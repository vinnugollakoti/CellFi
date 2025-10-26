const express = require("express");
const { ethers } = require("ethers");
const { Vonage } = require("@vonage/server-sdk");
require("dotenv").config();

const app = express();
const port = 3000;

// --- CONFIG ---
const SEPOLIA_RPC_URL = "https://sepolia.infura.io/v3/ee5a05b510a943fd8cfd9584671a3809";
const GAS_PAYER_PRIVATE_KEY = "0x7958083eb4cc34514394640b3c440ffd47cb7d35f9e9f73dbffd13465d271221";

// --- VONAGE SETUP ---
const vonage = new Vonage({
  apiKey: "37fe6925",
  apiSecret: "(5Bj7QJe!8Q^Un27oa!U", // Replace with your real secret
});

const SMS_FROM = "Vonage APIs";

// --- HELPERS ---
async function sendSMS(to, text) {
  const from = SMS_FROM;
  try {
    await vonage.sms
      .send({ to, from, text })
      .then(resp => {
        console.log("✅ SMS sent successfully:", resp.messages[0].status === "0" ? "OK" : resp.messages[0]["error-text"]);
      })
      .catch(err => {
        console.error("❌ SMS sending failed:", err);
      });
  } catch (err) {
    console.error("❌ Exception during SMS send:", err.message);
  }
}

// --- EXPRESS CONFIG ---
app.use(express.text());

// --- MAIN ROUTE ---
app.post("/", async (req, res) => {
  const content = req.body;
  console.log("📩 Received message:\n", content);

  try {
    // --- Parse message body ---
    const typeMatch = content.match(/Type\s*:\s*(Transfer|Swap)/i);
    const signatureMatch = content.match(/Signature\s*:\s*(0x[a-fA-F0-9]+)/);
    const senderMatch = content.match(/Sender Mobile number\s*:\s*(\+?\d+)/);
    const receiverMatch = content.match(/Receiver Mobile number\s*:\s*(\+?\d+)/);

    if (!typeMatch) throw new Error("Type (Transfer/Swap) not found");
    if (!signatureMatch) throw new Error("Signature not found");
    if (!senderMatch || !receiverMatch) throw new Error("Mobile numbers missing");

    const type = typeMatch[1];
    const signature = signatureMatch[1];
    const senderNumber = senderMatch[1];
    const receiverNumber = receiverMatch[1];

    console.log("✅ Parsed values:", { type, senderNumber, receiverNumber });

    // --- Setup provider and wallet ---
    const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const gasPayer = new ethers.Wallet(GAS_PAYER_PRIVATE_KEY, provider);

    console.log(`🚀 Executing ${type} transaction...`);

    // --- Send signed transaction ---
    const txResponse = await provider.sendTransaction(signature);
    const receipt = await txResponse.wait();

    // --- Fetch transaction details ---
    const tx = await provider.getTransaction(txResponse.hash);
    const amountEth = ethers.utils.formatEther(tx.value || 0);
    const toAddress = tx.to;
    const fromAddress = tx.from;

    console.log(`✅ Transaction confirmed: ${txResponse.hash}`);

    // --- SMS for receiver ---
    const receiverMsg = `✅ You received ${amountEth} ETH from ${fromAddress}.\nTx: ${txResponse.hash}`;
    await sendSMS(receiverNumber, receiverMsg);

    // --- SMS for sender ---
    const senderMsg = `✅ You sent ${amountEth} ETH to ${toAddress} successfully.\nTx: ${txResponse.hash}`;
    await sendSMS(senderNumber, senderMsg);

    res.send(`✅ ${type} executed.\nTx Hash: ${txResponse.hash}`);

  } catch (err) {
    console.error("❌ Error:", err.message);

    // Send SMS to sender only on failure
    const senderNumber = (req.body.match(/Sender Mobile number\s*:\s*(\+?\d+)/) || [])[1];
    if (senderNumber) {
      await sendSMS(senderNumber, `❌ Your transaction failed.\nReason: ${err.message}`);
    }

    res.status(400).send(`❌ Transaction failed: ${err.message}`);
  }
});

app.listen(port, () => console.log(`🚀 Server running at http://localhost:${port}`));
