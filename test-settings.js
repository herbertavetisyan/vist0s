import axios from 'axios';

async function runTest() {
  try {
    // 1. Auth to get token
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@vistos.com',
      password: 'password123'
    });
    const token = loginRes.data.token;
    console.log("Login successful, token retrieved.");

    // 2. Add System Settings
    const settings = {
        DMS_URL: 'https://mock.dms.engine/api/v1',
        DMS_API_KEY: 'test_key_12345'
    };
    
    const updateRes = await axios.put('http://localhost:5000/api/settings', { settings }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Settings Update Response:", updateRes.data);

    // 3. Get System Settings
    const getRes = await axios.get('http://localhost:5000/api/settings', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Settings Get Response:", getRes.data);

  } catch (error) {
    console.error("Test failed:", error.response?.data || error.message);
  }
}

runTest();
