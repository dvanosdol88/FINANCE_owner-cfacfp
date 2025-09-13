They’re your Teller client certificate and its private key. You must use them for mTLS when your server calls the Teller API. Access tokens alone won’t work without that client cert. 
teller.io
+1

Where they are now

Not in the repo. Our server.js calls Teller without a client cert, so real API calls will fail once you leave the demo. 
teller.io

What to do on Render

In your Render service, add Secret Files for the two PEMs:

/etc/secrets/teller_cert.pem

/etc/secrets/teller_key.pem
You can upload them in Environment → Secret Files. 
Render

Optional: if Teller provides a CA bundle, add /etc/secrets/teller_ca.pem.

Render’s public HTTPS certs for your domain are auto‑managed. You don’t store those. Different concern. 
Render

Minimal code change (Node 18)

Use an mTLS client when calling Teller. Add undici and pass a TLS-enabled dispatcher.

npm i undici

// at top of server.js
const { readFileSync } = require('fs');
const { Agent } = require('undici');

const CERT_PATH = process.env.TELLER_CERT_PATH || '/etc/secrets/teller_cert.pem';
const KEY_PATH  = process.env.TELLER_KEY_PATH  || '/etc/secrets/teller_key.pem';
const CA_PATH   = process.env.TELLER_CA_PATH; // optional

const cert = readFileSync(CERT_PATH);
const key  = readFileSync(KEY_PATH);
const ca   = CA_PATH ? readFileSync(CA_PATH) : undefined;

const tellerDispatcher = new Agent({ connect: { cert, key, ca } });


Then, for every Teller call:

const resp = await fetch(`${TELLER_API}/accounts`, {
  dispatcher: tellerDispatcher,
  headers: { Authorization: auth, Accept: 'application/json' }
});


Same for balances/transactions. This is the supported way to attach client certs to fetch in Node via Undici’s Agent. 
GitHub
+2
undici.nodejs.org
+2

Summary

Store the two PEM files as Render Secret Files.

Read them at boot and use an mTLS-enabled Agent for all Teller requests.

Render’s inbound HTTPS certs require no action from you. 
Render
+1