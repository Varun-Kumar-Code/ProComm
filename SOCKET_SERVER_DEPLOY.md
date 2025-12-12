# Socket.IO Server Deployment Guide

## ⚠️ Important: Why You Need This

Vercel **cannot** run persistent WebSocket connections (Socket.IO) because it uses serverless functions. For full video conferencing functionality with multiple participants, you need to deploy the Socket.IO server separately.

## Current Status

✅ **Working:** Video calls using PeerJS cloud + localStorage fallback  
⚠️ **Limited:** Only works within same browser/device  
❌ **Not Working:** Real-time signaling across different devices without Socket.IO

## Quick Fix Options

### Option 1: Deploy to Render.com (FREE & EASY)

1. **Go to** https://render.com
2. **Sign up** with GitHub
3. **Click** "New +" → "Web Service"
4. **Connect** your ProComm repository
5. **Configure:**
   - Name: `procomm-socket-server`
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: `Free`
6. **Add Environment Variable:**
   - Key: `NODE_ENV`
   - Value: `production`
7. **Click** "Create Web Service"
8. **Copy** your server URL (e.g., `https://procomm-socket-server.onrender.com`)

### Option 2: Deploy to Railway.app (FREE)

1. **Go to** https://railway.app
2. **Sign up** with GitHub  
3. **Click** "New Project" → "Deploy from GitHub repo"
4. **Select** ProComm repository
5. **Configure:**
   - Root Directory: `server`
   - Start Command: `npm start`
6. **Add Variables:**
   ```
   NODE_ENV=production
   PORT=3002
   ```
7. **Deploy** and copy your server URL

### Option 3: Deploy to Heroku

1. Install Heroku CLI
2. Run:
   ```bash
   cd server
   heroku create procomm-socket-server
   git subtree push --prefix server heroku main
   ```
3. Copy your Heroku app URL

## After Deployment

### Update Your App

1. **Create** `.env.production` in `client/` folder:
   ```env
   REACT_APP_SERVER_URL=https://your-server-url.com
   ```

2. **Redeploy** to Vercel:
   ```bash
   git add client/.env.production
   git commit -m "Add production Socket.IO server URL"
   git push origin main
   ```

### Verify It Works

1. Open browser console at https://procomm-india.vercel.app
2. Look for: `✅ Socket.IO connected successfully!`
3. Test with 2 different devices/browsers

## Alternative: Use Without Socket.IO Server

Your app now has a localStorage fallback that works for:
- ✅ Testing on same device
- ✅ Multiple browser tabs
- ❌ Different devices (needs Socket.IO server)

## Recommended: Render.com

**Why:** Free tier, automatic deploys, supports WebSockets, easy setup

**Cost:** FREE forever  
**Setup Time:** 5 minutes  
**Reliability:** High

## Need Help?

Check deployment logs in your chosen platform's dashboard for any errors.
