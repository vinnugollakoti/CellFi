import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Dimensions,
  ActivityIndicator,
  Animated,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as SMS from "expo-sms";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { ethers } from "ethers";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import * as Font from "expo-font";

// --- Assuming these are correctly imported SVG components ---
import ETHIcon from "./components/icons/ETHIcon";
import BTCIcon from "./components/icons/BTCIcon";
import USDTIcon from "./components/icons/USDTIcon";
import BNBIcon from "./components/icons/BNBIcon";
import SOLIcon from "./components/icons/SOLIcon";

// Keep the splash screen visible while loading fonts and assets
SplashScreen.preventAutoHideAsync();

// --- Constants (Centralized Configuration) ---
const PRIMARY_COLOR = "#7E23E9";
const DARK_BG = "#1A1A2E";
const CARD_BG = "#2C2C40";
const TEXT_COLOR = "#FFFFFF";
const LIGHT_TEXT_COLOR = "#B0B0D0";
const BORDER_COLOR = "#3A3A5A";
const ERROR_COLOR = "#FF6B6B";

const PRIVATE_KEY_KEY = "user_private_key";
const NONCE_KEY = "offline_nonce";
const SEPOLIA_CHAIN_ID = 11155111;
const SMS_RECIPIENT = "+916301181244";
const SENDER_MOBILE_DEMO = "+919999999999";
// NOTE: You MUST replace this with a valid RPC endpoint (e.g., Infura/Alchemy)
const SEPOLIA_RPC_URL = "https://sepolia.infura.io/v3/ee5a05b510a943fd8cfd9584671a3809";
const SWAP_CONTRACT_ADDRESS = "0x7a250d5630B4cF539739dF2C5cEABc630CEB4323"; // Uniswap V2 Router (Placeholder)

const { width } = Dimensions.get("window");

// --- Token Options ---
const tokenOptions = [
  { name: "Ethereum", symbol: "ETH", IconComponent: ETHIcon },
  { name: "Bitcoin", symbol: "BTC", IconComponent: BTCIcon },
  { name: "Tether", symbol: "USDT", IconComponent: USDTIcon },
  { name: "Binance Coin", symbol: "BNB", IconComponent: BNBIcon },
  { name: "Solana", symbol: "SOL", IconComponent: SOLIcon },
];

// --- Image Assets Mapping (Placeholder paths) ---
const txnIcons = {
  Transfer: require("./assets/icons/transfer.png"),
  Swap: require("./assets/icons/swap.png"),
  Bridge: require("./assets/icons/bridge.png"),
};

// --- Ethers Provider Setup ---
const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);

// --- Utility Functions ---
const getPrivateKey = async () => AsyncStorage.getItem(PRIVATE_KEY_KEY);
const setPrivateKey = async (key) =>
  AsyncStorage.setItem(PRIVATE_KEY_KEY, key.replace(/\s+/g, ""));
const removePrivateKey = async () => AsyncStorage.removeItem(PRIVATE_KEY_KEY);


async function generateSignature(privateKey, toAddress, amountEth, nonce) {
  if (!privateKey.startsWith("0x")) privateKey = "0x" + privateKey.trim();
  const wallet = new ethers.Wallet(privateKey);

  // NOTE: This utility ONLY creates a basic ETH transfer transaction.
  // Token Swaps/Interactions require encoding function data, which is omitted here.
  const tx = {
    to: toAddress,
    value: ethers.parseEther(amountEth.toString()),
    nonce: nonce,
    gasLimit: 21000n,
    gasPrice: ethers.parseUnits("10", "gwei"),
    chainId: BigInt(SEPOLIA_CHAIN_ID),
  };

  const signedTx = await wallet.signTransaction(tx);
  return signedTx;
}

// ------------------------------------
// --- REUSABLE COMPONENTS ---
// ------------------------------------

const FloatingIcons = () => {
  const ICON_SIZE = 40;
  const animationValues = tokenOptions.map(() => new Animated.Value(1));

  useEffect(() => {
    const animations = animationValues.map((animValue, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 1.1,
            duration: 2500,
            useNativeDriver: true,
            delay: index * 500,
          }),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
            delay: 0,
          }),
        ])
      )
    );
    animations.forEach((anim) => anim.start());
    return () => animations.forEach((anim) => anim.stop());
  }, []);

  const fixedPositions = [
    { top: "10%", left: "10%", rotate: 15 },
    { top: "25%", left: "80%", rotate: -30 },
    { top: "50%", left: "45%", rotate: 45 },
    { top: "70%", left: "15%", rotate: -10 },
    { top: "85%", left: "60%", rotate: 60 },
  ];

  return (
    <View style={styles.floatingContainer}>
      {tokenOptions.map((token, index) => {
        const Icon = token.IconComponent;
        const pos = fixedPositions[index];

        return (
          <Animated.View
            key={token.symbol}
            style={[
              styles.floatingIcon,
              {
                top: pos.top,
                left: pos.left,
                transform: [
                  { translateX: -ICON_SIZE / 2 },
                  { translateY: -ICON_SIZE / 2 },
                  { rotate: `${pos.rotate}deg` },
                  { scale: animationValues[index] },
                ],
              },
            ]}
          >
            <Icon width={ICON_SIZE} height={ICON_SIZE} />
          </Animated.View>
        );
      })}
    </View>
  );
};

