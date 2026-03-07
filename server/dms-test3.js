import axios from 'axios';
const payload = {
    "application": {
        "data": {
            "loanInformation": {
                "amount": 94410,
                "executedAmount": null,
                "prepayment": 0,
                "monthlyPayment": null,
                "duration": 48,
                "paymentDate": 20,
                "goodsTypeName": "Կենցաղային և համակարգչային տեխնիկա",
                "goodsTypeKey": "G1",
                "goodsTypeTemplate": "400",
                "goodsQuantity": 1,
                "goods": []
            },
            "personalInformation": {
                "SSN": {
                    "SSN_Type": "SSN",
                    "SSN_Number": "2007910616"
                },
                "document": {
                    "documentType": "IDCard",
                    "documentNumber": "014215644",
                    "issueDate": "2022-05-10T00:00:00.000Z",
                    "issuedBy": "001",
                    "validBefore": "2032-05-10T00:00:00"
                },
                "user": {
                    "firstName": "ԿԱՐԵՆ",
                    "lastName": "ԲԱՍԵՆՑՅԱՆ",
                    "middleName": "ՍԻՄՈՆԻ",
                    "gender": "male",
                    "email": "basencyankaren91@gmail.com",
                    "residence": "Yes",
                    "birthDate": "1991-07-10T00:00:00.000Z",
                    "mobilePhoneNumber": "95922688",
                    "additionalMobilePhoneNumber": "44922680"
                },
                "address": {
                    "residence": {
                        "region": "ԵՐԵՎԱՆ",
                        "city": "ԷՐԵԲՈՒՆԻ",
                        "street": "ԱՃԵՄՅԱՆ Փ.",
                        "house": "16",
                        "apartment": "37"
                    },
                    "accommodation": {
                        "region": "",
                        "city": "",
                        "street": "",
                        "house": "",
                        "apartment": ""
                    }
                }
            },
            "_id": "699886d16dbf1763e9e789db"
        },
        "nork": {
            "s:Envelope": {
                "xmlns:s": "http://schemas.xmlsoap.org/soap/envelope/",
                "s:Body": {
                    "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
                    "xmlns:xsd": "http://www.w3.org/2001/XMLSchema",
                    "GetUserData_v2021Response": {
                        "xmlns": "http://norq.am/dxchange/2013",
                        "GetUserData_v2021Result": "true",
                        "argCurrenDate": "2026-02-20T20:07:51.8297691+04:00",
                        "argVersionDate": "2026-01-24T00:00:00",
                        "argPrivateData": {
                            "Aph_Kod": "9000545279",
                            "Soccard": "2007910616",
                            "Lastname": "ԲԱՍԵՆՑՅԱՆ",
                            "Firstname": "ԿԱՐԵՆ",
                            "Middlename": "ՍԻՄՈՆԻ",
                            "Birthdate": "1991-07-10T00:00:00",
                            "Gender": "2",
                            "IsDead": "False",
                            "Deathdate": { "xsi:nil": "true" },
                            "Citizenship": "ARM",
                            "Region": "ԵՐԵՎԱՆ",
                            "Community": "ԷՐԵԲՈՒՆԻ",
                            "Street": "ԱՃԵՄՅԱՆ Փ.",
                            "Building": "16",
                            "Buildingtype": "Շ",
                            "Apartment": "37",
                            "Regtypename": "ՄՇՏԱԿԱՆ",
                            "Regdate": "2008-05-16T00:00:00",
                            "Passport": "AO0355450",
                            "PassportWhere": "009",
                            "PassportDate": "2025-09-17T00:00:00",
                            "PassportVdate": "2035-09-17T00:00:00",
                            "PassportDoctype": "P",
                            "PassportDoctypeName": "ՀՀ ԱՆՁՆԱԳԻՐ",
                            "Passportvalid": "True",
                            "Passportinvaliddate": { "xsi:nil": "true" },
                            "IdCard": "014215644",
                            "IdCardWhere": "001",
                            "IdCardDate": "2022-05-10T00:00:00",
                            "IdCardVdate": "2032-05-10T00:00:00",
                            "IdCardDoctype": "I",
                            "Idcardvalid": "True",
                            "Idcardinvaliddate": { "xsi:nil": "true" }
                        },
                        "argArchiveData": {},
                        "argWorkData": {
                            "WorkData_v2018": []
                        }
                    }
                }
            }
        },
        "acra": {
            "ROWDATA": {
                "type": "Bank_Application_LOAN_PP_Answer",
                "ReqID": "6127232123241655820224312",
                "AppNumber": "60660",
                "DateTime": "20/02/2026 20:17:15",
                "Response": "OK",
                "SID": "k1atbmfub9qkhb59iblkf74toh",
                "ReportType": "01",
                "PARTICIPIENT": {
                    "id": "1",
                    "ThePresenceData": "1",
                    "KindBorrower": "1",
                    "RequestTarget": "1",
                    "UsageRange": "1",
                    "FirstName": "ԿԱՐԵՆ",
                    "LastName": "ԲԱՍԵՆՑՅԱՆ",
                    "SocCardNumber": "2007910616",
                    "TotalLiabilitiesLoan": {
                        "Amount": "200000",
                        "Currency": "AMD"
                    },
                    "Loans": {
                        "Loan": []
                    }
                }
            }
        }
    }
};
const testDmsUrl = async (url) => {
    try {
        const res = await axios.post(url, payload, { headers: { key: '7zApprdwr0QQe0H5nwIX-qPwUWYg4TWopu1qbZI8hvVrtTa0uTxsYeRw3XoYvVBD_j57SzLGIN_RRWEXkMnFV0v2wDUtTgSbHEbR' } });
        console.log("Success with", url);
        console.log("Got response:", JSON.stringify(res.data).substring(0, 1000));
        console.log("Offers:", res.data.Offers);
    } catch (e) {
        console.log("Failed with", url, e.response?.data);
    }
}
testDmsUrl('https://stage.decision-making.software/api/flows/publish/Smart/v177');
