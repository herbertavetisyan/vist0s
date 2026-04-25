import { mockEkengVerify } from './src/services/integrationMockService.js';

async function test() {
    try {
        console.log("Testing SSN passed as string `1702920925`");
        const res1 = await mockEkengVerify('John', 'Doe', undefined, '1702920925', '001');
        console.log("Success:", !!res1);
    } catch (e) {
        console.error("Test 1 Failed:", e.message);
    }
}

test();
