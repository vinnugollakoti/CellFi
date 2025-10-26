import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as SMS from "expo-sms";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { ethers } from "ethers";
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import * as Font from 'expo-font';

// --- Assuming these are correctly imported SVG components ---
import ETHIcon from "./components/icons/ETHIcon"; 
import BTCIcon from "./components/icons/BTCIcon"; 
import USDTIcon from "./components/icons/USDTIcon"; 
import BNBIcon from "./components/icons/BNBIcon"; 
import SOLIcon from "./components/icons/SOLIcon"; 

// Keep the splash screen visible while loading fonts and assets
SplashScreen.preventAutoHideAsync();

// --- Constants (Unchanged) ---
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
const SMS_RECIPIENT = "+918074503341";

const { width } = Dimensions.get("window");

// --- Token Options (Unchanged) ---
const tokenOptions = [
  { name: "Ethereum", symbol: "ETH", IconComponent: ETHIcon },
  { name: "Bitcoin", symbol: "BTC", IconComponent: BTCIcon },
  { name: "Tether", symbol: "USDT", IconComponent: USDTIcon },
  { name: "Binance Coin", symbol: "BNB", IconComponent: BNBIcon },
  { name: "Solana", symbol: "SOL", IconComponent: SOLIcon },
];

// --- Utility Functions (Mocked/Simplified for presentation) ---
const getPrivateKey = async () => AsyncStorage.getItem(PRIVATE_KEY_KEY);
const setPrivateKey = async (key) =>
  AsyncStorage.setItem(PRIVATE_KEY_KEY, key.replace(/\s+/g, ""));
const getNonce = async (walletAddress) => { return 0; };
const incrementNonce = async () => { return 1; };
const setupNonceSync = (walletAddress) => {};

async function generateSignature(privateKey, toAddress, amountEth) {
  if (!privateKey.startsWith("0x")) privateKey = "0x" + privateKey.trim();
  const wallet = new ethers.Wallet(privateKey);

  let nonce = await getNonce(wallet.address);

  const tx = {
    to: toAddress,
    value: ethers.parseEther(amountEth.toString()),
    nonce: nonce,
    gasLimit: 21000n,
    gasPrice: ethers.parseUnits("10", "gwei"),
    chainId: BigInt(SEPOLIA_CHAIN_ID),
  };

  const signedTx = await wallet.signTransaction(tx);

  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    await incrementNonce();
  }

  return signedTx;
}

// ------------------------------------
// --- REUSABLE COMPONENTS (Font Application) ---
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
          }),
        ])
      )
    );
    animations.forEach((anim) => anim.start());
    return () => animations.forEach((anim) => anim.stop());
  }, []);

  const fixedPositions = [
    { top: '10%', left: '10%', rotate: 15 },
    { top: '25%', left: '80%', rotate: -30 },
    { top: '50%', left: '45%', rotate: 45 },
    { top: '70%', left: '15%', rotate: -10 },
    { top: '85%', left: '60%', rotate: 60 },
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

const InfoCard = ({ title, message, iconName }) => (
  <View style={styles.infoCard}>
    <Feather name={iconName} size={30} color={PRIMARY_COLOR} />
    <Text style={[styles.infoTitle, { fontFamily: 'BBH_Sans_Bartle' }]}>{title}</Text>
    <Text style={[styles.infoMessage, { fontFamily: 'Poppins_Regular' }]}>{message}</Text>
  </View>
);

const TransactionCard = ({ iconName, title, onPress }) => (
  <TouchableOpacity style={styles.txnCard} onPress={onPress}>
    <View style={styles.cardIconWrapper}>
      <Feather name={iconName} size={28} color={PRIMARY_COLOR} />
    </View>
    <Text style={[styles.cardTitle, { fontFamily: 'Poppins_SemiBold' }]}>{title}</Text>
  </TouchableOpacity>
);

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
    <Text style={[styles.label, { fontFamily: 'Poppins_Regular' }]}>{label}</Text>
    <View style={styles.inputContainer}>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput, { fontFamily: 'Poppins_Regular' }]}
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
    {error && <Text style={[styles.errorText, { fontFamily: 'Poppins_Regular' }]}>{error}</Text>}
  </View>
);

