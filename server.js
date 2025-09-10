const express = require('express');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const ACCOUNT_ID = process.env.TELLER_ACCOUNT_ID;
const API_KEY = process.env.TELLER_API_KEY;

if (!ACCOUNT_ID) {
  console.warn('TELLER_ACCOUNT_ID is not set. API routes will fail.');
}
if (!API_KEY) {
  console.warn('TELLER_API_KEY is not set. API routes will fail.');
}

app.use(express.static('public'));

async function tellerRequest(path) {
  const url = `https://api.teller.io${path}`;
  const auth = 'Basic ' + Buffer.from(`${API_KEY}:`).toString('base64');
  const res = await fetch(url, {
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    throw new Error(`Teller API responded with ${res.status}`);
  }
  return res.json();
}

app.get('/api/balances', async (req, res) => {
  try {
    const balances = await tellerRequest(`/accounts/${ACCOUNT_ID}/balances`);
    res.json(balances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await tellerRequest(`/accounts/${ACCOUNT_ID}/transactions`);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
