const axios = require('axios');

const fixedId = "TEST_DUP_" + Date.now();

const payload1 = {
    "applicationId": fixedId,
    "timestamp": new Date().toISOString(),
    "loanRequest": {
        "amount": 100000,
        "currency": "AMD",
        "type": "PERSONAL",
        "term": 12
    },
    "applicant": {
        "id": "uuid-applicant-1",
        "email": "user1@example.com",
        "mobileNumber": "+37499123456",
        "ssn": "SSN_1",
        "firstName": "John",
        "lastName": "Doe",
        "firstNameNonLatin": "Ջոն",
        "lastNameNonLatin": "Դո",
        "birthDate": "1990-01-01",
        "gender": "MALE"
    },
    "kyc": { "status": "Verified" },
    "questionnaire": {}
};

const payloadInvalidDate = {
    "applicationId": "TEST_DATE_" + Date.now(),
    "timestamp": new Date().toISOString(),
    "loanRequest": { "amount": 100000, "currency": "AMD", "type": "PERSONAL", "term": 12 },
    "applicant": {
        "id": "uuid-applicant-2",
        "email": "user2@example.com",
        "mobileNumber": "+37499123456",
        "ssn": "SSN_2",
        "firstName": "Jane",
        "lastName": "Doe",
        "birthDate": "INVALID-DATE-STRING", // <--- Trigger Invalid Date
        "gender": "FEMALE"
    },
    "kyc": {},
    "questionnaire": {}
};

async function run() {
    try {
        // Authenticate
        const login = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'hebo@mail.com', password: '1111'
        });
        const token = login.data.token;

        // Get Partner Key (create new one)
        const partner = await axios.post('http://localhost:3000/api/admin/partners',
            { name: 'Repro Partner ' + Date.now() },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const apiKey = partner.data.apiKey;
        console.log('Got API Key:', apiKey);

        // Test 1: Success
        console.log('\nTest 1: Normal Request (Should 201)');
        await axios.post('http://localhost:3000/api/partners/applications', payload1, {
            headers: { 'x-api-key': apiKey }
        });
        console.log('✅ Success');

        // Test 2: Duplicate (Should Fail)
        console.log('\nTest 2: Duplicate Request (Should Fail)');
        try {
            await axios.post('http://localhost:3000/api/partners/applications', payload1, {
                headers: { 'x-api-key': apiKey }
            });
            console.log('❌ Unexpected Success on Duplicate');
        } catch (e) {
            console.log('✅ Failed as expected:', e.response?.status, e.response?.data);
        }

        // Test 3: Invalid Date (Should Fail)
        console.log('\nTest 3: Invalid Date (Should Fail)');
        try {
            await axios.post('http://localhost:3000/api/partners/applications', payloadInvalidDate, {
                headers: { 'x-api-key': apiKey }
            });
            console.log('❌ Unexpected Success on Invalid Date');
        } catch (e) {
            console.log('✅ Failed as expected:', e.response?.status, e.response?.data);
        }

    } catch (e) {
        console.error('Script Error:', e.response ? e.response.data : e.message);
    }
}

run();
