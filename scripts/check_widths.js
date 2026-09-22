const fs = require('fs');
const content = fs.readFileSync('public/index.html', 'utf8');
const regex = /style="([^"]+)"/g;
let match;
while ((match = regex.exec(content)) !== null) {
  const s = match[1];
  if (s.includes('width') || s.includes('min-width') || s.includes('flex')) {
    console.log(s);
  }
}
