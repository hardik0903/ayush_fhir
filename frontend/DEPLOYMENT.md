# Vercel Deployment Guide for AYUSH-FHIR Frontend

## Quick Setup

### 1. Vercel Project Configuration

When deploying to Vercel, use these settings:

**Framework Preset**: Vite

**Root Directory**: `frontend`

**Build Command**: `npm run build`

**Output Directory**: `dist`

**Install Command**: `npm install`

---

## 2. Environment Variables

Add the following environment variable in Vercel Dashboard:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_URL` | `https://your-backend-api.com` | Your backend API URL |

**Steps to add:**
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add `VITE_API_URL` with your backend URL
4. Save and redeploy

---

## 3. Backend API URL

You need to deploy your backend separately and use that URL. Options:

### Option A: Deploy Backend on Render/Railway/Heroku
1. Deploy the `backend` folder to a Node.js hosting service
2. Get the deployed URL (e.g., `https://ayush-fhir-api.onrender.com`)
3. Add this URL as `VITE_API_URL` in Vercel

### Option B: Use Vercel Serverless Functions
1. Convert backend routes to Vercel serverless functions
2. Place in `api/` directory
3. API will be available at `https://your-app.vercel.app/api`

---

## 4. Deployment Steps

### Via Vercel Dashboard
1. Go to https://vercel.com/new
2. Import your GitHub repository: `hardik0903/ayush_fhir`
3. Set Root Directory to `frontend`
4. Add environment variable `VITE_API_URL`
5. Click "Deploy"

### Via Vercel CLI
```bash
cd frontend
npm install -g vercel
vercel
```

---

## 5. Post-Deployment Checklist

- [ ] Verify frontend loads at your Vercel URL
- [ ] Test login functionality
- [ ] Verify API calls work (check browser console)
- [ ] Test 3D body map loads correctly
- [ ] Verify PDF export works
- [ ] Test disease prediction feature

---

## 6. Troubleshooting

### API Calls Failing
- Check `VITE_API_URL` is set correctly in Vercel
- Verify backend is deployed and accessible
- Check CORS settings on backend allow your Vercel domain

### 3D Model Not Loading
- Ensure Git LFS is enabled on GitHub
- Verify `human.glb` file is accessible
- Check browser console for errors

### Build Failures
- Check all dependencies are in `package.json`
- Verify Node.js version compatibility
- Review build logs in Vercel dashboard

---

## 7. Configuration Files

The following files have been configured for production:

- ✅ `vercel.json` - Vercel deployment configuration
- ✅ `.env.example` - Environment variable template
- ✅ `src/services/api.js` - Updated to use environment variables

---

## 8. Performance Optimization

The `vercel.json` includes:
- SPA routing for React Router
- Asset caching (1 year for static assets)
- Automatic compression

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Vite Deployment: https://vitejs.dev/guide/static-deploy.html
