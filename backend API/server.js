const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, "data");

const readJSON = async (file) => {
  const data = await fs.readFile(path.join(DATA_DIR, file), "utf8");
  return JSON.parse(data);
};

// OFFERS
app.get("/offers", async (req, res) => {
  try {
    const offers = await readJSON("offers.json");
    res.json(offers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// BASE PAYOUTS
app.get("/offerPayouts", async (req, res) => {
  try {
    const payouts = await readJSON("offerPayouts.json");
    res.json(payouts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CUSTOM PAYOUTS
app.get("/influencerCustomPayouts", async (req, res) => {
  try {
    const custom = await readJSON("influencerCustomPayouts.json");
    res.json(custom); // MUST be array
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
