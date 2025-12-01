import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const inputPath = join(__dirname, '../public/images/qualitrol-q-logo.svg');
const outputPath = join(__dirname, '../public/favicon.png');

async function convertSvgToPng() {
  try {
    await sharp(inputPath)
      .resize(32, 32) // Standard favicon size
      .png()
      .toFile(outputPath);
    
    console.log('SVG successfully converted to PNG at:', outputPath);
  } catch (error) {
    console.error('Error converting SVG to PNG:', error);
    process.exit(1);
  }
}

convertSvgToPng();
