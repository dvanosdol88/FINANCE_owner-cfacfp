import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchFromTeller(endpoint) {
  const apiKey = process.env.TELLER_API_KEY;
  const accessToken = process.env.TELLER_ACCESS_TOKEN;
  if (!apiKey || !accessToken) {
    throw new Error('Missing Teller credentials');
  }
  const url = `https://api.teller.io${endpoint}`;
  const auth = Buffer.from(`${apiKey}:${accessToken}`).toString('base64');
  const response = await fetch(url, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Teller API error: ${response.status} ${text}`);
  }
  return response.json();
}

app.get('/api/balances', async (req, res) => {
  try {
    const data = await fetchFromTeller('/balances');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions', async (req, res) => {
  try {
    const data = await fetchFromTeller('/transactions');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