// ------------------------------------
// --- MODALS (Font Application) ---
// ------------------------------------

const TokenSelectionModal = ({ visible, onClose, onSelect }) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
    onRequestClose={onClose}
  >
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <View style={styles.modalContent}>
        <Text style={[styles.modalTitle, { fontFamily: 'BBH_Sans_Bartle' }]}>Select Token</Text>
        <ScrollView>
          {tokenOptions.map((tokenItem) => {
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
                <Text style={[styles.tokenName, { fontFamily: 'Poppins_Regular' }]}>
                  {tokenItem.name} ({tokenItem.symbol})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Pressable>
  </Modal>
);

const SettingsModal = ({ visible, onClose, currentKey, onSaveKey }) => {
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
          <Text style={[styles.modalTitle, { fontFamily: 'BBH_Sans_Bartle' }]}>Profile & Settings</Text>

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
          <Text style={[styles.note, { fontFamily: 'Poppins_Regular' }]}>
            *Warning: Your private key grants full access to your funds. It is
            only stored locally.
          </Text>

          <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
            <Text style={[styles.actionButtonText, { fontFamily: 'Poppins_SemiBold' }]}>Save Private Key</Text>
          </TouchableOpacity>

          <View style={styles.separator} />
          <Text style={[styles.note, { fontFamily: 'Poppins_Regular' }]}>
            Current Nonce is managed automatically.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

// ------------------------------------
// --- TRANSACTION SCREEN (Font Application) ---
// ------------------------------------

const TransactionScreen = ({
  type,
  privateKey,
  onSignatureGenerated,
  onGoBack,
}) => {
  const [token, setToken] = useState("ETH");
  const [amount, setAmount] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [errors, setErrors] = useState({});
  const [isTokenPickerVisible, setIsTokenPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken("ETH");
    setAmount("");
    setToAddress("");
    setErrors({});
  }, [type]);

  const selectedTokenData = tokenOptions.find((t) => t.symbol === token);
  const CurrentTokenIcon = selectedTokenData
    ? selectedTokenData.IconComponent
    : null;

  const validateInputs = () => {
    const newErrors = {};
    if (!token) newErrors.token = "Please select a token.";
    if (!amount || isNaN(amount) || Number(amount) <= 0)
      newErrors.amount = "Enter a valid numeric amount.";
    if (!toAddress) newErrors.toAddress = "Recipient address is required.";
    else if (!ethers.isAddress(toAddress))
      newErrors.toAddress = "Invalid Ethereum address.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerateSignature = async () => {
    if (!validateInputs()) return;
    if (!privateKey) {
      Alert.alert(
        "Setup Required",
        "Please set your private key in the profile settings first."
      );
      return;
    }

    setLoading(true);
    try {
      const signedTx = await generateSignature(privateKey, toAddress, amount);
      onSignatureGenerated(signedTx);
      onGoBack();
    } catch (err) {
      Alert.alert("Signature Error", err.message);
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
        <Text style={[styles.txnScreenTitle, { fontFamily: 'BBH_Sans_Bartle' }]}>{type} Setup</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.txnScreenContent}>
        <InfoCard
          iconName={type === "Transfer" ? "send" : "repeat"}
          title={`${type} Transaction`}
          message={`Configure your offline ${type.toLowerCase()} details. The signed transaction will be sent via SMS to the relayer address.`}
        />

        {/* Token Selection */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { fontFamily: 'Poppins_Regular' }]}>Token:</Text>
          <TouchableOpacity
            style={styles.dropdownContainer}
            onPress={() => setIsTokenPickerVisible(true)}
          >
            {CurrentTokenIcon ? (
              <View style={styles.tokenIconContainer}>
                <CurrentTokenIcon width={24} height={24} />
              </View>
            ) : (
              <Feather
                name="dollar-sign"
                size={18}
                color={LIGHT_TEXT_COLOR}
                style={styles.inputIcon}
              />
            )}
            <Text style={[styles.dropdownText, { fontFamily: 'Poppins_Regular' }]}>
              {token || "Select your token"}
            </Text>
            <Feather name="chevron-down" size={18} color={LIGHT_TEXT_COLOR} />
          </TouchableOpacity>
          {errors.token && <Text style={[styles.errorText, { fontFamily: 'Poppins_Regular' }]}>{errors.token}</Text>}
        </View>

        {/* Amount */}
        <InputWithLabel
          label="Amount:"
          value={amount}
          onChangeText={setAmount}
          placeholder={`Enter ${token || "ETH"} amount`}
          keyboardType="numeric"
          error={errors.amount}
        />

        {/* Recipient Address */}
        <InputWithLabel
          label={type === "Transfer" ? "To Address:" : "Swap Destination:"}
          value={toAddress}
          onChangeText={setToAddress}
          placeholder="0x..."
          error={errors.toAddress}
          icon="copy"
          onIconPress={async () => setToAddress(await Clipboard.getStringAsync())}
        />

        {/* Action Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleGenerateSignature}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={TEXT_COLOR} />
          ) : (
            <Text style={[styles.actionButtonText, { fontFamily: 'Poppins_SemiBold' }]}>
              Generate Signature & Send SMS
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <TokenSelectionModal
        visible={isTokenPickerVisible}
        onClose={() => setIsTokenPickerVisible(false)}
        onSelect={(symbol) => {
          setToken(symbol);
          setIsTokenPickerVisible(false);
        }}
      />
    </SafeAreaView>
  );
};

// ------------------------------------
// --- MAIN APP COMPONENT (With Font Loading) ---
// ------------------------------------
export default function App() {
  // --- FONT LOADING ---
  const [fontsLoaded] = useFonts({
    // Replace the placeholders with the actual font files if you download them, 
    // or use Font.loadAsync with a URI if you prefer.
    // Assuming you set up the project to map these names to the loaded files.
    'Playfair_Display_Bold': require('./assets/fonts/PlayfairDisplay-Bold.ttf'), // Placeholder path
    'BBH_Sans_Bartle': require('./assets/fonts/BBHSansBartle-Regular.ttf'), // Placeholder path
    'Poppins_Regular': require('./assets/fonts/Poppins-Regular.ttf'), // Placeholder path
    'Poppins_SemiBold': require('./assets/fonts/Poppins-SemiBold.ttf'), // Placeholder path
    'monospace': Font.isLoaded('monospace') ? 'monospace' : require('./assets/fonts/RobotoMono-Regular.ttf'), // Ensures monospace fallback or loads a file
  });

  const [privateKey, setPrivateKeyState] = useState(null);
  const [loadingKey, setLoadingKey] = useState(true);
  const [activeScreen, setActiveScreen] = useState("Home");
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [signedMessage, setSignedMessage] = useState(
    "SMS content will appear here after generating signature."
  );

  // --- ASSET/STATE LOADING EFFECT ---
  const onLayoutRootView = useCallback(async () => {
    // Only hide the splash screen when fonts and AsyncStorage key are loaded
    if (fontsLoaded && !loadingKey) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, loadingKey]);


  useEffect(() => {
    const loadKey = async () => {
      const key = await getPrivateKey();
      setPrivateKeyState(key);
      setLoadingKey(false);
    };
    loadKey();
  }, []);

  useEffect(() => {
    if (privateKey) {
      const normalizedKey = privateKey.startsWith("0x")
        ? privateKey
        : "0x" + privateKey;
      try {
        const wallet = new ethers.Wallet(normalizedKey);
        setupNonceSync(wallet.address);
      } catch (e) {
        console.error("Invalid key for Nonce Sync:", e);
      }
    }
  }, [privateKey]);

  const handleSavePrivateKey = async (key) => {
    await setPrivateKey(key);
    setPrivateKeyState(key);
  };

  const handleTxnCardPress = (type) => {
    if (!privateKey) {
      Alert.alert(
        "Setup Required",
        "Please set your private key in the profile settings (top left icon) before proceeding."
      );
      return;
    }
    setActiveScreen(type);
  };

  const handleSignatureGenerated = async (signedTx) => {
    setSignedMessage(signedTx);
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      const { result } = await SMS.sendSMSAsync(
        [SMS_RECIPIENT],
        `${signedTx}`
      );
      console.log("SMS result:", result);
      Alert.alert("Success", "Signed transaction sent via SMS.");
    } else {
      Alert.alert(
        "SMS Not Available",
        "SMS service is not supported on this device. Signature copied to clipboard."
      );
      await Clipboard.setStringAsync(signedTx);
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
            onSignatureGenerated={handleSignatureGenerated}
            onGoBack={() => setActiveScreen("Home")}
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
              <Text style={[styles.txnScreenTitle, { fontFamily: 'BBH_Sans_Bartle' }]}>Bridge Coins</Text>
              <View style={{ width: 24 }} />
            </View>
            <View style={styles.txnScreenContent}>
              <InfoCard
                iconName="tool"
                title="Bridge Feature Under Construction"
                message="This feature is coming soon! Bridging across chains requires complex offline signature generation. We are working hard to integrate it."
              />
            </View>
          </SafeAreaView>
        );
      case "Home":
      default:
        return (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header (Unchanged) */}
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
              {/* Playfair Display for main title, BBH Sans Bartle for subtitle */}
              <Text style={[styles.heroTitle, styles.glowingText, { fontFamily: 'BBH_Sans_Bartle' }]}>CellFi</Text>
              <Text style={[styles.heroSubtitle, styles.glowingText, { fontFamily: 'BBH_Sans_Bartle' }]}>
                Your Secure Offline Transaction Hub
              </Text>
              <TouchableOpacity
                style={styles.completeProfileContainer}
                onPress={() =>
                  !privateKey ? setIsSettingsModalVisible(true) : null
                }
              >
                <Text style={[styles.completeProfileText, { fontFamily: 'Poppins_SemiBold' }]}>
                  {privateKey
                    ? "Ready for Transaction"
                    : "Complete your profile (Set Private Key)"}
                </Text>
                <Feather name="arrow-right" size={18} color={TEXT_COLOR} />
              </TouchableOpacity>
            </View>

            {/* Transaction Cards Section */}
            <Text style={[styles.sectionTitle, { fontFamily: 'BBH_Sans_Bartle' }]}>Main Transactions</Text>
            <View style={styles.cardsContainer}>
              <TransactionCard
                iconName="send"
                title="Transfer"
                onPress={() => handleTxnCardPress("Transfer")}
              />
              <TransactionCard
                iconName="repeat"
                title="Swap"
                onPress={() => handleTxnCardPress("Swap")}
              />
              <TransactionCard
                iconName="link"
                title="Bridge Coins"
                onPress={() => setActiveScreen("Bridge")}
              />
            </View>

            {/* Last Signed Message */}
            <View style={styles.messageBox}>
              <Text style={[styles.label, { fontFamily: 'Poppins_Regular' }]}>Last Signed Transaction:</Text>
              <View style={styles.messageContainer}>
                <ScrollView style={{ maxHeight: 100 }}>
                  <Text style={[styles.messageText, { fontFamily: 'monospace' }]}>{signedMessage}</Text>
                </ScrollView>
                <TouchableOpacity
                  onPress={() => Clipboard.setStringAsync(signedMessage)}
                  style={styles.copyIcon}
                >
                  <Feather name="copy" size={18} color={LIGHT_TEXT_COLOR} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.note, { fontFamily: 'Poppins_Regular' }]}>
                The raw signed transaction is what you send to a relayer.
              </Text>
            </View>
          </ScrollView>
        );
    }
  };

  if (!fontsLoaded || loadingKey) {
    return (
      // Render a simple loading view until both fonts and private key state are loaded
      <View style={styles.loadingContainer} onLayout={onLayoutRootView}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={{color: LIGHT_TEXT_COLOR, marginTop: 10}}>Loading App State...</Text>
      </View>
    );
  }

  // Once fonts and state are loaded, render the main UI
  return (
    <SafeAreaView style={styles.safeArea} onLayout={onLayoutRootView}>
      {renderScreen()}
      <SettingsModal
        visible={isSettingsModalVisible}
        onClose={() => setIsSettingsModalVisible(false)}
        currentKey={privateKey}
        onSaveKey={handleSavePrivateKey}
      />
    </SafeAreaView>
  );
}

