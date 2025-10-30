const fs = require('fs');
const path = require('path');

// Create a simple PNG icon programmatically
// This is a basic 256x256 PNG with a simple design
const createSimpleIcon = () => {
  // Simple PNG header and data for a 256x256 icon
  // This creates a basic blue square with white text
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    // IHDR chunk
    0x00, 0x00, 0x00, 0x0D, // Length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x01, 0x00, // Width: 256
    0x00, 0x00, 0x01, 0x00, // Height: 256
    0x08, 0x06, 0x00, 0x00, 0x00, // Bit depth, color type, compression, filter, interlace
    0x00, 0x00, 0x00, 0x00, // CRC
    // IDAT chunk (simplified)
    0x00, 0x00, 0x00, 0x08, // Length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, // Compressed data
    0x00, 0x00, 0x00, 0x00, // CRC
    // IEND chunk
    0x00, 0x00, 0x00, 0x00, // Length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  return pngData;
};

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create a simple icon file
const iconPath = path.join(assetsDir, 'icon.png');
const iconData = createSimpleIcon();
fs.writeFileSync(iconPath, iconData);

console.log('Created icon.png in assets folder');
console.log('Note: This is a basic icon. For production, use a proper 256x256 PNG icon.');
