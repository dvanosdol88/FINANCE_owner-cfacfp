# Finance App – Project Context

## Current Structure
- **Backend**: `teller_clean/server.js` with Express.  
  - Serves both API and static frontend.  
  - Added `/health` route.  
  - Connects to Postgres with SSL toggle (`rejectUnauthorized: false` in prod).  
  - Bootstraps schema for `institutions`, `accounts`, `balances`.  
  - Provides `/api/balances` endpoint (reads latest balance per account).  
- **Frontend**: `teller_clean/public/index.html`.  
  - Demo page with table + “Refresh” button.  
  - JS snippet calls `/api/balances`.  
- **Config**: `teller_clean/render.yaml` for Render deployment.  
- **Database**: Render PostgreSQL instance.  
- **Secrets**: Render environment variables currently (`PORT`, `NODE_ENV`, `DATABASE_URL`, Teller API keys later).  

## Deployment
- Planned deploy on **Render Web Service** (root = `teller_clean`).  
- Build: `npm ci` (or `npm install`).  
- Start: `node server.js`.  
- Env vars:  
  - `PORT=10000`  
  - `NODE_ENV=production`  
  - `DATABASE_URL=<from Render>`  
  - `TELLER_APPLICATION_ID`, `TELLER_APPLICATION_SECRET` (for future Teller refresh job).  

## Next Steps
1. **Deploy to Render**  
   - Create Postgres.  
   - Create Web Service from repo.  
   - Add env vars.  
   - Verify `/health` and `/api/balances`.  

2. **Wire Teller API**  
   - Implement `/admin/refresh` route that calls Teller, upserts accounts and balances.  
   - Protect with a secret header.  

3. **Daily Refresh Job**  
   - Render Cron to hit `/admin/refresh`.  

4. **Polish**  
   - Conditional DB SSL already in place.  
   - Add basic UX polish: loading state, empty-state message, refresh button (done).  
   - Log errors minimally.  
