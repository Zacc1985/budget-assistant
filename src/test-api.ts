import axios from 'axios';

const API_URL = 'https://budget-assistant.onrender.com';

async function testAPI() {
    try {
        // Test the basic endpoint
        console.log('Testing basic endpoint...');
        const basicResponse = await axios.get(API_URL);
        console.log('Basic endpoint response:', basicResponse.data);

        // Test the chat query endpoint
        console.log('\nTesting chat query endpoint...');
        const chatResponse = await axios.post(`${API_URL}/api/chat/query`, {
            message: "What's my current budget situation?"
        });
        console.log('Chat endpoint response:', chatResponse.data);

        // Test the insights endpoint
        console.log('\nTesting insights endpoint...');
        const insightsResponse = await axios.get(`${API_URL}/api/chat/insights`);
        console.log('Insights endpoint response:', insightsResponse.data);

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('API Error:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
        } else {
            console.error('Unexpected error:', error);
        }
    }
}

// Run the tests
console.log('Starting API tests...\n');
testAPI(); 