const fs = require('fs');
const path = require('path');
const sharp = require('C:/Users/DELL/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');

const outDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Regular icon SVG (saffron radial gradient, golden Devanagari श्री, pure veg green leaf badge)
const createIconSvg = (size, isMaskable = false) => {
  const padding = isMaskable ? size * 0.12 : 0;
  const innerSize = size - padding * 2;
  const rx = isMaskable ? 0 : size * 0.22;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ea580c"/>
      <stop offset="50%" stop-color="#c2410c"/>
      <stop offset="100%" stop-color="#7c2d12"/>
    </linearGradient>
    <radialGradient id="goldGlow" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#ea580c" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="goldText" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#facc15"/>
    </linearGradient>
  </defs>

  <!-- Background tile -->
  <rect x="0" y="0" width="${size}" height="${size}" rx="${rx}" fill="url(#bgGrad)"/>
  <rect x="0" y="0" width="${size}" height="${size}" rx="${rx}" fill="url(#goldGlow)"/>

  <!-- Gold border for non-maskable -->
  ${!isMaskable ? `<rect x="${size * 0.04}" y="${size * 0.04}" width="${size * 0.92}" height="${size * 0.92}" rx="${rx * 0.85}" fill="none" stroke="#facc15" stroke-width="${size * 0.02}" stroke-opacity="0.4"/>` : ''}

  <!-- Center Devanagari 'श्री' glyph -->
  <g transform="translate(${size / 2}, ${size * 0.52})">
    <text text-anchor="middle" dominant-baseline="middle" font-family="'Noto Sans Devanagari', 'Segoe UI', Arial, sans-serif" font-weight="900" font-size="${innerSize * 0.48}" fill="url(#goldText)" filter="drop-shadow(0px ${size * 0.02}px ${size * 0.03}px rgba(0,0,0,0.5))">श्री</text>
  </g>

  <!-- Subtitle badge: Pure Veg dot in square -->
  <g transform="translate(${size / 2 - size * 0.22}, ${size * 0.78})">
    <rect width="${size * 0.44}" height="${size * 0.11}" rx="${size * 0.055}" fill="#166534" fill-opacity="0.95" stroke="#4ade80" stroke-width="${size * 0.01}"/>
    <circle cx="${size * 0.06}" cy="${size * 0.055}" r="${size * 0.025}" fill="#4ade80"/>
    <text x="${size * 0.12}" y="${size * 0.075}" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="${size * 0.045}" fill="#ffffff" letter-spacing="1">STAFF</text>
  </g>
</svg>
`;
};

// 2. Monochrome badge for notification status bar
const createBadgeSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.46}" fill="#ea580c"/>
  <text x="${size / 2}" y="${size * 0.62}" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="${size * 0.55}" fill="#ffffff">श्री</text>
</svg>
`;

async function generate() {
  console.log('Generating PWA Icons...');

  // SVG files
  fs.writeFileSync(path.join(outDir, 'icon.svg'), createIconSvg(512, false).trim());

  // PNG files
  await sharp(Buffer.from(createIconSvg(512, false)))
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, 'icon-512.png'));

  await sharp(Buffer.from(createIconSvg(512, true)))
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, 'icon-maskable.png'));

  await sharp(Buffer.from(createIconSvg(192, false)))
    .resize(192, 192)
    .png()
    .toFile(path.join(outDir, 'icon-192.png'));

  await sharp(Buffer.from(createIconSvg(180, false)))
    .resize(180, 180)
    .png()
    .toFile(path.join(outDir, 'apple-touch-icon.png'));

  await sharp(Buffer.from(createBadgeSvg(72)))
    .resize(72, 72)
    .png()
    .toFile(path.join(outDir, 'badge-72.png'));

  // Also write to public/apple-touch-icon.png and public/favicon.ico
  fs.copyFileSync(path.join(outDir, 'apple-touch-icon.png'), path.join(__dirname, '../public/apple-touch-icon.png'));
  fs.copyFileSync(path.join(outDir, 'icon-192.png'), path.join(__dirname, '../public/favicon.ico'));

  console.log('All PWA icons generated successfully!');
}

generate().catch(console.error);
