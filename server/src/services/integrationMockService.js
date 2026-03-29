// Mock service to simulate external integrations
import crypto from 'crypto';

const NORQ_MOCK_DATA = [
    {
        "argPrivateData": {
            "Soccard": "7102938475",
            "Lastname": "ՀԱԿՈԲՅԱՆ",
            "Firstname": "ԱՐՄԱՆ",
            "Birthdate": "1990-03-15T00:00:00",
            "Citizenship": "ARM",
            "Region": "ԵՐԵՎԱՆ",
            "Community": "ԵՐԵՎԱՆ",
            "Street": "ԿՈՄԻՏԱՍ",
            "Building": "12",
            "Buildingtype": "Շ",
            "Apartment": "45",
            "Passport": "AN0123456",
            "IdCard": "016580946",
            "Biometric": "BA1234567"
        },
        "argWorkData": {
            "WorkData_v2018": [
                {
                    "WorkName": "Tech Solutions LLC",
                    "EntryDate": "2025-01-01T00:00:00",
                    "ExpiryDate": { "xsi:nil": "true" },
                    "Salary": "3500000",
                    "Pashton": "Manager"
                }
            ]
        }
    },
    {
        "argPrivateData": {
            "Soccard": "6102841122",
            "Lastname": "ՊԵՏՐՈՍՅԱՆ",
            "Firstname": "ԳԱԳԻԿ",
            "Birthdate": "1987-07-09T00:00:00",
            "Citizenship": "ARM",
            "Region": "ԵՐԵՎԱՆ",
            "Community": "ԵՐԵՎԱՆ",
            "Street": "ԲԱԳՐԱՏՈՒՆՅԱՑ",
            "Building": "8",
            "Buildingtype": "Շ",
            "Apartment": "19",
            "Passport": "AM0987654",
            "IdCard": "011928710",
            "Biometric": "BA7654321"
        },
        "argWorkData": {
            "WorkData_v2018": [
                {
                    "WorkName": "Digital Core CJSC",
                    "EntryDate": "2024-04-01T00:00:00",
                    "ExpiryDate": { "xsi:nil": "true" },
                    "Salary": "2500000",
                    "Pashton": "CTO"
                }
            ]
        }
    },
    {
        "argPrivateData": {
            "Soccard": "1702920925",
            "Lastname": "ԵՐԻՑՅԱՆ",
            "Firstname": "ԱՆԴՐԱՆԻԿ",
            "Birthdate": "1983-12-11T00:00:00",
            "Citizenship": "ARM",
            "Region": "ԵՐԵՎԱՆ",
            "Community": "ԵՐԵՎԱՆ",
            "Street": "ՄԱՇՏՈՑ",
            "Building": "15",
            "Buildingtype": "Շ",
            "Apartment": "7",
            "Passport": "AP0608436",
            "IdCard": "020347472",
            "Biometric": "BA2681064"
        },
        "argWorkData": {
            "WorkData_v2018": [
                {
                    "WorkName": "Engineering Hub LLC",
                    "EntryDate": "2025-06-01T00:00:00",
                    "ExpiryDate": { "xsi:nil": "true" },
                    "Salary": "2000000",
                    "Pashton": "Software Engineer"
                }
            ]
        }
    }
];

