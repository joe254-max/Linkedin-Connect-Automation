/**
 * LinkedIn Auto-Connect Tool
 * ==========================
 * Automatically sends connection requests on LinkedIn with human-like behavior.
 *
 * Features:
 * - Session persistence (saves cookies so you don't re-login every time)
 * - Human-like delays, scrolling, and mouse movements
 * - Daily safety limits to protect your account
 * - Progress tracking across runs
 * - Optional personalized connection messages
 * - Captcha / security check detection
 */

require("dotenv").config();
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

// ============================================
// Configuration from .env
// ============================================

const LINKEDIN_EMAIL = process.env.LINKEDIN_EMAIL;
const LINKEDIN_PASSWORD = process.env.LINKEDIN_PASSWORD;
const DAILY_LIMIT = parseInt(process.env.DAILY_LIMIT, 10) || 20;
const SEND_MESSAGE = process.env.SEND_MESSAGE === "true";
const CONNECTION_MESSAGE =
  process.env.CONNECTION_MESSAGE ||
  "Hi {firstName}, I'd love to connect and grow our networks together!";

// File paths
const PROGRESS_FILE = path.join(__dirname, "progress.json");
const SESSION_DIR = path.join(__dirname, "auth-session");

// ============================================
// Utility Functions
// ============================================

/**
 * Returns a random integer between min and max (inclusive).
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Waits for a random duration between minMs and maxMs milliseconds.
 * Logs the wait time so you can see what's happening.
 */
async function humanDelay(minMs = 3000, maxMs = 8000) {
  const delay = randomInt(minMs, maxMs);
  console.log(`   ⏳ Waiting ${(delay / 1000).toFixed(1)}s (human-like delay)...`);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Moves the mouse to a random position on the page to simulate human behavior.
 */
async function randomMouseMove(page) {
  const x = randomInt(100, 900);
  const y = randomInt(100, 600);
  await page.mouse.move(x, y, { steps: randomInt(5, 15) });
}

/**
 * Scrolls the page by a random amount to simulate browsing behavior.
 */
async function randomScroll(page) {
  const scrollAmount = randomInt(200, 600);
  await page.evaluate((amount) => {
    window.scrollBy({ top: amount, behavior: "smooth" });
  }, scrollAmount);
  await humanDelay(1000, 2000);
}

/**
 * Loads progress data from the progress.json file.
 * Creates a fresh file if it doesn't exist yet.
 */
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"));
      return data;
    } catch {
      console.log("⚠️  Could not parse progress.json, starting fresh.");
    }
  }

  // Default progress structure
  return {
    totalConnectionsSent: 0,
    lastRunDate: null,
    connectionsSentToday: 0,
  };
}

/**
 * Saves the current progress to progress.json.
 */
function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), "utf-8");
}

/**
 * Returns today's date as a YYYY-MM-DD string.
 */
function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

/**
 * Checks if the page is showing a captcha or security verification.
 * Returns true if a security challenge is detected.
 */
async function detectSecurityCheck(page) {
  const url = page.url();

  // LinkedIn redirects to a challenge page when it detects suspicious activity
  if (url.includes("/checkpoint/") || url.includes("/challenge/")) {
    return true;
  }

  // Check for common captcha or verification elements on the page
  const securityIndicators = [
    'text="Let\'s do a quick security check"',
    'text="Verify your identity"',
    'text="Security verification"',
    "#captcha-internal",
    'iframe[src*="captcha"]',
    'iframe[src*="recaptcha"]',
  ];

  for (const selector of securityIndicators) {
    try {
      const element = await page.$(selector);
      if (element) return true;
    } catch {
      // Selector didn't match, that's fine
    }
  }

  return false;
}

// ============================================
// Core Automation Logic
// ============================================

/**
 * Logs in to LinkedIn using credentials from the .env file.
 * If a saved session exists, it will be reused to skip login.
 */
