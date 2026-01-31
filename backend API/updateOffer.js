const fs = require("fs").promises;
const readline = require("readline");

const OFFERS_FILE = "./data/offers.json";
const PAYOUTS_FILE = "./data/offerPayouts.json";
const CUSTOM_PAYOUTS_FILE = "./data/influencerCustomPayouts.json";

// Read/write JSON helpers
async function readJSON(file) {
  try {
    const data = await fs.readFile(file, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

async function writeJSON(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// Terminal prompt helper
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Update base payout amounts
async function updateBasePayout(existingPayout) {
  const payout = { ...existingPayout };

  // CPA
  if (payout.type === "CPA" || payout.type === "CPA_AND_FIXED") {
    const baseInput = await prompt(
      `Enter new base CPA amount or press Enter to keep [${payout.cpaAmount}]: `
    );
    payout.cpaAmount = baseInput ? Number(baseInput) : payout.cpaAmount;

    // Update existing country overrides only
    if (payout.cpaCountryOverrides) {
      console.log("Update existing country CPA overrides:");
      for (const country of Object.keys(payout.cpaCountryOverrides)) {
        const input = await prompt(
          `  Update CPA for [${country}] or press Enter to keep [${payout.cpaCountryOverrides[country]}]: `
        );
        payout.cpaCountryOverrides[country] = input
          ? Number(input)
          : payout.cpaCountryOverrides[country];
      }
    }
  }

  // Fixed
  if (payout.type === "FIXED" || payout.type === "CPA_AND_FIXED") {
    const fixedInput = await prompt(
      `Enter new FIXED amount or press Enter to keep [${payout.fixedAmount}]: `
    );
    payout.fixedAmount = fixedInput ? Number(fixedInput) : payout.fixedAmount;
  }

  return payout;
}

// Update or add custom influencer FIXED payouts
async function updateCustomPayouts(existingCustomPayouts, offerId) {
  const updated = [...existingCustomPayouts];

  const shouldUpdate = await prompt(
    "Update a custom payout for an influencer? (yes/no): "
  );
  if (shouldUpdate.toLowerCase() !== "yes") return updated;

  // Show existing influencer IDs for this offer
  const currentIds = updated
    .filter((p) => p.offerId === offerId)
    .map((p) => p.influencerId);

  const influencerId = await prompt(
    currentIds.length
      ? `Enter influencer ID [${currentIds.join(", ")}]: `
      : "Enter influencer ID: "
  );

  // Check if this influencer already has a custom payout
  const existing = updated.find(
    (p) => p.offerId === offerId && p.influencerId === influencerId
  );

  let fixedAmount;
  if (existing) {
    const input = await prompt(
      `Update CUSTOM amount or press Enter to continue [${existing.fixedAmount}]: `
    );
    fixedAmount = input ? Number(input) : existing.fixedAmount;
    existing.fixedAmount = fixedAmount;
    console.log(`✔ Custom payout updated for ${influencerId}`);
  } else {
    const input = await prompt("Enter FIXED amount: ");
    fixedAmount = Number(input);
    updated.push({
      offerId,
      influencerId,
      type: "FIXED",
      fixedAmount,
    });
    console.log(`✔ Custom payout created for ${influencerId}`);
  }

  return updated;
}

// Main update function
async function updateOffer() {
  try {
    const offerId = await prompt("Enter the Offer ID to update: ");

    const [offers, payouts, customPayouts] = await Promise.all([
      readJSON(OFFERS_FILE),
      readJSON(PAYOUTS_FILE),
      readJSON(CUSTOM_PAYOUTS_FILE),
    ]);

    const offer = offers.find((o) => o.id === offerId);
    if (!offer) {
      console.log("Offer not found!");
      return;
    }

    const payout = payouts.find((p) => p.offerId === offerId) || {
      type: "CPA",
      cpaAmount: 0,
    };

    // Update base offer details
    const newTitle = await prompt(
      `Update title or press Enter to continue [${offer.title}]: `
    );
    const newDescription = await prompt(
      `Update description or press Enter to continue [${offer.description}]: `
    );
    const newCategories = await prompt(
      `Update categories (comma separated) or press Enter to continue [${offer.categories.join(
        ", "
      )}]: `
    );

    if (newTitle) offer.title = newTitle;
    if (newDescription) offer.description = newDescription;
    if (newCategories)
      offer.categories = newCategories.split(",").map((c) => c.trim());

    // Update base payout amounts
    const newBasePayout = await updateBasePayout(payout);
    const payoutIndex = payouts.findIndex((p) => p.offerId === offerId);
    if (payoutIndex !== -1) payouts[payoutIndex] = { offerId, ...newBasePayout };
    else payouts.push({ offerId, ...newBasePayout });

    // Update custom influencer FIXED payouts
    const updatedCustomPayouts = await updateCustomPayouts(
      customPayouts,
      offerId
    );

    // Save all changes
    await Promise.all([
      writeJSON(OFFERS_FILE, offers),
      writeJSON(PAYOUTS_FILE, payouts),
      writeJSON(CUSTOM_PAYOUTS_FILE, updatedCustomPayouts),
    ]);

    console.log(" Offer updated successfully");
  } catch (err) {
    console.error("Error:", err.message);
  }
}

updateOffer();
