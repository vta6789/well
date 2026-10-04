const { readdirSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
for (const file of readdirSync('frontend').filter(file => file.endsWith('.js'))) {
  execFileSync(process.execPath, ['--check', `frontend/${file}`], { stdio: 'inherit' });
}
console.log('All frontend scripts parse successfully.');
