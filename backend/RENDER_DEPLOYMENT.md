# Render Deployment Guide for AYUSH-FHIR Backend

## Prerequisites

1. **PostgreSQL Database**: You need a PostgreSQL database. Options:
   - Render PostgreSQL (recommended - free tier available)
   - Supabase (free tier with generous limits)
   - ElephantSQL (free tier available)

2. **GitHub Repository**: Your code is already on GitHub at `hardik0903/ayush_fhir`

---

## Step 1: Create PostgreSQL Database on Render

1. Go to https://dashboard.render.com
2. Click "New +" → "PostgreSQL"
3. Configure:
   - **Name**: `ayush-fhir-db`
   - **Database**: `ayush_fhir`
   - **User**: `ayush_admin` (or any name)
   - **Region**: Oregon (or closest to you)
   - **Plan**: Free
4. Click "Create Database"
5. **Save these credentials** (you'll need them):
   - Internal Database URL
   - External Database URL
   - Host
   - Port
   - Database
   - Username
   - Password

---

## Step 2: Deploy Backend to Render

### Option A: Using Render Dashboard (Recommended)

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `hardik0903/ayush_fhir`
4. Configure the service:

**Basic Settings:**
- **Name**: `ayush-fhir-backend`
- **Region**: Oregon (same as database)
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Environment Variables:**
Click "Advanced" → "Add Environment Variable" and add these:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `DB_HOST` | (from Step 1 - Internal Database URL host) |
| `DB_PORT` | `5432` |
| `DB_NAME` | `ayush_fhir` |
| `DB_USER` | (from Step 1) |
| `DB_PASSWORD` | (from Step 1) |
| `JWT_SECRET` | (generate random string - use: `openssl rand -base64 32`) |
| `JWT_REFRESH_SECRET` | (generate another random string) |
| `CORS_ORIGIN` | `https://your-frontend.vercel.app` (update after deploying frontend) |
| `RENDER_EXTERNAL_URL` | `https://ayush-fhir-backend.onrender.com` (your service URL) |

5. Click "Create Web Service"

### Option B: Using render.yaml (Automatic)

The `render.yaml` file is already configured in the backend folder. Render will automatically detect it.

1. Go to https://dashboard.render.com
2. Click "New +" → "Blueprint"
3. Connect repository: `hardik0903/ayush_fhir`
4. Render will detect `backend/render.yaml`
5. Fill in the environment variables when prompted
6. Click "Apply"

---

## Step 3: Initialize Database

After deployment, you need to set up the database schema:

### Option A: Using Render Shell

1. Go to your web service in Render dashboard
2. Click "Shell" tab
3. Run these commands:
```bash
cd backend
node database/setup.js
node database/seed.js
```

### Option B: Connect Locally

1. Use the External Database URL from Step 1
2. Run migrations locally:
```bash
cd backend
# Update .env with External Database URL
node database/setup.js
node database/seed.js
```

---

## Step 4: Verify Deployment

1. **Check Health Endpoint**:
   - Visit: `https://your-service.onrender.com/health`
   - Should return: `{"status":"healthy",...}`

2. **Check Logs**:
   - Go to Render dashboard → Your service → "Logs"
   - Look for: "✅ Keep-alive ping successful"

3. **Test API**:
```bash
curl https://your-service.onrender.com/fhir/metadata
```

---

## Step 5: Keep-Alive Service

✅ **Already Configured!**

The backend includes a keep-alive service that:
- Pings itself every 14 minutes
- Prevents Render free tier from sleeping (sleeps after 15 min inactivity)
- Automatically starts in production mode
- Logs ping status in console

You'll see logs like:
```
🔄 Keep-alive service started - pinging https://your-service.onrender.com every 14 minutes
✅ Keep-alive ping successful at 2026-01-03T14:45:00.000Z - Status: 200
```

---

## Step 6: Update Frontend

After backend is deployed, update your frontend:

1. Copy your Render backend URL: `https://ayush-fhir-backend.onrender.com`
2. In Vercel, add environment variable:
   - Key: `VITE_API_URL`
   - Value: `https://ayush-fhir-backend.onrender.com`
3. Redeploy frontend

---

## Important Notes

### Free Tier Limitations

**Render Free Tier:**
- ✅ 750 hours/month (enough for 24/7 with keep-alive)
- ✅ Automatic HTTPS
- ⚠️ Spins down after 15 min inactivity (keep-alive prevents this)
- ⚠️ Cold starts take ~30 seconds

**PostgreSQL Free Tier:**
- ✅ 1 GB storage
- ✅ Expires after 90 days (backup your data!)
- ⚠️ Limited to 97 connections

### CORS Configuration

Update `CORS_ORIGIN` environment variable with your Vercel frontend URL:
```
CORS_ORIGIN=https://your-app.vercel.app
```

### Database Backup

**Important**: Free PostgreSQL databases expire after 90 days!

Backup your database regularly:
```bash
pg_dump -h <host> -U <user> -d ayush_fhir > backup.sql
```

---

## Troubleshooting

### Service Won't Start
- Check logs in Render dashboard
- Verify all environment variables are set
- Ensure database is accessible

### Database Connection Errors
- Verify database credentials
- Use **Internal Database URL** for Render services
- Check database is in same region

### Keep-Alive Not Working
- Check logs for "Keep-alive service started"
- Verify `RENDER_EXTERNAL_URL` is set correctly
- Ensure `/health` endpoint is accessible

### CORS Errors
- Update `CORS_ORIGIN` with your frontend URL
- Redeploy backend after changing environment variables

---

## Monitoring

### View Logs
```
Render Dashboard → Your Service → Logs
```

### Check Metrics
```
Render Dashboard → Your Service → Metrics
```

### Health Check
```
https://your-service.onrender.com/health
```

---

## Cost Optimization

**Free Tier Strategy:**
- ✅ Use Render free tier for backend
- ✅ Use Vercel free tier for frontend
- ✅ Use Supabase/ElephantSQL for database (longer free tier)
- ✅ Keep-alive service keeps backend active

**Total Cost**: $0/month (with limitations)

---

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Initialize database
3. ✅ Verify keep-alive is working
4. ⏭️ Deploy frontend to Vercel
5. ⏭️ Update frontend with backend URL
6. ⏭️ Test end-to-end functionality

---

## Support

- Render Docs: https://render.com/docs
- Render Community: https://community.render.com
- PostgreSQL Docs: https://www.postgresql.org/docs/
