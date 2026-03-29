const fs = require('fs');
const text = fs.readFileSync('src/pages/identity/directory/UsersListTable.tsx', 'utf-8');

const mMatch = text.match(/(<div className=\{styles\.mobileCards\}>[\s\S]*?)<\/div>\s*\{\/\*(.*?)Desktop/);
if (mMatch) {
  fs.writeFileSync('extracted_mobile.txt', mMatch[1] + '</div>', 'utf-8');
  console.log('mobile length:', mMatch[1].length);
} else {
  console.log('no mobile match');
}

const dMatch = text.match(/(<div className="desktop-only">[\s\S]*?)<\/div>\s*<\/div>\s*\)\s*;\s*\}/);
if (dMatch) {
  fs.writeFileSync('extracted_desktop.txt', dMatch[1] + '</div>', 'utf-8');
  console.log('desktop length:', dMatch[1].length);
} else {
  console.log('no desktop match');
}
