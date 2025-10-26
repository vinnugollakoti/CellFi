import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as SMS from "expo-sms";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { ethers } from "ethers";

import ETHIcon from "./components/icons/ETHIcon";
import BTCIcon from "./components/icons/BTCIcon";
import USDTIcon from "./components/icons/USDTIcon";
import BNBIcon from "./components/icons/BNBIcon";
import SOLIcon from "./components/icons/SOLIcon";

// --- Token Options ---
const tokenOptions = [
  { name: "Ethereum", symbol: "ETH", IconComponent: ETHIcon },
  { name: "Bitcoin", symbol: "BTC", IconComponent: BTCIcon },
  { name: "Tether", symbol: "USDT", IconComponent: USDTIcon },
  { name: "Binance Coin", symbol: "BNB", IconComponent: BNBIcon },
  { name: "Solana", symbol: "SOL", IconComponent: SOLIcon },
];

// Transaction Type Options
const transactionOptions = ["Transfer", "Swap"];

// --- Reusable Input Component ---
const InputWithIcon = ({
  iconName,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  note,
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    {note && <Text style={styles.note}>{note}</Text>}
    <View style={styles.inputContainer}>
      <Feather
        name={iconName}
        size={18}
        color="#999"
        style={styles.inputIcon}
        pointerEvents="none"
      />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType || "default"}
        placeholderTextColor="#999"
        secureTextEntry={secureTextEntry}
      />
    </View>
  </View>
);

// --- Nonce Management ---
const NONCE_KEY = "offline_nonce";

const getNonce = async (walletAddress) => {
  const state = await NetInfo.fetch();
  const isConnected = state.isConnected;

  if (isConnected) {
    try {
      const provider = new ethers.JsonRpcProvider(
        "https://sepolia.infura.io/v3/YOUR_INFURA_KEY"
      );
      const networkNonce = await provider.getTransactionCount(walletAddress);
      await AsyncStorage.setItem(NONCE_KEY, networkNonce.toString());
      return networkNonce;
    } catch (err) {
      console.warn("Error fetching nonce online, using stored nonce:", err);
    }
  }

  const storedNonce = await AsyncStorage.getItem(NONCE_KEY);
  return storedNonce ? parseInt(storedNonce, 10) : 0;
};

const incrementNonce = async () => {
  const storedNonce = await AsyncStorage.getItem(NONCE_KEY);
  const newNonce = storedNonce ? parseInt(storedNonce, 10) + 1 : 1;
  await AsyncStorage.setItem(NONCE_KEY, newNonce.toString());
  return newNonce;
};

const setupNonceSync = (walletAddress) => {
  NetInfo.addEventListener(async (state) => {
    if (state.isConnected) {
      try {
        const provider = new ethers.JsonRpcProvider(
          "https://sepolia.infura.io/v3/YOUR_INFURA_KEY"
        );
        const networkNonce = await provider.getTransactionCount(walletAddress);
        await AsyncStorage.setItem(NONCE_KEY, networkNonce.toString());
        console.log("Nonce synced with network:", networkNonce);
      } catch (err) {
        console.warn("Failed to sync nonce:", err);
      }
    }
  });
};

// --- Generate Ethereum Signature ---
async function generateSignature(privateKey, toAddress, amountEth) {
  if (!privateKey.startsWith("0x")) privateKey = "0x" + privateKey.trim();
  const wallet = new ethers.Wallet(privateKey);

  // Get nonce dynamically
  let nonce = await getNonce(wallet.address);

  const tx = {
    to: toAddress,
    value: ethers.parseEther(amountEth.toString()),
    nonce: nonce,
    gasLimit: 21000n,
    gasPrice: ethers.parseUnits("10", "gwei"),
    chainId: 11155111,
  };

  const signedTx = await wallet.signTransaction(tx);

  // If offline → increment local nonce
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    await incrementNonce();
  }

  return signedTx;
}

