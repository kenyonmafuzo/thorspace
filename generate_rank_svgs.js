#!/usr/bin/env node
/**
 * Gera placeholders SVG para ranks (fallback se PNG não existir)
 */

const fs = require('fs');
const path = require('path');

const TIERS = ["rookie", "veteran", "elite", "pro", "master", "grandmaster", "legendary"];
const MATERIALS = ["bronze", "silver", "gold"];
const COLORS = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700"
};

const OUTPUT_DIR = path.join(__dirname, 'public', 'images', 'ranks');

// Criar diretórios
TIERS.forEach(tier => {
  const dir = path.join(OUTPUT_DIR, tier);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Gerar SVG placeholders
TIERS.forEach(tier => {
  MATERIALS.forEach(material => {
    const svg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad-${tier}-${material}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${COLORS[material]};stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:${COLORS[material]};stop-opacity:0.6" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="256" cy="256" r="220" fill="url(#grad-${tier}-${material})" stroke="#fff" stroke-width="8"/>
  
  <!-- Inner circle -->
  <circle cx="256" cy="256" r="180" fill="none" stroke="#fff" stroke-width="3" opacity="0.5"/>
  
  <!-- Tier text -->
  <text x="256" y="220" font-family="Arial, sans-serif" font-size="48" font-weight="bold" 
        fill="#fff" text-anchor="middle" style="text-transform: uppercase;">${tier}</text>
  
  <!-- Material text -->
  <text x="256" y="280" font-family="Arial, sans-serif" font-size="36" 
        fill="#fff" text-anchor="middle" opacity="0.9" style="text-transform: capitalize;">${material}</text>
  
  <!-- Border decoration -->
  <circle cx="256" cy="256" r="235" fill="none" stroke="#fff" stroke-width="2" opacity="0.3"/>
</svg>`;

    const filename = path.join(OUTPUT_DIR, tier, `${tier}_${material}.svg`);
    fs.writeFileSync(filename, svg);
    console.log(`✓ ${tier}/${tier}_${material}.svg`);
  });
});

console.log(`\n✅ ${TIERS.length * MATERIALS.length} SVG placeholders criados!`);
console.log('\nCONVERTER PARA PNG (use ImageMagick ou online converter):');
console.log('for f in public/images/ranks/*/*.svg; do');
console.log('  convert "$f" "${f%.svg}.png"');
console.log('done');
