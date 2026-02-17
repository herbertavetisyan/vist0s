const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const ADMIN_EMAIL = 'hebo@mail.com';
const ADMIN_PASSWORD = '1111';

async function runVerification() {
    try {
        console.log('--- Starting Partner Flow Verification ---');

        // 1. Login as Admin
        console.log('\nNO. 1: Logging in as Admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        const token = loginRes.data.token;
        console.log('✅ Admin Logged In. Token received.');

        // 2. Create Partner
        console.log('\nNO. 2: Creating New Partner...');
        const partnerName = `Test Partner ${Date.now()}`;
        const createRes = await axios.post(
            `${API_URL}/admin/partners`,
            { name: partnerName },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const { id, apiKey: originalKey, appId } = createRes.data;
        console.log(`✅ Partner Created: ${partnerName} (ID: ${id})`);
        console.log(`   App ID: ${appId}`);
        console.log(`   API Key: ${originalKey}`);

        // 3. Test Partner API with Original Key
        console.log('\nNO. 3: Testing Partner Application Submission (Original Key)...');
        try {
            await axios.post(
                `${API_URL}/partners/applications`,
                {
                    amountRequested: 500000,
                    currency: "AMD",
                    termRequested: 12,
                    purpose: "Test Loan",
                    applicant: {
                        nationalId: `ID${Date.now()}`,
                        firstName: "Test",
                        lastName: "User",
                        dateOfBirth: "1990-01-01",
                        type: "INDIVIDUAL" // Ensure this matches schema/enum
                    }
                },
                { headers: { 'x-api-key': originalKey } }
            );
            console.log('✅ Submission Successful with Original Key.');
        } catch (error) {
            console.error('❌ Submission Failed:', error.response?.data || error.message);
            process.exit(1);
        }

        // 4. Rotate Key
        console.log('\nNO. 4: Rotating API Key...');
        const rotateRes = await axios.put(
            `${API_URL}/admin/partners/${id}/rotate-key`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const newKey = rotateRes.data.apiKey;
        console.log('✅ Key Rotated.');
        console.log(`   New Key: ${newKey}`);

        if (originalKey === newKey) {
            console.error('❌ Error: Key did not change!');
            process.exit(1);
        }

        // 5. Test Old Key (Should Fail)
        console.log('\nNO. 5: Testing Old Key (Should Fail)...');
        try {
            await axios.post(
                `${API_URL}/partners/applications`,
                { amountRequested: 1000 }, // Minimal body
                { headers: { 'x-api-key': originalKey } }
            );
            console.error('❌ Error: Old key still works!');
            process.exit(1);
        } catch (error) {
            if (error.response?.status === 403 || error.response?.status === 401) {
                console.log('✅ Old key rejected as expected.');
            } else {
                console.error(`❌ Unexpected error: ${error.message}`);
            }
        }

        // 6. Test New Key (Should Success)
        console.log('\nNO. 6: Testing New Key (Should Success)...');
        try {
            await axios.post(
                `${API_URL}/partners/applications`,
                {
                    amountRequested: 500000,
                    currency: "AMD",
                    termRequested: 12,
                    purpose: "Test Loan 2",
                    applicant: {
                        nationalId: `ID${Date.now()}2`,
                        firstName: "Test",
                        lastName: "User",
                        dateOfBirth: "1990-01-01",
                        type: "INDIVIDUAL"
                    }
                },
                { headers: { 'x-api-key': newKey } }
            );
            console.log('✅ Submission Successful with New Key.');
        } catch (error) {
            console.error('❌ Submission Failed with New Key:', error.response?.data || error.message);
            process.exit(1);
        }

        // 7. Cleanup (Optional, but good for repeatability)
        console.log('\nNO. 7: Cleaning up (Deleting Partner)...');
        await axios.delete(
            `${API_URL}/admin/partners/${id}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('✅ Partner Deleted.');

        console.log('\n--- Verification Completed Successfully! 🚀 ---');

    } catch (error) {
        console.error('\n❌ Verification Failed:', error.message);
        console.error(error.response?.data);
    }
}

runVerification();