// --- Styles (Finalized with Font References) ---
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
  // Removed loadingText style as it was merged into the conditional block for better handling

  // --- Screens/Navigation Header ---
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
  txnScreenTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: TEXT_COLOR,
    fontFamily: 'BBH_Sans_Bartle',
  },
  txnScreenContent: {
    flex: 1,
    padding: 20,
    width: "100%",
  },

  // Header (Unchanged)
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

  // Hero Section
  heroSection: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: CARD_BG,
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
    fontSize: 48,
    fontWeight: "800",
    color: PRIMARY_COLOR,
    marginBottom: 5,
    zIndex: 10,
    fontFamily: 'Playfair_Display_Bold',
  },
  heroSubtitle: {
    fontSize: 16,
    color: LIGHT_TEXT_COLOR,
    textAlign: "center",
    marginBottom: 20,
    zIndex: 10,
    fontFamily: 'BBH_Sans_Bartle',
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
    fontFamily: 'Poppins_SemiBold',
  },

  // Cards Section
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_COLOR,
    width: "100%",
    textAlign: "left",
    marginBottom: 15,
    fontFamily: 'BBH_Sans_Bartle',
  },
  cardsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 30,
  },
  txnCard: {
    width: width / 3 - 30,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  cardIconWrapper: {
    backgroundColor: `${PRIMARY_COLOR}20`,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  cardTitle: {
    color: TEXT_COLOR,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    fontFamily: 'Poppins_SemiBold'
  },

  // Info Card
  infoCard: {
    backgroundColor: CARD_BG,
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 25,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_COLOR,
    marginTop: 10,
    fontFamily: 'BBH_Sans_Bartle',
  },
  infoMessage: {
    fontSize: 14,
    color: LIGHT_TEXT_COLOR,
    textAlign: "center",
    marginTop: 5,
    fontFamily: 'Poppins_Regular',
  },

  // Input & Form Styles
  inputGroup: { marginBottom: 15, width: "100%" },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 5,
    color: LIGHT_TEXT_COLOR,
    fontFamily: 'Poppins_Regular',
  },
  note: { fontSize: 12, color: PRIMARY_COLOR, marginBottom: 5, fontFamily: 'Poppins_Regular' },
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
  input: { flex: 1, paddingVertical: 10, fontSize: 16, color: TEXT_COLOR, fontFamily: 'Poppins_Regular' },
  multilineInput: { height: 100, paddingTop: 10 },
  inputAccessory: { paddingLeft: 10 },
  errorText: { color: ERROR_COLOR, fontSize: 12, marginTop: 4, fontFamily: 'Poppins_Regular' },
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
  inputIcon: { marginRight: 10 },
  dropdownText: { flex: 1, fontSize: 16, color: TEXT_COLOR, paddingLeft: 5, fontFamily: 'Poppins_Regular' },
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
    fontFamily: 'Poppins_SemiBold',
  },

  // Message Box
  messageBox: { width: "100%", marginTop: 20 },
  messageContainer: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
    backgroundColor: CARD_BG,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  messageText: {
    fontSize: 12,
    textAlign: "left",
    color: LIGHT_TEXT_COLOR,
    flex: 1,
    fontFamily: 'monospace',
  },
  copyIcon: { marginLeft: 10, padding: 5 },

  // Modals
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
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    color: TEXT_COLOR,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    paddingBottom: 10,
    fontFamily: 'BBH_Sans_Bartle',
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
  tokenName: { fontSize: 16, color: TEXT_COLOR, fontFamily: 'Poppins_Regular' },
  separator: {
    height: 1,
    backgroundColor: BORDER_COLOR,
    marginVertical: 20,
  },
});