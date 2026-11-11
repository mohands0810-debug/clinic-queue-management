const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const targetUrl = 'https://clinic-queue-management-theta.vercel.app/instant-token';

async function generate() {
  // 1. High-resolution standalone QR code PNG
  await QRCode.toFile('public/dhanvantri-instant-token-qr.png', targetUrl, {
    width: 1024,
    margin: 2,
    color: {
      dark: '#0F4C81', // Clinical Deep Blue
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H'
  });

  // Also standalone SVG
  await QRCode.toFile('public/dhanvantri-instant-token-qr.svg', targetUrl, {
    type: 'svg',
    margin: 2,
    color: {
      dark: '#0F4C81',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H'
  });

  console.log('Generated public/dhanvantri-instant-token-qr.png and .svg');
}

generate().catch(console.error);

