# Database Initialization Guide

## ✅ Backend Status
- **URL**: https://ayush-fhir-backend.onrender.com
- **Health**: ✅ Healthy
- **FHIR Metadata**: ✅ Working
- **Keep-Alive**: ✅ Will start automatically

---

## Next Step: Initialize Database

You need to run the database setup scripts to create tables and populate data.

### **Option 1: Using Render Shell (Recommended)**

1. Go to https://dashboard.render.com
2. Click on your backend service: `ayush-fhir-backend`
3. Click the "Shell" tab
4. Run these commands one by one:

```bash
# Navigate to backend directory
cd /opt/render/project/src

# Run database setup (creates tables)
node database/setup.js

# Run seed data (populates initial data)
node database/seed.js

# Run body regions migration
node scripts/run_body_migration_direct.js

# Run intelligent body mapper
node scripts/intelligent_body_mapper.js

# Populate doctors
node scripts/populate_doctors.js
```

### **Option 2: Connect Locally**

If Render Shell doesn't work, you can run from your local machine:

1. Update your local `backend/.env` with the **External Database URL**:
```
DB_HOST=dpg-d5cduip5pdvs73c8hq70-a.oregon-postgres.render.com
DB_PORT=5432
DB_NAME=ayush_fhir
DB_USER=ayush_admin
DB_PASSWORD=Y0063Ha8YjJ6ppDTrNK20z1hI8knrv13
```

2. Run from your local terminal:
```bash
cd backend
node database/setup.js
node database/seed.js
node scripts/run_body_migration_direct.js
node scripts/intelligent_body_mapper.js
node scripts/populate_doctors.js
```

---

## What Each Script Does

| Script | Purpose |
|--------|---------|
| `database/setup.js` | Creates all database tables (doctors, audit_logs, etc.) |
| `database/seed.js` | Populates NAMASTE and ICD-11 codes |
| `run_body_migration_direct.js` | Creates body region tables |
| `intelligent_body_mapper.js` | Creates 289 intelligent body region mappings |
| `populate_doctors.js` | Creates 100 doctor accounts |

---

## Expected Output

You should see:
```
✅ Database setup completed successfully
✅ Seed data loaded
✅ Body regions migration completed
✅ Created 289 intelligent mappings
✅ Successfully created 100 doctors
```

---

## After Database Initialization

1. ✅ Update Render environment variable:
   - `RENDER_EXTERNAL_URL` = `https://ayush-fhir-backend.onrender.com`

2. ⏭️ Deploy frontend to Vercel

3. ⏭️ Update frontend environment variable:
   - `VITE_API_URL` = `https://ayush-fhir-backend.onrender.com`

---

## Troubleshooting

**If scripts fail:**
- Check database credentials are correct
- Ensure database is accessible
- Check Render logs for errors

**If connection timeout:**
- Use External Database URL for local connection
- Check firewall/network settings
