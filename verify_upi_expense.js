const http = require('http');

// Simple fetch implementation using http module to avoid external dependencies
function fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const { method = 'GET', headers = {}, body } = options;
        const urlObj = new URL(url);

        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 80,
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(reqOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                let parsedData;
                try {
                    parsedData = JSON.parse(data);
                } catch (e) {
                    parsedData = data;
                }
                resolve({
                    status: res.statusCode,
                    json: async () => parsedData,
                    text: async () => data,
                    headers: res.headers
                });
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

const BASE_URL = 'http://localhost:3000/api'; // Updated to match server default port
const timestamp = Date.now();
const testUser = {
    name: `Test User ${timestamp}`,
    email: `test${timestamp}@example.com`,
    password: 'Password123'
};

async function verify() {
    console.log('--- Starting UPI Expense Verification ---');

    try {
        // 1. Register
        console.log('\n1. Registering User...');
        const registerRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            body: JSON.stringify(testUser)
        });
        const registerData = await registerRes.json();

        if (registerRes.status !== 201) {
            throw new Error(`Registration failed: ${JSON.stringify(registerData)}`);
        }
        console.log('✅ Registration Successful');

        // 2. Login
        console.log('\n2. Logging In...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ email: testUser.email, password: testUser.password })
        });
        const loginData = await loginRes.json();

        if (loginRes.status !== 200) {
            throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
        }
        console.log('✅ Login Successful');

        const token = loginData.token;
        if (!token) throw new Error('No token received');

        // 3. Add UPI Expense (New Month)
        const month = '2026-02';
        const upiData1 = {
            amount: 150,
            date: '2026-02-10'
        };

        console.log(`\n3. Adding UPI Expense (New Document) for ${month}...`);
        // Note: No Authorization header needed now
        const res1 = await fetch(`${BASE_URL}/expenses/${testUser.email}/${month}/upi`, {
            method: 'POST',
            body: JSON.stringify(upiData1)
        });
        const data1 = await res1.json();

        if (res1.status === 200 && data1.success) {
            const expense = data1.data.expenses.find(e => e.title === 'UPI');
            if (expense && expense.subExpenses.length === 1 && expense.amount === 150) {
                console.log('✅ UPI Expense created successfully (Public Access)');
            } else {
                console.error('❌ UPI Expense structure incorrect:', JSON.stringify(data1, null, 2));
            }
        } else {
            console.error('❌ Failed to add UPI expense:', JSON.stringify(data1));
        }

        // 4. Add Another UPI Expense (Append)
        const upiData2 = {
            amount: 50,
            date: '2026-02-12'
        };

        console.log(`\n4. Appending UPI Expense for ${month}...`);
        const res2 = await fetch(`${BASE_URL}/expenses/${testUser.email}/${month}/upi`, {
            method: 'POST',
            body: JSON.stringify(upiData2)
        });
        const data2 = await res2.json();

        if (res2.status === 200 && data2.success) {
            const expense = data2.data.expenses.find(e => e.title === 'UPI');
            // Since we appended 50 to 150, the total should be 200 if logic is correct
            // Wait, existing logic might recalculate amount or append. 
            // My implementation: 
            // if (upiExpense) { upiExpense.subExpenses.push(...) }
            // And pre-save hook recalculates total. So 150 + 50 = 200.

            if (expense && expense.subExpenses.length === 2 && expense.amount === 200) {
                console.log('✅ UPI Expense appended successfully');
                console.log('   Total Amount:', expense.amount);
                console.log('   Sub Expenses:', expense.subExpenses.length);
            } else {
                console.error('❌ UPI Expense append structure incorrect:', JSON.stringify(data2.data, null, 2));
            }
        } else {
            console.error('❌ Failed to append UPI expense:', JSON.stringify(data2));
        }

    } catch (error) {
        console.error('❌ Verification Error:', error.message);
    }
}

verify();