export const mockEkengVerify = async (firstName, lastName, passport, ssn, loanTypeId) => {
    // Simulate API delay
    await new Promise(r => setTimeout(r, 800));

    // 1. Opportunistic lookup: ALWAYS check the mock dataset first.
    const person = NORQ_MOCK_DATA.find(p => {
        const pd = p.argPrivateData;
        return (ssn && pd.Soccard === ssn) ||
            (passport && (pd.Passport === passport || pd.IdCard === passport || pd.Biometric === passport));
    });

    if (person) {
        // Return realistic mock data
        const pd = person.argPrivateData;
        let addressStr = pd.Region;
        if (pd.Community && pd.Community !== pd.Region) addressStr += `, ${pd.Community}`;
        if (pd.Street) addressStr += `, ${pd.Street}`;
        if (pd.Buildingtype && pd.Building) addressStr += ` ${pd.Building}${pd.Buildingtype}`;
        if (pd.Apartment) addressStr += `, ԲՆ. ${pd.Apartment}`;

        return {
            status: 'VERIFIED',
            provider: 'EKENG_NORQ_MOCK',
            timestamp: new Date().toISOString(),
            matchScore: 100,
            data: {
                firstName: pd.Firstname,
                lastName: pd.Lastname,
                passport: pd.Passport,
                idCard: pd.IdCard,
                biometric: pd.Biometric,
                documentNumber: ssn || passport,
                isResident: pd.Citizenship === 'ARM',
                address: addressStr,
                birthDate: pd.Birthdate,
                citizenship: pd.Citizenship
            }
        };
    }

    // 2. Person is NOT in the mock dataset.
    // If strict enforcement is required (loan type '001'), throw an error.
    if (loanTypeId === '001') {
        throw new Error(`Person with document ${passport || ''} or SSN ${ssn || ''} not found in EKENG database.`);
    }

    // 3. Fallback permissive mock data for unknown users (for non-'001' flows)
    return {
        status: 'VERIFIED',
        provider: 'EKENG_NORQ_MOCK',
        timestamp: new Date().toISOString(),
        matchScore: 99,
        data: {
            firstName: firstName || 'John',
            lastName: lastName || 'Doe',
            passport: passport || 'AO0000000',
            idCard: '011111111',
            biometric: 'BA2222222',
            documentNumber: ssn || passport,
            isResident: true,
            address: 'Yerevan, Abovyan St, 1',
            birthDate: '1990-01-01T00:00:00',
            citizenship: 'ARM'
        }
    };
};

export const mockNorqIncome = async (ssn, loanTypeId) => {
    await new Promise(r => setTimeout(r, 1200));

    // 1. Opportunistic lookup: ALWAYS check the mock dataset.
    const person = NORQ_MOCK_DATA.find(p => p.argPrivateData.Soccard === ssn);

    if (person) {
        const workData = person.argWorkData.WorkData_v2018 || [];

        if (workData.length === 0) {
            return {
                status: 'COMPLETED',
                provider: 'NORQ_MOCK',
                averageMonthlySalaryAMD: 0,
                employerName: '',
                employmentStatus: 'INACTIVE',
                monthsEmployed: 0,
                position: ''
            };
        }

        // Calculate average salary (excluding 0 salary entries like leave without pay)
        const validSalaries = workData.filter(d => parseInt(d.Salary) > 0);
        const totalSalary = validSalaries.reduce((sum, d) => sum + parseInt(d.Salary), 0);
        const average = validSalaries.length > 0 ? Math.round(totalSalary / validSalaries.length) : 0;

        // Determine if currently employed (ExpiryDate is nil/null or in future)
        const currentJob = workData[workData.length - 1]; // Assume last is current
        const isActive = currentJob.ExpiryDate && currentJob.ExpiryDate["xsi:nil"] === "true";

        return {
            status: 'COMPLETED',
            provider: 'NORQ_MOCK',
            averageMonthlySalaryAMD: average,
            employerName: currentJob.WorkName || '',
            employmentStatus: isActive ? 'ACTIVE' : 'INACTIVE',
            monthsEmployed: validSalaries.length,
            position: currentJob.Pashton || ''
        };
    }

    // 2. Person is NOT in the mock dataset.
    // If strict enforcement is required (loan type '001'), throw an error.
    if (loanTypeId === '001') {
        throw new Error(`Income data for SSN ${ssn} not found in NORQ database.`);
    }

    // 3. Fallback permissive Mock for unknown users
    return {
        status: 'COMPLETED',
        provider: 'NORQ_MOCK',
        averageMonthlySalaryAMD: 350000,
        employerName: 'Tech Solutions LLC',
        employmentStatus: 'ACTIVE',
        monthsEmployed: 42,
        position: 'Software Engineer'
    };
};

