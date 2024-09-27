import sqlite3
import os
from datetime import datetime
from PIL import Image
from generate_thumbnail import generate_thumbnail

def parse_file_size(file_size_str):
    units = {"B": 1, "KB": 1024, "MB": 1024**2, "GB": 1024**3}
    size, unit = file_size_str.split()
    return int(float(size) * units[unit.upper()])

def add_image(filename, url, file_size, rating, ranking, tags, creation_time, person, location, type, original_image_path):
    conn = sqlite3.connect('images.db')
    c = conn.cursor()
    
    # creation_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    # Parse the creation time
    # creation_time = datetime.strptime(creation_time, "%Y-%m-%d %H:%M:%S")
    # If creation_time is empty, use current time
    if not creation_time:
        creation_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    else:
        creation_time = datetime.strptime(creation_time, "%Y-%m-%d %H:%M:%S")
    
    # Parse the file size
    file_size = parse_file_size(file_size)
    
    # Generate thumbnail if original image is provided
    if original_image_path:
        thumbnail_path = generate_thumbnail(original_image_path)
    else:
        thumbnail_path = None
    
    c.execute('''INSERT INTO images (filename, url, file_size, rating, ranking, tags, creation_time, person, location, type, thumbnail_path)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
              (filename, url, file_size, rating, ranking, tags, creation_time, person, location, type, thumbnail_path))
    
    conn.commit()
    conn.close()

# Example usage:
add_image("mountain.png", "http://example.com/mountain.png", 2048000, 4, 2, "mountain,nature", "Jane Smith", "Alps")
add_image("sunset.jpg", "http://example.com/sunset.jpg", "1.5 MB", 5, 1, "sunset,beach", "John Doe", "Hawaii", "2024-09-10 16:02:00")