async function loginToLinkedIn(context, page) {
  console.log("\n🔐 Navigating to LinkedIn...");
  await page.goto("https://www.linkedin.com/login", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  // Check if we're already logged in (session was restored from cookies)
  if (page.url().includes("/feed") || page.url().includes("/mynetwork")) {
    console.log("✅ Already logged in from saved session!");
    return true;
  }

  console.log("📝 Entering login credentials...");

  // Type email with a slight delay between keystrokes (more human-like)
  await page.fill("#username", "");
  await page.type("#username", LINKEDIN_EMAIL, { delay: randomInt(50, 120) });
  await humanDelay(500, 1500);

  // Type password
  await page.fill("#password", "");
  await page.type("#password", LINKEDIN_PASSWORD, { delay: randomInt(50, 120) });
  await humanDelay(500, 1500);

  // Click the login button
  await page.click('button[type="submit"]');
  console.log("   Waiting for login to complete...");

  // Wait for navigation after login
  await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
  await humanDelay(2000, 4000);

  // Check for security challenges after login
  if (await detectSecurityCheck(page)) {
    console.log("\n🚨 SECURITY CHECK DETECTED!");
    console.log("   LinkedIn is asking for verification.");
    console.log("   Please complete the check manually in the browser window.");
    console.log("   The script will wait for 2 minutes...\n");

    // Give the user time to solve the captcha manually
    try {
      await page.waitForURL("**/feed/**", { timeout: 120000 });
      console.log("✅ Security check passed! Continuing...");
    } catch {
      console.log("❌ Timed out waiting for security check. Stopping.");
      return false;
    }
  }

  // Verify login was successful
  const currentUrl = page.url();
  if (
    currentUrl.includes("/feed") ||
    currentUrl.includes("/mynetwork") ||
    currentUrl.includes("/in/")
  ) {
    console.log("✅ Login successful!");

    // Save the session cookies for next time
    await context.storageState({ path: path.join(SESSION_DIR, "state.json") });
    console.log("💾 Session saved for future runs.");
    return true;
  }

  console.log("❌ Login may have failed. Current URL:", currentUrl);
  return false;
}

/**
 * Extracts the first name from a connect button's surrounding card/element.
 * Used for personalized connection messages.
 */
async function getFirstName(connectButton) {
  try {
    // Try to find the name in the parent card element
    const card = await connectButton.evaluateHandle((btn) => {
      // Walk up the DOM to find the card container
      let el = btn;
      for (let i = 0; i < 10; i++) {
        el = el.parentElement;
        if (!el) break;
        // Look for common LinkedIn card selectors
        if (
          el.classList.contains("discover-person-card") ||
          el.classList.contains("mn-connection-card") ||
          el.classList.contains("entity-result") ||
          el.querySelector("span.discover-person-card__name") ||
          el.querySelector("span.mn-connection-card__name")
        ) {
          return el;
        }
      }
      return el;
    });

    if (card) {
      // Try multiple selectors LinkedIn might use for the person's name
      const nameSelectors = [
        "span.discover-person-card__name",
        "span.mn-connection-card__name",
        ".entity-result__title-text a span",
        "[data-anonymize='person-name']",
        ".artdeco-entity-lockup__title span",
      ];

      for (const selector of nameSelectors) {
        const nameEl = await card.$(selector);
        if (nameEl) {
          const fullName = await nameEl.innerText();
          // Return just the first name
          return fullName.trim().split(" ")[0];
        }
      }
    }
  } catch {
    // If we can't find the name, return a generic fallback
  }

  return "there";
}

/**
 * Main function: sends connection requests on LinkedIn.
 */
async function autoConnect() {
  // ── Validate credentials ──
  if (!LINKEDIN_EMAIL || !LINKEDIN_PASSWORD) {
    console.log("❌ Error: LINKEDIN_EMAIL and LINKEDIN_PASSWORD must be set in your .env file.");
    console.log("   Copy .env.example to .env and fill in your credentials.");
    process.exit(1);
  }

  // ── Load and check progress ──
  const progress = loadProgress();
  const today = getTodayDate();

  // Reset daily counter if it's a new day
  if (progress.lastRunDate !== today) {
    progress.connectionsSentToday = 0;
    progress.lastRunDate = today;
  }

  // Check if daily limit already reached
  if (progress.connectionsSentToday >= DAILY_LIMIT) {
    console.log(`\n🛑 Daily limit reached! You've already sent ${progress.connectionsSentToday} connections today.`);
    console.log(`   Come back tomorrow or adjust DAILY_LIMIT in your .env file.`);
    return;
  }

  const remaining = DAILY_LIMIT - progress.connectionsSentToday;
  console.log("\n🚀 LinkedIn Auto-Connect Starting...");
  console.log(`   Daily limit: ${DAILY_LIMIT} | Sent today: ${progress.connectionsSentToday} | Remaining: ${remaining}`);
  console.log(`   Total connections ever: ${progress.totalConnectionsSent}`);
  console.log(`   Send message with request: ${SEND_MESSAGE ? "Yes" : "No"}\n`);

  // ── Ensure session directory exists ──
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  // ── Launch the browser ──
  // Using a visible (headed) browser so LinkedIn is less likely to flag it
  const sessionExists = fs.existsSync(path.join(SESSION_DIR, "state.json"));
  const browser = await chromium.launch({
    headless: false,
    slowMo: randomInt(30, 80),
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--start-maximized",
    ],
  });

  // Restore previous session if available
  const contextOptions = {
    viewport: { width: 1366, height: 768 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    locale: "en-US",
  };

  if (sessionExists) {
    console.log("📂 Restoring previous login session...");
    contextOptions.storageState = path.join(SESSION_DIR, "state.json");
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  let connectionsSentThisRun = 0;

  try {
    // ── Step 1: Log in ──
    const loggedIn = await loginToLinkedIn(context, page);
    if (!loggedIn) {
      console.log("❌ Could not log in. Exiting.");
      await browser.close();
      return;
    }

    // ── Step 2: Navigate to My Network ──
    console.log("\n🌐 Navigating to My Network page...");
    await page.goto("https://www.linkedin.com/mynetwork/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await humanDelay(3000, 5000);

    // Check for security after navigation
    if (await detectSecurityCheck(page)) {
      console.log("\n🚨 SECURITY CHECK DETECTED on My Network page!");
      console.log("   Please solve it manually in the browser window.");
      console.log("   Waiting up to 2 minutes...\n");
      await page.waitForURL("**/mynetwork/**", { timeout: 120000 });
    }

    // ── Step 3: Send connection requests ──
    console.log("🔍 Looking for Connect buttons...\n");

    let scrollCount = 0;
    const maxScrollAttempts = 15;

    while (
      connectionsSentThisRun < remaining &&
      scrollCount < maxScrollAttempts
    ) {
      // Find all visible "Connect" buttons on the page
      const connectButtons = await page.$$('button:has-text("Connect"):visible');

      if (connectButtons.length === 0) {
        console.log("   No Connect buttons found, scrolling to load more...");
        await randomScroll(page);
        await randomScroll(page);
        scrollCount++;
        await humanDelay(2000, 4000);
        continue;
      }

      console.log(`   Found ${connectButtons.length} Connect button(s) on the page.`);

      // Click each Connect button
      for (const button of connectButtons) {
        // Stop if we've hit the remaining daily limit
        if (connectionsSentThisRun >= remaining) break;

        try {
          // Check for security challenges before each action
          if (await detectSecurityCheck(page)) {
            console.log("\n🚨 SECURITY CHECK DETECTED! Stopping to protect your account.");
            console.log("   Please solve the check manually and run the script again.\n");
            saveProgress(progress);
            await browser.close();
            return;
          }

          // Simulate human-like behavior: move mouse randomly
          await randomMouseMove(page);
          await humanDelay(1000, 2000);

          // Scroll the button into view
          await button.scrollIntoViewIfNeeded();
          await humanDelay(500, 1000);

          // Get the person's first name (for the message feature)
          const firstName = SEND_MESSAGE ? await getFirstName(button) : "";

          // Click the Connect button
          await button.click();
          await humanDelay(1500, 3000);

          // Handle the popup that appears after clicking Connect
          // LinkedIn may show: "Add a note" / "Send without a note"
          if (SEND_MESSAGE) {
            // ── Send WITH a personalized note ──
            try {
              const addNoteBtn = await page.$('button:has-text("Add a note")');
              if (addNoteBtn) {
                await addNoteBtn.click();
                await humanDelay(1000, 2000);

                // Fill in the custom message
                const messageText = CONNECTION_MESSAGE.replace(
                  "{firstName}",
                  firstName
                );
                const messageBox = await page.$(
                  'textarea[name="message"], textarea#custom-message'
                );
                if (messageBox) {
                  await messageBox.fill("");
                  await messageBox.type(messageText, {
                    delay: randomInt(30, 80),
                  });
                  await humanDelay(500, 1500);
                }

                // Click "Send" to send the request with the note
                const sendBtn = await page.$('button:has-text("Send")');
                if (sendBtn) {
                  await sendBtn.click();
                }
              } else {
                // No "Add a note" button — try "Send" directly
                const sendBtn = await page.$('button:has-text("Send"):visible');
                if (sendBtn) await sendBtn.click();
              }
            } catch (popupErr) {
              console.log(`   ⚠️  Popup handling error: ${popupErr.message}`);
              // Try to close any open modal
              const closeBtn = await page.$('button[aria-label="Dismiss"]');
              if (closeBtn) await closeBtn.click();
            }
          } else {
            // ── Send WITHOUT a note ──
            try {
              // Check if a modal appeared
              const sendWithoutNote = await page.$(
                'button:has-text("Send without a note")'
              );
              if (sendWithoutNote) {
                await humanDelay(500, 1000);
                await sendWithoutNote.click();
              } else {
                // Sometimes there's just a "Send" button or it sends directly
                const sendBtn = await page.$(
                  'button:has-text("Send"):visible'
                );
                if (sendBtn) {
                  await humanDelay(500, 1000);
                  await sendBtn.click();
                }
              }
            } catch (popupErr) {
              console.log(`   ⚠️  Popup handling error: ${popupErr.message}`);
              const closeBtn = await page.$('button[aria-label="Dismiss"]');
              if (closeBtn) await closeBtn.click();
            }
          }

          // Update counters
          connectionsSentThisRun++;
          progress.connectionsSentToday++;
          progress.totalConnectionsSent++;
          saveProgress(progress);

          console.log(
            `   ✅ Sent connection ${connectionsSentThisRun}/${remaining} | Total ever: ${progress.totalConnectionsSent}`
          );

          // Human-like delay between connection requests (3-8 seconds)
          await humanDelay(3000, 8000);

          // Every 10 connections, do an extra scroll to load more people
          if (connectionsSentThisRun % 10 === 0) {
            console.log("\n   📜 Scrolling to load more suggestions...");
            await randomScroll(page);
            await randomScroll(page);
            await humanDelay(3000, 5000);
          }
        } catch (err) {
          // If something breaks on one person, log it and continue to the next
          console.log(`   ⚠️  Error on a connection: ${err.message}`);
          console.log("   Skipping and moving to the next person...");

          // Try to dismiss any open modals/popups
          try {
            const closeBtn = await page.$('button[aria-label="Dismiss"]');
            if (closeBtn) await closeBtn.click();
          } catch {
            // Ignore if we can't close the modal
          }

          await humanDelay(2000, 4000);
        }
      }

      // Scroll down to load more people after processing current batch
      if (connectionsSentThisRun < remaining) {
        console.log("\n   📜 Scrolling to load more people...");
        await randomScroll(page);
        await randomScroll(page);
        scrollCount++;
        await humanDelay(2000, 4000);
      }
    }

    // ── Done! ──
    console.log("\n========================================");
    console.log("🎉 Auto-Connect Run Complete!");
    console.log(`   Connections sent this run: ${connectionsSentThisRun}`);
    console.log(`   Connections sent today: ${progress.connectionsSentToday}`);
    console.log(`   Total connections ever: ${progress.totalConnectionsSent}`);
    console.log("========================================\n");

    // Save the session for next time
    await context.storageState({ path: path.join(SESSION_DIR, "state.json") });
    console.log("💾 Session saved. You won't need to log in next time.\n");
  } catch (err) {
    console.log(`\n❌ Unexpected error: ${err.message}`);
    console.log("   Saving progress and shutting down gracefully...\n");
    saveProgress(progress);
  } finally {
    await browser.close();
  }
}

// ============================================
// Run the script
// ============================================

autoConnect().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
