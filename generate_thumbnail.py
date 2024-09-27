from PIL import Image
from image_conversion import image_conversion
import os

def generate_thumbnail(image_path, thumbnail_size=(150, 150), quality=80):
    """Generate a thumbnail for the given image in WebP format."""
    with Image.open(image_path) as img:
        img.thumbnail(thumbnail_size)
        thumbnail_dir = r"D:\Picture\static\thumbnails"
        os.makedirs(thumbnail_dir, exist_ok=True)  # Ensure the directory exists
        thumbnail_path = os.path.join(thumbnail_dir, os.path.splitext(os.path.basename(image_path))[0] + '.webp')
        img.save(thumbnail_path, format='WEBP', quality=quality)  # Save as WebP with specified quality
        return thumbnail_path
    
url = r"C:\Users\Xx\AppData\Roaming\uploads\example.png"
thumbnail_path = generate_thumbnail(url)
