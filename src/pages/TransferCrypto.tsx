import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/ui/glass-card";
import { SecureButton } from "@/components/ui/secure-button";
import { User, Send, Copy, Wallet, ChevronDown } from "lucide-react";
import { authService, User as UserType } from "@/services/authService";
import { StorageDebugger } from "@/utils/storageDebugger";
import { verifyPassword } from "@/lib/crypto";

export default function TransferCrypto() {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("ETH");
  const [networkFee] = useState("0.0012 ETH");
  const [total, setTotal] = useState("0.0000 ETH");
  const [error, setError] = useState("");
  const [senderWalletAddress, setSenderWalletAddress] = useState("");
  const [userWallets, setUserWallets] = useState<{primary: string, secondary: string}>({primary: "", secondary: ""});
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [recipientUser, setRecipientUser] = useState<UserType | null>(null);
  const [showRecipientDetails, setShowRecipientDetails] = useState(false);
  const [isCfrVerified, setIsCfrVerified] = useState(false);
  const [verificationRequestId, setVerificationRequestId] = useState<string | null>(null);
  const [recipientPhotoUrl, setRecipientPhotoUrl] = useState<string | null>(null);
  const [verificationExpiresAt, setVerificationExpiresAt] = useState<number | null>(null);
  const [cryptoPrices, setCryptoPrices] = useState({
    eth: 2847.32,
    btc: 72750,
    sol: 98.45,
    ada: 0.52
  });

  const user = authService.getCurrentUser();
  const keyPrefix = user?.id ? `user:${user.id}:` : 'user:anon:';
  // Per-user, per-wallet ETH base balances (same keys as Dashboard/SelfTransfer)
  const getWallet1EthBalance = (): number => {
    try {
      const raw = localStorage.getItem(`${keyPrefix}dashboard:wallet1BalanceETH`);
      const v = raw != null ? parseFloat(raw) : NaN;
      if (!isNaN(v)) return v;
      localStorage.setItem(`${keyPrefix}dashboard:wallet1BalanceETH`, '100');
      return 100;
    } catch { return 100; }
  };

  // Chain to token mapping similar to SelfTransfer
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
  // From chain defaults to saved dashboard chain for wallet1
  const [fromChain, setFromChain] = useState<string>(() => {
    try {
      return (typeof window !== 'undefined' && localStorage.getItem(`${keyPrefix}dashboard:wallet1Chain`)) || 'Ethereum';
    } catch {
      return 'Ethereum';
    }
  });
  // Recipient chain selection (default Ethereum)
  const [recipientChain, setRecipientChain] = useState<string>('Ethereum');
  const mismatchAlertShown = useRef(false);

  // Keep selected currency in sync with fromChain
  useEffect(() => {
    const token = chainToToken[fromChain] || 'ETH';
    setSelectedCurrency(token);
    try {
      localStorage.setItem(`${keyPrefix}dashboard:wallet1Chain`, fromChain);
    } catch {}
  }, [fromChain]);
  const getWallet2EthBalance = (): number => {
    try {
      const raw = localStorage.getItem(`${keyPrefix}dashboard:wallet2BalanceETH`);
      const v = raw != null ? parseFloat(raw) : NaN;
      if (!isNaN(v)) return v;
      localStorage.setItem(`${keyPrefix}dashboard:wallet2BalanceETH`, '50');
      return 50;
    } catch { return 50; }
  };

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

  // Calculate converted amount (same as dashboard)
  const getConvertedAmount = () => {
    // Deprecated helper here; explicit token pricing helpers are used below
    if (selectedCurrency === 'ETH') return 1;
    const rate = conversionRates[selectedCurrency as keyof typeof conversionRates]?.['ETH'] || 0;
    return 1 * rate;
  };

  // Get USD equivalent (same as dashboard)
  const getUSDEquivalent = () => {
    const ethAmount = getConvertedAmount();
    return (ethAmount * cryptoPrices.eth).toFixed(2);
  };

  // Initialize wallet addresses
  useEffect(() => {
    if (user) {
      const primary = user.walletAddress || "";
      const secondary = user.secondaryWalletAddress || "";
      setUserWallets({primary, secondary});
      
      // Set default sender wallet to primary if available
      if (primary) {
        setSenderWalletAddress(primary);
      }
    }
    
    // Initialize crypto prices
    setCryptoPrices({
      eth: 2847.32,
      btc: 72750,
      sol: 98.45,
      ada: 0.52
    });
  }, [user]);

  // Price helpers similar to SelfTransfer
  const getTokenPrice = (symbol: string) => {
    const priceMap: Record<string, number> = {
      ETH: cryptoPrices.eth,
      BTC: cryptoPrices.btc,
      SOL: cryptoPrices.sol,
      ADA: cryptoPrices.ada,
      USDT: 1.0,
      USD: 1.0,
    };
    return priceMap[symbol] ?? cryptoPrices.eth;
  };
  const getNetworkFeeToken = () => {
    const baseFeeEth = 0.0012;
    const feeUsd = baseFeeEth * cryptoPrices.eth;
    const price = getTokenPrice(selectedCurrency);
    return feeUsd / price;
  };

  // Recipient lookup and verification card state
  useEffect(() => {
    const input = (recipientAddress || "").trim();
    // Reset if empty
    if (!input) {
      setRecipientUser(null);
      setShowRecipientDetails(false);
      setIsCfrVerified(false);
      return;
    }
    // Prevent same-address selection
    if (senderWalletAddress && input.toLowerCase() === senderWalletAddress.toLowerCase()) {
      setRecipientUser(null);
      setShowRecipientDetails(false);
      setIsCfrVerified(false);
      setError("Cannot send to the same wallet address. Please select a different recipient address.");
      return;
    } else if (error && error.includes("Cannot send to the same wallet address")) {
      setError("");
    }

    // Try to find user by wallet address (case-insensitive). If not found or invalid format, show Unknown.
    const allUsers = StorageDebugger.getAllUsers();
    const found = Array.isArray(allUsers)
      ? allUsers.find((u: any) => (u.walletAddress || "").toLowerCase() === input.toLowerCase())
      : null;

    if (found) {
      setRecipientUser(found);
      setShowRecipientDetails(true);
      // Load recipient's preferred chain if available from their namespaced storage
      try {
        const recKeyPrefix = found.id ? `user:${found.id}:` : '';
        const saved = recKeyPrefix ? localStorage.getItem(`${recKeyPrefix}dashboard:wallet1Chain`) : null;
        setRecipientChain(saved || 'Ethereum');
      } catch {
        setRecipientChain('Ethereum');
      }
    } else {
      // Populate Unknown Recipient placeholder similar to SelfTransfer
      const placeholder: UserType = {
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
      } as any;
      setRecipientUser(placeholder);
      setShowRecipientDetails(true);
    }
    // Reset verification on address change
    setIsCfrVerified(false);
  }, [recipientAddress, senderWalletAddress, error]);

  // Popup warning once when chains mismatch
  useEffect(() => {
    if (showRecipientDetails && recipientUser && fromChain !== recipientChain) {
      if (!mismatchAlertShown.current) {
        mismatchAlertShown.current = true;
        alert('Warning: Sender and recipient chains do not match. You must select the same chain; otherwise, your assets may be lost.');
      }
    } else {
      mismatchAlertShown.current = false;
    }
  }, [showRecipientDetails, recipientUser, fromChain, recipientChain]);

  // Poll for recipient approval response
  useEffect(() => {
    if (!verificationRequestId) return;
    const interval = window.setInterval(() => {
      try {
        const respStr = localStorage.getItem(`${keyPrefix}verificationResponses`);
        const arr = respStr ? JSON.parse(respStr) : [];
        const match = Array.isArray(arr) ? arr.find((r: any) => r.requestId === verificationRequestId && r.approved) : null;
        if (match) {
          setIsCfrVerified(true);
          if (match.recipientPhoto) setRecipientPhotoUrl(match.recipientPhoto);
          window.clearInterval(interval);
        } else if (verificationExpiresAt && Date.now() > verificationExpiresAt) {
          window.clearInterval(interval);
        }
      } catch {}
    }, 1500);
    return () => window.clearInterval(interval);
  }, [verificationRequestId, verificationExpiresAt, keyPrefix]);

  // Get wallet balance (ETH base) for the selected sender wallet (per-user stored value)
  const getWalletBalance = () => {
    if (senderWalletAddress === userWallets.primary) {
      return getWallet1EthBalance();
    } else if (senderWalletAddress === userWallets.secondary) {
      return getWallet2EthBalance();
    }
    return 0;
  };

  // Get USD equivalent of wallet balance (ETH -> USD using ETH price)
  const getWalletBalanceUSD = () => {
    const ethAmount = getWalletBalance();
    return (ethAmount * cryptoPrices.eth).toFixed(2);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showWalletDropdown && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowWalletDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showWalletDropdown]);

  // Update total when amount or network fee changes (respect selectedCurrency)
  useEffect(() => {
    if (amount) {
      const amountNum = parseFloat(amount);
      const networkFeeNumToken = getNetworkFeeToken();
      if (!isNaN(amountNum)) {
        setTotal((amountNum + networkFeeNumToken).toFixed(6) + ` ${selectedCurrency}`);
      }
    } else {
      setTotal(`0.0000 ${selectedCurrency}`);
    }
  }, [amount, selectedCurrency, cryptoPrices.eth, cryptoPrices.btc, cryptoPrices.sol, cryptoPrices.ada]);

  const handleTransfer = () => {
    // Check if sender wallet is selected
    if (!senderWalletAddress) {
      setError("Please select a sender wallet address.");
      return;
    }
    
    // Check if recipient address is the same as sender address
    if (recipientAddress && recipientAddress === senderWalletAddress) {
      setError("Cannot send to the same wallet address. Please select a different recipient address.");
      return;
    }
    
    // Check if amount is provided
    if (!amount) {
      setError("Please enter an amount to send.");
      return;
    }
    
    // Validate balance >= amount + network fee (convert to ETH base)
    const amountNum = parseFloat(amount);
    const walletBalance = getWalletBalance(); // ETH base
    const tokenPrice = getTokenPrice(selectedCurrency);
    const amountEth = (amountNum * tokenPrice) / cryptoPrices.eth; // convert to ETH via USD parity
    const feeEth = 0.0012; // base fee in ETH

    if (isNaN(amountNum)) {
      setError("Invalid amount or network fee.");
      return;
    }
    
    if (walletBalance < (amountEth + feeEth)) {
      const neededEth = (amountEth + feeEth).toFixed(6);
      setError(`Insufficient balance. You need at least ${neededEth} ETH (Amount + Network Fee).`);
      return;
    }
    
    // CFR PIN verification (inline prompt)
    try {
      const current = authService.getCurrentUser();
      if (!current) {
        alert('Not authenticated.');
        return;
      }
      const username = current.username || 'global';
      const isPrimary = senderWalletAddress === userWallets.primary;
      const pinKey = isPrimary ? `cfrPin:wallet1:${username}` : `cfrPin:wallet2:${username}`;
      const storedPin = localStorage.getItem(pinKey);
      if (!storedPin) {
        if (window.confirm('CFR PIN not set for this wallet. Go to setup now?')) {
          navigate('/cfr-pin-setup');
        }
        return;
      }
      const entered = window.prompt('Enter CFR PIN to release crypto');
      if (!entered) return;
      const ok = verifyPassword(entered, storedPin);
      if (!ok) {
        if (window.confirm('Invalid CFR PIN. Would you like to reset your CFR PIN now?')) {
          navigate('/cfr-pin-setup');
        }
        return;
      }
    } catch {
      alert('CFR verification failed.');
      return;
    }

    // Deduct sender balance (ETH) and credit recipient wallet1 (ETH) if known user
    try {
      // Update sender wallet balance
      const senderIsPrimary = senderWalletAddress === userWallets.primary;
      const senderKey = senderIsPrimary ? `${keyPrefix}dashboard:wallet1BalanceETH` : `${keyPrefix}dashboard:wallet2BalanceETH`;
      const senderRaw = localStorage.getItem(senderKey);
      const senderEth = senderRaw ? parseFloat(senderRaw) : (senderIsPrimary ? 100 : 50);
      const newSenderEth = Math.max(0, (isNaN(senderEth) ? 0 : senderEth) - (amountEth + feeEth));
      localStorage.setItem(senderKey, newSenderEth.toString());

      // Credit recipient wallet1 if it is a known user (not Unknown Recipient placeholder)
      const recId = recipientUser && recipientUser.id !== 'hacker' ? recipientUser.id : null;
      if (recId) {
        const recPrefix = `user:${recId}:`;
        const recKey = `${recPrefix}dashboard:wallet1BalanceETH`;
        const recRaw = localStorage.getItem(recKey);
        const recEth = recRaw ? parseFloat(recRaw) : 100;
        const newRecEth = (isNaN(recEth) ? 0 : recEth) + amountEth;
        localStorage.setItem(recKey, newRecEth.toString());
      }

      // Record history for sender (Sent) with original token amount
      const senderHistKey = `${keyPrefix}txHistory`;
      const sRaw = localStorage.getItem(senderHistKey);
      const sList = sRaw ? JSON.parse(sRaw) : [];
      sList.push({
        id: Date.now(),
        type: 'Sent',
        amount: `${amountNum} ${selectedCurrency}`,
        to: recipientAddress,
        date: new Date().toISOString(),
        status: 'Completed',
        context: fromChain
      });
      localStorage.setItem(senderHistKey, JSON.stringify(sList));

      // Record history for recipient (Received) with original token amount
      if (recId) {
        const recHistKey = `user:${recId}:txHistory`;
        const rRaw = localStorage.getItem(recHistKey);
        const rList = rRaw ? JSON.parse(rRaw) : [];
        rList.push({
          id: Date.now() + 1,
          type: 'Received',
          amount: `${amountNum} ${selectedCurrency}`,
          from: senderWalletAddress,
          date: new Date().toISOString(),
          status: 'Completed',
          context: recipientChain
        });
        localStorage.setItem(recHistKey, JSON.stringify(rList));
      }
    } catch (e) {
      console.error('Error updating balances/history', e);
    }

    alert(`Transfer of ${amount} ${selectedCurrency} from ${senderWalletAddress} to ${recipientAddress} completed!`);
    navigate('/transaction-history');
  };

  const handleCancel = () => {
    navigate("/dashboard");
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

  const selectWalletAddress = (address: string) => {
    setSenderWalletAddress(address);
    setShowWalletDropdown(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Transfer Crypto
            </h1>
            <p className="text-muted-foreground mt-2">
              Send cryptocurrency to another wallet address
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
              <h3 className="text-xl font-semibold mb-6">Send Cryptocurrency</h3>
              
              <div className="space-y-6">
                {/* Error Message */}
                {error && (
                  <div className="bg-destructive/20 border border-destructive/30 rounded-lg p-3">
                    <p className="text-destructive text-sm">
                      {error}
                    </p>
                  </div>
                )}
                
                {/* Sender Wallet Address */}
                <div className="relative" ref={dropdownRef}>
                  <label className="text-sm font-medium text-muted-foreground">Sender Wallet Address</label>
                  <div 
                    className="mt-1 flex bg-input/50 border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer hover:bg-input/70 transition-colors"
                    onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                  >
                    <div className="flex-grow font-mono text-sm break-all">
                      {senderWalletAddress || "Select sender wallet"}
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                  
                  {showWalletDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-lg shadow-lg top-full">
                      {userWallets.primary && (
                        <div 
                          className="p-3 hover:bg-input/50 cursor-pointer flex justify-between items-center"
                          onClick={() => selectWalletAddress(userWallets.primary)}
                        >
                          <div>
                            <p className="font-medium text-sm">Primary Wallet</p>
                            <p className="font-mono text-xs text-muted-foreground truncate">{userWallets.primary}</p>
                          </div>
                          {senderWalletAddress === userWallets.primary && (
                            <span className="text-green-500 text-xs">Selected</span>
                          )}
                        </div>
                      )}
                      {userWallets.secondary && (
                        <div 
                          className={`p-3 hover:bg-input/50 cursor-pointer flex justify-between items-center ${userWallets.primary ? 'border-t border-input' : ''}`}
                          onClick={() => selectWalletAddress(userWallets.secondary)}
                        >
                          <div>
                            <p className="font-medium text-sm">Secondary Wallet</p>
                            <p className="font-mono text-xs text-muted-foreground truncate">{userWallets.secondary}</p>
                          </div>
                          {senderWalletAddress === userWallets.secondary && (
                            <span className="text-green-500 text-xs">Selected</span>
                          )}
                        </div>
                      )}
                      {!userWallets.primary && !userWallets.secondary && (
                        <div className="p-3 text-sm text-muted-foreground">
                          No wallets available
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Sender Wallet Balance */}
                {senderWalletAddress && (
                  <div className="bg-input/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Balance</p>
                    <p className="font-medium">{getWalletBalance().toFixed(6)} ETH</p>
                    <p className="text-xs text-muted-foreground">≈ ${getWalletBalanceUSD()} USD</p>
                  </div>
                )}
                
                {/* From Chain selection (like SelfTransfer) */}
                <div className="mt-1 flex items-center justify-start">
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

                {/* Transfer Amount (Professional) */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Transfer Amount</label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-input/50 border border-input rounded-lg px-3 py-2 pr-20 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                      <select
                        value={selectedCurrency}
                        onChange={(e) => setSelectedCurrency(e.target.value)}
                        className="bg-transparent text-sm font-medium focus:outline-none"
                      >
                        <option>ETH</option>
                        <option>BTC</option>
                        <option>SOL</option>
                        <option>ADA</option>
                        <option>USDT</option>
                        <option>USD</option>
                      </select>
                    </div>
                  </div>
                  {/* Conversion Matrix */}
                  {amount && (
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                      {(() => {
                        const amt = parseFloat(amount || '0');
                        const priceSel = getTokenPrice(selectedCurrency);
                        const usd = isNaN(amt) ? 0 : amt * priceSel;
                        const to = (sym: string) => {
                          const p = getTokenPrice(sym);
                          if (sym === 'USD' || sym === 'USDT') return usd.toFixed(2) + (sym === 'USD' ? ' USD' : ' USDT');
                          return (usd / p).toFixed(6) + ` ${sym}`;
                        };
                        return (
                          <>
                            <div>≈ {to('ETH')}</div>
                            <div>≈ {to('BTC')}</div>
                            <div>≈ {to('SOL')}</div>
                            <div>≈ {to('ADA')}</div>
                            <div>≈ {to('USDT')}</div>
                            <div>≈ {to('USD')}</div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Recipient Address */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Recipient Address</label>
                  <div className="mt-1 flex">
                    <input 
                      type="text" 
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder="Enter wallet address (0x...)" 
                      className="flex-grow bg-input/50 border border-input rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button 
                      onClick={() => copyToClipboard(recipientAddress)}
                      className="bg-primary text-primary-foreground px-4 rounded-r-lg hover:bg-primary/90 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Recipient Verification Card */}
                {showRecipientDetails && recipientUser && (
                  <GlassCard className={`${isCfrVerified ? 'bg-green-500/10 border border-green-500/30' : 'bg-warning/10 border border-warning/20'}`}>
                    <div className="p-4">
                      <h4 className={`font-semibold ${isCfrVerified ? 'text-green-600' : 'text-warning'}`}>
                        {isCfrVerified ? 'Recipient Verified' : 'Recipient Verification Pending'}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {isCfrVerified
                          ? 'This recipient has been verified. You may proceed with the transfer.'
                          : "Please verify the recipient's details before proceeding with the transfer."}
                      </p>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-warning/20 to-warning/40 flex items-center justify-center">
                          <User className="w-6 h-6 text-warning" />
                        </div>
                        <div>
                          <p className="font-medium">{recipientUser.realName}</p>
                          <p className="text-sm text-muted-foreground">@{recipientUser.username}</p>
                        </div>
                      </div>

                      {isCfrVerified && recipientPhotoUrl && (
                        <div className="mt-3">
                          <div className="w-20 h-20 rounded-lg overflow-hidden border border-input bg-background/50">
                            <img src={recipientPhotoUrl} alt="Recipient" className="w-full h-full object-cover" />
                          </div>
                        </div>
                      )}

                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Country:</span>
                          <span className="ml-1">{(recipientUser as any).country || 'Unknown'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Member Since:</span>
                          <span className="ml-1">{new Date(recipientUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</span>
                        </div>
                        <div className="col-span-2 flex items-center gap-3">
                          <div className="text-xs text-muted-foreground">Recipient Chain</div>
                          <select
                            value={recipientChain}
                            onChange={(e) => setRecipientChain(e.target.value)}
                            disabled={!!recipientUser && recipientUser.id !== 'hacker'}
                            className="bg-input/50 border border-input rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
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

                        {fromChain !== recipientChain && (
                          <div className="col-span-2 mt-2 bg-destructive/10 border border-destructive/30 rounded p-3">
                            <p className="text-sm text-destructive">
                              Chain mismatch detected: Sender is on {fromChain} and Recipient is on {recipientChain}. You must use the same chain as the recipient, otherwise your assets may be permanently lost.
                            </p>
                            <div className="mt-2">
                              <SecureButton
                                variant="default"
                                className={`w-full ${isCfrVerified ? 'bg-green-600 hover:bg-green-600 cursor-default text-white' : ''}`}
                                disabled={false}
                                onClick={() => {
                                  setFromChain(recipientChain);
                                  setShowRecipientDetails(true);
                                  setIsCfrVerified(false);
                                }}
                              >
                                Auto Fix: Match Sender Chain to {recipientChain}
                              </SecureButton>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4">
                        <SecureButton 
                          variant="default" 
                          className={`w-full ${isCfrVerified ? 'bg-green-600 hover:bg-green-600 cursor-default' : 'bg-warning hover:bg-warning/90'} text-white`}
                          disabled={isCfrVerified || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0}
                          onClick={() => {
                            const requestId = Date.now().toString(36) + Math.random().toString(36).slice(2);
                            const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes
                            try {
                              const recId = recipientUser?.id;
                              if (recId && recId !== 'hacker') {
                                const recPrefix = `user:${recId}:`;
                                const listStr = localStorage.getItem(`${recPrefix}incomingVerifications`);
                                const list = listStr ? JSON.parse(listStr) : [];
                                list.push({
                                  requestId,
                                  senderId: user?.id,
                                  senderUsername: user?.username,
                                  amount: parseFloat(amount),
                                  currency: selectedCurrency,
                                  createdAt: Date.now(),
                                  expiresAt: expiry,
                                  senderWallet: senderWalletAddress,
                                  recipientAddress,
                                  fromChain,
                                  recipientChain
                                });
                                localStorage.setItem(`${recPrefix}incomingVerifications`, JSON.stringify(list));
                              }
                              localStorage.setItem(`${keyPrefix}outgoingVerification`, JSON.stringify({ requestId, recipientId: recId, createdAt: Date.now(), expiresAt: expiry }));
                              setVerificationRequestId(requestId);
                              setVerificationExpiresAt(expiry);
                              setIsCfrVerified(false);
                              setShowRecipientDetails(true);
                            } catch {}
                          }}
                        >
                          {isCfrVerified ? 'Verified' : 'Verify Recipient'}
                        </SecureButton>
                        {(!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) && !isCfrVerified && (
                          <p className="mt-2 text-xs text-muted-foreground">Enter a valid transfer amount to enable verification.</p>
                        )}
                        {!isCfrVerified && verificationExpiresAt && (
                          <p className="mt-2 text-xs text-muted-foreground">Request expires in ~5 minutes.</p>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* Network and Fees */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Network Fee</label>
                    <p className="font-medium">{networkFee}</p>
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
                    disabled={!recipientAddress || !amount || !senderWalletAddress}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Crypto
                  </SecureButton>
                </div>
              </div>
            </GlassCard>
          </div>
          
          {/* Wallet Information */}
          <div className="space-y-6">
            {/* To Wallet */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                To Wallet
              </h3>
              
              <div className="space-y-4">
                {recipientAddress ? (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
                      <div className="font-mono text-sm break-all bg-input/50 p-2 rounded">
                        {recipientAddress}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Verification</p>
                      <p className="text-green-500 text-sm font-medium">✓ Verified Address</p>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">Enter a recipient address to see details</p>
                )}
              </div>
            </GlassCard>
            
            {/* Security Notice */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-3">Security Notice</h3>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Always verify the recipient address before sending</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Network fees are non-refundable</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Transactions cannot be reversed once confirmed</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>You cannot send cryptocurrency to the same wallet address</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Balance must be greater than or equal to Amount + Network Fee</span>
                </li>
              </ul>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}