const InfoCard = ({ title, message, iconSource }) => (
  <View style={styles.infoCard}>
    <View style={styles.titleRow}>
      <View style={styles.titleContainer}>
        <Text style={styles.infoTitle}>{title}</Text>
      </View>
      {iconSource ? (
        <Image
          source={iconSource}
          style={styles.icon}
          resizeMode="contain"
        />
      ) : (
        <Feather name="info" size={30} color={PRIMARY_COLOR} />
      )}
    </View>
    <Text style={styles.infoMessage}>{message}</Text>
  </View>
);

const TransactionCard = ({ title, onPress }) => {
  const key = title.split(" ")[0];
  const imageSource = txnIcons[key];

  return (
    <TouchableOpacity style={styles.txnCard} onPress={onPress}>
      <View style={styles.cardIconWrapper}>
        <Image
          source={imageSource}
          style={{ width: 28, height: 28 }}
          resizeMode="contain"
        />
      </View>
      <Text style={[styles.cardTitle, { fontFamily: "Poppins_SemiBold" }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

// NEW COMPONENT: Displays a summary of the last transaction
const LastTransactionCard = ({ transaction, onPress }) => {
    if (!transaction.signedMessage) return null;
    
    const key = transaction.type.split(" ")[0];
    const imageSource = txnIcons[key] || txnIcons.Transfer;
    const date = new Date(transaction.timestamp).toLocaleTimeString();

    return (
        <TouchableOpacity style={styles.lastTxnCard} onPress={onPress}>
            <View style={styles.cardIconWrapper}>
                <Image
                    source={imageSource}
                    style={{ width: 24, height: 24 }}
                    resizeMode="contain"
                />
            </View>
            <View style={styles.lastTxnDetails}>
                <Text style={[styles.cardTitle, { fontFamily: "Poppins_SemiBold", textAlign: 'left', fontSize: 16 }]}>
                    {transaction.title}
                </Text>
                <Text style={[styles.note, { color: LIGHT_TEXT_COLOR, marginTop: 2, fontSize: 12 }]}>
                    Nonce: {transaction.nonce} | Signed at {date}
                </Text>
            </View>
            <Feather name="chevron-right" size={24} color={LIGHT_TEXT_COLOR} />
        </TouchableOpacity>
    );
};

const InputWithLabel = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry = false,
  multiline = false,
  icon,
  onIconPress,
  editable = true,
  error,
}) => (
  <View style={styles.inputGroup}>
    <Text style={[styles.label, { fontFamily: "Poppins_Regular" }]}>{label}</Text>
    <View style={[
        styles.inputContainer, 
        !editable && { backgroundColor: BORDER_COLOR + '60', borderColor: BORDER_COLOR }
    ]}>
      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
          { fontFamily: "Poppins_Regular" },
          !editable && { color: LIGHT_TEXT_COLOR },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType || "default"}
        placeholderTextColor={LIGHT_TEXT_COLOR}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        editable={editable}
      />
      {icon && (
        <TouchableOpacity onPress={onIconPress} style={styles.inputAccessory}>
          <Feather name={icon} size={20} color={LIGHT_TEXT_COLOR} />
        </TouchableOpacity>
      )}
    </View>
    {error && (
      <Text style={[styles.errorText, { fontFamily: "Poppins_Regular" }]}>
        {error}
      </Text>
    )}
  </View>
);

const TokenSelectionModal = ({ visible, onClose, onSelect, title = "Select Token", excludeSymbol = null }) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
    onRequestClose={onClose}
  >
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <View style={styles.modalContent}>
        <Text style={[styles.modalTitle, { fontFamily: "BBH_Sans_Bartle" }]}>
          {title}
        </Text>
        <ScrollView>
          {tokenOptions
            .filter(tokenItem => tokenItem.symbol !== excludeSymbol)
            .map((tokenItem) => {
            const Icon = tokenItem.IconComponent;
            return (
              <TouchableOpacity
                key={tokenItem.symbol}
                style={styles.tokenItem}
                onPress={() => onSelect(tokenItem.symbol)}
              >
                <View style={styles.tokenIconWrapper}>
                  <Icon width={24} height={24} />
                </View>
                <Text style={[styles.tokenName, { fontFamily: "Poppins_Regular" }]}>
                  {tokenItem.name} ({tokenItem.symbol})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {excludeSymbol && (
            <Text style={[styles.note, { color: LIGHT_TEXT_COLOR, marginTop: 15 }]}>
                {excludeSymbol} excluded from selection.
            </Text>
        )}
      </View>
    </Pressable>
  </Modal>
);

const SettingsModal = ({ visible, onClose, currentKey, onSaveKey, onRemoveKey }) => {
  const [newKey, setNewKey] = useState(currentKey || "");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setNewKey(currentKey || "");
    setError("");
  }, [visible, currentKey]);

  const handleSave = () => {
    const normalizedKey = newKey.replace(/\s+/g, "");
    if (!normalizedKey.match(/^(0x)?[a-fA-F0-9]{64}$/)) {
      setError("Invalid private key format (must be 64 hex characters).");
      return;
    }
    setError("");
    onSaveKey(normalizedKey);
    onClose();
    Alert.alert("Success", "Private key saved securely.");
  };

  const handleRemove = () => {
    Alert.alert(
        "Confirm Removal",
        "Are you sure you want to remove your private key? You will lose access to sign transactions until a new one is set.",
        [
            {
                text: "Cancel",
                style: "cancel"
            },
            {
                text: "Remove",
                style: "destructive",
                onPress: () => {
                    onRemoveKey();
                    onClose();
                    Alert.alert("Removed", "Private key successfully removed.");
                }
            }
        ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalDismissArea} onPress={onClose} />
        <View style={styles.settingsModalContent}>
          <Text style={[styles.modalTitle, { marginBottom: 15 }]}>
            Profile & Settings
          </Text>

          <InputWithLabel
            label="Private Key:"
            value={newKey}
            onChangeText={setNewKey}
            placeholder="Enter or change your private key"
            secureTextEntry={!showKey}
            icon={showKey ? "eye-off" : "eye"}
            onIconPress={() => setShowKey(!showKey)}
            error={error}
          />
          <Text style={[styles.note, { fontFamily: "Poppins_Regular" }]}>
            *Warning: Your private key grants full access to your funds. It is
            only stored locally.
          </Text>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={[styles.saveButtonText, { fontFamily: "Poppins_SemiBold" }]}>
              Save Private Key
            </Text>
          </TouchableOpacity>
          
          {/* NEW REMOVE KEY BUTTON */}
          {currentKey && (
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: ERROR_COLOR, marginTop: 15 }]} onPress={handleRemove}>
                <Text style={[styles.actionButtonText, { fontFamily: "Poppins_SemiBold" }]}>
                  Remove Private Key
                </Text>
              </TouchableOpacity>
          )}

          <View style={styles.separator} />
          <Text style={[styles.note, { fontFamily: "Poppins_Regular" }]}>
            The current Nonce is synchronized automatically when you are online.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

// NEW COMPONENT: Shows full details of the last transaction
const TransactionDetailModal = ({ visible, onClose, transaction }) => {
    if (!transaction) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <Pressable style={styles.modalDismissArea} onPress={onClose} />
                <View style={styles.settingsModalContent}>
                    <Text style={[styles.modalTitle, { fontFamily: 'BBH_Sans_Bartle' }]}>
                        {transaction.title} Details
                    </Text>

                    <Text style={[styles.label, { color: TEXT_COLOR }]}>Date: {new Date(transaction.timestamp).toLocaleString()}</Text>
                    <Text style={[styles.label, { color: TEXT_COLOR }]}>Nonce: {transaction.nonce}</Text>
                    <Text style={[styles.label, { color: TEXT_COLOR, marginTop: 15 }]}>Raw Signed Message (SMS Body):</Text>
                    
                    <View style={styles.messageContainer}>
                        <ScrollView style={{ maxHeight: 200 }}>
                            <Text style={[styles.messageText, { fontFamily: 'monospace' }]}>
                                {transaction.signedMessage}
                            </Text>
                        </ScrollView>
                        <TouchableOpacity
                            onPress={() => {
                                Clipboard.setStringAsync(transaction.signedMessage);
                                Alert.alert("Copied", "Raw signed message copied to clipboard.");
                            }}
                            style={styles.copyIcon}
                        >
                            <Feather name="copy" size={18} color={LIGHT_TEXT_COLOR} />
                        </TouchableOpacity>
                    </View>
                    
                    <TouchableOpacity style={[styles.actionButton, { marginTop: 30 }]} onPress={onClose}>
                        <Text style={[styles.actionButtonText, { fontFamily: 'Poppins_SemiBold' }]}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// ------------------------------------
// --- TRANSACTION SCREEN (UPDATED) ---
// ------------------------------------

const TransactionScreen = ({
  type,
  privateKey,
  currentNonce,
  onSignatureGenerated,
  onGoBack,
  isOnline,
}) => {
  // Only allow ETH for Transfer/Swap as the current signing utility only supports ETH value transfer
  const [token, setToken] = useState("ETH"); 
  const [swapToToken, setSwapToToken] = useState("BTC"); 
  const [amount, setAmount] = useState("");
  
  // To Address is only required for Transfer
  const [toAddress, setToAddress] = useState(type === "Transfer" ? "" : SWAP_CONTRACT_ADDRESS); 

  const [errors, setErrors] = useState({});
  const [isTokenPickerVisible, setIsTokenPickerVisible] = useState(false);
  const [isSwapToPickerVisible, setIsSwapToPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken("ETH");
    setSwapToToken("BTC");
    setAmount("");
    setErrors({});
    // Set default recipient based on type
    setToAddress(type === "Transfer" ? "" : SWAP_CONTRACT_ADDRESS);
  }, [type]);

  // Force token to ETH if type is Swap or Bridge due to signing limitations
  useEffect(() => {
      if (type !== 'Transfer') {
          setToken('ETH');
      }
  }, [type]);

  const selectedTokenData = tokenOptions.find((t) => t.symbol === token);
  const CurrentTokenIcon = selectedTokenData ? selectedTokenData.IconComponent : null;
  const SwapToTokenIcon = tokenOptions.find((t) => t.symbol === swapToToken)?.IconComponent;

  const transactionIconSource = txnIcons[type];

  const validateInputs = () => {
    const newErrors = {};
    if (!token) newErrors.token = "Please select a token.";
    if (!amount || isNaN(amount) || Number(amount) <= 0)
      newErrors.amount = "Enter a valid numeric amount.";
      
    // CORE VALIDATION: Only ETH is supported for non-Transfer types with simple value signing
    if (type !== "Transfer" && token !== "ETH") {
        newErrors.token = "Only ETH is currently supported for this transaction type.";
    }

    if (type === "Transfer") {
      if (!toAddress) newErrors.toAddress = "Recipient address is required.";
      else if (!ethers.isAddress(toAddress))
        newErrors.toAddress = "Invalid Ethereum address.";
    }

    if (type === "Swap") {
        // Swap Contract address is hardcoded and validated to ensure it's a contract interaction
        if (!ethers.isAddress(SWAP_CONTRACT_ADDRESS)) {
            newErrors.contract = "Invalid Swap Contract Address in Constants.";
        }
        if (!swapToToken) newErrors.swapToToken = "Please select a token to receive.";
    }
    
    // Bridge is just an info screen now, so no extra validation needed

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerateSignature = async () => {
    if (!validateInputs()) return;
    if (!privateKey) {
      Alert.alert("Setup Required", "Please set your private key in the profile settings first.");
      return;
    }
    if (currentNonce === null) {
      Alert.alert("Nonce Error", "Nonce not loaded. Please wait.");
      return;
    }
    if (type !== 'Transfer' && token !== 'ETH') {
        Alert.alert("Limitation", "Only ETH value transfers are supported for Swap/Bridge signatures at this time.");
        return;
    }

    setLoading(true);
    try {
      const recipient = type === "Transfer" ? toAddress : SWAP_CONTRACT_ADDRESS;
      
      const signedTx = await generateSignature(
        privateKey,
        recipient,
        amount,
        currentNonce
      );
      
      onSignatureGenerated(signedTx, type, isOnline, { from: token, to: swapToToken, amount, recipient });
      onGoBack();
    } catch (err) {
      Alert.alert("Signature Error", err.message || "Failed to sign transaction.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.txnScreenHeader}>
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={TEXT_COLOR} />
        </TouchableOpacity>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.txnScreenContent}>
        <InfoCard
          iconSource={transactionIconSource}
          title={`${type} Transaction`}
          message={`Configure your offline ${type.toLowerCase()} details. The signed transaction will be sent via SMS to the relayer address.`}
        />
        
        {/* Token Selection: FROM */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { fontFamily: "Poppins_Regular" }]}>
            {type === "Swap" ? "Token to Send (FROM):" : "Token:"}
          </Text>
          <TouchableOpacity
            style={styles.dropdownContainer}
            onPress={() => type === 'Transfer' ? setIsTokenPickerVisible(true) : null} // Only allow token selection for Transfer
          >
            {CurrentTokenIcon ? (
              <View style={styles.tokenIconContainer}>
                <CurrentTokenIcon width={24} height={24} />
              </View>
            ) : (
              <Feather name="dollar-sign" size={18} color={LIGHT_TEXT_COLOR} style={styles.inputIcon} />
            )}
            <Text style={[styles.dropdownText, { fontFamily: "Poppins_Regular" }]}>
              {token || "Select your token"}
            </Text>
            {type === 'Transfer' && <Feather name="chevron-down" size={18} color={LIGHT_TEXT_COLOR} />}
          </TouchableOpacity>
          {/* {type !== 'Transfer' && (
              <Text style={[styles.note, { color: ERROR_COLOR, marginTop: 4, fontFamily: "Poppins_Regular" }]}>
                  ⚠️ Only **ETH** is available for this transaction type using simple signature generation.
              </Text>
          )} */}
          {errors.token && (
            <Text style={[styles.errorText, { fontFamily: "Poppins_Regular" }]}>
              {errors.token}
            </Text>
          )}
        </View>
        
        {/* Token Selection: TO (SWAP ONLY) */}
        {type === "Swap" && (
            <View style={styles.inputGroup}>
                <Text style={[styles.label, { fontFamily: "Poppins_Regular" }]}>
                    Token to Receive (TO):
                </Text>
                <TouchableOpacity
                    style={styles.dropdownContainer}
                    onPress={() => setIsSwapToPickerVisible(true)}
                >
                    {SwapToTokenIcon ? (
                        <View style={styles.tokenIconContainer}>
                            <SwapToTokenIcon width={24} height={24} />
                        </View>
                    ) : (
                        <Feather name="dollar-sign" size={18} color={LIGHT_TEXT_COLOR} style={styles.inputIcon} />
                    )}
                    <Text style={[styles.dropdownText, { fontFamily: "Poppins_Regular" }]}>
                        {swapToToken || "Select token to receive"}
                    </Text>
                    <Feather name="chevron-down" size={18} color={LIGHT_TEXT_COLOR} />
                </TouchableOpacity>
                {errors.swapToToken && (
                    <Text style={[styles.errorText, { fontFamily: "Poppins_Regular" }]}>
                        {errors.swapToToken}
                    </Text>
                )}
            </View>
        )}

        {/* Amount */}
        <InputWithLabel
          label={`Amount in ${token}:`}
          value={amount}
          onChangeText={setAmount}
          placeholder={`Enter ${token || "ETH"} amount`}
          keyboardType="numeric"
          error={errors.amount}
        />

        {/* Recipient Address (TRANSFER ONLY) */}
        {type === "Transfer" && (
            <InputWithLabel
            label="To Address:"
            value={toAddress}
            onChangeText={setToAddress}
            placeholder="0x..."
            error={errors.toAddress}
            icon="copy"
            onIconPress={async () => setToAddress(await Clipboard.getStringAsync())}
            />
        )}
        
        {/* Contract Address (SWAP/BRIDGE ONLY) - Read Only */}
        {(type === "Swap" || type === "Bridge") && (
            <InputWithLabel
            label={`${type} Contract/Relayer Address (Recipient):`}
            value={type === "Swap" ? SWAP_CONTRACT_ADDRESS : "Not Applicable Yet"}
            editable={false}
            icon="server"
            />
        )}
        
        {/* SMS Recipient Preview */}
        <InputWithLabel
            label="SMS Relayer Recipient:"
            value={SMS_RECIPIENT}
            editable={false}
            icon="message-square"
        />

        {/* Nonce Display - MOVED AND GREYED OUT */}
        <InputWithLabel
            label="Current Transaction Nonce:"
            value={currentNonce !== null ? currentNonce.toString() : "Loading..."}
            editable={false}
            icon="hash"
        />

        {/* Action Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleGenerateSignature}
          disabled={loading || currentNonce === null}
        >
          {loading ? (
            <ActivityIndicator color={TEXT_COLOR} />
          ) : (
            <Text style={[styles.actionButtonText, { fontFamily: "Poppins_SemiBold" }]}>
              Generate Signature & Send SMS
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Token Picker Modal (FROM) - Only for Transfer */}
      <TokenSelectionModal
        visible={isTokenPickerVisible && type === 'Transfer'}
        onClose={() => setIsTokenPickerVisible(false)}
        onSelect={(symbol) => {
          setToken(symbol);
          setIsTokenPickerVisible(false);
        }}
        title={"Select Token"}
        excludeSymbol={null}
      />
      
      {/* Token Picker Modal (TO) - Only for Swap */}
      <TokenSelectionModal
        visible={isSwapToPickerVisible && type === 'Swap'}
        onClose={() => setIsSwapToPickerVisible(false)}
        onSelect={(symbol) => {
          setSwapToToken(symbol);
          setIsSwapToPickerVisible(false);
        }}
        title={"Select Token to Receive"}
        excludeSymbol={token} // Exclude the "FROM" token
      />
    </SafeAreaView>
  );
};

// ------------------------------------
// --- MAIN APP COMPONENT ---
// ------------------------------------
export default function App() {
  const [fontsLoaded] = useFonts({
    "Playfair_Display_Bold": require("./assets/fonts/PlayfairDisplay-Bold.ttf"),
    "BBH_Sans_Bartle": require("./assets/fonts/BBHSansBartle-Regular.ttf"),
    "Poppins_Regular": require("./assets/fonts/Poppins-Regular.ttf"),
    "Poppins_SemiBold": require("./assets/fonts/Poppins-SemiBold.ttf"),
    "monospace": Font.isLoaded('monospace') ? 'monospace' : require('./assets/fonts/RobotoMono-Regular.ttf'),
  });

  const [privateKey, setPrivateKeyState] = useState(null);
  const [loadingKey, setLoadingKey] = useState(true);
  const [activeScreen, setActiveScreen] = useState("Home");
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  
  // NEW STATE: Structured storage for the last transaction
  const [lastTransaction, setLastTransaction] = useState(null); 
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  
  const [currentNonce, setCurrentNonce] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [nonceSyncStatus, setNonceSyncStatus] = useState("Awaiting setup...");
  const nonceSyncRef = useRef(null);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && !loadingKey) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, loadingKey]);

  const fetchLatestNonce = useCallback(async (address) => {
    try {
      const txCount = await provider.getTransactionCount(address, "latest");
      const latestNonce = Number(txCount);
      setCurrentNonce(latestNonce);
      setNonceSyncStatus(`Synced: ${new Date().toLocaleTimeString()}`);
      return latestNonce;
    } catch (e) {
      console.error("Failed to fetch latest nonce:", e);
      setNonceSyncStatus("Sync failed. Check RPC URL.");
      return null;
    }
  }, []);

  const syncNonce = useCallback(async (key, online) => {
    if (!key) {
        setCurrentNonce(null);
        setNonceSyncStatus("Set Private Key in Profile.");
        return;
    }
    
    const wallet = new ethers.Wallet(key);
    const address = wallet.address;
    const storedNonceKey = `${NONCE_KEY}_${address}`;

    if (online) {
      setNonceSyncStatus("Connecting to network...");
      const latestNonce = await fetchLatestNonce(address);
      if (latestNonce !== null) {
        await AsyncStorage.setItem(storedNonceKey, latestNonce.toString());
        setCurrentNonce(latestNonce);
      } else {
        const localNonce = await AsyncStorage.getItem(storedNonceKey);
        setCurrentNonce(localNonce ? Number(localNonce) : 0);
        setNonceSyncStatus("Sync failed, using local value.");
      }
    } else {
      setNonceSyncStatus("Offline mode. Using local nonce.");
      const localNonce = await AsyncStorage.getItem(storedNonceKey);
      setCurrentNonce(localNonce ? Number(localNonce) : 0);
    }
  }, [fetchLatestNonce]);

  // --- Initial Load Effect (Private Key and NetInfo) ---
  useEffect(() => {
    const loadState = async () => {
      const key = await getPrivateKey();
      setPrivateKeyState(key);
      setLoadingKey(false);
    };
    loadState();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected;
      setIsOnline(online);
      // Wait for key to be loaded before initial sync
      if (!loadingKey) {
        syncNonce(privateKey, online);
      }
    });

    return () => unsubscribe();
  }, [privateKey, syncNonce, loadingKey]);

  // --- Nonce Polling Effect ---
  useEffect(() => {
    if (privateKey && !loadingKey) {
      syncNonce(privateKey, isOnline);
    }

    if (isOnline && privateKey) {
      const wallet = new ethers.Wallet(privateKey);
      const address = wallet.address;
      
      if (nonceSyncRef.current) {
          clearInterval(nonceSyncRef.current);
      }

      nonceSyncRef.current = setInterval(() => {
        fetchLatestNonce(address);
      }, 30000); // Poll every 30 seconds
    } else if (nonceSyncRef.current) {
        clearInterval(nonceSyncRef.current);
    }

    return () => {
      if (nonceSyncRef.current) {
        clearInterval(nonceSyncRef.current);
      }
    };
  }, [privateKey, isOnline, loadingKey, fetchLatestNonce, syncNonce]);


  const handleSavePrivateKey = async (key) => {
    await setPrivateKey(key);
    setPrivateKeyState(key);
    syncNonce(key, isOnline);
  };
  
  const handleRemovePrivateKey = async () => {
      await removePrivateKey();
      setPrivateKeyState(null);
      setCurrentNonce(null);
      setNonceSyncStatus("Private key removed. Please set a new one.");
  };

  const handleTxnCardPress = (type) => {
    if (!privateKey) {
      Alert.alert("Setup Required", "Please set your private key in the profile settings (top left icon) before proceeding.");
      return;
    }
    if (currentNonce === null) {
      Alert.alert("Loading Nonce", "Please wait a moment for the transaction nonce to load.");
      return;
    }
    setActiveScreen(type);
  };

  const handleSignatureGenerated = async (signedTx, type, wasOnline, txnData) => {
    const wallet = new ethers.Wallet(privateKey);
    const address = wallet.address;
    const storedNonceKey = `${NONCE_KEY}_${address}`;
    let txnTitle = type;

    // 1. OFFLINE NONCE INCREMENT
    if (!wasOnline) {
      const newNonce = currentNonce + 1;
      await AsyncStorage.setItem(storedNonceKey, newNonce.toString());
      setCurrentNonce(newNonce);
      setNonceSyncStatus(`Local increment: ${newNonce}. Sync to network required.`);
    }

    // 2. Format SMS Body
    if (type === "Swap") {
        txnTitle = `Swap ${txnData.amount} ${txnData.from} via Contract`;
    } else if (type === "Transfer") {
        txnTitle = `Transfer ${txnData.amount} ${txnData.from} to ${txnData.recipient.substring(0, 6)}...`;
    } else { // Bridge
        txnTitle = `Bridge ${txnData.amount} ${txnData.from} (Basic Signature)`;
    }
    
    // The server only needs the signed transaction for relaying
    const smsBody = `Type : ${type}\nSignature : ${signedTx}\nSender Mobile number : ${SENDER_MOBILE_DEMO}\nReceiver mobile number : ${SMS_RECIPIENT}`;
    
    // 3. Store the structured transaction data
    setLastTransaction({
        title: txnTitle,
        type: type,
        amount: txnData.amount,
        token: txnData.from,
        recipient: txnData.recipient,
        nonce: currentNonce,
        signedMessage: smsBody,
        timestamp: Date.now(),
    });

    // 4. Send SMS
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      const { result } = await SMS.sendSMSAsync([SMS_RECIPIENT], smsBody);
      console.log("SMS result:", result);
      Alert.alert("Success", "Signed transaction sent via SMS.");
    } else {
      Alert.alert(
        "SMS Not Available",
        "SMS service is not supported on this device. Formatted signature copied to clipboard."
      );
      await Clipboard.setStringAsync(smsBody);
    }
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case "Transfer":
      case "Swap":
        return (
          <TransactionScreen
            type={activeScreen}
            privateKey={privateKey}
            currentNonce={currentNonce}
            onSignatureGenerated={handleSignatureGenerated}
            onGoBack={() => setActiveScreen("Home")}
            isOnline={isOnline}
          />
        );
      case "Bridge":
        return (
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.txnScreenHeader}>
              <TouchableOpacity
                onPress={() => setActiveScreen("Home")}
                style={styles.backButton}
              >
                <Feather name="arrow-left" size={24} color={TEXT_COLOR} />
              </TouchableOpacity>
              <View style={{ width: 24 }} />
            </View>
            <View style={styles.txnScreenContent}>
              <View style={[styles.infoCard, { alignItems: "center", marginTop: 50 }]}>
                <Image
                  source={txnIcons.Bridge}
                  style={{ width: 100, height: 100, marginVertical: 40 }}
                  resizeMode="contain"
                />
                <Text style={[styles.infoTitle, { marginTop: 30 }]}>Bridge Feature Under Construction</Text>
                <Text style={[styles.infoMessage, { marginTop: 30, textAlign: 'left' }]}>
                  This feature is coming soon! Bridging across chains requires
                  complex offline signature generation (contract interaction). We are working hard to
                  integrate it. For now, only simple ETH transfers are supported.
                </Text>
                <TouchableOpacity
                  style={[styles.actionButton, { marginTop: 50, width: '100%' }]}
                  onPress={() => setActiveScreen("Home")}
                >
                  <Text style={styles.actionButtonText}>Go Back</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        );
      case "Home":
      default:
        return (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => setIsSettingsModalVisible(true)}
                style={styles.profileButton}
              >
                <Feather
                  name="user"
                  size={24}
                  color={TEXT_COLOR}
                  style={styles.profileIcon}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.helpButton}>
                <Feather
                  name="help-circle"
                  size={24}
                  color={LIGHT_TEXT_COLOR}
                />
              </TouchableOpacity>
            </View>

            {/* Hero Section */}
            <View style={styles.heroSection}>
              <FloatingIcons />
              <Text
                style={[
                  styles.heroTitle,
                  styles.glowingText,
                ]}
              >
                CellFi
              </Text>
              <Text
                style={[
                  styles.heroSubtitle,
                  styles.glowingText,
                ]}
              >
                Your Secure Offline Transaction Hub
              </Text>
              <TouchableOpacity
                style={styles.completeProfileContainer}
                onPress={() =>
                  !privateKey ? setIsSettingsModalVisible(true) : null
                }
              >
                <Text
                  style={[
                    styles.completeProfileText,
                    { fontFamily: "Poppins_SemiBold" },
                  ]}
                >
                  {/* TEXT CHANGE APPLIED HERE */}
                  {privateKey
                    ? "Private key added"
                    : "Complete your profile (Set Private Key)"}
                </Text>
                {/* ICON CHANGE APPLIED HERE */}
                <Feather name={privateKey ? "check-circle" : "arrow-right"} size={18} color={TEXT_COLOR} />
              </TouchableOpacity>
            </View>

            {/* Nonce Status Box */}
            <Text style={[styles.sectionTitle, { fontFamily: "BBH_Sans_Bartle", marginBottom: 15 }]}>
                Network Status
            </Text>
            <View style={[styles.messageBox, { marginTop: 0, marginBottom: 30, paddingVertical: 10, paddingHorizontal: 15, backgroundColor: CARD_BG, borderRadius: 12 }]}>
              <Text style={[styles.label, { fontFamily: 'Poppins_Regular', marginBottom: 5 }]}>
                Current Network Nonce:
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: PRIMARY_COLOR, fontSize: 12, fontWeight: 'bold'}}>
                      {isOnline ? "ONLINE" : "OFFLINE"}
                  </Text>
                  <Text style={[styles.note, { color: LIGHT_TEXT_COLOR, marginTop: 5, fontSize: 10 }]}>
                    {nonceSyncStatus}
                  </Text>  
                </View>
                <View>
                  <Text style={[styles.messageText, { fontFamily: 'BBH_Sans_Bartle', fontSize: 30, color: TEXT_COLOR}]}>
                    {currentNonce === null ? "Loading..." : currentNonce}
                  </Text>
                </View>
              </View>
            </View>

            {/* Transaction Cards Section */}
            <Text style={[styles.sectionTitle, { fontFamily: "BBH_Sans_Bartle" }]}>
              Main Transactions
            </Text>
            <View style={styles.cardsContainer}>
              <TransactionCard
                title="Transfer"
                onPress={() => handleTxnCardPress("Transfer")}
              />
              <TransactionCard
                title="Swap"
                onPress={() => handleTxnCardPress("Swap")}
              />
              <TransactionCard
                title="Bridge"
                onPress={() => handleTxnCardPress("Bridge")}
              />
            </View>

            {/* Last Signed Transaction Card - NEW LAYOUT */}
            <Text style={[styles.sectionTitle, { fontFamily: "BBH_Sans_Bartle" }]}>
                Last Transaction
            </Text>
            {lastTransaction ? (
                <LastTransactionCard 
                    transaction={lastTransaction} 
                    onPress={() => setIsDetailModalVisible(true)} 
                />
            ) : (
                <View style={styles.emptyTxnCard}>
                    <Text style={[styles.infoMessage, { textAlign: 'center' }]}>
                        No transactions signed yet.
                    </Text>
                </View>
            )}

          </ScrollView>
        );
    }
  };

  if (!fontsLoaded || loadingKey) {
    return (
      <View style={styles.loadingContainer} onLayout={onLayoutRootView}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={{ color: LIGHT_TEXT_COLOR, marginTop: 10 }}>
          Loading App State...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} onLayout={onLayoutRootView}>
      {renderScreen()}
      <SettingsModal
        visible={isSettingsModalVisible}
        onClose={() => setIsSettingsModalVisible(false)}
        currentKey={privateKey}
        onSaveKey={handleSavePrivateKey}
        onRemoveKey={handleRemovePrivateKey}
      />
      <TransactionDetailModal
        visible={isDetailModalVisible}
        onClose={() => setIsDetailModalVisible(false)}
        transaction={lastTransaction}
      />
    </SafeAreaView>
  );
}

