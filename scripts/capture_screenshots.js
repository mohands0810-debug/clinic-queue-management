import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve(process.cwd(), 'docs', 'assets', 'screenshots');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const baseUrl = 'https://clinic-queue-management-theta.vercel.app';

async function capture() {
  console.log('Launching Chrome via puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    defaultViewport: {
      width: 1280,
      height: 800,
      deviceScaleFactor: 2, // High-DPI crisp retina capture
    },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  // Helper to ensure splash is skipped and language set
  const preparePage = async (lang = 'en') => {
    await page.evaluateOnNewDocument((targetLang) => {
      sessionStorage.setItem('dhanvantri_splash_seen', 'true');
      if (targetLang) {
        localStorage.setItem('i18nextLng', targetLang);
      }
    }, lang);
  };

  try {
    // 1. Home Page (English)
    console.log('1. Capturing Home Page...');
    await preparePage('en');
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({
      path: path.join(outputDir, 'home-page-patient.jpg'),
      type: 'jpeg',
      quality: 92,
    });
    console.log('✓ home-page-patient.jpg saved');

    // 2. Home Page (Kannada)
    console.log('2. Capturing Home Page (Kannada)...');
    await preparePage('kn');
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      localStorage.setItem('i18nextLng', 'kn');
    });
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({
      path: path.join(outputDir, 'home-page-kannada.jpg'),
      type: 'jpeg',
      quality: 92,
    });
    console.log('✓ home-page-kannada.jpg saved');

    // 3. 3-Step Accessible Registration Page (/get-token)
    console.log('3. Capturing 3-Step Registration (/get-token)...');
    await preparePage('en');
    await page.goto(`${baseUrl}/get-token`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({
      path: path.join(outputDir, 'token-registration.png'),
    });
    console.log('✓ token-registration.png saved');

    // 4. Live Token Status Page (/status)
    // We navigate to /instant-token to generate an active token, which redirects to /status?id=...
    console.log('4. Generating active token and capturing Live Token Status (/status)...');
    await preparePage('en');
    await page.goto(`${baseUrl}/instant-token`, { waitUntil: 'networkidle2' });
    // Wait for auto redirect to /status
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({
      path: path.join(outputDir, 'live-token-status.png'),
    });
    console.log('✓ live-token-status.png saved');

    // 5. Waiting Room TV Display Board (/display)
    console.log('5. Capturing TV Display Board (/display)...');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await preparePage('en');
    await page.goto(`${baseUrl}/display`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({
      path: path.join(outputDir, 'tv-display-board.png'),
    });
    console.log('✓ tv-display-board.png saved');

    // 6. Doctor Console (/doctor)
    console.log('6. Logging into Doctor Console (/doctor)...');
    await page.setViewport({ width: 1366, height: 850, deviceScaleFactor: 2 });
    await preparePage('en');
    await page.goto(`${baseUrl}/doctor`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));

    // Fill sign in credentials if sign in form is visible
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      await page.type('input[type="email"]', 'doctor@dhanvantri.clinic');
      await page.type('input[type="password"]', 'Doctor@123');
      await page.click('button[type="submit"]');
      await new Promise((r) => setTimeout(r, 2500));
    }

    await page.screenshot({
      path: path.join(outputDir, 'doctor-console.png'),
    });
    console.log('✓ doctor-console.png saved');

  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
    console.log('Browser closed. All screenshots finished!');
  }
}

capture();
