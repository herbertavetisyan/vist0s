const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    console.log('🚀 Starting Loan Lifecycle Test...');

    try {
        // 1. Submit Application
        console.log('\nStep 1: Submitting Application...');
        const submitRes = await axios.post(`${API_BASE}/applications`, {
            nationalId: `ID-${Date.now()}`,
            phone: '+37499123456',
            email: 'test@example.com',
            amountRequested: 500000,
            termRequested: 24,
            productTypeId: 1
        });
        const applicationId = submitRes.data.applicationId;
        console.log(`✅ Application submitted. ID: ${applicationId}`);

        // 2. Poll for Status (Wait for OFFER_READY)
        console.log('\nStep 2: Waiting for Scoring...');
        let application;
        for (let i = 0; i < 15; i++) {
            const offerRes = await axios.get(`${API_BASE}/applications/${applicationId}/offer`);
            application = offerRes.data;
            console.log(`Current Status: ${application.status}`);
            if (application.status === 'OFFER_READY' || application.status === 'REJECTED') break;
            await delay(2000);
        }

        if (application.status !== 'OFFER_READY') {
            throw new Error(`Scoring failed or unexpected status: ${application.status}`);
        }
        console.log(`✅ Offer Ready: ${application.approvedLimit} ${application.currency}`);

        // 3. Selection
        console.log('\nStep 3: Selecting Offer...');
        await axios.post(`${API_BASE}/applications/${applicationId}/selection`, {
            selectedAmount: application.approvedLimit,
            selectedTerm: application.approvedTerm
        });
        console.log('✅ Offer selected.');

        // 4. Fetch Agreement
        console.log('\nStep 4: Fetching Agreement...');
        const agreementRes = await axios.get(`${API_BASE}/applications/${applicationId}/agreement`);
        console.log(`✅ Agreement fetched. Size: ${agreementRes.data.length} bytes`);

        // 5. Signing
        console.log('\nStep 5: Signing Document...');
        await axios.post(`${API_BASE}/applications/${applicationId}/signing`);
        console.log('✅ Document signed.');

        // 6. OTP Request
        console.log('\nStep 6: Requesting OTP...');
        const otpReqRes = await axios.post(`${API_BASE}/applications/${applicationId}/otp-request`);
        const mockCode = otpReqRes.data._mock_code;
        console.log(`✅ OTP requested. Mock Code: ${mockCode}`);

        // 7. OTP Verify
        console.log('\nStep 7: Verifying OTP...');
        await axios.post(`${API_BASE}/applications/${applicationId}/otp-verify`, { code: mockCode });
        console.log('✅ OTP verified.');

        // 8. Disbursement Details
        console.log('\nStep 8: Providing Disbursement Details...');
        await axios.post(`${API_BASE}/applications/${applicationId}/disbursement`, {
            bankName: 'Mock Bank',
            accountNumber: 'AM1234567890'
        });
        console.log('✅ Disbursement details saved.');

        // 9. Final Check
        console.log('\nStep 9: Final Status Check...');
        const finalRes = await axios.get(`${API_BASE}/applications/${applicationId}/offer`);
        console.log(`✅ Final Status: ${finalRes.data.status}`);

        console.log('\n✨ Lifecycle Test Completed Successfully!');

    } catch (error) {
        console.error('\n❌ Test Failed:');
        if (error.response) {
            console.error(error.response.data);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

runTest();