export const mockAcraCredit = async (firstName, lastName, passport) => {
    await new Promise(r => setTimeout(r, 1500));

    // The payload provided by the user
    return {
        type: "Bank_Application_LOAN_PP_Answer",
        ReqID: "2512512916717616313716220",
        AppNumber: "60660",
        DateTime: new Date().toLocaleDateString('en-GB') + " 09:03:25",
        Response: "OK",
        SID: "c7tf0oihe5g8qhjcqitecjme1a",
        ReportType: "02",
        PARTICIPIENT: {
            id: "1",
            FirstName: firstName || "ՄԱՐԻԱՄ",
            LastName: lastName || "ԳՐԻԳՈՐՅԱՆ",
            PassportNumber: passport || "BA2681064",
            Residence: "Ռեզիդենտ",
            TotalLiabilitiesLoan: { Amount: "5019621", Currency: "AMD" },
            Loans: {
                Loan: [
                    {
                        CreditID: "9604089932",
                        SourceName: "Ինեկոբանկ ՓԲԸ",
                        Currency: "AMD",
                        CreditStatus: "մարված",
                        CreditAmount: "475000",
                        OutstandingPercent: "0"
                    }
                    // (Assuming more payload objects here, simplified for brevity until needed)
                ]
            }
        }
    };
};

export const mockDmsScoring = async (applicationData) => {
    await new Promise(r => setTimeout(r, 2000));

    // Basic mock logic: Approve 80% of requested amount if income is high enough
    const requested = applicationData.requestedAmount || 500000;
    const standardLimit = 1500000;

    const approvedAmount = Math.min(requested, standardLimit);
    const approvedTenure = applicationData.requestedTenure || 24;

    return {
        status: 'APPROVED',
        provider: 'DMS_ENGINE',
        score: 745,
        riskBand: 'LOW',
        approvedLimitAMD: approvedAmount,
        maxTenureMonths: 60,
        assignedInterestRate: 14.5
    };
};

export const mockArmsoftDisbursement = async (applicationId, amount) => {
    await new Promise(r => setTimeout(r, 1500));

    return {
        status: 'SUCCESS',
        provider: 'ARMSOFT_CORE',
        coreReferenceId: `CBS-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
        disbursedAmount: amount,
        timestamp: new Date().toISOString()
    };
};

export const mockSendSms = async (phone, message) => {
    console.log(`[MOCK SMS TO ${phone}]: ${message}`);
    return { delivered: true };
};

export const mockSendEmail = async (email, subject, body) => {
    console.log(`[MOCK EMAIL TO ${email}]: ${subject}`);
    return { delivered: true };
};

export const mockArmsoftSchedule = async (amount, tenureMonths, annualRate) => {
    // Simulate API delay
    await new Promise(r => setTimeout(r, 400));

    const principal = Number(amount);
    const months = Number(tenureMonths);
    const monthlyRate = Number(annualRate) / 100 / 12;

    let monthlyPayment = 0;
    if (monthlyRate === 0) {
        monthlyPayment = principal / months;
    } else {
        monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    }

    let schedule = [];
    let remainingBalance = principal;
    let currentDate = new Date();

    for (let i = 1; i <= months; i++) {
        const interest = remainingBalance * monthlyRate;
        let principalPayment = monthlyPayment - interest;

        // Handle rounding for the final payment to ensure balance hits zero
        if (i === months) {
            principalPayment = remainingBalance;
            monthlyPayment = principalPayment + interest;
        }

        remainingBalance -= principalPayment;

        // Add one month
        currentDate.setMonth(currentDate.getMonth() + 1);

        schedule.push({
            month: i,
            paymentDate: currentDate.toISOString().split('T')[0],
            paymentAmount: Math.round(monthlyPayment * 100) / 100,
            principal: Math.round(principalPayment * 100) / 100,
            interest: Math.round(interest * 100) / 100,
            remainingBalance: Math.max(0, Math.round(remainingBalance * 100) / 100)
        });
    }

    return {
        provider: 'ARMSOFT_SCHEDULE_MOCK',
        timestamp: new Date().toISOString(),
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        totalPayment: Math.round((monthlyPayment * months) * 100) / 100,
        schedule
    };
};
