import axios from 'axios';

const payload = {
    "productId": "001",
    "firstName": "Gago",
    "lastName": "Pighosyan",
    "passport": "AP0608436",
    "ssn": "1702920925",
    "phone": "091881088",
    "email": "test@test.test",
    "address": "string",
    "requestedAmount": 500000,
    "requestedTenure": 12,
    "passportScan": "https://service-didit-verification-production-a1c5f9b8.s3.amazonaws.com/ocr/5af2e9ef-e955-4d85-b6b5-8839ef522511-portrait_image.jpg",
    "selfieData": "https://service-didit-verification-production-a1c5f9b8.s3.amazonaws.com/ocr/5af2e9ef-e955-4d85-b6b5-8839ef522511-front_image.jpg",
    "livenessData": {
        "applicationId": "PREVIEW-MODE",
        "timestamp": "2026-02-24T18:25:43.888Z",
        "loanRequest": {
            "amount": 100000,
            "currency": "AMD",
            "type": "PERSONAL",
            "term": 12
        },
        "applicant": {
            "id": "27956770-f574-417f-beca-504602b8f9f2",
            "email": "shahenmin@gmail.com",
            "mobileNumber": "+37455600090",
            "ssn": "3107880639",
            "firstName": "",
            "lastName": "",
            "idDocument": {
                "type": "",
                "number": "",
                "issuedBy": "",
                "dateIssued": "",
                "dateExpires": "",
                "country": ""
            }
        },
        "kyc": {
            "sessionId": "5af2e9ef-e955-4d85-b6b5-8839ef522511",
            "status": "verified"
        },
        "questionnaire": {
            "salary": "500,000+ AMD",
            "creditHistory": "24 months +",
            "unpledgedLoans": "2,000,000 AMD +",
            "overdueDays": "≤ 10"
        }
    }
};

async function run() {
    try {
        const response = await axios.post('http://localhost:5000/api/external/applications', payload, {
            headers: { 'x-api-key': 'sk_test_partner_123456789' } // Bypass actual auth issues locally, assuming local db has this
        });
        console.log('SUCCESS:', response.data);
    } catch (e) {
        console.log('ERROR STATUS:', e.response?.status);
        console.log('ERROR DATA:', e.response?.data);
    }
}
run();
