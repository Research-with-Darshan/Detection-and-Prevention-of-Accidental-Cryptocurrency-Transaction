import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/ui/glass-card";
import { SecureButton } from "@/components/ui/secure-button";
import { User, Send, Copy, ArrowLeftRight, Wallet, Edit3, AlertTriangle, CheckCircle } from "lucide-react";
import { authService, User as UserType } from "@/services/authService";
import { StorageDebugger } from "@/utils/storageDebugger";

export default function SelfTransfer() {
  const navigate = useNavigate();
  // Current user (moved early so we can namespace storage keys)
  const user = authService.getCurrentUser();
  const keyPrefix = user?.id ? `user:${user.id}:` : "user:anon:";
  const [amount, setAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("ETH");
  const [networkFee] = useState("0.0012 ETH");
  const [total, setTotal] = useState("0.0000 ETH");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fromWallet, setFromWallet] = useState<"primary" | "secondary">("primary");
  const [customToWallet, setCustomToWallet] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [isCustomWallet, setIsCustomWallet] = useState(true);
  const [recipientUser, setRecipientUser] = useState<UserType | null>(null);
  const [showRecipientDetails, setShowRecipientDetails] = useState(false);
  const [sameAddressWarning, setSameAddressWarning] = useState("");
  const [isCfrVerified, setIsCfrVerified] = useState(false);
  const [cfrInput, setCfrInput] = useState("");
  const [cfrError, setCfrError] = useState("");
  const [cfrSuccess, setCfrSuccess] = useState("");
  const [cfrRemainSec, setCfrRemainSec] = useState(0);
  const [cryptoPrices, setCryptoPrices] = useState({
    eth: 2847.32,
    btc: 72750,
    bnb: 585.00,
    matic: 0.75,
    sol: 98.45,
    ada: 0.52,
    usdt: 1.0,
    usd: 1.0,
    wld: 2.40
  });
  const chainToToken: Record<string, string> = {
    "Ethereum": "ETH",
    "Bitcoin": "BTC",
    "Binance Smart Chain": "BNB",
    "Polygon": "MATIC",
    "Solana": "SOL",
    "USDT": "USDT",
    "USD": "USD",
    "Worldcoin": "WLD"
  };

  // Persisted wallet ETH balances (Wallet 1 = primary, Wallet 2 = Your Another Wallet) scoped per user
  const WALLET1_KEY = `${keyPrefix}dashboard:wallet1BalanceETH`;
  const WALLET2_KEY = `${keyPrefix}dashboard:wallet2BalanceETH`;
  const getWallet1EthBalance = (): number => {
    try {
      const raw = localStorage.getItem(WALLET1_KEY);
      const v = raw != null ? parseFloat(raw) : NaN;
      if (!isNaN(v)) return v;
      localStorage.setItem(WALLET1_KEY, '100');
      return 100;
    } catch { return 100; }
  };
  const setWallet1EthBalance = (val: number) => {
    try { localStorage.setItem(WALLET1_KEY, val.toFixed(6)); } catch {}
  };
  const getWallet2EthBalance = (): number => {
    try {
      const raw = localStorage.getItem(WALLET2_KEY);
      const v = raw != null ? parseFloat(raw) : NaN;
      if (!isNaN(v)) return v;
      localStorage.setItem(WALLET2_KEY, '50');
      return 50;
    } catch { return 50; }
  };
  const setWallet2EthBalance = (val: number) => {
    try { localStorage.setItem(WALLET2_KEY, val.toFixed(6)); } catch {}
  };

  // Token USD price map helper
  const getTokenPrice = (symbol: string) => {
    const priceMap: Record<string, number> = {
      ETH: cryptoPrices.eth,
      BTC: cryptoPrices.btc,
      BNB: cryptoPrices.bnb,
      MATIC: cryptoPrices.matic,
      SOL: cryptoPrices.sol,
      ADA: cryptoPrices.ada,
      USDT: cryptoPrices.usdt,
      USD: cryptoPrices.usd,
      WLD: cryptoPrices.wld,
    };
    return priceMap[symbol] ?? cryptoPrices.eth;
  };

  // Compute network fee in the currently selected token units using base 0.0012 ETH
  const getNetworkFeeToken = () => {
    const baseFeeEth = 0.0012; // base fee in ETH
    const feeUsd = baseFeeEth * cryptoPrices.eth;
    const price = getTokenPrice(selectedCurrency);
    return feeUsd / price;
  };
  const [fromChain, setFromChain] = useState<string>(() => {
    try {
      return (typeof window !== 'undefined' && localStorage.getItem(`${keyPrefix}dashboard:wallet1Chain`)) || 'Ethereum';
    } catch {
      return 'Ethereum';
    }
  });
  const [toChain, setToChain] = useState<string>(() => {
    try {
      return (typeof window !== 'undefined' && localStorage.getItem(`${keyPrefix}dashboard:wallet2Chain`)) || 'Ethereum';
    } catch {
      return 'Ethereum';
    }
  });
  
  // Wallet balances (stored in localStorage as ETH base)
  const primaryWalletBalance = getWallet1EthBalance();
  const secondaryWalletBalance = getWallet2EthBalance();

  
  // Second wallet address (from user data or derived from primary) - same as dashboard
  const secondWalletAddress = user?.secondaryWalletAddress || 
    (user?.walletAddress ? 
      "0x" + user.walletAddress.slice(2).split("").reverse().join("").substring(0, 20) + "abcd" + 
      user.walletAddress.slice(2).split("").reverse().join("").substring(24) : 
      "0x9876543210abcdef9876543210abcdef98765432");
  
  // Conversion rates based on the provided data (same as dashboard)
  const conversionRates = {
    ETH: {
      USD: 2847.32,
      BTC: 0.039,
      SOL: 28.9,
      ADA: 5475,
      INR: 234500
    },
    BTC: {
      USD: 72750,
      ETH: 25.64,
      SOL: 740,
      ADA: 140000,
      INR: 6000000
    },
    USD: {
      ETH: 0.000351,
      BTC: 0.0000138,
      SOL: 0.0102,
      ADA: 1.94,
      INR: 82
    },
    INR: {
      ETH: 0.00000428,
      BTC: 0.000000167,
      SOL: 0.000124,
      ADA: 0.0237,
      USD: 0.0122
    }
  };

  // Get USD equivalent from token amount and token symbol
  const getUSDEquivalent = (amountInToken: number, tokenSymbol: string) => {
    const priceMap: Record<string, number> = {
      ETH: cryptoPrices.eth,
      BTC: cryptoPrices.btc,
      BNB: cryptoPrices.bnb,
      MATIC: cryptoPrices.matic,
      SOL: cryptoPrices.sol,
      ADA: cryptoPrices.ada,
      USDT: cryptoPrices.usdt,
      USD: cryptoPrices.usd,
      WLD: cryptoPrices.wld,
    };
    const usd = (amountInToken * (priceMap[tokenSymbol] || cryptoPrices.eth));
    return usd.toFixed(2);
  };

  // Compute FROM wallet balance in current chain's token
  const getWalletBalance = () => {
    const baseEth = getWallet1EthBalance(); // stored base as ETH units
    const token = chainToToken[fromChain] || 'ETH';
    if (token === 'ETH') return baseEth;
    const priceMap: Record<string, number> = {
      ETH: cryptoPrices.eth,
      BTC: cryptoPrices.btc,
      BNB: cryptoPrices.bnb,
      MATIC: cryptoPrices.matic,
      SOL: cryptoPrices.sol,
      ADA: cryptoPrices.ada,
      USDT: cryptoPrices.usdt,
      USD: cryptoPrices.usd,
      WLD: cryptoPrices.wld,
    };
    const ethUSD = cryptoPrices.eth;
    const tokenUSD = priceMap[token] || ethUSD;
    // Convert value of base ETH into target token amount via USD
    const balanceToken = (baseEth * ethUSD) / tokenUSD;
    return balanceToken;
  };

  // USD equivalent of FROM balance
  const getWalletBalanceUSD = () => {
    const balanceToken = getWalletBalance();
    const token = chainToToken[fromChain] || 'ETH';
    return getUSDEquivalent(balanceToken, token);
  };

  // Update total when amount, price, or token changes
  useEffect(() => {
    if (amount) {
      const amountNum = parseFloat(amount);
      const networkFeeNum = getNetworkFeeToken();
      if (!isNaN(amountNum)) {
        setTotal((amountNum + networkFeeNum).toFixed(6) + ` ${selectedCurrency}`);
      }
    } else {
      setTotal(`0.0000 ${selectedCurrency}`);
    }
  }, [amount, selectedCurrency, cryptoPrices.eth, cryptoPrices.btc, cryptoPrices.bnb, cryptoPrices.matic, cryptoPrices.sol, cryptoPrices.ada, cryptoPrices.usdt, cryptoPrices.usd, cryptoPrices.wld]);

  // Initialize crypto prices
  useEffect(() => {
    setCryptoPrices({
      eth: 2847.32,
      btc: 72750,
      bnb: 585.00,
      matic: 0.75,
      sol: 98.45,
      ada: 0.52,
      usdt: 1.0,
      usd: 1.0,
      wld: 2.40
    });
  }, []);

  // Keep selected token in sync with fromChain
  useEffect(() => {
    const token = chainToToken[fromChain] || 'ETH';
    setSelectedCurrency(token);
    try {
      localStorage.setItem(`${keyPrefix}dashboard:wallet1Chain`, fromChain);
    } catch {}
  }, [fromChain]);

  // Fetch recipient user details when custom wallet address changes
  useEffect(() => {
    if (isCustomWallet) {
      const input = (customToWallet || "").trim();
      if (!input) {
        // No custom wallet address entered
        setRecipientUser(null);
        setShowRecipientDetails(false);
        setSameAddressWarning("");
        setIsCfrVerified(false);
        setCfrInput("");
        setCfrError("");
        setCfrSuccess("");
        setCfrRemainSec(0);
        return;
      }

      // Prevent same address as sender wallet
      const senderAddress = fromWallet === "primary" ? user?.walletAddress : secondWalletAddress;
      if (senderAddress && input.toLowerCase() === senderAddress.toLowerCase()) {
        setSameAddressWarning("Sender and receiver wallet address must not be the same.");
        setRecipientUser(null);
        setShowRecipientDetails(false);
        setIsCfrVerified(false);
        setCfrInput("");
        setCfrError("");
        setCfrSuccess("");
        setCfrRemainSec(0);
        return;
      } else {
        setSameAddressWarning("");
      }

      // Match against user's derived 'YOUR ANOTHER WALLET' address (case-insensitive)
      if (secondWalletAddress && input.toLowerCase() === secondWalletAddress.toLowerCase() && user) {
        const derivedRecipient: UserType = {
          id: `${user.id}-another`,
          username: user.username,
          realName: `${user.realName} (Your Another Wallet)`,
          email: user.email,
          password: "",
          phone: user.phone,
          country: user.country,
          dateOfBirth: user.dateOfBirth,
          createdAt: user.createdAt,
          walletAddress: input,
          referencePhoto: user.referencePhoto || ""
        };
        setRecipientUser(derivedRecipient);
        setShowRecipientDetails(true);
        if (error && error.includes("Please enter a valid wallet address")) setError("");
        return;
      }

      // Find user by wallet address in DB (case-insensitive exact match)
      const allUsers = StorageDebugger.getAllUsers();
      const foundUser = Array.isArray(allUsers)
        ? allUsers.find((u: any) => (u.walletAddress || "").toLowerCase() === input.toLowerCase())
        : null;

      if (foundUser) {
        setRecipientUser(foundUser);
        setShowRecipientDetails(true);
      } else {
        // No user found, show Unknown Recipient placeholder
        setRecipientUser({
          id: "hacker",
          username: "suspicious_user",
          realName: "Unknown Recipient",
          email: "suspicious@example.com",
          password: "",
          phone: "+1*** *** ****",
          country: "Unknown",
          dateOfBirth: "1990-01-01",
          createdAt: new Date().toISOString(),
          walletAddress: input,
          referencePhoto: ""
        });
        setShowRecipientDetails(true);
      }

      // Clear any previous format error
      if (error && error.includes("Please enter a valid wallet address")) {
        setError("");
      }
      // Reset CFR state on address change
      setIsCfrVerified(false);
      setCfrInput("");
      setCfrError("");
      setCfrSuccess("");
      setCfrRemainSec(0);
    } else {
      // Not in custom wallet mode
      setRecipientUser(null);
      setShowRecipientDetails(false);
      setSameAddressWarning("");
      setIsCfrVerified(false);
      setCfrInput("");
      setCfrError("");
      setCfrSuccess("");
      setCfrRemainSec(0);
    }
  }, [customToWallet, isCustomWallet, error, fromWallet, user, secondWalletAddress]);

  useEffect(() => {
    const tick = () => {
      try {
        const raw = localStorage.getItem(`${keyPrefix}cfrSession:selfTransfer`);
        if (!raw) { setCfrRemainSec(0); return; }
        const session = JSON.parse(raw) as { expiresAt: number };
        const now = Date.now();
        const remain = Math.max(0, Math.ceil((session.expiresAt - now) / 1000));
        setCfrRemainSec(remain);
      } catch {
        setCfrRemainSec(0);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  // When not using custom wallet, show current user details as recipient (own other wallet)
  useEffect(() => {
    if (!isCustomWallet && user) {
      setRecipientUser(user);
      setShowRecipientDetails(true);
    }
  }, [isCustomWallet, fromWallet, user]);

  // Update toChain when recipient changes, prefer saved chain for second wallet
  useEffect(() => {
    const recipientAddr = (customToWallet || '').trim();
    if (recipientAddr && secondWalletAddress && recipientAddr.toLowerCase() === secondWalletAddress.toLowerCase()) {
      try {
        const saved = localStorage.getItem(`${keyPrefix}dashboard:wallet2Chain`);
        if (saved) setToChain(saved);
      } catch {}
    }
  }, [customToWallet, secondWalletAddress]);

  const handleTransfer = () => {
    // Reset messages
    setError("");
    setSuccess("");
    
    // Check if amount is provided
    if (!amount) {
      setError("Please enter an amount to transfer.");
      return;
    }
    
    // Validate amount
    const amountNum = parseFloat(amount);
    const networkFeeNum = parseFloat(networkFee);
    
    if (isNaN(amountNum) || isNaN(networkFeeNum)) {
      setError("Invalid amount or network fee.");
      return;
    }
    
    if (amountNum <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    
    // Validate custom wallet address if in custom mode
    if (isCustomWallet) {
      if (!customToWallet) {
        setError("Please enter a recipient wallet address.");
        return;
      }
      
      const isValidEthAddress = /^0x[a-fA-F0-9]{40}$/.test(customToWallet);
      if (!isValidEthAddress) {
        setError("Please enter a valid wallet address (0x followed by 40 hex characters).");
        return;
      }
      // Require CFR verification before proceeding
      if (!isCfrVerified) {
        setError("Please verify the recipient by entering the 4-digit code sent to your contacts.");
        return;
      }
      
      // Same-address case is handled by inline warning and disabled button
      
      // Check if recipient is a hacker (no valid user found)
      if (recipientUser && recipientUser.id === "hacker") {
        const confirmTransfer = window.confirm(
          "Warning: This wallet address does not belong to a verified SecureTx user. " +
          "The recipient details appear suspicious. Are you sure you want to proceed with this transfer?"
        );
        
        if (!confirmTransfer) {
          setError("Transfer cancelled by user.");
          return;
        }
      }
    }
    
    // Validate balance >= amount + network fee (primary only)
    const fromWalletBalance = getWalletBalance();
    if (fromWalletBalance < (amountNum + networkFeeNum)) {
      setError(`Insufficient balance in Primary wallet. You need at least ${(amountNum + networkFeeNum).toFixed(6)} ${selectedCurrency} (Amount + Network Fee).`);
      return;
    }
    
    // In a real app, this would call the transfer API
    const fromWalletName = fromWallet === "primary" ? "Primary" : "Secondary";
    const toWalletName = isCustomWallet ? "Custom Wallet" : (fromWallet === "primary" ? "Secondary" : "Primary");
    
    setSuccess(`Transfer of ${amount} ${selectedCurrency} from ${fromWalletName} to ${toWalletName} completed successfully!`);
    
    // Save to Recent Transactions history
    try {
      const histRaw = localStorage.getItem(`${keyPrefix}txHistory`);
      const txHistory: any[] = histRaw ? JSON.parse(histRaw) : [];
      const nowIso = new Date().toISOString();
      const fromAddr = user?.walletAddress || '';
      const toAddr = getToWalletAddress();
      const baseEntry = {
        id: Date.now(),
        type: 'Sent',
        amount: `${parseFloat(amount).toFixed(6)} ${selectedCurrency}`,
        from: fromAddr,
        to: toAddr,
        date: nowIso,
        status: 'Completed',
        context: 'Self Transfer'
      };
      txHistory.unshift(baseEntry);
      // Also add a Received entry if self-transfer to your another wallet
      const isToSecondWalletForHistory = (!isCustomWallet) || (
        (customToWallet || '').trim().toLowerCase() === (secondWalletAddress || '').toLowerCase()
      );
      if (isToSecondWalletForHistory) {
        txHistory.unshift({
          ...baseEntry,
          id: Date.now() + 1,
          type: 'Received',
          from: fromAddr,
          to: secondWalletAddress,
        });
      }
      // cap history length
      localStorage.setItem(`${keyPrefix}txHistory`, JSON.stringify(txHistory.slice(0, 200)));
    } catch {}

    // Apply accounting only if recipient is valid user or it's a self-transfer to Your Another Wallet
    const isKnownUser = !!recipientUser && recipientUser.id !== "hacker";
    const isToSecondWallet = (!isCustomWallet) || (
      (customToWallet || '').trim().toLowerCase() === (secondWalletAddress || '').toLowerCase()
    );
    if (isKnownUser || isToSecondWallet) {
      // Convert entered amount (selectedCurrency) to ETH via USD parity
      const amountToken = parseFloat(amount);
      const amountEth = (amountToken * getTokenPrice(selectedCurrency)) / cryptoPrices.eth;
      const feeEth = 0.0012; // base fee in ETH
      const totalDeductEth = amountEth + feeEth;
      // Deduct from Wallet 1
      const w1 = getWallet1EthBalance();
      setWallet1EthBalance(Math.max(0, w1 - totalDeductEth));
      // Credit Wallet 2 only for self-transfer
      if (isToSecondWallet) {
        const w2 = getWallet2EthBalance();
        setWallet2EthBalance(w2 + amountEth);
      }
    }
    
    // Reset form after successful transfer
    setAmount("");
    setTotal(`0.0000 ${selectedCurrency}`);
    setCustomToWallet("");
    setRecipientUser(null);
    setShowRecipientDetails(false);
  };

  const handleCancel = () => {
    navigate("/dashboard");
  };

  const swapWallets = () => {
    setIsSwapping(true);
    // Swap the wallets
    setFromWallet(fromWallet === "primary" ? "secondary" : "primary");
    
    // Reset swapping state after animation
    setTimeout(() => {
      setIsSwapping(false);
    }, 300);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('Address copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy address');
      });
  };

  // Get primary wallet address
  const getWalletAddress = () => {
    if (!user) return "";
    return user.walletAddress;
  };

  // Get the current "to" wallet address (custom only)
  const getToWalletAddress = () => {
    return customToWallet;
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Self Transfer
            </h1>
            <p className="text-muted-foreground mt-2">
              Transfer cryptocurrency between your wallets
            </p>
          </div>
          <div className="flex gap-3">
            <SecureButton variant="outline" onClick={handleCancel}>
              Back to Dashboard
            </SecureButton>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transfer Form */}
          <div className="lg:col-span-2">
            <GlassCard className="p-6">
              <h3 className="text-xl font-semibold mb-6">Transfer Between Wallets</h3>
              
              <div className="space-y-6">
                {/* Success Message */}
                {success && (
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                    <p className="text-green-500 text-sm">
                      {success}
                    </p>
                  </div>
                )}
                
                {/* Error Message */}
                {error && (
                  <div className="bg-destructive/20 border border-destructive/30 rounded-lg p-3">
                    <p className="text-destructive text-sm">
                      {error}
                    </p>
                  </div>
                )}
                
                {/* Wallet Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  {/* From Wallet */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">From Wallet</label>
                    <div 
                      className={`p-4 rounded-lg border bg-primary/10 border-primary cursor-default ${isSwapping ? "transform scale-95 opacity-75" : ""}`}
                    >
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                        <span className="font-medium">Primary</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {getWalletAddress().substring(0, 10)}...{getWalletAddress().substring(32)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Swap Button */}
                  <div className="flex justify-center">
                    <button 
                      onClick={swapWallets}
                      className={`p-3 rounded-full bg-input/50 border border-input hover:bg-input/70 transition-all duration-300 ${
                        isSwapping ? "transform rotate-180" : ""
                      }`}
                    >
                      <ArrowLeftRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                  
                  {/* To Wallet (Custom Only) */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">To Wallet</label>
                    <div 
                      className="p-4 rounded-lg border transition-all duration-300 border-input bg-input/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                          <span className="font-medium">Custom Wallet</span>
                        </div>
                        <Edit3 className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Click to enter address</p>
                    </div>
                  </div>
                </div>
                
                {/* Custom Wallet Input */}
                {isCustomWallet && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Recipient Wallet Address</label>
                    <div className="mt-1 flex">
                      <input 
                        type="text" 
                        value={customToWallet}
                        onChange={(e) => setCustomToWallet(e.target.value)}
                        placeholder="Enter wallet address (0x...)" 
                        className="flex-grow bg-input/50 border border-input rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button 
                        onClick={() => copyToClipboard(customToWallet)}
                        className="bg-primary text-primary-foreground px-4 rounded-r-lg hover:bg-primary/90 transition-colors"
                        disabled={!customToWallet}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    {sameAddressWarning && (
                      <div className="mt-2 text-sm text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded px-3 py-2">
                        {sameAddressWarning}
                      </div>
                    )}
                    
                    {/* Warning for custom wallet */}
                    {!isCfrVerified && (
                      <div className="mt-2 flex items-center text-yellow-500 text-sm">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        <span>Verify recipient details before transferring</span>
                      </div>
                    )}

                  {/* Chain selection affecting Dashboard Wallet 1 */}
                  <div className="mt-3 flex items-center justify-start">
                    <label className="text-xs text-muted-foreground mr-2">SELECT YOUR FROM chain</label>
                    <select
                      value={fromChain}
                      onChange={(e) => setFromChain(e.target.value)}
                      className="bg-input/50 border border-input rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option>Ethereum</option>
                      <option>Bitcoin</option>
                      <option>Binance Smart Chain</option>
                      <option>Polygon</option>
                      <option>Solana</option>
                      <option>USDT</option>
                      <option>USD</option>
                      <option>Worldcoin</option>
                    </select>
                  </div>
                  </div>
                )}
                
                {/* Recipient User Details */}
                {showRecipientDetails && recipientUser && !sameAddressWarning && (
                  <GlassCard className={`${isCfrVerified ? 'bg-green-500/10 border border-green-500/30' : 'bg-warning/10 border border-warning/20'}`}>
                    <div className="p-4">
                      <h4 className={`font-semibold flex items-center ${isCfrVerified ? 'text-green-600' : 'text-warning'}`}>
                        {isCfrVerified ? (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 mr-2" />
                        )}
                        {isCfrVerified ? 'Recipient Verification Successful' : 'Recipient Verification Pending'}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {isCfrVerified
                          ? "This recipient has been verified. You may proceed with the transfer."
                          : "Please verify the recipient's details before proceeding with the transfer."}
                      </p>

                      <div className="mt-3 flex items-center gap-3">
                        {recipientUser.referencePhoto ? (
                          <img 
                            src={recipientUser.referencePhoto} 
                            alt="Recipient" 
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-warning/20 to-warning/40 flex items-center justify-center">
                            <User className="w-6 h-6 text-warning" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{recipientUser.realName}</p>
                          <p className="text-sm text-muted-foreground">@{recipientUser.username}</p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Country:</span>
                          <span className="ml-1">{recipientUser.country}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Member Since:</span>
                          <span className="ml-1">
                            {new Date(recipientUser.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short'
                            })}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center gap-3">
                          <div className="text-xs text-muted-foreground">Recipient Chain</div>
                          <select
                            value={toChain}
                            onChange={(e) => {
                              const v = e.target.value;
                              setToChain(v);
                              const addr = (customToWallet || '').trim();
                              if (secondWalletAddress && addr.toLowerCase() === secondWalletAddress.toLowerCase()) {
                                try { localStorage.setItem(`${keyPrefix}dashboard:wallet2Chain`, v); } catch {}
                              }
                            }}
                            className="bg-input/50 border border-input rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option>Ethereum</option>
                            <option>Bitcoin</option>
                            <option>Binance Smart Chain</option>
                            <option>Polygon</option>
                            <option>Solana</option>
                            <option>USDT</option>
                            <option>USD</option>
                            <option>Worldcoin</option>
                          </select>
                        </div>
                      </div>

                      {fromChain !== toChain && (
                        <div className="mt-3 bg-destructive/10 border border-destructive/30 rounded p-3">
                          <p className="text-sm text-destructive">
                            Your FROM wallet chain is {fromChain} and TO wallet chain is {toChain}. Sending across different chains may permanently lose assets.
                          </p>
                          <div className="mt-2">
                            <SecureButton 
                              variant="default"
                              className={`w-full ${isCfrVerified ? 'bg-green-600 hover:bg-green-600 cursor-default text-white' : ''}`}
                              disabled={isCfrVerified}
                              onClick={() => {
                                const fix = fromChain;
                                setToChain(fix);
                                const addr = (customToWallet || '').trim();
                                if (secondWalletAddress && addr.toLowerCase() === secondWalletAddress.toLowerCase()) {
                                  try { localStorage.setItem(`${keyPrefix}dashboard:wallet2Chain`, fix); } catch {}
                                }
                                alert(`Auto-fix applied. Recipient chain set to ${fix}.`);
                              }}
                            >
                              Auto Fix: Match Recipient Chain to {fromChain}
                            </SecureButton>
                          </div>
                        </div>
                      )}

                      {/* Verify Button */}
                      <div className="mt-4">
                        <SecureButton 
                          variant="default" 
                          className={`w-full ${isCfrVerified ? 'bg-green-600 hover:bg-green-600 cursor-default' : 'bg-warning hover:bg-warning/90'} text-white`}
                          disabled={isCfrVerified}
                          onClick={() => {
                            const maskedPhone = recipientUser.phone 
                              ? `${recipientUser.phone.slice(0, 3)}****${recipientUser.phone.slice(-2)}`
                              : 'Not provided';
                            const maskedEmail = recipientUser.email 
                              ? `${recipientUser.email.charAt(0)}***${recipientUser.email.split('@')[1]}`
                              : 'Not provided';
                            const cfrCode = Math.floor(1000 + Math.random() * 9000).toString();
                            const now = Date.now();
                            const session = {
                              code: cfrCode,
                              expiresAt: now + 5 * 60 * 1000,
                              canResendAt: now + 30 * 1000,
                              info: {
                                fromChain,
                                toChain,
                                toAddress: (customToWallet || '').trim(),
                                userMaskedPhone: maskedPhone,
                                userMaskedEmail: maskedEmail,
                              }
                            };
                            try {
                              localStorage.setItem(`${keyPrefix}cfrSession:selfTransfer`, JSON.stringify(session));
                            } catch {}
                            alert(`CFR code sent to your registered contacts.\nPhone: ${maskedPhone}\nEmail: ${maskedEmail}`);
                            setCfrInput("");
                            setCfrError("");
                            setCfrSuccess("4-digit code sent. Please enter it below to verify.");
                            setIsCfrVerified(false);
                            setCfrRemainSec(5 * 60);
                          }}
                        >
                          {isCfrVerified ? 'Recipient Verified' : 'Verify Recipient'}
                        </SecureButton>
                      </div>

                      {(() => {
                        try {
                          const raw = localStorage.getItem(`${keyPrefix}cfrSession:selfTransfer`);
                          if (!raw) return null;
                          const session = JSON.parse(raw) as { code: string };
                          const codeToShow = recipientUser.id === 'hacker' ? '****' : session.code;
                          const mm = String(Math.floor(cfrRemainSec / 60)).padStart(2, '0');
                          const ss = String(cfrRemainSec % 60).padStart(2, '0');
                          return (
                            !isCfrVerified && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                Code sent: <span className="font-mono">{codeToShow}</span> • Expires in {mm}:{ss}
                              </div>
                            )
                          );
                        } catch { return null; }
                      })()}

                      {/* CFR Code Entry */}
                      {!isCfrVerified && (
                      <div className="mt-3">
                        <label className="text-sm font-medium text-muted-foreground">Enter 4-digit CFR code</label>
                        <div className="mt-1 flex gap-2">
                          <input
                            type="password"
                            inputMode="numeric"
                            pattern="\\d*"
                            maxLength={4}
                            value={cfrInput}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                              setCfrInput(v);
                            }}
                            className="flex-grow bg-input/50 border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="0000"
                          />
                          <SecureButton
                            variant="outline"
                            className="border-green-600 text-green-600 hover:bg-green-500/10"
                            onClick={() => {
                              setCfrError("");
                              setCfrSuccess("");
                              const raw = localStorage.getItem(`${keyPrefix}cfrSession:selfTransfer`);
                              if (!raw) { setCfrError('No verification session found. Please send the code again.'); return; }
                              try {
                                const session = JSON.parse(raw) as { code: string; expiresAt: number };
                                if (!/^\d{4}$/.test(cfrInput)) { setCfrError('Enter a valid 4-digit code.'); return; }
                                const now = Date.now();
                                if (now > session.expiresAt) { setCfrError('Code expired. Please resend.'); return; }
                                if (cfrInput !== session.code) { setCfrError('Invalid code.'); return; }
                                setIsCfrVerified(true);
                                setCfrSuccess('Recipient verified successfully.');
                                try { localStorage.removeItem(`${keyPrefix}cfrSession:selfTransfer`); } catch {}
                                setCfrRemainSec(0);
                              } catch {
                                setCfrError('Verification failed. Please resend.');
                              }
                            }}
                          >
                            Validate
                          </SecureButton>
                        </div>
                        {cfrError && (
                          <div className="mt-2 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded px-3 py-2">{cfrError}</div>
                        )}
                        {cfrSuccess && (
                          <div className="mt-2 bg-green-500/10 border border-green-500/30 text-green-600 text-sm rounded px-3 py-2">{cfrSuccess}</div>
                        )}
                      </div>
                      )}
                    </div>
                  </GlassCard>
                )}
                
                {/* Wallet Balances */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-input/50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <div className="text-xs text-muted-foreground font-semibold tracking-wide">FROM</div>
                        <div className="font-medium text-sm">FROM wallet balance</div>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(getWalletAddress())}
                        className="text-primary hover:text-primary/80 text-sm flex items-center font-medium"
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </button>
                    </div>
                    <p className="font-medium">{getWalletBalance().toFixed(6)} {selectedCurrency}</p>
                    <p className="text-xs text-muted-foreground">≈ ${getUSDEquivalent(getWalletBalance(), selectedCurrency)} USD</p>
                  </div>
                  
                  <div className="bg-input/50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <div className="font-medium text-sm">Custom Wallet address</div>
                      </div>
                    </div>
                    <p className="font-medium font-mono break-all">{customToWallet ? customToWallet : "Enter Address"}</p>
                    {customToWallet && (
                      <p className={`text-xs mt-1 ${recipientUser && recipientUser.id !== 'hacker' ? 'text-green-500' : 'text-destructive'}`}>
                        {recipientUser && recipientUser.id !== 'hacker' ? 'Valid user' : 'Unknown recipient'}
                      </p>
                    )}
                    {/* Address already shown above when custom is enabled */}
                  </div>
                </div>
                
                {/* Amount */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Amount</label>
                  <div className="relative mt-1">
                    <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00" 
                      className="w-full bg-input/50 border border-input rounded-lg px-3 py-2 pr-16 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <select 
                        value={selectedCurrency}
                        onChange={(e) => setSelectedCurrency(e.target.value)}
                        className="bg-transparent text-sm font-medium focus:outline-none"
                      >
                        <option>ETH</option>
                        <option>BTC</option>
                        <option>SOL</option>
                        <option>BNB</option>
                        <option>MATIC</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Network and Fees */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Network Fee</label>
                    <p className="font-medium">{getNetworkFeeToken().toFixed(6)} {selectedCurrency}</p>
                  </div>
                  <div className="text-right">
                    <label className="text-xs text-muted-foreground">Total</label>
                    <p className="font-medium">{total}</p>
                  </div>
                </div>
                
                {/* Transfer Button */}
                <div className="pt-4">
                  <SecureButton 
                    className="w-full" 
                    glow
                    onClick={handleTransfer}
                    disabled={!amount || !!sameAddressWarning}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Transfer Crypto
                  </SecureButton>
                </div>
              </div>
            </GlassCard>
            {success && (
              <GlassCard className="mt-4 p-6 border border-green-500/30 bg-green-500/5">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-700">Transaction Finalized</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      All transaction information has been securely packaged and encrypted into a block candidate. The network miners are now working to solve the cryptographic puzzle to validate and commit the block. Once confirmed, the transaction becomes immutable on-chain and the successful miner receives the protocol reward.
                    </p>
                  </div>
                </div>
              </GlassCard>
            )}
          </div>
          
          {/* Wallet Information */}
          <div className="space-y-6">
            {/* Transfer Details */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Wallet className="w-5 h-5 mr-2" />
                Transfer Details
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From:</span>
                  <span className="font-medium">Primary Wallet</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To:</span>
                  <span className="font-medium">{isCustomWallet ? 'Custom Wallet' : 'Primary Wallet'}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recipient Address:</span>
                  <span className="font-mono text-xs break-all text-right">
                    {getToWalletAddress()}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">{amount || "0.00"} {selectedCurrency}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network Fee:</span>
                  <span className="font-medium">{networkFee}</span>
                </div>
                
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-medium">{total}</span>
                </div>
              </div>
            </GlassCard>
            
            {/* User Details - REMOVED */}
          </div>
        </div>
      </div>
    </div>
  );
}