// --- Styles (Updated for new components) ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: DARK_BG },
  scrollContent: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: DARK_BG,
    justifyContent: "center",
    alignItems: "center",
  },
  txnScreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backButton: { padding: 5 },
  titleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  txnScreenContent: {
    flex: 1,
    padding: 20,
    width: "100%",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  profileButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 15,
    padding: 5,
  },
  profileIcon: { padding: 2 },
  helpButton: { padding: 5 },
  heroSection: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 30,
    borderRadius: 15,
    marginBottom: 25,
    position: "relative",
    overflow: "hidden",
  },
  floatingContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingIcon: {
    position: "absolute",
    opacity: 0.3,
    shadowColor: TEXT_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  glowingText: {
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 10,
  },
  heroTitle: {
    fontSize: 36,
    color: TEXT_COLOR,
    marginBottom: 5,
    zIndex: 10,
    fontFamily: "BBH_Sans_Bartle",
  },
  heroSubtitle: {
    color: LIGHT_TEXT_COLOR,
    textAlign: "center",
    marginBottom: 20,
    zIndex: 10,
    fontFamily: "Poppins_Regular",
  },
  completeProfileContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BORDER_COLOR,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    zIndex: 10,
  },
  completeProfileText: {
    color: TEXT_COLOR,
    fontSize: 14,
    fontWeight: "500",
    marginRight: 8,
    fontFamily: "Poppins_SemiBold",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_COLOR,
    width: "100%",
    textAlign: "left",
    marginBottom: 15,
    fontFamily: "BBH_Sans_Bartle",
  },
  cardsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 30,
  },
  txnCard: {
    width: width / 3 - 20,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  lastTxnCard: {
    width: "100%",
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 15,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emptyTxnCard: {
    width: "100%",
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  lastTxnDetails: {
    flex: 1,
    paddingHorizontal: 15,
  },
  cardIconWrapper: {
    backgroundColor: `${PRIMARY_COLOR}20`,
    borderRadius: 10,
    padding: 10,
    // Removed marginBottom for LastTransactionCard
  },
  cardTitle: {
    color: TEXT_COLOR,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    fontFamily: "Poppins_SemiBold",
  },
  infoCard: {
    width: "100%",
    marginBottom: 25,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_COLOR,
    fontFamily: "BBH_Sans_Bartle",
  },
  icon: {
    width: 40,
    height: 40,
  },
  infoMessage: {
    fontSize: 12,
    color: LIGHT_TEXT_COLOR,
    fontFamily: "Poppins_Regular",
  },
  inputGroup: { marginBottom: 15, width: "100%" },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 5,
    color: LIGHT_TEXT_COLOR,
    fontFamily: "Poppins_Regular",
  },
  note: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    marginBottom: 5,
    fontFamily: "Poppins_Regular",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DARK_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 50,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: TEXT_COLOR,
    fontFamily: "Poppins_Regular",
  },
  multilineInput: { height: 100, paddingTop: 10 },
  inputAccessory: { paddingLeft: 10 },
  errorText: { color: ERROR_COLOR, fontSize: 12, marginTop: 4, fontFamily: "Poppins_Regular" },
  dropdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DARK_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    height: 50,
    justifyContent: "space-between",
  },
  tokenIconContainer: {
    marginRight: 8,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: TEXT_COLOR,
    paddingLeft: 5,
    fontFamily: "Poppins_Regular",
  },
  actionButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonText: {
    color: TEXT_COLOR,
    fontWeight: "700",
    fontSize: 16,
    fontFamily: "Poppins_SemiBold",
  },
  saveButton: {
    backgroundColor: DARK_BG,
    borderColor: BORDER_COLOR,
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    color: TEXT_COLOR,
    fontWeight: "700",
    fontSize: 16,
    borderColor: BORDER_COLOR,
    fontFamily: "Poppins_SemiBold",
  },
  messageBox: { width: "100%", marginTop: 20 },
  messageContainer: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
    backgroundColor: DARK_BG, // Changed from CARD_BG for contrast
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  messageText: {
    fontSize: 12,
    textAlign: "left",
    color: LIGHT_TEXT_COLOR,
    flex: 1,
    fontFamily: "monospace",
    lineHeight: 18,
  },
  copyIcon: { marginLeft: 10, padding: 5, backgroundColor: BORDER_COLOR, borderRadius: 5 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalDismissArea: {
    flex: 1,
  },
  modalContent: {
    width: "100%",
    padding: 20,
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  settingsModalContent: {
    width: "100%",
    padding: 20,
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 16,
    marginBottom: 20,
    color: TEXT_COLOR,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    paddingBottom: 10,
    fontFamily: "BBH_Sans_Bartle",
  },
  tokenItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  tokenIconWrapper: {
    width: 24,
    height: 24,
    marginRight: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  tokenName: { fontSize: 16, color: TEXT_COLOR, fontFamily: "Poppins_Regular" },
  separator: {
    height: 1,
    backgroundColor: BORDER_COLOR,
    marginVertical: 20,
  },
});