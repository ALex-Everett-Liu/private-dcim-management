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

async function createWindow() {
  try {
    // Initialize store
    const { default: Store } = await import('electron-store');
    store = new Store();
    
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
    try {
      expressApp = express();
      
      // Setup server with the Express app, not the Electron app
      await setupServer(expressApp, app)
        .then(configuredApp => {
          // Start the server
          expressApp.listen(PORT, () => {
            console.log(`Express server running on port ${PORT}`);
            mainWindow.loadURL(`http://localhost:${PORT}`);
          });
        })
        .catch(err => {
          console.error('Failed to set up server:', err);
          mainWindow.loadFile(path.join(__dirname, 'public', 'error.html'));
          dialog.showErrorBox('Server Error', `Failed to start server: ${err.message}`);
        });
    } catch (serverError) {
      console.error('Express server error:', serverError);
      mainWindow.loadFile(path.join(__dirname, 'public', 'error.html'));
      dialog.showErrorBox('Server Error', `Express server error: ${serverError.message}`);
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
    
    // Set up IPC handlers
    await setupIpcHandlers();
    
  } catch (error) {
    console.error('Error in createWindow:', error);
    if (mainWindow) {
      mainWindow.loadFile(path.join(__dirname, 'public', 'error.html'));
      dialog.showErrorBox('Application Error', `Failed to initialize application: ${error.message}`);
    }
  }
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('Uncaught Exception', `An unexpected error occurred: ${error.message}`);
});

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