// --- Main App ---
export default function App() {
  const [transactionType, setTransactionType] = useState("");
  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [messageBody, setMessageBody] = useState(
    "SMS content will appear here after generating signature."
  );
  const [errors, setErrors] = useState({});
  const [isTokenPickerVisible, setIsTokenPickerVisible] = useState(false);
  const [isTxnPickerVisible, setIsTxnPickerVisible] = useState(false);

  // --- Sync nonce when app starts
  useEffect(() => {
    if (privateKey) setupNonceSync(privateKey.startsWith("0x") ? privateKey : "0x" + privateKey);
  }, [privateKey]);

  // --- Validation ---
  const validateInputs = () => {
    const newErrors = {};
    if (!transactionType) newErrors.transactionType = "Please select a transaction type.";
    if (!token) newErrors.token = "Please select a token.";
    if (!amount || isNaN(amount) || Number(amount) <= 0)
      newErrors.amount = "Enter a valid numeric amount.";
    if (!toAddress) newErrors.toAddress = "Recipient address is required.";
    else if (!ethers.isAddress(toAddress)) newErrors.toAddress = "Invalid Ethereum address.";
    if (!privateKey) newErrors.privateKey = "Private key is required.";
    else if (!privateKey.replace(/\s+/g, "").match(/^(0x)?[a-fA-F0-9]{64}$/))
      newErrors.privateKey = "Invalid private key format.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const selectedTokenData = tokenOptions.find((t) => t.symbol === token);
  const CurrentTokenIcon = selectedTokenData ? selectedTokenData.IconComponent : null;

  const TokenItem = ({ token, onSelect }) => {
    const Icon = token.IconComponent;
    return (
      <TouchableOpacity style={styles.tokenItem} onPress={() => onSelect(token.symbol)}>
        <View style={styles.tokenIconWrapper}>
          <Icon width={24} height={24} />
        </View>
        <Text style={styles.tokenName}>
          {token.name} ({token.symbol})
        </Text>
      </TouchableOpacity>
    );
  };

  const TxnItem = ({ type, onSelect }) => (
    <TouchableOpacity style={styles.txnItem} onPress={() => onSelect(type)}>
      <Text style={styles.txnText}>{type}</Text>
    </TouchableOpacity>
  );

  const handleSendSMS = async (text) => {
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      const { result } = await SMS.sendSMSAsync(["+918074503341"], text);
      console.log("SMS result:", result);
    } else {
      alert("SMS not supported on this device.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>CellFi</Text>
        <Text style={styles.subtitle}>Generate Signature in 1 min</Text>

        <View style={styles.form}>
          {/* Transaction Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Type of Transaction :</Text>
            <TouchableOpacity
              style={styles.dropdownContainer}
              onPress={() => setIsTxnPickerVisible(true)}
            >
              <Feather name="shuffle" size={18} color="#999" style={styles.inputIcon} />
              <Text style={styles.dropdownText}>
                {transactionType || "Select Transfer / Swap"}
              </Text>
              <Feather name="chevron-down" size={18} color="#999" />
            </TouchableOpacity>
            {errors.transactionType && <Text style={styles.errorText}>{errors.transactionType}</Text>}
          </View>

          {/* Token Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Token :</Text>
            <TouchableOpacity style={styles.dropdownContainer} onPress={() => setIsTokenPickerVisible(true)}>
              {CurrentTokenIcon ? (
                <View style={styles.tokenIconContainer}>
                  <CurrentTokenIcon width={24} height={24} />
                </View>
              ) : (
                <Feather name="dollar-sign" size={18} color="#999" style={styles.inputIcon} />
              )}
              <Text style={styles.dropdownText}>{token || "Select your token"}</Text>
              <Feather name="chevron-down" size={18} color="#999" />
            </TouchableOpacity>
            {errors.token && <Text style={styles.errorText}>{errors.token}</Text>}
          </View>

          {/* Amount */}
          <InputWithIcon
            iconName="hash"
            label="Amount :"
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            keyboardType="numeric"
          />
          {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}

          {/* Recipient Address */}
          <InputWithIcon
            iconName="target"
            label="To Address :"
            value={toAddress}
            onChangeText={setToAddress}
            placeholder="0x..."
          />
          {errors.toAddress && <Text style={styles.errorText}>{errors.toAddress}</Text>}

          {/* Private Key */}
          <InputWithIcon
            iconName="key"
            label="Private key :"
            note="Private key will not be shared (offline only)."
            value={privateKey}
            onChangeText={setPrivateKey}
            placeholder="Enter private key"
            secureTextEntry
          />
          {errors.privateKey && <Text style={styles.errorText}>{errors.privateKey}</Text>}

          {/* Generate Signature Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={async () => {
              if (!validateInputs()) return;
              try {
                const normalizedKey = privateKey.startsWith("0x") ? privateKey : "0x" + privateKey.trim();
                const signed = await generateSignature(normalizedKey, toAddress, amount);
                setMessageBody(signed);
                await handleSendSMS(signed);
              } catch (err) {
                Alert.alert("Error", err.message);
              }
            }}
          >
            <Text style={styles.buttonText}>Generate Sign</Text>
            <Feather name="edit-3" size={18} color="#fff" style={styles.buttonIcon} />
          </TouchableOpacity>

          {/* Message Box */}
          <View style={styles.messageBox}>
            <Text style={styles.label}>Your Message Body :</Text>
            <View style={styles.messageContainer}>
              <Text style={styles.messageText}>{messageBody}</Text>
              <Feather
                name="copy"
                size={18}
                color="#999"
                style={styles.copyIcon}
                onPress={() => Clipboard.setStringAsync(messageBody)}
              />
            </View>
            <TouchableOpacity style={styles.button} onPress={() => handleSendSMS(messageBody)}>
              <Text style={styles.buttonText}>Send SMS</Text>
              <Feather name="send" size={18} color="#fff" style={styles.buttonIcon} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Token Modal */}
        <Modal
          visible={isTokenPickerVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsTokenPickerVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setIsTokenPickerVisible(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Token</Text>
              <ScrollView>
                {tokenOptions.map((tokenItem) => (
                  <TokenItem
                    key={tokenItem.symbol}
                    token={tokenItem}
                    onSelect={(symbol) => {
                      setToken(symbol);
                      setIsTokenPickerVisible(false);
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        {/* Transaction Type Modal */}
        <Modal
          visible={isTxnPickerVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsTxnPickerVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setIsTxnPickerVisible(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Transaction Type</Text>
              {transactionOptions.map((type) => (
                <TxnItem
                  key={type}
                  type={type}
                  onSelect={(selectedType) => {
                    setTransactionType(selectedType);
                    setIsTxnPickerVisible(false);
                  }}
                />
              ))}
            </View>
          </Pressable>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles (same as your original) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { alignItems: "center", paddingVertical: 30, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 10, color: "#000" },
  subtitle: { fontSize: 18, textAlign: "center", marginBottom: 25, color: "#333" },
  form: { width: "100%" },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 4 },
  note: { fontSize: 12, color: "#666", marginBottom: 4 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bbb",
    borderRadius: 8,
    paddingHorizontal: 10,
    borderStyle: "dashed",
    backgroundColor: "#fefefe",
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: "#333" },
  dropdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bbb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderStyle: "dashed",
    backgroundColor: "#fefefe",
    justifyContent: "space-between",
  },
  tokenIconContainer: { marginRight: 8, width: 24, height: 24, justifyContent: "center", alignItems: "center" },
  dropdownText: { flex: 1, fontSize: 14, color: "#333", paddingLeft: 5 },
  button: { backgroundColor: "#000", paddingVertical: 14, borderRadius: 8, marginTop: 25, flexDirection: "row", justifyContent: "center", alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16, marginRight: 8 },
  buttonIcon: { marginLeft: 8 },
  messageBox: { width: "100%", marginTop: 40 },
  messageContainer: { borderWidth: 1, borderColor: "#bbb", borderRadius: 8, padding: 20, marginTop: 10, backgroundColor: "#f9f9f9", borderStyle: "dashed", flexDirection: "row", justifyContent: "space-between" },
  messageText: { fontSize: 14, textAlign: "left", color: "#555", flex: 1 },
  copyIcon: { marginLeft: 10 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "80%", padding: 20, backgroundColor: "white", borderRadius: 10, elevation: 10, maxHeight: "70%" },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15, borderBottomWidth: 1, borderBottomColor: "#eee", paddingBottom: 10 },
  tokenItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  txnItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  txnText: { fontSize: 16, color: "#333" },
  tokenIconWrapper: { width: 24, height: 24, marginRight: 10, justifyContent: "center", alignItems: "center" },
  tokenName: { fontSize: 16, color: "#333" },
  errorText: { color: "red", fontSize: 12, marginTop: 4 },
});
