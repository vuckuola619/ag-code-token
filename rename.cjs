const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    if (file.includes('node_modules') || file.includes('.git')) return;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (/\.(js|html|md|yml|env|json)$/.test(file)) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('.');

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  // Replacements
  content = content.replace(/AG-Code Token Tracker/gi, 'Wasted Token Tracker');
  content = content.replace(/AG-Code Token/gi, 'Wasted Token Tracker');
  content = content.replace(/AG Token Tracker/gi, 'Wasted Token Tracker');
  content = content.replace(/ag-code-token/gi, 'wasted-token-tracker');
  content = content.replace(/ag-token/gi, 'wasted-token');
  content = content.replace(/AG-Token/gi, 'Wasted Token');
  content = content.replace(/AG_TOKEN/g, 'WASTED_TOKEN');

  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Updated', f);
  }
});
