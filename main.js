const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const { setupServer } = require('./src/server');

let mainWindow;
let expressApp;
const PORT = 3011;

// Initialize store
let store;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Open DevTools
  mainWindow.webContents.openDevTools();

  // Start Express server
  expressApp = express();
  
  // Initialize electron-store and setup server
  (async () => {
    try {
      console.log('Starting application...');
      
      // Check if public directory exists
      const publicDir = path.join(__dirname, 'public');
      if (!fs.existsSync(publicDir)) {
        console.error('Public directory does not exist:', publicDir);
        fs.mkdirSync(publicDir, { recursive: true });
        console.log('Created public directory');
      }

      // Check if index.html exists
      const indexPath = path.join(publicDir, 'index.html');
      if (!fs.existsSync(indexPath)) {
        console.error('index.html does not exist:', indexPath);
        // Create a simple index.html if it doesn't exist
        const simpleHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Simple Page</title></head>
        <body>
          <h1>Simple Page</h1>
          <p>This is a simple page created because the original index.html was not found.</p>
        </body>
        </html>`;
        fs.writeFileSync(indexPath, simpleHtml);
        console.log('Created simple index.html');
      }
      
      // Initialize store
      console.log('Initializing electron-store...');
      const { default: Store } = await import('electron-store');
      store = new Store();
      console.log('Store initialized');
      
      // Setup server with Express app
      console.log('Setting up Express server...');
      await setupServer(expressApp);
      console.log('Express server setup complete');
      
      // Start Express server
      console.log('Starting Express server on port', PORT);
      const server = expressApp.listen(PORT, () => {
        console.log(`Express server running on port ${PORT}`);
        // Load the app from the Express server
        mainWindow.loadURL(`http://localhost:${PORT}`);
      });
      
      // Handle window closing
      mainWindow.on('closed', () => {
        mainWindow = null;
        if (server) {
          server.close();
        }
      });
    } catch (error) {
      console.error('Error setting up application:', error);
      // If server setup fails, load a static error page
      mainWindow.loadFile(path.join(__dirname, 'public', 'error.html'));
    }
  })();
}

app.whenReady().then(() => {
  createWindow();
  
  // Set up IPC handlers
  setupIpcHandlers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Setup IPC handlers for communication with renderer process
async function setupIpcHandlers() {
  try {
    // Initialize store if not already done
    if (!store) {
      const { default: Store } = await import('electron-store');
      store = new Store();
    }

    // Handle directory selection
    ipcMain.handle('select-directory', async () => {
      try {
        const result = await dialog.showOpenDialog(mainWindow, {
          properties: ['openDirectory']
        });
        
        if (!result.canceled) {
          // Update watched directories
          store.set('thumbnailsDir', path.join(result.filePaths[0], 'thumbnails'));
          store.set('assetsDir', path.join(result.filePaths[0], 'assets'));
          return result.filePaths[0];
        }
        return null;
      } catch (error) {
        console.error('Error in select-directory handler:', error);
        return null;
      }
    });
  } catch (error) {
    console.error('Error setting up IPC handlers:', error);
  }
} 