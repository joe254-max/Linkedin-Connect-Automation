LinkedIn Auto Connect Bot

A simple automation bot that automatically sends connection requests on LinkedIn so you don't have to manually click hundreds of times.

The bot opens a browser, logs into LinkedIn, navigates to People You May Know, and sends connection requests automatically while respecting a daily safety limit.

Features
Automatically logs into LinkedIn
Navigates to People You May Know
Sends connection requests automatically
Human-like pauses between actions
Configurable daily connection limit
Optional automated messaging
Uses a private automated browser
Project Structure
linkedin-auto-connect
│
├── index.js          # Main bot logic
├── package.json      # Project dependencies and scripts
├── .env.example      # Environment variable template
├── README.md         # Project documentation
└── .gitignore        # Files that should not be committed
Requirements

Before running the bot you need:

Node.js (LTS version recommended)
npm (comes with Node.js)
A LinkedIn account

Download Node.js from:

https://nodejs.org

Installation

Clone or download the repository, then install the dependencies.

npm install

Next install the automated browser used by the bot.

npm run install-browser

This will download the required browser components used for automation.

Environment Configuration

Create a .env file in the project root.

You can copy the template from .env.example.

Example configuration:

LINKEDIN_EMAIL=your-email@example.com
LINKEDIN_PASSWORD=your-password-here
DAILY_LIMIT=20
SEND_MESSAGE=false

Explanation of variables:

Variable	Description
LINKEDIN_EMAIL	Your LinkedIn login email
LINKEDIN_PASSWORD	Your LinkedIn password
DAILY_LIMIT	Maximum connections per day
SEND_MESSAGE	Whether to send a message with the connection

Recommended safe setting:

DAILY_LIMIT=20
Running the Bot

Start the bot using:

npm start

The bot will:

Launch a browser window
Log into LinkedIn
Navigate to People You May Know
Start sending connection requests automatically
Pause between actions to simulate human behavior
Stop after reaching the configured daily limit

Example terminal output:

Sent connection 1/20
Sent connection 2/20
Sent connection 3/20
...
Sent connection 20/20
Daily limit reached
Daily Usage

To run the bot again:

npm start

The bot will automatically respect the configured daily connection limit.

Safety Guidelines

LinkedIn monitors automation behavior. Follow these precautions:

Rule	Reason
Keep connection requests ≤ 20/day	Prevent account restrictions
Never share your .env file	It contains your credentials
Watch the first runs	Ensure the bot behaves correctly
Solve CAPTCHAs manually if prompted	LinkedIn may request verification
If restricted, pause usage for 3–5 days	Resume with a lower limit
Disclaimer

This project is for educational and research purposes only.

Use automation responsibly and in accordance with LinkedIn's terms of service.

The author is not responsible for account restrictions or misuse.

If you want, I can also show you how to upgrade this bot to a serious growth automation tool with things like:

auto-finding target industries
AI personalized connection messages
profile scraping
lead generation database
CRM export
500+ safe connections per week
