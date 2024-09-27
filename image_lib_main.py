from flask import Flask, render_template, request, send_file, send_from_directory, redirect, url_for
import sqlite3
import os
import subprocess
import urllib.parse
from datetime import datetime
from image_management import add_image, generate_thumbnail

app = Flask(__name__)

def format_file_size(size_in_bytes):
    """Convert bytes to a human-readable file size format."""
    if isinstance(size_in_bytes, str):
        size_in_bytes = int(size_in_bytes)  # Convert to int if it's a string
    if size_in_bytes < 1024:
        return f"{size_in_bytes} B"
    elif size_in_bytes < 1024**2:
        return f"{size_in_bytes / 1024:.2f} KB"
    elif size_in_bytes < 1024**3:
        return f"{size_in_bytes / 1024**2:.2f} MB"
    else:
        return f"{size_in_bytes / 1024**3:.2f} GB"

@app.route('/')
def index():
    conn = sqlite3.connect('images2.db')
    c = conn.cursor()
    c.execute("SELECT * FROM images")
    images = c.fetchall()
    conn.close()

    # Format the file sizes for display
    formatted_images = []
    for image in images:
        formatted_image = list(image)  # Convert tuple to list for modification
        formatted_image[3] = format_file_size(formatted_image[3])  # Assuming file_size is the 3rd column
        
        # Prepare the correct file URL for local files
        if os.path.isfile(formatted_image[2]):
            formatted_image[2] = 'file:///' + os.path.abspath(formatted_image[2]).replace('\\', '/')
        
        # Handle the case where thumbnail_path might be None
        if formatted_image[11] is not None:
            formatted_image[11] = os.path.basename(formatted_image[11])
        else:
            formatted_image[11] = 'default_thumbnail.webp'  # Use a default thumbnail name
        
        # Handle the case where tags might be None
        if formatted_image[6] is None:
            formatted_image[6] = ''  # Set to empty string if None
        
        formatted_images.append(formatted_image)

    # Sort images by ranking (ascending) and rating (descending)
    formatted_images.sort(key=lambda x: (x[5], -x[4]))  # x[5] is ranking, x[4] is rating
    
    return render_template('index.html', images=formatted_images)

@app.route('/open_image/<path:image_path>')
def open_image(image_path):
    # This route will now only handle web URLs
    parsed_url = urllib.parse.urlparse(image_path)
    if parsed_url.scheme and parsed_url.netloc:
        return redirect(image_path)
    else:
        return "Invalid image path", 400

@app.route('/thumbnails/<filename>')
def thumbnails(filename):
    return send_from_directory(r"D:\Picture\static\thumbnails", filename)

@app.route('/add_image', methods=['GET', 'POST'])
def add_new_image():
    if request.method == 'POST':
        filename = request.form['filename']
        url = request.form['url']
        file_size = request.form['file_size']
        rating = float(request.form['rating'])
        ranking = float(request.form['ranking']) # ranking = int(request.form['ranking'])
        tags = request.form.get('tags', '')  # Use get() with a default value
        creation_time = request.form.get('creation_time', '')  # Use get() with a default value
        person = request.form.get('person', '')  # Use get() with a default value
        location = request.form.get('location', '')  # Use get() with a default value
        image_type = request.form['type']
        
        # Handle file upload for the original image
        original_image_file = request.files['thumbnail']
        if original_image_file:
            original_image_path = os.path.join(r"D:\Picture\static\originals", filename)
            original_image_file.save(original_image_path)
        else:
            original_image_path = None

        # If creation_time is empty, use current time
        if not creation_time:
            creation_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        add_image(filename, url, file_size, rating, ranking, tags, creation_time, person, location, image_type, original_image_path)
        return redirect(url_for('index'))
    
    return render_template('add_image.html')

if __name__ == '__main__':
    app.run(debug=True)
