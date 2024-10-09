const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' }); // Configure multer for file uploads

// Set up EJS for templating
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/thumbnails', express.static('Q:\\Picture@2024\\static\\thumbnails'));
app.use(express.urlencoded({ extended: true }));

// Connect to SQLite database
const db = new sqlite3.Database('image.db');

// Helper to format file size
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

function generateThumbnail(imagePath, thumbnailSize = { width: 150, height: 150 }, quality = 60) {
    const thumbnailDir = path.join(__dirname, 'public/thumbnails');
    fs.mkdirSync(thumbnailDir, { recursive: true });
  
    const thumbnailFilename = path.basename(imagePath, path.extname(imagePath)) + '.webp';
    const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);
  
    return sharp(imagePath)
      .resize(thumbnailSize.width, thumbnailSize.height)
      .webp({ quality: quality })
      .toFile(thumbnailPath)
      .then(() => `/thumbnails/${thumbnailFilename}`) // Return the relative URL path
      .catch(err => {
        console.error('Error generating thumbnail:', err);
        return null;
      });
  }

  function processThumbPath(thumbPath) {
    if (!thumbPath) {
      return '/path/to/default/thumbnail.webp'; // Replace with your default thumbnail path
    }
    // Extract just the filename from the full path
    const filename = path.basename(thumbPath);
    return `/thumbnails/${filename}`;
  }
  

// Routes
app.get('/', (req, res) => {
  db.all('SELECT * FROM images', [], (err, images) => {
    if (err) {
      return res.status(500).send('Database error');
    }

    images = images.map(image => {
      image.file_size = formatFileSize(image.file_size);
      image.thumbnail_path = processThumbPath(image.thumbnail_path);
      image.tags = image.tags || '';
      return image;
    });

    images.sort((a, b) => a.ranking - b.ranking || b.rating - a.rating);

    res.render('index', { images });
  });
});

app.get('/add-image', (req, res) => {
  res.render('add_image');  // Ensure 'add_image.ejs' is in your views directory
});

app.post('/add_image', upload.single('thumbnail'), async (req, res) => {
    try {
      const { filename, url, file_size, rating, ranking, tags = '', creation_time, person = '', location = '', type } = req.body;
      
      if (!req.file) {
        return res.status(400).send('No image uploaded');
      }
  
      const safeFilename = path.basename(filename); // Sanitize filename
      const originalImagePath = path.join(__dirname, 'public/originals', safeFilename);
      
      fs.renameSync(req.file.path, originalImagePath);
  
      const thumbnailPath = await generateThumbnail(originalImagePath);
      if (!thumbnailPath) {
        return res.status(500).send('Thumbnail generation error');
      }
  
      // Use the original creation_time if provided, otherwise use current time in a similar format
      const creationTime = creation_time || new Date().toISOString().replace('T', ' ').slice(0, 19);

      // Convert file size to bytes
      const fileSizeInBytes = parseFileSize(file_size);
      if (fileSizeInBytes === null) {
        return res.status(400).send('Invalid file size format');
      }
  
      db.run(
        'INSERT INTO images (filename, url, file_size, rating, ranking, tags, creation_time, person, location, type, thumbnail_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [safeFilename, url, file_size, rating, ranking, tags, creationTime, person, location, type, thumbnailPath],
        err => {
          if (err) {
            console.error('Database insertion error:', err);
            return res.status(500).send('Database error');
          }
          res.redirect('/');
        }
      );
    } catch (error) {
      console.error('Unexpected error:', error);
      res.status(500).send('An unexpected error occurred');
    }
  });
  
app.use((err, req, res, next) => {
    if (err.code === 'ENOENT') {
      res.status(404).send('Thumbnail not found');
    } else {
      next(err);
    }
  });

// Start server
app.listen(3011, () => {
  console.log('Server running on http://localhost:3011');
});
