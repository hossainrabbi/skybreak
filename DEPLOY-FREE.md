# How to Host SKYBREAK Online for Free (Render Deployment Guide)

This guide explains how to put **SKYBREAK** online for free so you and up to 3 friends can play together from different houses and different internet connections.

---

## Why Render Web Services Work for SKYBREAK

SKYBREAK runs **Next.js** and **Socket.IO** together on a single persistent Node.js server (`server.js`).
- Ordinary "serverless" platforms (like standard Vercel functions or Netlify static hosting) shut down immediately after each HTTP request and **cannot** keep persistent Socket.IO multiplayer rooms alive.
- **[Render](https://render.com/docs/free)** provides a **Free Web Service** tier for Node.js applications that supports **persistent processes** and **inbound WebSockets (`wss://`)** on the same port ([Render WebSockets Documentation](https://render.com/docs/websocket)).
- Furthermore, per Render's February 2026 platform update ([Render Changelog](https://render.com/changelog/free-web-services-now-remain-active-while-receiving-websocket-messages)), **active WebSocket messages from connected players prevent a Free web service from spinning down** while a match is being played!

---

## Step 1: Create Your Free Accounts (GitHub & Render)

1. **Create a Free GitHub Account**:
   - Go to **[https://github.com](https://github.com)** and sign up for a free account (if you don't already have one).
2. **Create a Free Render Account**:
   - Go to **[https://render.com](https://render.com)** and click **"Get Started for Free"**.
   - Click **"Sign up with GitHub"** so Render can easily connect to your GitHub code repository.
   - **No credit card is required** to deploy a Free Web Service on Render ([Render Free Docs](https://render.com/docs/free)).

---

## Step 2: Upload the SKYBREAK Project to a GitHub Repository

You can upload the extracted **`skybreak`** folder to GitHub using either **GitHub Desktop (easiest for beginners, no command line)** or **Git commands**.

### Option A: Using GitHub Desktop (No Command Line Needed)
1. Download and install **[GitHub Desktop](https://desktop.github.com/)** and sign in with your GitHub account.
2. In GitHub Desktop, click **File -> Add local repository...**
3. Select your extracted **`skybreak`** folder (the folder that contains `package.json` and `server.js`).
4. If it says *"This directory does not appear to be a Git repository"*, click the blue link **"create a repository"** right there, keep the name `skybreak`, and click **Create Repository**.
5. Click **"Publish repository"** at the top to upload it to your GitHub account!

### Option B: Using Git Commands in Terminal
1. Go to **[https://github.com/new](https://github.com/new)**, type `skybreak` as the **Repository name**, leave all checkboxes blank, and click **Create repository**.
2. Open a terminal inside your `skybreak` folder (make sure you do **not** include `node_modules`—our `.gitignore` file automatically excludes it) and run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of SKYBREAK 3D multiplayer game"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/skybreak.git
   git push -u origin main
   ```
   *(Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.)*

---

## Step 3: Connect Your GitHub Repository to Render

1. Log in to your **[Render Dashboard](https://dashboard.render.com/)**.
2. Click the **"New +"** button in the top-right corner and select **"Web Service"** (do **not** select Static Site, Private Service, or Background Worker).
3. Select **"Build and deploy from a Git repository"** and click **Next**.
4. Find your **`skybreak`** repository in the list and click **"Connect"**. (If you don't see it yet, click *"Configure account"* on the right to grant Render access to your `skybreak` repository).

---

## Step 4: Exact Render Configuration (Build, Start, Environment & Plan)

Fill in the Render Web Service form with these exact settings:

| Setting Field | What to Enter / Select |
| :--- | :--- |
| **Name** | `skybreak-game` (or any name you like) |
| **Language / Runtime** | `Node` |
| **Branch** | `main` |
| **Root Directory** | *(Leave blank if `package.json` is at the root of your repo; or type `skybreak` if you uploaded the outer folder)* |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type / Plan** | Select **Free** (`$0 / month`, 512 MB RAM, 0.1 CPU) |

### Environment Variables
Scroll down to the **Environment Variables** section.
- You do **not** need any secret API keys or database URLs.
- Render automatically sets `PORT` (default `10000`) and `NODE_ENV=production` during build/start, or you can optionally add:
  - **Key**: `NODE_ENV` | **Value**: `production`

Click **"Create Web Service"** at the bottom of the page!

---

## Step 5: How Port, HTTPS, and WebSockets Work Automatically

1. **Port Configuration**: Render routes all public internet traffic to a single internal port provided in the `PORT` environment variable (default `10000` on Render). Our `server.js` automatically reads `process.env.PORT || 3000` and listens on `0.0.0.0`, so zero manual port configuration is required.
2. **HTTPS & Secure WebSockets (`wss://`)**: Render automatically provisions a free managed TLS/SSL certificate (`https://your-app-name.onrender.com`). Because both Next.js and Socket.IO run on the same HTTP server, the Socket.IO client (`lib/socketClient.ts`) automatically connects to the same origin and upgrades to a secure **`wss://`** WebSocket connection over port 443.

---

## Step 6: How to Test with Friends Across Different Internet Connections

1. Wait 2–4 minutes for Render's first build to finish. When the logs say `SKYBREAK 3D Multiplayer Server is READY!` and the status badge turns green (**Live**), copy your public URL at the top of the Render dashboard (for example, `https://skybreak-game.onrender.com`).
2. Open that URL in your browser, enter your nickname, and click **"Create Room"**.
3. Click **"Copy Room Code"** and send the **website link** + **6-character Room Code** to up to 3 friends on WhatsApp, Messenger, or Discord.
4. Your friends open the same link on their PC or mobile phone (using their own Wi-Fi or mobile data), enter the Room Code, and click **"Join Room"**.
5. Once everyone is in the lobby, click **"Start Race Now"**!

---

## Step 7: Important Free Tier Behavior, Limits & How to Avoid Charges

We verified Render's current Free Web Service rules ([https://render.com/docs/free](https://render.com/docs/free)):

1. **Sleeping / Spin-Down After 15 Minutes of Inactivity**:
   - If nobody visits the website or sends WebSocket messages for **15 minutes**, Render puts the free server to sleep ("spins down").
   - When the next person opens the link, Render wakes the server back up automatically in **about 30 to 60 seconds** (showing a temporary loading screen while it boots).
   - **While you are actively playing**, incoming WebSocket movement messages keep the server awake!
2. **What Happens to Active Rooms When the Server Sleeps or Restarts**:
   - Because SKYBREAK stores rooms in **server memory (RAM)** with no database required, whenever the server sleeps after 15 minutes of inactivity or restarts, any old rooms are cleared. Players simply click **Create Room** to start a fresh room.
3. **Monthly Usage Limits (750 Free Hours / Month)**:
   - Render gives each workspace **750 free instance hours per month** (enough to run one service 24/7 all month, and sleeping time does not count against your hours!).
   - Free accounts also get 100 GB/month of outbound bandwidth and 500 build pipeline minutes/month.
4. **How to Avoid Accidentally Selecting a Paid Service**:
   - Always make sure **"Free ($0/month)"** is selected under **Instance Type**.
   - Do **not** attach a "Persistent Disk" (Persistent Disks are a paid feature and are not needed for SKYBREAK).
   - Do **not** enter a credit card if you want a 100% hard zero-dollar cap—without a payment method on file, Render will never bill you; if you ever exceed a monthly free quota, it simply pauses the free service until the 1st of the next month.

---

## Alternative Free Hosting Options Supporting Persistent WebSockets

If you ever want to try another free platform that supports persistent Node.js + WebSocket servers besides Render:
1. **[Koyeb Free Tier](https://www.koyeb.com/)**: Offers 1 free "Eco" Web Service instance (512 MB RAM) with native GitHub deployment and full WebSocket (`wss://`) support using the exact same Build (`npm install && npm run build`) and Run (`npm start`) commands.
2. **[Hugging Face Spaces (Docker)](https://huggingface.co/docs/hub/spaces-sdks-docker)**: Because we included a ready-to-use `Dockerfile` in the project root, you can create a free Docker Space on Hugging Face (which gives 2 vCPU and 16 GB RAM for free and supports WebSockets on port 7860 if `PORT=7860` is set).
