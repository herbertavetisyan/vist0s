const fs = require('fs');
const filePath = '/home/hebo/vistOs/server/src/services/dmsService.js';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /const PAYLOAD_TEMPLATE = (\{[\s\S]*?\});\n/m;
const match = content.match(regex);
if (match) {
    try {
        let payload = JSON.parse(match[1]);
        delete payload.store;
        delete payload.step;
        delete payload.status;
        delete payload.createdAt;
        delete payload.updatedAt;
        delete payload.applicationId;
        delete payload.__v;
        
        // Remove PrevApps completely just in case the new Smart flow engine rejects it too
        delete payload.PrevApps;

        content = content.replace(match[0], `const PAYLOAD_TEMPLATE = ${JSON.stringify(payload)};\n`);
        fs.writeFileSync(filePath, content);
        console.log("SUCCESS");
    } catch (e) {
        console.log("JSON Parse err:", e.message);
    }
} else {
    console.log("Regex failed.");
}
