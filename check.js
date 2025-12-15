const { chromium } = require('playwright');
const axios = require('axios');
const FormData = require('form-data');

const EVENT_URL = process.env.EVENT_URL || 'https://www.liputon.fi/events/109776';
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

const eventUrls = EVENT_URL.split(',')
  .map((url) => url.trim())
  .filter(Boolean);

async function checkEvent(page, url) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  const content = await page.content();
  if (content.includes('Ei lippuja myynnissä')) {
    console.log(`No tickets for ${url}`);
    return false;
  }

  const buffer = await page.screenshot();
  const form = new FormData();
  const alertMessage = `@everyone 🚨 POSSIBLE TICKETS! Check screenshot below: ${url}`;

  form.append('content', alertMessage);
  form.append('file', buffer, { filename: 'screenshot.png' });

  if (!DISCORD_WEBHOOK) {
    throw new Error('DISCORD_WEBHOOK is not defined');
  }

  await axios.post(DISCORD_WEBHOOK, form, {
    headers: form.getHeaders(),
  });

  console.log(`Alert sent successfully for ${url}`);
  return true;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const results = [];

    for (const url of eventUrls) {
      const alertSent = await checkEvent(page, url);
      results.push({ url, alertSent });
    }

    const alertedEvents = results.filter((result) => result.alertSent);
    if (alertedEvents.length === 0) {
      console.log('No tickets found for any configured events');
    }
  } catch (error) {
    console.error('Failed to check tickets:', error.message);
  } finally {
    await browser.close();
  }
}

main();
