const { chromium } = require('playwright');
const axios = require('axios');
const FormData = require('form-data');

const EVENT_URL = process.env.EVENT_URL || 'https://www.liputon.fi/events/109776';
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(EVENT_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    const content = await page.content();
    if (content.includes('Ei lippuja myynnissä')) {
      console.log('No tickets');
      return;
    }

    const buffer = await page.screenshot();
    const form = new FormData();
    const alertMessage = `@everyone 🚨 POSSIBLE TICKETS! Check screenshot below: ${EVENT_URL}`;

    form.append('content', alertMessage);
    form.append('file', buffer, { filename: 'screenshot.png' });

    if (!DISCORD_WEBHOOK) {
      throw new Error('DISCORD_WEBHOOK is not defined');
    }

    await axios.post(DISCORD_WEBHOOK, form, {
      headers: form.getHeaders(),
    });

    console.log('Alert sent successfully');
  } catch (error) {
    console.error('Failed to check tickets:', error.message);
  } finally {
    await browser.close();
  }
}

main();
