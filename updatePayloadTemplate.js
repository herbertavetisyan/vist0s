const fs = require('fs');
const filePath = '/home/hebo/vistOs/server/src/services/dmsService.js';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /const PAYLOAD_TEMPLATE = (\{.*?\});\n/s;
const match = content.match(regex);

if (match) {
    let payload = JSON.parse(match[1]);
    
    // Delete the extraneous fields
    delete payload.store;
    delete payload.step;
    delete payload.status;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.applicationId;
    delete payload.__v;
    
    let newPayloadStr = JSON.stringify(payload);
    let newContent = content.replace(regex, `const PAYLOAD_TEMPLATE = ${newPayloadStr};\n`);
    
    fs.writeFileSync(filePath, newContent);
    console.log("Updated PAYLOAD_TEMPLATE successfully.");
} else {
    console.log("Could not find PAYLOAD_TEMPLATE.");
}

