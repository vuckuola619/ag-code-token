const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('**/*.{js,html,md,yml,env,json}', { ignore: ['node_modules/**', '.git/**'] });

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  // Replacements
  content = content.replace(/Wasted Token Tracker/gi, 'Wasted Token Tracker');
  content = content.replace(/Wasted Token Tracker/gi, 'Wasted Token Tracker');
  content = content.replace(/Wasted Token Tracker/gi, 'Wasted Token Tracker');
  content = content.replace(/wasted-token-tracker/gi, 'wasted-token-tracker');
  content = content.replace(/wasted-token/gi, 'wasted-token');
  content = content.replace(/wasted-token/gi, 'Wasted Token');
  content = content.replace(/WASTED_TOKEN/g, 'WASTED_TOKEN');

  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Updated', f);
  }
});
