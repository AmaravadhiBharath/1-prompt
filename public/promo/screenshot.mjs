import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 560, deviceScaleFactor: 2 });

  const htmlPath = path.join(__dirname, 'marquee-promo-tile.html');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

  // Screenshot just the tile element
  const tile = await page.$('.tile');
  await tile.screenshot({
    path: path.join(__dirname, 'marquee-promo-tile-1400x560.png'),
    type: 'png',
  });

  console.log('Saved: marquee-promo-tile-1400x560.png');
  await browser.close();
})();
