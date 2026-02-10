
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE = path.resolve(__dirname, '../public/icons/logo_source.png');
const DEST_DIR = path.resolve(__dirname, '../public/icons');

const sizes = [16, 32, 48, 128];

async function resize() {
    if (!fs.existsSync(SOURCE)) {
        console.error('Source image not found:', SOURCE);
        process.exit(1);
    }

    console.log('Resizing icons from:', SOURCE);

    for (const size of sizes) {
        const dest = path.join(DEST_DIR, `icon${size}.png`);
        await sharp(SOURCE)
            .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }) // Ensure alpha is 0
            .png()
            .toFile(dest);
        console.log(`Generated: ${dest}`);
    }
}

resize().catch(console.error);
