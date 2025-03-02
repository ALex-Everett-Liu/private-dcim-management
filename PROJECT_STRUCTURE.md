# DCIM Management Project Structure

## Table of Contents
1. [Project Overview](#project-overview)
2. [Core Components](#core-components)
3. [Main Workflow](#main-workflow)
4. [Data Models](#data-models)
5. [API Controllers](#api-controllers)
6. [Frontend Components](#frontend-components)
7. [Technical Stack](#technical-stack)
8. [Build Process](#build-process)

## Project Overview

### Purpose
A web application for managing and organizing a personal Digital Content Information Management (DCIM) system. It provides a way to catalog, view, and filter image metadata with thumbnail previews.

### Key Features
- Image metadata management
- Thumbnail generation and preview
- Filterable and sortable data tables
- Image upload and processing
- Directory monitoring
- Responsive web interface
- Local data storage in SQLite
- Customizable pagination and ranking

## Core Components

### 1. Server Infrastructure (src/server.js)

#### Server Configuration
Class: ServerConfig
- setupExpress(): Configures Express server settings
- setupMiddleware(): Sets up Express middleware
- setupRoutes(): Configures API and view routes
- setupStaticFiles(): Configures static file serving
- startServer(port): Starts the Express server

#### File Watcher
Class: DirectoryWatcher
- watchDirectory(path, options): Sets up directory watching
- handleFileChange(event, path): Processes file changes
- processNewFile(path): Handles new files
- handleDeletedFile(path): Handles file deletions

### 2. Database Manager (src/database/DatabaseManager.js)

Class: DatabaseManager
- init(): Initializes SQLite database connection
- setupTables(): Creates required tables if they don't exist
- handleError(error): Handles database errors
- closeConnection(): Properly closes database connection

### 3. Image Processor (src/services/ImageProcessor.js)

Class: ImageProcessor
- generateThumbnail(sourcePath, options): Creates webp thumbnails
- processImage(sourcePath, destPath, options): General image processing
- calculateDimensions(metadata, maxSize): Calculates dimensions for resize
- getImageMetadata(path): Extracts image metadata

## Data Models

### Image Model (src/models/Image.js)

Class: Image
Properties:
- id: INTEGER (Primary Key)
- filename: TEXT
- url: TEXT
- file_size: INTEGER
- rating: REAL
- ranking: INTEGER
- tags: TEXT
- creation_time: TEXT
- person: TEXT
- location: TEXT
- type: TEXT
- thumbnail_path: TEXT

Methods:
- create(imageData): Creates a new image record
- findById(id): Retrieves an image by ID
- findAll(options): Retrieves all images with optional filtering/sorting
- update(id, imageData): Updates an image record
- delete(id): Deletes an image record
- formatSize(): Utility to format file size for display

## API Controllers

### Images Controller (src/controllers/ImagesController.js)

Class: ImagesController
Methods:
- getAll(req, res): Returns all images, optionally filtered
- getById(req, res): Returns a single image by ID
- add(req, res): Creates a new image record
- update(req, res): Updates an existing image
- delete(req, res): Deletes an image
- generateThumbnail(req, res): Creates a thumbnail for an image

### File Controller (src/controllers/FileController.js)

Class: FileController
Methods:
- uploadFile(req, res): Handles file uploads
- processUpload(file): Processes an uploaded file
- validateFile(file): Validates file type and size
- handleFileDeletion(req, res): Handles file deletion requests

## Frontend Components (src/public/js)

### Table Manager (src/public/js/tableManager.js)

Class: TableManager
Methods:
- initTable(): Initializes the DataTable
- setupFilters(): Sets up DataTable filters
- setupPagination(): Configures pagination
- applyRankingFilter(): Applies ranking filters
- handlePageNavigation(): Manages manual page navigation
- refreshTable(): Reloads table data

### Form Manager (src/public/js/formManager.js)

Class: FormManager
Methods:
- initForm(): Sets up form validation and submission
- handleSubmit(): Processes form submission
- validateInputs(): Validates form inputs
- displayErrors(): Shows validation errors
- clearForm(): Resets form fields

### Utils (src/public/js/utils.js)

Class: Utils
Methods:
- formatFileSize(bytes): Formats file size for display
- parseFileSize(string): Parses formatted file size back to bytes
- validateFileType(file): Checks file type validity
- formatDate(dateString): Formats dates for display

## Technical Stack

### Core Technologies
- Backend: Node.js with Express
- Database: SQLite3
- Image Processing: Sharp
- File Watching: Chokidar
- Frontend: jQuery, DataTables
- Templates: EJS
- Upload Handling: Multer

### Key Dependencies
| Package | Purpose |
|---------|---------|
| Express | Web server framework |
| SQLite3 | Database |
| Multer | File upload handling |
| Sharp | Image processing and thumbnails |
| Chokidar | File system watching |
| DataTables | Interactive data tables |
| EJS | Server-side templating |

## Build Process

### Development Mode
1. Clone the repository
2. Install dependencies with `npm install`
3. Run the server with `npm start` or `node src/server.js`
4. Access the application at http://localhost:3011

### Production Deployment
1. Set up proper directory paths in configuration
2. Ensure directories for uploads and thumbnails exist and are writable
3. Install production dependencies only with `npm install --production`
4. Run with a process manager like PM2: `pm2 start src/server.js` 