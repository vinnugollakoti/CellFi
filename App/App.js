import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// Assuming you have '@expo/vector-icons' (for general icons) installed
import { Feather } from "@expo/vector-icons";
// Import specific branded coin icons from @web3icons/react
// NOTE: You must have 'react-native-svg' installed for these to render correctly in RN.
//

// --- Token Data with Web3Icon Components ---
// const tokenOptions = [
//   { name: "Ethereum", symbol: "ETH", IconComponent: TokenETH, defaultIcon: Feather, defaultIconName: "aperture" },
//   { name: "Bitcoin", symbol: "BTC", IconComponent: TokenBTC, defaultIcon: Feather, defaultIconName: "bold" },
//   { name: "Tether", symbol: "USDT", IconComponent: TokenUSDT, defaultIcon: Feather, defaultIconName: "dollar-sign" },
//   { name: "Binance Coin", symbol: "BNB", IconComponent: TokenBNB, defaultIcon: Feather, defaultIconName: "box" },
//   { name: "Solana", symbol: "SOL", IconComponent: TokenSOL, defaultIcon: Feather, defaultIconName: "sun" },
// ];

import ETHIcon from "./components/icons/ETHIcon";
import BTCIcon from "./components/icons/BTCIcon";
import USDTIcon from "./components/icons/USDTIcon";
import BNBIcon from "./components/icons/BNBIcon";
import SOLIcon from "./components/icons/SOLIcon";

const tokenOptions = [
  { name: "Ethereum", symbol: "ETH", IconComponent: ETHIcon },
  { name: "Bitcoin", symbol: "BTC", IconComponent: BTCIcon },
  { name: "Tether", symbol: "USDT", IconComponent: USDTIcon },
  { name: "Binance Coin", symbol: "BNB", IconComponent: BNBIcon },
  { name: "Solana", symbol: "SOL", IconComponent: SOLIcon },
];

// Dropdown options for Transaction Type
const transactionOptions = ["Transfer", "Swap"];

