async function testSearch() {
    try {
        // Debug Search
        const url = `http://localhost:3000/api/funds/search?q=HDFC`;
        console.log(`Fetching ${url}...`);

        const response = await fetch(url, {
            headers: {
                // Simulate auth if needed? 
                // The route is protected: router.use(protect);
                // I need a token!
            }
        });

        // If 401, I need to login first.
        if (response.status === 401) {
            console.log('Auth required. Logging in...');
            const loginRes = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'aquibislam786@gmail.com', password: 'password123' })
            });

            const loginData = await loginRes.json();
            const token = loginData?.data?.accessToken;

            if (!token) {
                console.error('Login failed:', loginData);
                return;
            }
            console.log('Logged in. Token obtained.');

            // Retry search with token
            const response2 = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data2 = await response2.json();
            console.log('Search Response:', JSON.stringify(data2, null, 2));
            return;
        }

        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
}

testSearch();
