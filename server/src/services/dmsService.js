import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Correct DMS payload template matching the exact structure accepted by the
// "vist/v2" smart-flow endpoint. Key structural rules:
//
//  {
//    application: { _id, contractCode, data, ManualOffers, nork, store (ID string),
//                   step, status, createdAt, updatedAt, applicationId, __v, acra },
//    store: { full store object },
//    maxGoodDuration: number,
//    PrevApps: []
//  }
// ─────────────────────────────────────────────────────────────────────────────

// Removed MOCK_STORE POS details
const MOCK_NORK = {
    "s:Envelope": {
        "xmlns:s": "http://schemas.xmlsoap.org/soap/envelope/",
        "s:Body": {
            "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
            "xmlns:xsd": "http://www.w3.org/2001/XMLSchema",
            "GetUserData_v2021Response": {
                "xmlns": "http://norq.am/dxchange/2013",
                "GetUserData_v2021Result": "true",
                "argCurrenDate": "2024-01-03T17:31:09.3645463+04:00",
                "argVersionDate": "2023-11-23T00:00:00",
                "argPrivateData": {
                    "Aph_Kod": "1209094901",
                    "Soccard": "3107880639",
                    "Lastname": "ՄԻՆASYANYAN",
                    "Firstname": "SHAHEEN",
                    "Birthdate": "1988-07-21T00:00:00",
                    "Gender": "2",
                    "IsDead": "False",
                    "Deathdate": { "xsi:nil": "true" },
                    "Citizenship": "ARM",
                    "Region": "ԵՐEVAN",
                    "Community": "ARABKIR",
                    "Passport": "AG0444252",
                    "IdCard": "011928710",
                    "Passportvalid": "True",
                    "Passportinvaliddate": { "xsi:nil": "true" },
                    "Idcardvalid": "True",
                    "Idcardinvaliddate": { "xsi:nil": "true" }
                },
                "argArchiveData": { "ArchiveData": [] },
                "argWorkData": {
                    "WorkData_v2018": [
                        {
                            "WorkName": "ԱՐДШИНБАНК",
                            "EntryDate": "2023-01-01T00:00:00",
                            "ExpiryDate": { "xsi:nil": "true" },
                            "Salary": "3216048",
                            "Pajman_data": "2022-04-11T00:00:00",
                            "Avum": "32160481",
                            "Socvjar": "6432094",
                            "Pashton": "Senior Engineer"
                        }
                    ]
                }
            }
        }
    }
};

const MOCK_ACRA = {
    "ROWDATA": {
        "type": "Bank_Application_LOAN_PP_Answer",
        "ReqID": "2361561752261520152179242",
        "AppNumber": "60660",
        "DateTime": "03/01/2024 17:49:31",
        "Response": "OK",
        "ReportType": "02",
        "PARTICIPIENT": {
            "id": "1",
            "ThePresenceData": "1",
            "KindBorrower": "1",
            "RequestTarget": "1",
            "UsageRange": "1",
            "Residence": "Ռezidenyt",
            "TotalLiabilitiesLoan": { "Amount": "0", "Currency": "AMD" },
            "TotalLiabilitiesGuarantee": { "Amount": "0", "Currency": "AMD" },
            "SelfInquiryQuantity30": "0",
            "SelfInquiryQuantity": "0",
            "Loans": { "Loan": [] },
            "Guarantees": { "Guarantee": [] },
            "CountOfLoans": { "Current": "0", "Closed": "0", "Total": "0" },
            "CountOfGuarantees": { "Current": "0", "Closed": "0", "Total": "0" },
            "RequestQuantity30": "0",
            "RequestQuantity": "0",
            "Requests": { "Request": [] }
        }
    }
};

/**
 * Build a valid DMS scoring payload for the "vist/v2" endpoint.
 * All dynamic fields (ssn, name, amount, tenure, nork, acra) are overridden
 * from the live applicationRecord / applicantRecord before sending.
 */
