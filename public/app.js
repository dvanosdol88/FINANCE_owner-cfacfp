async function loadData() {
  try {
    const [balancesRes, transactionsRes] = await Promise.all([
      fetch('/api/balances'),
      fetch('/api/transactions')
    ]);

    const balances = await balancesRes.json();
    document.getElementById('balances').textContent = JSON.stringify(balances, null, 2);

    const transactions = await transactionsRes.json();
    const list = document.getElementById('transactions');
    list.innerHTML = '';
    transactions.forEach(tx => {
      const item = document.createElement('li');
      const amount = tx.amount || (tx.details && tx.details.processing_status ? tx.details.processing_status : '');
      item.textContent = `${tx.date || ''} ${tx.description || ''} ${amount}`.trim();
      list.appendChild(item);
    });
  } catch (err) {
    document.getElementById('balances').textContent = 'Failed to load data';
    console.error(err);
  }
}

loadData();
