const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const targetUrl = 'https://clinic-queue-management-theta.vercel.app/instant-token';

async function generate() {
  if (!fs.existsSync('public')) {
    fs.mkdirSync('public', { recursive: true });
  }

  // 1. High-resolution standalone QR code PNG (1024x1024)
  await QRCode.toFile('public/dhanvantri-instant-token-qr.png', targetUrl, {
    width: 1024,
    margin: 2,
    color: {
      dark: '#0F4C81', // Clinical Deep Blue
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H'
  });

  // 2. High-resolution standalone QR code SVG
  await QRCode.toFile('public/dhanvantri-instant-token-qr.svg', targetUrl, {
    type: 'svg',
    margin: 2,
    color: {
      dark: '#0F4C81',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H'
  });

  // 3. Base64 data URL for printable poster HTML
  const qrDataUrl = await QRCode.toDataURL(targetUrl, {
    width: 600,
    margin: 2,
    color: {
      dark: '#0F4C81',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H'
  });

  const standeeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dhanvantri Clinic - Instant Token QR Poster</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif;
      background: #f1f5f9;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .poster-card {
      width: 100%;
      max-width: 540px;
      background: #ffffff;
      border-radius: 28px;
      box-shadow: 0 20px 40px rgba(15, 76, 129, 0.12);
      border: 3px solid #0F4C81;
      overflow: hidden;
      text-align: center;
    }
    .poster-header {
      background: linear-gradient(135deg, #0F4C81 0%, #0369a1 100%);
      color: #ffffff;
      padding: 32px 24px 24px;
    }
    .emblem {
      width: 64px;
      height: 64px;
      background: #ffffff;
      color: #0F4C81;
      border-radius: 50%;
      font-size: 36px;
      font-weight: 900;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 900;
      letter-spacing: 0.5px;
    }
    .subheading {
      margin: 6px 0 0;
      font-size: 16px;
      font-weight: 600;
      color: #e0f2fe;
    }
    .address {
      margin: 4px 0 0;
      font-size: 13px;
      color: #bae6fd;
    }
    .badge {
      display: inline-block;
      margin: 20px auto 0;
      background: #fef3c7;
      color: #92400e;
      border: 2px solid #f59e0b;
      padding: 10px 24px;
      border-radius: 50px;
      font-weight: 800;
      font-size: 16px;
      letter-spacing: 0.5px;
    }
    .instructions {
      padding: 20px 24px 10px;
    }
    .instructions h2 {
      margin: 0;
      font-size: 20px;
      color: #0f172a;
      font-weight: 800;
    }
    .instructions p {
      margin: 6px 0 0;
      font-size: 14px;
      color: #64748b;
      font-weight: 500;
    }
    .qr-container {
      background: #f8fafc;
      margin: 16px 32px;
      padding: 20px;
      border-radius: 20px;
      border: 2px dashed #cbd5e1;
      display: flex;
      justify-content: center;
    }
    .qr-container img {
      width: 280px;
      height: 280px;
      display: block;
      border-radius: 12px;
    }
    .url-pill {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      padding: 6px 16px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 13px;
      font-weight: 700;
      margin-top: 10px;
    }
    .footer-note {
      padding: 16px 24px 24px;
      border-top: 1px solid #f1f5f9;
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
    }
    .senior-pill {
      color: #b45309;
      background: #fef3c7;
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: 700;
      display: inline-block;
      margin-bottom: 8px;
    }
    .print-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #0F4C81;
      color: white;
      border: none;
      padding: 14px 28px;
      font-size: 16px;
      font-weight: 700;
      border-radius: 50px;
      cursor: pointer;
      box-shadow: 0 10px 20px rgba(0,0,0,0.2);
    }
    @media print {
      body { background: transparent; padding: 0; }
      .print-btn { display: none; }
      .poster-card { box-shadow: none; border-width: 2px; }
    }
  </style>
</head>
<body>
  <div class="poster-card">
    <div class="poster-header">
      <div class="emblem">ಧ</div>
      <h1>DHANVANTRI CLINIC</h1>
      <div class="subheading">Dr Yogesh • BTM Layout, Bengaluru</div>
      <div class="address">Sandhya Theater Complex, VP Road • Ph: +91 98765 43210</div>
    </div>

    <div class="badge">⚡ SCAN FOR INSTANT TOKEN</div>

    <div class="instructions">
      <h2>No Typing or App Required</h2>
      <p>Scan with your phone camera or our website QR scanner to receive your queue token in 1 second.</p>
    </div>

    <div class="qr-container">
      <img src="${qrDataUrl}" alt="Scan for instant queue token" />
    </div>

    <div>
      <span class="url-pill">clinic-queue-management-theta.vercel.app</span>
    </div>

    <div class="footer-note">
      <div class="senior-pill">🌟 Senior Citizens (60+) receive priority interleaving</div>
      <div>Department of Computer Science & Engineering, KSIT Community Project 25BCP308</div>
    </div>
  </div>

  <button class="print-btn" onclick="window.print()">🖨️ Print Poster / Save as PDF</button>
</body>
</html>`;

  fs.writeFileSync('public/dhanvantri-clinic-standee.html', standeeHtml);

  // Copy to artifacts directory
  const artifactDir = 'C:\\Users\\mohan\\.gemini\\antigravity\\brain\\bb91ba91-2830-4c11-99db-09b86c8f66ab';
  if (fs.existsSync(artifactDir)) {
    fs.copyFileSync('public/dhanvantri-instant-token-qr.png', path.join(artifactDir, 'dhanvantri-instant-token-qr.png'));
    fs.copyFileSync('public/dhanvantri-instant-token-qr.svg', path.join(artifactDir, 'dhanvantri-instant-token-qr.svg'));
    fs.copyFileSync('public/dhanvantri-clinic-standee.html', path.join(artifactDir, 'dhanvantri-clinic-standee.html'));
  }

  console.log('SUCCESS: Generated QR PNG, SVG, and Standee HTML.');
}

generate().catch(console.error);
