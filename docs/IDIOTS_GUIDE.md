# The Idiot's Guide to Hearthstone

Welcome to Hearthstone! This guide is designed to be the simplest, most straightforward way to get your household management system up and running. Whether you're a seasoned developer or completely new to self-hosting, this guide will walk you through installing, upgrading, and using the app.

---

## 1. What is Hearthstone?

Hearthstone is a **Multi-Tenant Household Management System**. Think of it as a central hub for everything related to your home:

- **Assets:** Tracking your appliances, their warranties, and their values.
- **Finances:** Budgeting, tracking recurring bills, and managing your savings pots.
- **Meals & Shopping:** Planning your weekly meals and automatically generating shopping lists.
- **Members & Vehicles:** Tracking MOTs, chore assignments, and member details.

---

## 2. Installing the App (First-Time Setup)

Hearthstone is designed to be run using **Docker**. This means it runs inside secure, isolated "containers" so you don't have to worry about installing a million dependencies on your computer.

### Step 1: Prerequisites

You only need two things installed on your machine (whether it's a Mac, Windows PC, or a Raspberry Pi):

1. **Node.js** (Version 22+)
2. **Docker & Docker Compose**

### Step 2: Get the Code

Open your terminal (Command Prompt on Windows, Terminal on Mac/Linux) and clone the repository:

```bash
git clone git@github.com:mbryantuk/household-project.git
cd household-project
```

### Step 3: Run the Setup Script

We've created a magic "Setup" script that handles all the complicated database provisioning and seeding for you. Just run:

```bash
npm run setup
```

_This will:_

1. Start the PostgreSQL and Redis databases in the background.
2. Push all the necessary database structures.
3. Seed the database with some initial test data so it's not completely empty.

### Step 4: Access the App

Once the setup is complete, and the server/web clients are running, open your web browser and go to:
**http://localhost:4001**

_You're in!_

---

## 3. Upgrading the App

When new features are released or bugs are fixed, you'll want to upgrade. We've made this incredibly easy. You **do not** need to manually stop databases or run SQL migrations.

Whenever you want to upgrade, just run the following two commands from the root `household-project` folder:

### Step 1: Pull the latest changes

```bash
git pull origin main
```

### Step 2: Run the Deployment Script

```bash
./scripts/deploy/deploy_verify.sh "Upgrading to latest version"
```

_This script will:_

1. Automatically rebuild your Docker containers.
2. Apply any new database changes safely.
3. Run the automated verification suite to ensure nothing is broken.

If the script finishes and gives you a green light, your upgrade is complete!

---

## 4. Using the App: The Basics

Once you've logged in, here's how to navigate your new digital household:

### A. The Dashboard (Your Home Screen)

This is your command center. You can drag and drop widgets here to customize your view. It shows you an at-a-glance summary of your Budget Health, Upcoming Bills, and recent Activity.

### B. Setting up your Household

The first thing you should do is add the people who live with you:

1. Navigate to **People** in the sidebar.
2. Click **Add Member**.
3. You can categorize them as Adults, Children, or even Pets.

### C. Adding your Assets & Vehicles

Your household is full of valuable things. Let's track them!

1. Go to the **Assets** or **Vehicles** tab.
2. Click **New Asset/Vehicle**.
3. Fill in the purchase price, replacement cost, and warranty details. If it's a vehicle, don't forget to add the MOT due date—Hearthstone will remind you when it's coming up!

### D. Managing your Finances

Hearthstone shines when managing recurring costs.

1. Go to **Finance > Recurring Costs**.
2. Add your subscriptions (Netflix, Gym) and utility bills (Gas, Council Tax).
3. Hearthstone will automatically project these onto your Calendar and calculate your monthly liabilities.

### E. The Global Command Bar (Pro-Tip)

Want to move fast? Press `Ctrl + K` (or `Cmd + K` on a Mac) from anywhere in the app. This opens the **Global Command Bar**. You can type things like "Add Expense" or search for a specific asset without ever touching your mouse.

---

## 5. Troubleshooting (Help, it's broken!)

If things go wrong, don't panic. The system is designed to be highly resilient.

- **I can't log in!** Make sure your Docker containers are actually running. Try running `docker compose ps` to check their status. If they are off, run `docker compose up -d`.
- **The app says "System Upgrade in Progress" and won't let me in:** A nightly backup or upgrade might have failed. Look inside the `server/data/` folder for a file named `upgrading.lock` and delete it.
- **I want to start completely from scratch:** If you want to nuke everything and start over, you can wipe your local databases. (Warning: This deletes all your data!)
  ```bash
  docker compose down -v
  rm -rf server/data/*.db
  ```
  Then, just run `npm run setup` again.

---

_Welcome to your organized life. Enjoy Hearthstone!_
