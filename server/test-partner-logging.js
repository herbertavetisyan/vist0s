import axios from 'axios';

const API_URL = 'http://localhost:5000/api/external/applications';
const API_KEY = 'test_partner_secret_key_123'; // Make sure this matches a DB Partner key or use a valid one from DB. 
// For this test, to just trigger the logger regardless of auth passing perfectly, we'll try it.

async function testLogging() {
    console.log('--- Starting Partner API Logging Test ---');

    console.log('\n1. Testing Invalid Request (Missing Fields) -> Should trigger a 400 and a Winston warning log');
    try {
        await axios.post(API_URL, {
            firstName: "John" // Missing productId, passport, etc.
        }, {
            headers: { 'x-api-key': API_KEY }
        });
    } catch (err) {
        console.log(`Received expected error status: ${err.response?.status}`);
    }

    console.log('\n2. Testing Valid Request -> Should trigger a 201 and Winston info logs');
    try {
        await axios.post(API_URL, {
            productId: "P001",
            passport: "A12345678",
            firstName: "Jane",
            lastName: "Doe",
            phone: "+1234567890",
            email: "jane@example.com",
            ssn: "123-456-7890", // Should be redacted in logs
            livenessData: { secretBiometrics: true, confidence: 0.99 } // Should be redacted
        }, {
            headers: { 'x-api-key': API_KEY }
        });
        console.log('Request successful!');
    } catch (err) {
        console.log(`Received error (expected if DB doesn't have P001 or Key is invalid): ${err.response?.data?.error || err.message}`);
    }

    console.log('\n--- Check /server/logs directory for partner-api-YYYY-MM-DD.log and error-YYYY-MM-DD.log ---');
}

testLogging();
