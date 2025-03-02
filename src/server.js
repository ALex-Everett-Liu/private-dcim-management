const path = require('path');
const express = require('express');
const fs = require('fs');

// Function to set up the Express app
async function setupServer(app) {
  try {
    console.log('Setting up server...');
    
    // Initialize electron-store
    const { default: Store } = await import('electron-store');
    const store = new Store();
    console.log('Store initialized');

    // Set default paths if not already set
    if (!store.get('thumbnailsDir')) {
      const defaultThumbDir = path.join(app.getPath('userData'), 'thumbnails');
      store.set('thumbnailsDir', defaultThumbDir);
      fs.mkdirSync(defaultThumbDir, { recursive: true });
      console.log('Created default thumbnails directory:', defaultThumbDir);
    }
    
    if (!store.get('assetsDir')) {
      const defaultAssetsDir = path.join(app.getPath('userData'), 'assets');
      store.set('assetsDir', defaultAssetsDir);
      fs.mkdirSync(defaultAssetsDir, { recursive: true });
      console.log('Created default assets directory:', defaultAssetsDir);
    }

    // Get paths from store
    const thumbnailsDir = store.get('thumbnailsDir');
    const assetsDir = store.get('assetsDir');
    console.log('Using directories:', { thumbnailsDir, assetsDir });

    // Middleware to serve static files
    app.use(express.static(path.join(__dirname, '..', 'public')));
    app.use('/thumbnails', express.static(thumbnailsDir));
    app.use('/assets', express.static(assetsDir));
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    console.log('Middleware set up');

    // Basic routes
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });

    app.get('/add-image', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'add_image.html'));
    });

    app.get('/settings', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'settings.html'));
    });

    // API route to get image data (mock data for now)
    app.get('/api/images', (req, res) => {
      // Create a default thumbnail if it doesn't exist
      const defaultThumbDir = path.join(__dirname, '..', 'public', 'thumbnails');
      fs.mkdirSync(defaultThumbDir, { recursive: true });
      
      const defaultThumbPath = path.join(defaultThumbDir, 'default-thumbnail.webp');
      
      // Check if default thumbnail exists, if not create a simple one
      if (!fs.existsSync(defaultThumbPath)) {
        try {
          // If sharp is available, use it to create a thumbnail
          const sharp = require('sharp');
          sharp({
            create: {
              width: 150,
              height: 150,
              channels: 4,
              background: { r: 200, g: 200, b: 200, alpha: 1 }
            }
          })
          .jpeg()
          .toFile(defaultThumbPath.replace('.webp', '.jpg'))
          .then(() => {
            console.log('Created default thumbnail');
          })
          .catch(err => {
            console.error('Error creating thumbnail with sharp:', err);
          });
        } catch (error) {
          // If sharp is not available, create an empty file
          console.error('Error requiring sharp:', error);
          fs.writeFileSync(defaultThumbPath.replace('.webp', '.jpg'), '');
        }
      }
      
      res.json([
        {
          id: 1,
          filename: 'example.jpg',
          url: 'https://example.com/image.jpg',
          file_size: '1.5 MB',
          rating: 8.5,
          ranking: 1,
          tags: 'example,test',
          creation_time: '2023-01-01 12:00:00',
          person: 'John Doe',
          location: 'New York',
          type: 'JPEG',
          thumbnail_path: '/thumbnails/default-thumbnail.jpg' // Use a path that will actually work
        }
      ]);
    });

    // API route for settings
    app.get('/api/settings', (req, res) => {
      res.json({
        rootDirectory: path.dirname(store.get('thumbnailsDir')),
        thumbnailsDir: store.get('thumbnailsDir'),
        assetsDir: store.get('assetsDir')
      });
    });

    // API route to update directories
    app.post('/api/settings/update-directories', (req, res) => {
      try {
        console.log('Received update directories request:', req.body);
        
        const { rootDirectory } = req.body;
        
        if (!rootDirectory) {
          return res.status(400).json({ error: 'Root directory is required' });
        }
        
        // Create thumbnails directory
        const thumbnailsDir = path.join(rootDirectory, 'thumbnails');
        fs.mkdirSync(thumbnailsDir, { recursive: true });
        
        // Create assets directory
        const assetsDir = path.join(rootDirectory, 'assets');
        fs.mkdirSync(assetsDir, { recursive: true });
        
        // Update stored paths
        store.set('thumbnailsDir', thumbnailsDir);
        store.set('assetsDir', assetsDir);
        
        console.log('Updated directories:', { thumbnailsDir, assetsDir });
        
        res.json({
          success: true,
          thumbnailsDir,
          assetsDir
        });
      } catch (error) {
        console.error('Error updating directories:', error);
        res.status(500).json({ error: 'Failed to update directories', details: error.message });
      }
    });

    console.log('Server setup complete');
    return app;
  } catch (error) {
    console.error('Error in setupServer:', error);
    throw error;
  }
}

module.exports = { setupServer }; 