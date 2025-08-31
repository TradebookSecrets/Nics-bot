const puppeteer = require("puppeteer");
const cron = require("node-cron");
const fs = require("fs");
const express = require("express");

// === CONFIG ===
const COOKIES_PATH = "./cookies.json"; // FB cookies file
const THREAD_ID = "8266164920164005";  // <-- imong GC thread ID
const GC_URL = `https://www.facebook.com/messages/t/${THREAD_ID}`;

// === Get Random Bible Verse ===
async function getVerse() {
  try {
    const res = await fetch("https://labs.bible.org/api/?passage=random&type=json");
    const data = await res.json();
    return `${data[0].bookname} ${data[0].chapter}:${data[0].verse} - ${data[0].text}`;
  } catch (e) {
    console.error("Verse fetch error:", e);
    return "📖 Daily Verse unavailable right now.";
  }
}

// === Send to Messenger GC ===
async function sendToGC() {
  const verse = await getVerse();
  console.log("Verse:", verse);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  if (fs.existsSync(COOKIES_PATH)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH));
    await page.setCookie(...cookies);
  } else {
    console.error("❌ No cookies.json found. Please export your FB cookies!");
    await browser.close();
    return;
  }

  try {
    await page.goto(GC_URL, { waitUntil: "networkidle2" });
    await page.waitForSelector("div[aria-label='Message']", { timeout: 20000 });
    await page.click("div[aria-label='Message']");
    await page.keyboard.type(`📖 Daily Bible Verse:\n${verse}`, { delay: 50 });
    await page.keyboard.press("Enter");
    console.log("✅ Sent to Messenger GC.");
  } catch (err) {
    console.error("❌ Error sending to GC:", err);
  }

  await browser.close();
}

// === Schedule (Asia/Manila) ===
cron.schedule("0 6 * * *", sendToGC, { timezone: "Asia/Manila" });
cron.schedule("0 12 * * *", sendToGC, { timezone: "Asia/Manila" });
cron.schedule("0 17 * * *", sendToGC, { timezone: "Asia/Manila" });
cron.schedule("0 22 * * *", sendToGC, { timezone: "Asia/Manila" });

console.log("📖 Messenger GC Bot running... Scheduled at 6AM, 12NN, 5PM, 10PM (Asia/Manila).");

// === Keep-alive Express server (for Render) ===
const app = express();
app.get("/", (req, res) => res.send("Bible Bot is running"));
app.listen(10000, () => console.log("✅ Keep-alive server running on port 10000"));