// Reusable Input Component with Icon
const InputWithIcon = ({ iconName, label, value, onChangeText, placeholder, keyboardType, secureTextEntry, note }) => (
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


export default function App() {
  const [transactionType, setTransactionType] = useState("");
  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [messageBody, setMessageBody] = useState(
    "SMS content will be displayed here after generating the signature."
  );

  // State for controlling dropdown/modal visibility
  const [isTokenPickerVisible, setIsTokenPickerVisible] = useState(false);
  const [isTxnPickerVisible, setIsTxnPickerVisible] = useState(false);

  // Helper function to find the icon component for the currently selected token
  const selectedTokenData = tokenOptions.find((t) => t.symbol === token);
  const CurrentTokenIcon = selectedTokenData
    ? selectedTokenData.IconComponent
    : null;

  // Component for Token Dropdown Item - NOW USES REAL ICON
  const TokenItem = ({ token, onSelect }) => {
    const Icon = token.IconComponent;
    return (
      <TouchableOpacity
        style={styles.tokenItem}
        onPress={() => onSelect(token.symbol)}
      >
        <View style={styles.tokenIconWrapper}>
          {/* USAGE OF WEB3 ICON */}
          <Icon size={24} variant="branded" />
        </View>
        <Text style={styles.tokenName}>
          {token.name} ({token.symbol})
        </Text>
      </TouchableOpacity>
    );
  };

  // Component for Transaction Type Dropdown Item
  const TxnItem = ({ type, onSelect }) => {
    return (
      <TouchableOpacity style={styles.txnItem} onPress={() => onSelect(type)}>
        <Text style={styles.txnText}>{type}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        <Text style={styles.title}>CellFi</Text>
        <Text style={styles.subtitle}>Generate Signature in 1 min</Text>

        <View style={styles.form}>
          {/* --- Transaction Type Dropdown --- */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Type of Transaction (select Transfer or Swap) :
            </Text>
            <TouchableOpacity
              style={styles.dropdownContainer}
              onPress={() => setIsTxnPickerVisible(true)}
            >
              <Feather
                name="shuffle"
                size={18}
                color="#999"
                style={styles.inputIcon}
              />
              <Text style={styles.dropdownText}>
                {transactionType || "Select Transfer / Swap"}
              </Text>
              <Feather name="chevron-down" size={18} color="#999" />
            </TouchableOpacity>
          </View>

          {/* --- Token Dropdown (with Web3 Icon) --- */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Token (Select your token symbol) :</Text>
            <TouchableOpacity
              style={styles.dropdownContainer}
              onPress={() => setIsTokenPickerVisible(true)}
            >
              {/* CONDITIONALLY RENDER SELECTED WEB3 ICON OR FALLBACK FEATHER ICON */}
              {CurrentTokenIcon ? (
                <View style={styles.tokenIconContainer}>
                  <CurrentTokenIcon width={24} height={24} />
                </View>
              ) : (
                <Feather
                  name="dollar-sign"
                  size={18}
                  color="#999"
                  style={styles.inputIcon}
                />
              )}
              <Text style={styles.dropdownText}>
                {token || "Select your token"}
              </Text>
              <Feather name="chevron-down" size={18} color="#999" />
            </TouchableOpacity>
          </View>

          <InputWithIcon
            iconName="hash"
            label="Amount :"
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            keyboardType="numeric"
          />
          <InputWithIcon
            iconName="target"
            label="To Address :"
            value={toAddress}
            onChangeText={setToAddress}
            placeholder="0x..."
          />
          <InputWithIcon
            iconName="key"
            label="Private key :"
            note="Private key will not be shared to anyone since this app is fully offline."
            value={privateKey}
            onChangeText={setPrivateKey}
            placeholder="Enter private key"
            secureTextEntry
          />

          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Generate Sign</Text>
            <Feather
              name="edit-3"
              size={18}
              color="#fff"
              style={styles.buttonIcon}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.messageBox}>
          <Text style={styles.label}>Your message Body :</Text>
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>{messageBody}</Text>
            <Feather
              name="copy"
              size={18}
              color="#999"
              style={styles.copyIcon}
            />
          </View>

          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Send SMS</Text>
            <Feather
              name="send"
              size={18}
              color="#fff"
              style={styles.buttonIcon}
            />
          </TouchableOpacity>
        </View>

        {/* --- Token Selection Modal --- */}
        <Modal
          visible={isTokenPickerVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsTokenPickerVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setIsTokenPickerVisible(false)}
          >
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

        {/* --- Transaction Type Selection Modal --- */}
        <Modal
          visible={isTxnPickerVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsTxnPickerVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setIsTxnPickerVisible(false)}
          >
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { alignItems: "center", paddingVertical: 30, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 10, color: "#000" },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 25,
    color: "#333",
  },
  form: { width: "100%" },inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  note: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },

  // --- Input/Dropdown Styles ---
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
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 0,
    color: "#333",
  },

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
  // Wrapper for the Web3 Icon in the main dropdown view
  tokenIconContainer: {
    marginRight: 8,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownText: { flex: 1, fontSize: 14, color: "#333", paddingLeft: 5 },

  // --- Button Styles ---
  button: {
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 25,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginRight: 8,
  },
  buttonIcon: { marginLeft: 8 },

  // --- Message Box Styles ---
  messageBox: { width: "100%", marginTop: 40 },
  messageContainer: {
    borderWidth: 1,
    borderColor: "#bbb",
    borderRadius: 8,
    padding: 20,
    marginTop: 10,
    backgroundColor: "#f9f9f9",
    borderStyle: "dashed",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  messageText: { fontSize: 14, textAlign: "left", color: "#555", flex: 1 },
  copyIcon: { marginLeft: 10 },

  // --- Modal Styles (for Token/Txn Selection) ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    padding: 20,
    backgroundColor: "white",
    borderRadius: 10,
    elevation: 10,
    maxHeight: "70%", // Limit height for scrollability
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 10,
  },

  // Styles for the Token/Txn list items
  tokenItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  txnItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  txnText: {
    fontSize: 16,
    color: "#333",
  },
  tokenIconWrapper: {
    width: 24,
    height: 24,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  tokenName: { fontSize: 16, color: "#333" },
});
