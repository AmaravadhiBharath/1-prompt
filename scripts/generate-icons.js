import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceFile = path.join(__dirname, '../public/icons/logo_v2.png');
const outputDir = path.join(__dirname, '../public/icons');

const sizes = [16, 32, 48, 128];

async function generateIcons() {
    console.log('Generating icons from:', sourceFile);

    for (const size of sizes) {
        const outputFile = path.join(outputDir, `icon${size}.png`);

        await sharp(sourceFile)
            .trim() // Remove the black outer border
            .resize(size, size, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .ensureAlpha()
            .toFile(outputFile);
        console.log(`Generated: ${outputFile}`);
    }

    // Also update logo-new.png and logo_source.png
    await sharp(sourceFile).trim().toFile(path.join(outputDir, 'logo-new.png'));
    await sharp(sourceFile).trim().toFile(path.join(outputDir, 'logo_source.png'));

    console.log('All icons updated successfully!');
}

generateIcons().catch(err => {
    console.error('Error generating icons:', err);
    process.exit(1);
});
