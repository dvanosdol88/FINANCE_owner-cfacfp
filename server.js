import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;
const TELLER_TOKEN = process.env.TELLER_TOKEN;
const ACCOUNT_ID = process.env.TELLER_ACCOUNT_ID;

app.use(express.static('public'));

async function fetchTeller(endpoint) {
  if (!TELLER_TOKEN || !ACCOUNT_ID) {
    return null;
  }
  const url = `https://api.teller.io/accounts/${ACCOUNT_ID}/${endpoint}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TELLER_TOKEN}` }
  });
  if (!res.ok) {
    throw new Error(`Teller request failed: ${res.status}`);
  }
  return res.json();
}

app.get('/api/balances', async (req, res) => {
  try {
    const data = await fetchTeller('balances');
    if (!data) {
      return res.json({
        available: 0,
        ledger: 0,
        message: 'Set TELLER_TOKEN and TELLER_ACCOUNT_ID to fetch real data'
      });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions', async (req, res) => {
  try {
    const data = await fetchTeller('transactions');
    if (!data) {
      return res.json([
        {
          id: 'demo',
          amount: 0,
          description: 'Set TELLER_TOKEN and TELLER_ACCOUNT_ID to fetch real data'
        }
      ]);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
