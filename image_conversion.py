from PIL import Image
import os

# Paths
image_dir = r"D:\Picture\png2webp-in"  # Directory containing PNG images
output_dir = r"D:\Picture\png2webp-out"  # Directory to save WebP images; 

# for single image conversion
def image_conversion(image_name, quality=80):
    input_path = os.path.join(image_dir, image_name)
    output_path = os.path.join(output_dir, os.path.splitext(image_name)[0] + '.webp')
    png_image = Image.open(input_path)
    png_image.save(output_path, 'webp', quality=quality)

    # also print the file size of the original and converted images
    original_size = os.path.getsize(input_path) / (1024 * 1024)  # Convert to MB
    converted_size = os.path.getsize(output_path) / (1024 * 1024)  # Convert to MB
    print(f'Original image size: {original_size:.2f} MB')
    print(f'Converted image size: {converted_size:.2f} MB')

    print(f'{image_name} converted to {os.path.splitext(image_name)[0]}.webp')

user_image_name = r"test01.png" # input("Enter the image name (with extension, e.g., 'test01.png'): ")
image_conversion(user_image_name)
