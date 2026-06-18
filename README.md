# RocKings Cafe - Cloud Deployment Guide

This repository contains the full-stack web application for RocKings Cafe, Bengaluru. 

By default, the Express backend serves all frontend static files (HTML, CSS, JS, Images) from the root directory and hosts the API endpoints. This means **you can deploy the entire project as a single Web Service** on platforms like Render or Railway.

---

## Deployment Architecture

```mermaid
graph TD
    User[User Web Browser] -->|Requests Deployed URL| Render[Render Web Service]
    Render -->|Serves Static Files| Frontend[HTML/CSS/JS]
    Render -->|API endpoints /api/*| Express[server.js Backend]
    Express -->|mysql2 connection pool| Database[(Cloud MySQL Database)]
```

---

## Step 1: Push Code to GitHub

1. Open your terminal in the `restro` directory and initialize Git:
   ```bash
   git init
   ```
2. Create a `.gitignore` file to avoid pushing credentials and dependencies:
   ```env
   node_modules/
   .env
   package-lock.json
   ```
3. Stage and commit files:
   ```bash
   git add .
   git commit -m "Initialize RocKings Cafe Full-stack Website"
   ```
4. Create a repository on [GitHub](https://github.com) (e.g., named `rockings-cafe`), and push your code:
   ```bash
   git remote add origin https://github.com/your-username/rockings-cafe.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 2: Spin Up a Cloud MySQL Database

You can host a MySQL database for free on cloud providers such as **Railway** or **Aiven**.

### Option A: Railway (Recommended)
1. Go to [Railway.app](https://railway.app) and sign in.
2. Click **New Project** -> **Provision MySQL**.
3. Under the MySQL service block, go to **Variables** and copy the **`DATABASE_URL`** (connection string). It will look like:
   `mysql://root:password@host:port/railway`

### Option B: Aiven
1. Go to [Aiven.io](https://aiven.io) and register.
2. Create a **New Service** -> Select **MySQL** -> Choose a Free Tier plan.
3. Once running, copy the **Service URI** (connection string) or download the Host, User, Password, Port, and Database Name parameters.

---

## Step 3: Deploy the Web Service on Render

Render is a free, easy-to-use cloud host for web applications.

1. Go to [Render.com](https://render.com) and sign in.
2. Click **New** -> **Web Service**.
3. Link your GitHub account and select your `rockings-cafe` repository.
4. Set the following configurations:
   *   **Name**: `rockings-cafe`
   *   **Language / Runtime**: `Node`
   *   **Build Command**: `npm install`
   *   **Start Command**: `npm start` (This will automatically run `node db_init.js` to initialize tables, then boot the server)
5. Scroll down to **Environment Variables** and click **Add Environment Variable**:
   *   **`DATABASE_URL`**: Paste the connection string URI you copied from your cloud database in Step 2.
   *   *Alternative (if you have separate credentials)*:
       *   `DB_HOST` = (database host address)
       *   `DB_PORT` = `3306`
       *   `DB_USER` = (database username)
       *   `DB_PASSWORD` = (database password)
       *   `DB_NAME` = `rockings_cafe`
6. Click **Deploy Web Service**.

Once Render finishes building and deploying, it will generate a public URL (e.g. `https://rockings-cafe.onrender.com`). Open this URL in any browser to access your live, production cafe website!
