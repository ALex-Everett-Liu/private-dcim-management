const path = require('path');
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const chokidar = require('chokidar');
const sharp = require('sharp');

// Function to set up the Express app
async function setupServer(expressApp, electronApp) {
  try {
    console.log('Setting up server...');
    
    // Initialize electron-store
    const { default: Store } = await import('electron-store');
    const store = new Store();
    console.log('Store initialized');

    // Set default paths if not already set
    if (!store.get('thumbnailsDir')) {
      const defaultThumbDir = path.join(electronApp.getPath('userData'), 'thumbnails');
      store.set('thumbnailsDir', defaultThumbDir);
      fs.mkdirSync(defaultThumbDir, { recursive: true });
      console.log('Created default thumbnails directory:', defaultThumbDir);
    }
    
    if (!store.get('assetsDir')) {
      const defaultAssetsDir = path.join(electronApp.getPath('userData'), 'assets');
      store.set('assetsDir', defaultAssetsDir);
      fs.mkdirSync(defaultAssetsDir, { recursive: true });
      console.log('Created default assets directory:', defaultAssetsDir);
    }

    // Get paths from store
    const thumbnailsDir = store.get('thumbnailsDir');
    const assetsDir = store.get('assetsDir');
    console.log('Using directories:', { thumbnailsDir, assetsDir });

    // Connect to SQLite database using better-sqlite3
    const dbPath = path.join(electronApp.getPath('userData'), 'image.db');
    const Database = require('better-sqlite3');
    const db = new Database(dbPath);
    
    // Initialize database tables
    await initializeDatabase(db);
    console.log('Database initialized');

    // Set up file watchers
    const watchOptions = {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    };

    chokidar.watch(thumbnailsDir, watchOptions).on('all', (event, path) => {
      console.log(`Thumbnails directory: ${event} detected on ${path}`);
    });

    chokidar.watch(assetsDir, watchOptions).on('all', (event, path) => {
      console.log(`Assets directory: ${event} detected on ${path}`);
    });

    // Set up multer for file uploads
    const uploadsDir = path.join(electronApp.getPath('userData'), 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, uploadsDir);
      },
      filename: function (req, file, cb) {
        // Generate a unique filename
        const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
        cb(null, uniqueSuffix + path.extname(file.originalname));
      }
    });
    
    const upload = multer({ storage: storage });

    // Middleware to serve static files
    expressApp.use(express.static(path.join(__dirname, '..', 'public')));
    expressApp.use('/thumbnails', express.static(thumbnailsDir));
    expressApp.use('/assets', express.static(assetsDir));
    expressApp.use(express.urlencoded({ extended: true }));
    expressApp.use(express.json());
    console.log('Middleware set up');

    // Helper functions
    function formatFileSize(sizeInBytes) {
      sizeInBytes = Number(sizeInBytes); // Ensure it's a number
      if (sizeInBytes < 1024) return `${sizeInBytes} B`;
      else if (sizeInBytes < 1024 ** 2) return `${(sizeInBytes / 1024).toFixed(2)} KB`;
      else if (sizeInBytes < 1024 ** 3) return `${(sizeInBytes / 1024 ** 2).toFixed(2)} MB`;
      return `${(sizeInBytes / 1024 ** 3).toFixed(2)} GB`;
    }

    function parseFileSize(sizeString) {
      const units = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024
      };
    
      const match = sizeString.match(/^(\d+(\.\d+)?)\s*(B|KB|MB|GB)$/i);
      if (!match) return null;
    
      const size = parseFloat(match[1]);
      const unit = match[3].toUpperCase();
    
      return Math.round(size * units[unit]);
    }

    async function generateThumbnail(imagePath, maxSize = 150, quality = 60) {
      fs.mkdirSync(thumbnailsDir, { recursive: true });
    
      const thumbnailFilename = path.basename(imagePath, path.extname(imagePath)) + '.webp';
      const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);
    
      try {
        const metadata = await sharp(imagePath).metadata();
        const aspectRatio = metadata.width / metadata.height;
        let resizeOptions;
    
        if (aspectRatio > 1) {
          // Image is wider than it is tall
          resizeOptions = { width: maxSize };
        } else {
          // Image is taller than it is wide or square
          resizeOptions = { height: maxSize };
        }
    
        await sharp(imagePath)
          .resize(resizeOptions)
          .webp({ quality: quality })
          .toFile(thumbnailPath);
          
        return `/thumbnails/${thumbnailFilename}`; // Return the relative URL path
      } catch (err) {
        console.error('Error generating thumbnail:', err);
        return null;
      }
    }

    function processThumbPath(thumbPath) {
      if (!thumbPath) {
        return '/thumbnails/default-thumbnail.jpg'; // Default thumbnail path
      }
      // Extract just the filename from the full path
      const filename = path.basename(thumbPath);
      return `/thumbnails/${filename}`;
    }

    // Basic routes
    expressApp.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });

    expressApp.get('/add-image', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'add_image.html'));
    });

    expressApp.get('/settings', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'settings.html'));
    });

    // API route to get image data
    expressApp.get('/api/images', (req, res) => {
      try {
        const images = db.prepare('SELECT * FROM images').all();
        
        const processedImages = images.map(image => {
          image.file_size = formatFileSize(image.file_size);
          image.thumbnail_path = processThumbPath(image.thumbnail_path);
          image.tags = image.tags || '';
          return image;
        });
        
        processedImages.sort((a, b) => a.ranking - b.ranking || b.rating - a.rating);
        
        res.json(processedImages);
      } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
      }
    });

    // API route for settings
    expressApp.get('/api/settings', (req, res) => {
      res.json({
        rootDirectory: path.dirname(store.get('thumbnailsDir')),
        thumbnailsDir: store.get('thumbnailsDir'),
        assetsDir: store.get('assetsDir')
      });
    });

    // API route to update directories
    expressApp.post('/api/settings/update-directories', (req, res) => {
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

    // Add image endpoint - modified to work with existing files and different URL formats
    expressApp.post('/add_image', upload.single('thumbnail'), async (req, res) => {
      try {
        console.log('Received add image request:', req.body);
        
        const { 
          filename, 
          url, 
          url_type,
          url_cloud,
          file_size, 
          rating, 
          ranking, 
          tags = '', 
          creation_time, 
          person = '', 
          location = '', 
          type,
          use_existing_file = 'false'
        } = req.body;
        
        // Validate required fields
        if (!filename || !url || !file_size || !rating || !ranking || !type) {
          return res.status(400).send('Missing required fields');
        }
        
        // Process the file path
        const safeFilename = path.basename(filename); // Sanitize filename
        const originalImagePath = path.join(assetsDir, safeFilename);
        
        // Check if we should use an existing file or process an upload
        if (use_existing_file === 'true') {
          // Check if the file exists in the assets directory
          if (!fs.existsSync(originalImagePath)) {
            return res.status(404).send(`File ${safeFilename} not found in assets directory`);
          }
          console.log(`Using existing file: ${originalImagePath}`);
        } else {
          // Process uploaded file
          if (!req.file) {
            return res.status(400).send('No image uploaded');
          }
          
          // Use copy instead of rename to handle cross-device operations
          try {
            // Create a read stream from the source
            const readStream = fs.createReadStream(req.file.path);
            // Create a write stream to the destination
            const writeStream = fs.createWriteStream(originalImagePath);
            
            // Wait for the copy to complete
            await new Promise((resolve, reject) => {
              readStream.on('error', reject);
              writeStream.on('error', reject);
              writeStream.on('finish', resolve);
              readStream.pipe(writeStream);
            });
            
            // Delete the source file after successful copy
            fs.unlinkSync(req.file.path);
            
            console.log(`File copied from ${req.file.path} to ${originalImagePath}`);
          } catch (copyError) {
            console.error('Error copying file:', copyError);
            return res.status(500).send('Error copying uploaded file: ' + copyError.message);
          }
        }
        
        // Generate thumbnail
        const thumbnailPath = await generateThumbnail(originalImagePath, 150);
        if (!thumbnailPath) {
          return res.status(500).send('Thumbnail generation error');
        }
        
        // Use the original creation_time if provided, otherwise use current time
        const creationTime = creation_time || new Date().toISOString().replace('T', ' ').slice(0, 19);
        
        // Convert file size to bytes
        const fileSizeInBytes = parseFileSize(file_size);
        if (fileSizeInBytes === null) {
          return res.status(400).send('Invalid file size format');
        }
        
        // Insert into database using better-sqlite3
        const stmt = db.prepare(`
          INSERT INTO images (filename, url, file_size, rating, ranking, tags, creation_time, person, location, type, thumbnail_path) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
          safeFilename, 
          url, 
          fileSizeInBytes, 
          rating, 
          ranking, 
          tags, 
          creationTime, 
          person, 
          location, 
          type, 
          thumbnailPath
        );
        
        res.status(200).send('Image added successfully');
      } catch (error) {
        console.error('Error adding image:', error);
        res.status(500).send('Error adding image: ' + error.message);
      }
    });

    // Add a new route for the converter page
    expressApp.get('/convert', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'convert.html'));
    });

    // API endpoint for image conversion
    expressApp.post('/api/convert', upload.single('image'), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No image uploaded' });
        }

        const quality = parseInt(req.body.quality) || 80;
        const originalPath = req.file.path;
        const filename = path.basename(req.file.originalname, path.extname(req.file.originalname)) + '.webp';
        const outputPath = path.join(assetsDir, filename);

        // Get original file size
        const originalSize = fs.statSync(originalPath).size;

        // Convert image to WebP
        await sharp(originalPath)
          .webp({ quality: quality })
          .toFile(outputPath);

        // Get converted file size
        const convertedSize = fs.statSync(outputPath).size;

        // Delete the temporary uploaded file
        fs.unlinkSync(originalPath);

        res.json({
          success: true,
          originalFile: req.file.originalname,
          convertedFile: filename,
          originalSize: formatFileSize(originalSize),
          convertedSize: formatFileSize(convertedSize),
          originalSizeBytes: originalSize,
          convertedSizeBytes: convertedSize,
          savingsPercent: ((originalSize - convertedSize) / originalSize * 100).toFixed(2),
          outputPath: `/assets/${filename}`
        });
      } catch (error) {
        console.error('Error converting image:', error);
        res.status(500).json({ error: 'Error converting image: ' + error.message });
      }
    });

    // Error handling middleware
    expressApp.use((err, req, res, next) => {
      console.error('Express error:', err);
      if (err.code === 'ENOENT') {
        res.status(404).send('File not found');
      } else {
        res.status(500).send('Internal server error');
      }
    });

    console.log('Server setup complete');
    return expressApp;
  } catch (error) {
    console.error('Error in setupServer:', error);
    throw error;
  }
}

// Initialize database tables
function initializeDatabase(db) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT,
        url TEXT,
        file_size INTEGER,
        rating REAL,
        ranking REAL,
        tags TEXT,
        creation_time TEXT,
        person TEXT,
        location TEXT,
        type TEXT,
        thumbnail_path TEXT
      )
    `);
    return Promise.resolve();
  } catch (error) {
    console.error('Error initializing database:', error);
    return Promise.reject(error);
  }
}

module.exports = { setupServer }; 