const fs = require('fs').promises;
const readline = require('readline');

const OFFERS_FILE = './data/offers.json';
const PAYOUTS_FILE = './data/offerPayouts.json';
const CUSTOM_PAYOUTS_FILE = './data/influencerCustomPayouts.json';

// Helper to read JSON file
async function readJSON(file) {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// Helper to write JSON file
async function writeJSON(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// Prompt helper
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer);
  }));
}

// Get base payout
async function getBasePayout() {
  const type = (await prompt('Enter base payout type (CPA/FIXED/CPA_AND_FIXED): ')).toUpperCase();
  const payout = { type };

  if (type === 'CPA' || type === 'CPA_AND_FIXED') {
    payout.cpaAmount = Number(await prompt('Enter base CPA amount: '));

    // Optional country-specific overrides
    const countryOverride = (await prompt('Add country-specific CPA overrides? (yes/no): ')).toLowerCase();
    if (countryOverride === 'yes') {
      payout.cpaCountryOverrides = {};
      while (true) {
        const country = await prompt('Enter country code (or press Enter to finish): ');
        if (!country) break;
        const amount = Number(await prompt(`Enter CPA amount for ${country}: `));
        payout.cpaCountryOverrides[country.toUpperCase()] = amount;
      }
    }
  }

  if (type === 'FIXED' || type === 'CPA_AND_FIXED') {
    payout.fixedAmount = Number(await prompt('Enter Fixed amount: '));
  }

  return payout;
}

/// Get custom payout for a specific influencer (always FIXED)
async function getCustomPayout(offerId) {
  const customPayouts = [];
  const addCustom = (await prompt('Add a custom payout for a specific influencer? (yes/no): ')).toLowerCase();

  if (addCustom === 'yes') {
    const influencerId = await prompt('Enter influencer ID: ');
    const fixedAmount = Number(await prompt('Enter FIXED amount for this influencer: '));

    customPayouts.push({
      offerId,
      influencerId,
      type: 'FIXED',
      fixedAmount
    });
  }

  return customPayouts;
}

// Main function
async function createOffer() {
  try {
    // Get offer info
    const title = await prompt('Enter offer title: ');
    const description = await prompt('Enter offer description: ');
    const catInput = await prompt('Enter categories (comma separated): ');
    const categories = catInput.split(',').map(c => c.trim());

    // Base payout
    const basePayout = await getBasePayout();

    // Read existing files
    const [offers, payouts, customPayoutsData] = await Promise.all([
      readJSON(OFFERS_FILE),
      readJSON(PAYOUTS_FILE),
      readJSON(CUSTOM_PAYOUTS_FILE)
    ]);

    // Create new offer
    const offerId = `offer_${Date.now()}`;
    offers.push({ id: offerId, title, description, categories });
    payouts.push({ offerId, ...basePayout });

    // Custom payouts
    const customPayouts = await getCustomPayout(offerId);
    const updatedCustomPayouts = [...customPayoutsData, ...customPayouts];

    // Save all
    await Promise.all([
      writeJSON(OFFERS_FILE, offers),
      writeJSON(PAYOUTS_FILE, payouts),
      writeJSON(CUSTOM_PAYOUTS_FILE, updatedCustomPayouts)
    ]);

    console.log(`Offer created successfully! Offer ID: ${offerId}`);
    if (customPayouts.length > 0) console.log('Custom payouts added for specific influencers.');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// Run
createOffer();
