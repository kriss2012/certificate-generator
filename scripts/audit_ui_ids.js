const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const js = fs.readFileSync('public/js/app.js', 'utf8');

const idRegex = /id=["']([^"']+)["']/g;
let match;
const allIds = [];
while ((match = idRegex.exec(html)) !== null) {
  allIds.push(match[1]);
}

const unreferenced = allIds.filter(id => !js.includes(id));
console.log('Total HTML IDs:', allIds.length);
console.log('Unreferenced IDs:', unreferenced);
