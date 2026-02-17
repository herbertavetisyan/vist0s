const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const ADMIN_EMAIL = 'hebo@mail.com';
const ADMIN_PASSWORD = '1111';

async function runVerification() {
    try {
        console.log('--- Starting Partner Payload Verification ---');

        // 1. Login as Admin
        console.log('\nNO. 1: Logging in as Admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        const token = loginRes.data.token;
        console.log('✅ Admin Logged In.');

        // 2. Create Partner
        console.log('\nNO. 2: Creating New Partner...');
        const partnerName = `Partner_${Date.now()}`;
        const createRes = await axios.post(
            `${API_URL}/admin/partners`,
            { name: partnerName },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const { id, apiKey } = createRes.data;
        console.log(`✅ Partner Created. API Key: ${apiKey}`);

        // 3. Submit New Nested Payload
        console.log('\nNO. 3: Submitting Nested Payload...');
        const applicationId = `EXT_${Date.now()}`;

        const payload = {
            applicationId: applicationId,
            timestamp: new Date().toISOString(),
            loanRequest: {
                amount: 100000,
                currency: "AMD",
                type: "PERSONAL",
                term: 12
            },
            applicant: {
                id: "uuid-123",
                email: `user_${Date.now()}@example.com`,
                mobileNumber: "+37499123456",
                ssn: `ID_${Date.now()}`,
                firstName: "John",
                lastName: "Doe",
                firstNameNonLatin: "Ջոն",
                lastNameNonLatin: "Դո",
                birthDate: "1990-01-01",
                gender: "MALE"
            },
            kyc: {
                sessionId: "kyc-session-123",
                status: "Verified",
                images: {
                    selfie: "base64_selfie_data",
                    documentFront: "base64_front_data",
                    documentBack: "base64_back_data"
                }
            },
            questionnaire: {
                employmentStatus: "EMPLOYED",
                monthlyIncome: 500000
            }
        };

        const submitRes = await axios.post(
            `${API_URL}/partners/applications`,
            payload,
            { headers: { 'x-api-key': apiKey } }
        );

        console.log('✅ Submission Successful.');
        console.log('Response:', submitRes.data);

        if (submitRes.data.status !== 'ENRICHING') {
            throw new Error(`Expected status ENRICHING, got ${submitRes.data.status}`);
        }

        console.log('\n--- Verification Completed Successfully! 🚀 ---');

        // Cleanup
        await axios.delete(`${API_URL}/admin/partners/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

    } catch (error) {
        console.error('\n❌ Verification Failed:', error.message);
        if (error.response) console.error(error.response.data);
    }
}

runVerification();
