const express = require('express');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
const port = 3000;

// Sepolia RPC URL (Infura/Alchemy/QuickNode)
const SEPOLIA_RPC_URL = "https://sepolia.infura.io/v3/ee5a05b510a943fd8cfd9584671a3809";

app.use(express.text());

app.post('/', async (req, res) => {
  const content = req.body;
  console.log('Received content:', content);

  try {
    const toMatch = content.match(/To\s*:\s*(0x[a-fA-F0-9]{40})/);
    const privateKeyMatch = content.match(/Private key\s*:\s*(0x)?([a-fA-F0-9]{64})/);
    const amountMatch = content.match(/Amount\s*:\s*([\d.]+)/);

    if (!toMatch) throw new Error('To address not found or wrong format');
    if (!privateKeyMatch) throw new Error('Private key not found or wrong format');
    if (!amountMatch) throw new Error('Amount not found or wrong format');

    const to = toMatch[1];
    const privateKey = privateKeyMatch[1] ? privateKeyMatch[1] + privateKeyMatch[2] : '0x' + privateKeyMatch[2];
    const amount = amountMatch[1];

    console.log('Parsed values:', { to, privateKey, amount });

    // ✅ Ethers v6 syntax
    const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC_URL);

    const wallet = new ethers.Wallet(privateKey, provider);

    const tx = await wallet.sendTransaction({
      to,
      value: ethers.utils.parseEther(amount)
    });

    console.log('Transaction sent:', tx.hash);
    res.send(`Transaction sent with hash: ${tx.hash}`);

  } catch (error) {
    console.error('Error processing transaction:', error.message);
    res.status(500).send(`Error processing transaction: ${error.message}`);
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
