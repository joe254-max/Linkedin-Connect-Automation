# LinkedIn Auto-Connect Tool

Automatically send connection requests on LinkedIn with human-like behavior and built-in safety limits. Built with Node.js and Playwright.

## Features

- **Auto Login** — Reads credentials from `.env`, saves session cookies so you only log in once
- **Smart Connecting** — Finds and clicks Connect buttons, handles popups automatically
- **Human-Like Behavior** — Random delays (3-8s), mouse movements, and scrolling between actions
- **Safety Limits** — Configurable daily cap (default: 20), stops gracefully when reached
- **Security Detection** — Detects captchas and verification pages, pauses so you can solve them
- **Progress Tracking** — Saves stats to `progress.json` with real-time console output
- **Optional Messages** — Send a personalized note with each connection request

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A LinkedIn account

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/joe254-max/linkedin-auto-connect.git
cd linkedin-auto-connect
```

### 2. Install dependencies

```bash
npm install
```

### 3. Install the Playwright browser

```bash
npm run install-browser
```

### 4. Create your `.env` file

```bash
cp .env.example .env
```

Then open `.env` in a text editor and fill in your LinkedIn credentials:

```env
LINKEDIN_EMAIL=your-email@example.com
LINKEDIN_PASSWORD=your-password-here
DAILY_LIMIT=20
SEND_MESSAGE=false
CONNECTION_MESSAGE=Hi {firstName}, I'd love to connect and grow our networks together!
```

| Variable | Description | Default |
|---|---|---|
| `LINKEDIN_EMAIL` | Your LinkedIn email | (required) |
| `LINKEDIN_PASSWORD` | Your LinkedIn password | (required) |
| `DAILY_LIMIT` | Max connection requests per day | `20` |
| `SEND_MESSAGE` | Send a personalized note with each request | `false` |
| `CONNECTION_MESSAGE` | The note to send (use `{firstName}` as placeholder) | See above |

## Usage

Run the tool:

```bash
npm start
```

Or directly:

```bash
node index.js
```

A Chrome browser window will open, log in to LinkedIn, and start sending connection requests. You'll see real-time progress in your terminal:

```
🚀 LinkedIn Auto-Connect Starting...
   Daily limit: 20 | Sent today: 0 | Remaining: 20

   ✅ Sent connection 1/20 | Total ever: 1
   ✅ Sent connection 2/20 | Total ever: 2
   ...

🎉 Auto-Connect Run Complete!
   Connections sent this run: 20
   Total connections ever: 42
```

## How It Works

1. **Login** — The script opens a visible Chrome window and logs in with your credentials. After the first login, your session is saved to `auth-session/` so you don't need to log in again.

2. **Navigate** — Goes to `linkedin.com/mynetwork/` where LinkedIn shows suggested connections.

3. **Connect** — Finds all "Connect" buttons on the page and clicks them one by one. If a popup appears, it clicks "Send without a note" (or adds a personalized message if enabled).

4. **Human Behavior** — Between each action, the script waits 3-8 seconds, moves the mouse randomly, and scrolls the page — all to mimic human browsing patterns.

5. **Safety** — Stops after hitting the daily limit. If LinkedIn shows a captcha or security check, the script pauses and alerts you so you can solve it manually.

6. **Progress** — All stats are saved to `progress.json` so progress carries over between runs.

## Files

| File | Description |
|---|---|
| `index.js` | Main automation script |
| `.env.example` | Template for your configuration |
| `.env` | Your actual config (git-ignored, you create this) |
| `progress.json` | Auto-created progress tracker (git-ignored) |
| `auth-session/` | Saved login cookies (git-ignored) |
| `package.json` | Dependencies and scripts |

## Safety Tips

- **Keep `DAILY_LIMIT` at 20 or below** — LinkedIn may restrict accounts that send too many requests
- **Don't run the script multiple times per day** — The daily counter resets automatically at midnight
- **If you see a captcha**, solve it manually in the browser window — the script will wait for you
- **Run during normal hours** — Sending connections at 3 AM looks suspicious
- **Don't leave it unattended for long** — Check in occasionally to make sure everything is running smoothly

## Troubleshooting

| Issue | Solution |
|---|---|
| "Cannot find module 'playwright'" | Run `npm install` |
| Browser doesn't open | Run `npm run install-browser` |
| Login fails | Double-check your `.env` credentials |
| Captcha appears | Solve it manually in the browser window |
| No Connect buttons found | LinkedIn may have changed their page layout |
| Daily limit reached message | Wait until tomorrow or increase `DAILY_LIMIT` in `.env` |

## License

MIT
