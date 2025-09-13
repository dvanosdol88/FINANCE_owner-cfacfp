### Project Brief

****************************************************************************************
****************************************************************************************
*
*   9/11/25    App is again working and pulling our real account values from TD Bank!!! ********
*
****************************************************************************************
****************************************************************************************


### Fast, safe next steps to link a real bank

Do this in order. Change nothing else.

1. **Get the right certs**

* In the Teller dashboard, create/download a **development** client certificate and private key for your app. Keep them off Git and private.

2. **Switch both tiers to development**

* `examples/static/index.js`:

  ```js
  const APPLICATION_ID = 'your_app_id';
  const ENVIRONMENT = 'development';
  const BASE_URL = 'http://localhost:8001/api';
  ```
* Backend:

  ```bash
  cd /mnt/d/Projects/teller_clean/examples/python
  source .venv/bin/activate
  python teller.py --environment development \
    --cert /mnt/c/Users/david/Downloads/teller/dev-cert.pem \
    --cert-key /mnt/c/Users/david/Downloads/teller/dev-private-key.pem
  ```

3. **Restart clean and clear cache**

* Frontend:

  ```bash
  cd /mnt/d/Projects/teller_clean/examples
  ./static.sh
  ```
* Browser at `http://localhost:8000`: DevTools → Network → Disable cache → in Console run:

  ```js
  localStorage.clear(); location.reload();
  ```

4. **Link your real bank**

* Click **Connect**, pick your bank, sign in. Footer should show an access token. Use the UI buttons to read balances and transactions.

5. **Optional curl (only after UI works)**

* In Console:

  ```js
  JSON.parse(localStorage.getItem('teller:enrollment')).accessToken
  ```
* In WSL:

  ```bash
  TOKEN='<paste>'
  curl -s -H "Authorization: $TOKEN" http://localhost:8001/api/accounts
  ```

### When you’re ready for production

* Complete billing/approval in Teller.
* Issue **production** cert+key for the app.
* Set `ENVIRONMENT='production'` and start backend with `--environment production` and the prod certs.

### Quick troubleshooting (only these)

* Port free: `sudo lsof -i :8001` → kill any PID.
* UI constants: `APPLICATION_ID` correct, `ENVIRONMENT` matches backend, `BASE_URL` exactly `http://localhost:8001/api`.
* Hard reload with cache disabled and `localStorage.clear()`.
* If a call fails, read the **backend** terminal last 10 lines; act on that message only.
