const fs = require('fs');
const dmsServicePath = 'src/services/dmsService.js';
const dmsCode = fs.readFileSync(dmsServicePath, 'utf8');
const lines = dmsCode.split('\n');
const startIdx = lines.findIndex(l => l.includes('const PAYLOAD_TEMPLATE ='));
const endIdx = lines.findIndex((l, i) => i > startIdx && l === '};' && lines[i+1] === '');
const replacement = fs.readFileSync('temp_payload.js', 'utf8').trim();
lines.splice(startIdx, endIdx - startIdx + 1, replacement);
fs.writeFileSync(dmsServicePath, lines.join('\n'));
