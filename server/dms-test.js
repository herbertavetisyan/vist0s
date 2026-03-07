import axios from 'axios';

const testDmsBody = async (bodyAuth) => {
    const payload = {"application": {"data": {"loanInformation": {"amount": 94410, "duration": 48}}}, ...bodyAuth};
    try {
        const res = await axios.post('https://stage.decision-making.software/api/flows/publish/Smart/v177', payload);
        console.log("Success with", JSON.stringify(bodyAuth));
        console.log(JSON.stringify(res.data).substring(0, 100));
    } catch (e) {
        console.log("Failed with", JSON.stringify(bodyAuth), e.response?.data);
    }
}
const runAll = async () => {
    const key = '7zApprdwr0QQe0H5nwIX-qPwUWYg4TWopu1qbZI8hvVrtTa0uTxsYeRw3XoYvVBD_j57SzLGIN_RRWEXkMnFV0v2wDUtTgSbHEbR';
    await testDmsBody({ apiKey: key });
    await testDmsBody({ api_key: key });
    await testDmsBody({ token: key });
    await testDmsBody({ key: key });
}
runAll();