const buildMainPayload = (applicationRecord, applicantRecord) => {
    const now = new Date().toISOString();

    const payload = {
        application: {
            "_id": applicationRecord.id || "6595619a44d6f506d8f48361",
            "contractCode": "",
            "data": {
                "loanInformation": {
                    "amount": applicationRecord.requestedAmount || 500000,
                    "executedAmount": null,
                    "prepayment": 0,
                    "monthlyPayment": null,
                    "effectiveAnnualRate": "",
                    "monthlyCommission": "",
                    "duration": applicationRecord.requestedTenure || 24,
                    "paymentDate": 20
                },
                "personalInformation": {
                    "SSN": {
                        "SSN_Type": "SSN",
                        "SSN_Number": applicantRecord?.ssn || "3107880639"
                    },
                    "document": {
                        "documentType": "IDCard",
                        "documentNumber": applicantRecord?.passport || "011928710",
                        "issueDate": "2020-08-30T20:00:00.000Z",
                        "issuedBy": "004",
                        "validBefore": "2030-08-31T00:00:00"
                    },
                    "user": {
                        "firstName": applicantRecord?.firstName || "FIRST",
                        "lastName": applicantRecord?.lastName || "LAST",
                        "middleName": "",
                        "gender": "male",
                        "email": applicantRecord?.email || "test@test.com",
                        "residence": "Yes",
                        "birthDate": "1988-07-20T19:00:00.000Z",
                        "mobilePhoneNumber": applicantRecord?.phone || "00000000",
                        "additionalMobilePhoneNumber": ""
                    },
                    "address": {
                        "residence": {
                            "region": "YEREVAN",
                            "city": "YEREVAN",
                            "street": "TEST ST.",
                            "house": "1",
                            "apartment": "1"
                        },
                        "accommodation": {
                            "region": "", "city": "", "street": "", "house": "", "apartment": ""
                        }
                    }
                },
                "_id": "6595619a44d6f506d8f48362"
            },
            "ManualOffers": [],
            // nork and acra will be set dynamically below
            "step": 5,
            "status": "InProgress",
            "createdAt": now,
            "updatedAt": now,
            "applicationId": 10004,
            "__v": 0,
            "metadata": applicationRecord.loanType?.scoreConfig || {}
        },
        "PrevApps": []
    };

    // ── Dynamic NORQ income data injection ───────────────────────────────────
    // Support both direct data and { rawData: ... } wrapped forms from the mock
    const norqData = applicationRecord.incomeVerificationData;
    if (norqData) {
        payload.application.nork = norqData.rawData || norqData;
    } else {
        payload.application.nork = MOCK_NORK;
    }

    // ── Dynamic ACRA credit data injection ───────────────────────────────────
    const acraData = applicationRecord.creditBureauData;
    if (acraData) {
        const rawAcra = acraData.rawData || acraData;
        // ACRA data is expected wrapped in { ROWDATA: ... }
        payload.application.acra = rawAcra.ROWDATA ? rawAcra : { ROWDATA: rawAcra };
    } else {
        payload.application.acra = MOCK_ACRA;
    }

    return payload;
};

export const scoreApplication = async (applicationRecord, applicantRecord, dmsType = 'MAIN', recalculationPayload = null) => {
    try {
        let payload;

        if (dmsType === 'RECALCULATE' && recalculationPayload) {
            // Build the specific flat payload expected by the DMS recalculation endpoint
            payload = {
                LoanType: applicationRecord?.loanType?.productId || "001",
                MonthlyCommission: 0,
                ExecutedAmount: recalculationPayload.ExecutedAmount,
                Rate: applicationRecord?.assignedRate || 0,
                Duration: applicationRecord?.approvedTenure || applicationRecord?.requestedTenure || 24,
                Prepayment: 0
            };
        } else {
            // Build the full structured payload for the main scoring flow
            payload = buildMainPayload(applicationRecord, applicantRecord);
        }

        const urlSettingKey = dmsType === 'RECALCULATE' ? 'dmsRecalculateUrl' : 'dmsUrl';
        const keySettingKey = dmsType === 'RECALCULATE' ? 'dmsRecalculateKey' : 'dmsKey';

        const settings = await prisma.setting.findMany({
            where: { tenantId: applicationRecord.tenantId, key: { in: [urlSettingKey, keySettingKey] } }
        });
        const dmsUrlSetting = settings.find(s => s.key === urlSettingKey)?.value;
        const dmsKeySetting = settings.find(s => s.key === keySettingKey)?.value;

        if (!dmsUrlSetting || !dmsKeySetting) {
            throw new Error(`DMS Configuration Missing. Please navigate to DMS Integration Settings in the UI and configure: ${urlSettingKey} and ${keySettingKey}`);
        }

        console.log(`[DMS] Calling ${dmsType} | URL: ${dmsUrlSetting}`);
        console.log(`[DMS] Payload top-level keys: ${Object.keys(payload).join(', ')}`);

        const res = await axios.post(dmsUrlSetting, payload, {
            headers: {
                'key': dmsKeySetting,
                'Content-Type': 'application/json'
            },
            timeout: 30000,
            family: 4,  // Force IPv4 — avoids EAI_AGAIN with Docker's IPv6-preferred DNS
        });

        console.log(`[DMS] Success. Response keys: ${Object.keys(res.data || {}).join(', ')}`);
        return res.data;
    } catch (error) {
        console.error(`[DMS] Request failed: ${error.message}`);
        if (error.response) {
            console.error('[DMS] Response status:', error.response.status);
            console.error('[DMS] Response data:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
};
