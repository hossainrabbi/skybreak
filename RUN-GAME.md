# How to Run SKYBREAK on Your Computer (Beginner Guide)

This guide explains every single step in plain, simple language. You do not need any prior experience with Node.js, npm, or servers.

---

## 1. Which Software You Must Install

You only need **two free programs** on your computer:
1. **Node.js (LTS Version)** — This runs the game server and installs the game's code libraries.
   - Download it from the official website: **[https://nodejs.org](https://nodejs.org)**
   - Click the green button that says **LTS (Recommended for Most Users)** and run the installer. Keep all default checkboxes selected and click **Next** until it finishes.
2. **A Modern Web Browser** — Google Chrome, Microsoft Edge, Mozilla Firefox, or Brave.

---

## 2. How to Check Whether Node.js Is Installed

1. Press the **Windows Key** on your keyboard, type `cmd`, and press **Enter** to open **Command Prompt**.
2. Type the following command and press **Enter**:
   ```bash
   node -v
   ```
3. Next, check that `npm` (Node Package Manager, which comes automatically with Node.js) is installed:
   ```bash
   npm -v
   ```
4. If both commands print version numbers (for example `v20.18.0` and `10.8.2`), Node.js is installed and ready!

---

## 3. Which Node.js Version Is Required

- **Required Minimum Version**: **Node.js 18.18.0** or newer (`>=18.18.0`).
- **Recommended Version**: **Node.js 20 LTS** or **Node.js 22 LTS**.

---

## 4. How to Extract the ZIP File

1. Download **`SKYBREAK-NextJS-Multiplayer.zip`** to your computer (for example, into your `Downloads` or `Desktop` folder).
2. **Right-click** on `SKYBREAK-NextJS-Multiplayer.zip` and click **"Extract All..."** (on Windows 10/11).
3. Click **"Extract"**.
4. Do **not** try to run the game from inside the un-extracted `.zip` preview window—always open the extracted folder first!

---

## 5. How to Open the Project Folder

1. Open the extracted folder.
2. Inside, open the **`skybreak`** folder so that you can see files named **`package.json`**, **`server.js`**, **`README.md`**, and folders named **`app`**, **`components`**, **`game`**, and **`server`**.

---

## 6. How to Open a Terminal in That Folder on Windows

Use either of these easy methods on Windows:

### Method A (Fastest — Address Bar Trick):
1. Open the **`skybreak`** folder in Windows File Explorer (where you see `package.json` and `server.js`).
2. Click once on the **Address Bar** at the top of the File Explorer window (where the folder path is shown).
3. Type `cmd` and press **Enter**.
4. A black **Command Prompt** window will open directly inside the `skybreak` folder!

### Method B (Right-Click Menu):
1. Inside the **`skybreak`** folder, right-click on an empty space.
2. Click **"Open in Terminal"** (Windows 11) or **Shift + Right-Click -> "Open PowerShell window here"** (Windows 10).

> **Windows PowerShell Note**: If you use PowerShell instead of Command Prompt (`cmd`) and see a red message saying *"running scripts is disabled on this system"*, either use **Command Prompt (`cmd`)** via Method A above, or run this command once in PowerShell:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

---

## 7. Exactly Which Commands to Run (In the Correct Order)

Copy and paste these commands one by one into your terminal window and press **Enter** after each one:

### Step 1 — Install the required packages (run this first):
```bash
npm install
```
*(Wait about 30–90 seconds while npm downloads Next.js, React, Three.js, and Socket.IO into a `node_modules` folder.)*

### Step 2 — (Optional) Run automated tests and TypeScript checks:
```bash
npm run typecheck
npm test
```

### Step 3 — Start the game server (starts both Next.js and Socket.IO together!):
```bash
npm run dev
```

*(Note: If you want to test a full production build locally later, you can run `npm run build` followed by `npm start`.)*

---

## 8. What Successful Output Should Look Like

When you run `npm run dev`, after a few seconds your terminal will display:

```text
============================================================
  SKYBREAK 3D Multiplayer Server is READY!
  Mode:        Development
  Local URL:   http://localhost:3000
  Socket.IO:   ws://localhost:3000/socket.io
============================================================
```

Keep this terminal window open while you are playing!

---

## 9. Which Local URL to Open in the Browser

Open Google Chrome, Microsoft Edge, or Firefox and go to:

```text
http://localhost:3000
```

*(The first time you load `http://localhost:3000` in development mode, Next.js may take 3–5 seconds to compile the 3D page.)*

---

## 10. How to Create a Room

1. On the **SKYBREAK** Main Menu at `http://localhost:3000`, verify that the green dot says **"Multiplayer Server Connected"**.
2. In the **PLAYER NICKNAME** box, type your name (for example, `Player1`).
3. Click the blue **"✨ Create Room"** button.
4. You will enter the **Sky Island Lobby** and see a 6-character **Room Code** in big yellow letters (for example, `SKY7B2`).
5. Click the **"📋 Copy Room Code"** button to copy the code.

---

## 11. How to Join the Room from a Second Browser Window

To test multiplayer on the same computer, each player needs their own session token:
1. Open a **New Incognito / Private Window** in your browser (`Ctrl + Shift + N` in Chrome/Edge) or open a **second browser** (such as Firefox or Edge).
2. Go to **`http://localhost:3000`** in that second window.
3. Type a different nickname (for example, `Player2`).
4. Paste the 6-character Room Code into the **"Join with Room Code"** box.
5. Click the green **"🚀 Join Room"** button.

---

## 12. How to Test with Two (or up to Four) Players

1. Place the two browser windows side-by-side on your screen.
2. In the Lobby, you will immediately see both `Player1 (Host)` and `Player2` listed with different colors (`Sky Cyan` and `Solar Crimson`).
3. Try clicking **"Mark as Ready / Toggle"** in either window—both windows update in real time!
4. In **Window 1 (the Host)**, click the **"🏁 Start Race Now"** button.
5. Watch both windows count down **"3... 2... 1... GO!"** in sync.
6. Click inside Window 1 and press **W, A, S, D** (or **Arrow Keys**) to run and **Spacebar** to jump. Look at Window 2—you will see `Player1`'s 3D character running and jumping across the floating islands with their nickname floating above their head!
7. Run across the platforms, touch the **3 glowing blue checkpoints**, and reach the golden **Finish Island** at the end of the course to see the Winner Announcement and Final Leaderboard!

---

## 13. How to Stop the Server

1. Click inside the terminal window where the server is running.
2. Hold down **Ctrl** and press **C** (`Ctrl + C`).
3. If Windows asks `Terminate batch job (Y/N)?`, type `Y` and press **Enter**.

---

## 14. How to Fix Common Errors

| Problem / Error Message | Why It Happened | Exact Solution |
| :--- | :--- | :--- |
| **`npm error enoent Could not read package.json`** | Your terminal is not inside the `skybreak` folder. | Type `cd skybreak` and press Enter, or follow **Section 6** above to open the terminal directly inside the folder containing `package.json`. |
| **`Error: listen EADDRINUSE: address already in use :::3000`** | Another program (or an old terminal window) is already using Port 3000. | Close any other open terminal windows running `npm run dev`, or run the game on port 3001 instead: `set PORT=3001 && npm run dev` (in Command Prompt). |
| **`'node' is not recognized as an internal or external command`** | Node.js is either not installed or you didn't restart your terminal after installing it. | Close all terminal windows, install Node.js LTS from [https://nodejs.org](https://nodejs.org), and open a fresh Command Prompt window. |
| **Windows Firewall popup asks for permission** | Windows Defender Firewall noticed Node.js opening port 3000. | Check **"Private networks"** and click **"Allow access"**. |
| **Joining from a 2nd tab in the same normal browser window replaces Player 1** | Normal tabs in the same browser window share `sessionStorage` in some configurations. | Use an **Incognito / Private window** (`Ctrl + Shift + N`) or a **different browser** for Player 2 on the same PC. |
