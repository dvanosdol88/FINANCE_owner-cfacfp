const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Helper to call Teller API
async function tellerFetch(path) {
  const apiKey = process.env.TELLER_API_KEY;
  if (!apiKey) throw new Error('TELLER_API_KEY not set');
  const auth = Buffer.from(apiKey + ':').toString('base64');
  const res = await fetch(`https://api.teller.io${path}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) {
    throw new Error(`Teller error ${res.status}`);
  }
  return res.json();
}

app.get('/api/balances', async (req, res) => {
  try {
    const accounts = await tellerFetch('/accounts');
    const balances = accounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      balance: acc.balances?.available ?? acc.current_balance,
    }));
    res.json(balances);
  } catch (err) {
    res.status(500).json({
      error: err.message,
      sample: [{ id: 'acct_1', name: 'Demo Checking', balance: 1234.56 }],
    });
  }
});

app.get('/api/transactions', async (req, res) => {
  try {
    const accounts = await tellerFetch('/accounts');
    if (!accounts.length) return res.json([]);
    const txns = await tellerFetch(`/accounts/${accounts[0].id}/transactions`);
    res.json(txns);
  } catch (err) {
    res.status(500).json({
      error: err.message,
      sample: [
        {
          id: 'txn_1',
          date: '2023-01-01',
          description: 'Demo transaction',
          amount: -20.5,
        },
      ],
    });
  }
});

app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
