import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/ui/glass-card";
import { SecureButton } from "@/components/ui/secure-button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ROUTES } from "@/lib/constants";
import { authService, User } from "@/services/authService";
import { StorageDebugger } from "@/utils/storageDebugger";
import { User as UserIcon, Camera, TrendingUp, Wallet, PieChart, Send, History, Copy } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const keyPrefix = user?.id ? `user:${user.id}:` : 'user:anon:';
  const [cryptoPrices, setCryptoPrices] = useState({
    eth: 0,
    btc: 0,
    sol: 0,
    ada: 0
  });
  const [selectedCurrency, setSelectedCurrency] = useState('ETH');
  const [currencyAmount, setCurrencyAmount] = useState(1);
  // Per-wallet conversion state
  const [wallet1Currency, setWallet1Currency] = useState('ETH');
  const [wallet1Amount, setWallet1Amount] = useState(1);
  const [wallet2Currency, setWallet2Currency] = useState('ETH');
  const [wallet2Amount, setWallet2Amount] = useState(1);
  const [hideSensitiveInfo, setHideSensitiveInfo] = useState(() => {
    try {
      const stored = localStorage.getItem('dashboard:hideSensitiveInfo');
      return stored ? stored === 'true' : false;
    } catch {
      return false;
    }
  });
  const [activeWalletTab, setActiveWalletTab] = useState('wallet1');
  const [secondaryWalletBalance] = useState(50);
  const [wallet1Chain, setWallet1Chain] = useState('Ethereum');
  const [wallet2Chain, setWallet2Chain] = useState('Ethereum');
  const [hasCfrPin, setHasCfrPin] = useState(false);
  const [countdownLabel, setCountdownLabel] = useState<string>("");
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [agreeMap, setAgreeMap] = useState<Record<string, boolean>>({});
  const [shareMap, setShareMap] = useState<Record<string, boolean>>({});

  // Mask sensitive information
  const maskInfo = (info: string, type: 'email' | 'phone' | 'wallet') => {
    if (!hideSensitiveInfo) return info;
    
    switch (type) {
      case 'email':
        return info ? `${info.charAt(0)}***${info.split('@')[1]}` : 'Not provided';
      case 'phone':
        return info ? `${info.slice(0, 3)}****${info.slice(-2)}` : 'Not provided';
      case 'wallet':
        return info ? `${info.substring(0, 6)}...${info.substring(info.length - 4)}` : 'Not provided';
      default:
        return info;
    }
  };

  // Read ETH balances persisted by SelfTransfer (Wallet 1 and YOUR ANOTHER WALLET), per user
  const getWallet1EthBalance = (): number => {
    try {
      const raw = localStorage.getItem(`${keyPrefix}dashboard:wallet1BalanceETH`);
      const v = raw != null ? parseFloat(raw) : NaN;
      if (!isNaN(v)) return v;
      localStorage.setItem(`${keyPrefix}dashboard:wallet1BalanceETH`, '100');
      return 100;
    } catch { return 100; }
  };
  const getWallet2EthBalance = (): number => {
    try {
      const raw = localStorage.getItem(`${keyPrefix}dashboard:wallet2BalanceETH`);
      const v = raw != null ? parseFloat(raw) : NaN;
      if (!isNaN(v)) return v;
      localStorage.setItem(`${keyPrefix}dashboard:wallet2BalanceETH`, '50');
      return 50;
    } catch { return 50; }
  };

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate(ROUTES.LOGIN);
    } else {
      setUser(currentUser);
      setLoading(false);
    }
    
    // Simulate fetching real-time crypto prices
    fetchCryptoPrices();
  }, [navigate]);

  // Load and refresh incoming verification requests for this user
  useEffect(() => {
    if (!user) return;
    const load = () => {
      try {
        const raw = localStorage.getItem(`${keyPrefix}incomingVerifications`);
        const list = raw ? JSON.parse(raw) : [];
        const now = Date.now();
        const filtered = Array.isArray(list) ? list.filter((r: any) => !r.expiresAt || r.expiresAt > now) : [];
        if (filtered.length !== list.length) {
          localStorage.setItem(`${keyPrefix}incomingVerifications`, JSON.stringify(filtered));
        }
        setIncomingRequests(filtered);
      } catch {}
    };
    load();
    const id = window.setInterval(load, 2000);
    return () => window.clearInterval(id);
  }, [user, keyPrefix]);

  const handleApproveVerification = (req: any) => {
    try {
      const senderPrefix = req.senderId ? `user:${req.senderId}:` : '';
      if (!senderPrefix) return;
      const respStr = localStorage.getItem(`${senderPrefix}verificationResponses`);
      const responses = respStr ? JSON.parse(respStr) : [];
      responses.push({
        requestId: req.requestId,
        approved: true,
        approvedAt: Date.now(),
        recipientPhoto: user?.referencePhoto || "",
      });
      localStorage.setItem(`${senderPrefix}verificationResponses`, JSON.stringify(responses));

      // Remove from incoming list
      const raw = localStorage.getItem(`${keyPrefix}incomingVerifications`);
      const list = raw ? JSON.parse(raw) : [];
      const updated = Array.isArray(list) ? list.filter((r: any) => r.requestId !== req.requestId) : [];
      localStorage.setItem(`${keyPrefix}incomingVerifications`, JSON.stringify(updated));
      setIncomingRequests(updated);
    } catch {}
  };

  // Load chains from namespaced storage when user is available
  useEffect(() => {
    if (!user) return;
    try {
      const c1 = localStorage.getItem(`${keyPrefix}dashboard:wallet1Chain`);
      if (c1) setWallet1Chain(c1);
    } catch {}
    try {
      const c2 = localStorage.getItem(`${keyPrefix}dashboard:wallet2Chain`);
      if (c2) setWallet2Chain(c2);
    } catch {}
  }, [user, keyPrefix]);

  // Check CFR PIN presence and start countdown timer
  useEffect(() => {
    if (!user) return;
    const username = user.username || 'global';
    const key1 = `cfrPin:wallet1:${username}`;
    const key2 = `cfrPin:wallet2:${username}`;
    const createdKey = `cfrPinCreatedAt:${username}`;
    const has1 = !!localStorage.getItem(key1);
    const has2 = !!localStorage.getItem(key2);
    const createdAtStr = localStorage.getItem(createdKey);
    const createdAt = createdAtStr ? parseInt(createdAtStr, 10) : undefined;
    const fourMonthsMs = 1000 * 60 * 60 * 24 * 120; // ~4 months

    setHasCfrPin(has1 && has2 && !!createdAt);

    const updateCountdown = () => {
      if (!createdAt) {
        setCountdownLabel("");
        return;
      }
      const target = createdAt + fourMonthsMs;
      const now = Date.now();
      const remaining = Math.max(0, target - now);
      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      setCountdownLabel(`${days}d ${hours}h ${minutes}m to PIN refresh`);
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [user]);

  // Persist hide/show sensitive info preference
  useEffect(() => {
    try {
      localStorage.setItem('dashboard:hideSensitiveInfo', String(hideSensitiveInfo));
    } catch {}
  }, [hideSensitiveInfo]);

  // Persist chains when changed (per user)
  useEffect(() => {
    try { localStorage.setItem(`${keyPrefix}dashboard:wallet1Chain`, wallet1Chain); } catch {}
  }, [wallet1Chain, keyPrefix]);
  useEffect(() => {
    try { localStorage.setItem(`${keyPrefix}dashboard:wallet2Chain`, wallet2Chain); } catch {}
  }, [wallet2Chain, keyPrefix]);

  const fetchCryptoPrices = () => {
    // In a real app, this would be an API call to a crypto price service
    // For demo purposes, we'll use simulated data
    setCryptoPrices({
      eth: 2847.32,
      btc: 43250.75,
      sol: 98.45,
      ada: 0.52
    });
  };

  const handleLogout = () => {
    authService.logout();
    navigate(ROUTES.LOGIN);
  };

  const handleSendCrypto = () => {
    // Navigate to the transfer crypto page
    navigate('/transfer');
  };

  const handleViewHistory = () => {
    // Navigate to the transaction history page
    navigate('/transaction-history');
  };

  const handleSelfTransfer = () => {
    // Navigate to the self transfer page
    navigate('/self-transfer');
  };

  const handleOpenCfrDialog = () => {
    navigate('/cfr-pin-setup');
  };

  const handleSaveCfrPin = () => {};

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // Show a simple alert to confirm copy
        alert('Wallet address copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy wallet address');
      });
  };

  // Conversion rates based on the provided data
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

  // Calculate converted amount
  const getConvertedAmount = () => {
    if (selectedCurrency === 'ETH') {
      return currencyAmount;
    }
    
    const rate = conversionRates[selectedCurrency as keyof typeof conversionRates]?.['ETH'] || 0;
    return currencyAmount * rate;
  };

  // Compute conversion for arbitrary currency/amount to ETH
  const computeConvertedAmount = (currency: string, amount: number) => {
    if (currency === 'ETH') return amount;
    const rate = (conversionRates as any)[currency]?.['ETH'] || 0;
    return amount * rate;
  };

  // Convert an ETH amount to a target currency for display
  const convertEthTo = (ethAmount: number, targetCurrency: string) => {
    if (targetCurrency === 'ETH') return ethAmount;
    const rate = (conversionRates as any)['ETH']?.[targetCurrency] || 0;
    return ethAmount * rate;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Mock wallet data - using user's actual wallet address
  const walletAddress = user?.walletAddress || "0x742d35Cc6634C0532925a3b8D4C9db4C4C4C4C4C";
  
  // Wallet-specific balances
  const primaryWalletBalance = getWallet1EthBalance(); // Live ETH balance from localStorage
  // secondaryWalletBalance state retained, but we read live value below when needed
  
  // Get current wallet balance based on active tab
  const getCurrentWalletBalance = () => {
    return activeWalletTab === 'wallet1' ? getWallet1EthBalance() : getWallet2EthBalance();
  };
  
  
  const walletBalance = getCurrentWalletBalance();
  // Determine per-tab display currency
  const currentDisplayCurrency = activeWalletTab === 'wallet1' ? wallet1Currency : wallet2Currency;
  const convertedDisplayBalance = convertEthTo(walletBalance, currentDisplayCurrency);
  const usdBalance = (walletBalance * cryptoPrices.eth).toFixed(2);
  
  // Second wallet address (from user data or derived from primary)
  const secondWalletAddress = user?.secondaryWalletAddress || 
    (user?.walletAddress ? 
      "0x" + user.walletAddress.slice(2).split("").reverse().join("").substring(0, 20) + "abcd" + 
      user.walletAddress.slice(2).split("").reverse().join("").substring(24) : 
      "0x9876543210abcdef9876543210abcdef98765432");
  
  // Get current wallet address based on active tab
  const getCurrentWalletAddress = () => {
    return activeWalletTab === 'wallet1' ? walletAddress : secondWalletAddress;
  };
  
  // Get current wallet balance in USD
  const getCurrentWalletBalanceUSD = () => {
    const balance = getCurrentWalletBalance();
    return (balance * cryptoPrices.eth).toFixed(2);
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              User Profile
            </h1>
            <p className="text-muted-foreground mt-2">
              Hello, {user?.realName?.split(' ')[0] || 'User'} 👋
            </p>
          </div>
          <div className="flex gap-3">
            <SecureButton variant="outline" onClick={handleLogout}>
              Logout
            </SecureButton>
          </div>
        </div>

        {user && (
          /* User Profile Section */
          <GlassCard className="mb-8 p-6 md:p-8">
            <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
              {/* Profile Photo - Enhanced for better face visibility */}
              <div className="flex-shrink-0 relative group mt-2">
                {user.referencePhoto ? (
                  <div className="relative">
                    <img 
                      src={user.referencePhoto} 
                      alt="Profile" 
                      className="w-44 h-44 md:w-56 md:h-56 rounded-2xl object-cover object-top border-4 border-primary shadow-2xl ring-4 ring-primary/30 transition-all duration-500 group-hover:ring-primary/50 group-hover:scale-105"
                      style={{ imageRendering: 'crisp-edges', objectPosition: 'center top', filter: 'contrast(1.05) saturate(1.1)' }}
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                ) : (
                  <div className="relative w-44 h-44 md:w-56 md:h-56 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-4 border-primary shadow-2xl ring-4 ring-primary/30">
                    <div className="bg-primary/10 rounded-full p-6">
                      <UserIcon className="w-24 h-24 md:w-32 md:h-32 text-primary" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-3 right-3 bg-primary rounded-full p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>
              
              {/* User Info */}
              <div className="flex-grow w-full">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                      {user.realName}
                    </h2>
                    <p className="text-muted-foreground mt-1">@{user.username}</p>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <SecureButton variant="default" glow>
                      Edit Profile
                    </SecureButton>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-bold text-foreground border-b-2 border-primary pb-3">
                        Contact Information
                      </h3>
                      <button 
                        onClick={() => setHideSensitiveInfo(!hideSensitiveInfo)}
                        className="text-sm bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg px-3 py-1.5 transition-colors font-medium"
                      >
                        {hideSensitiveInfo ? 'Show' : 'Hide'}
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <span className="font-semibold w-28 text-muted-foreground text-base">Email:</span>
                        <span className="text-foreground flex-1 text-base">{maskInfo(user.email, 'email')}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-semibold w-28 text-muted-foreground text-base">Phone:</span>
                        <span className="text-foreground flex-1 text-base">{maskInfo(user.phone, 'phone')}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-semibold w-28 text-muted-foreground text-base">Country:</span>
                        <span className="text-foreground flex-1 text-base">{user.country}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-foreground border-b-2 border-primary pb-3">
                      Personal Details
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <span className="font-semibold w-28 text-muted-foreground text-base">Birthday:</span>
                        <span className="text-foreground flex-1 text-base">
                          {user.dateOfBirth 
                            ? new Date(user.dateOfBirth).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            : 'Not provided'}
                        </span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-semibold w-28 text-muted-foreground text-base">Member Since:</span>
                        <span className="text-foreground flex-1 text-base">
                          {new Date(user.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-semibold w-28 text-muted-foreground text-base">Status:</span>
                        <span className="text-green-500 font-semibold flex-1 text-base">Verified</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-foreground border-b-2 border-primary pb-3">
                      Wallet Information
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <span className="font-semibold w-28 text-muted-foreground text-base">Primary:</span>
                        <span className="text-foreground font-mono text-sm break-all flex-1">{maskInfo(user.walletAddress, 'wallet')}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-semibold w-28 text-muted-foreground text-base">YOUR ANOTHER WALLET:</span>
                        <span className="text-foreground font-mono text-sm break-all flex-1">{maskInfo(secondWalletAddress, 'wallet')}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-semibold w-28 text-muted-foreground text-base">CFR:</span>
                        <span className="text-green-500 font-semibold flex-1 text-base">Successfully verified</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </GlassCard>
        )}

        {/* Incoming Verification Requests for Recipient */}
        {incomingRequests.length > 0 && (
          <GlassCard className="mb-8 p-6">
            <h3 className="text-xl font-semibold mb-4">Incoming Verification Requests</h3>
            <div className="space-y-4">
              {incomingRequests.map((req) => {
                const agree = !!agreeMap[req.requestId];
                const share = !!shareMap[req.requestId];
                const remainingMs = (req.expiresAt || 0) - Date.now();
                const remainingMin = Math.max(0, Math.floor(remainingMs / 60000));
                const remainingSec = Math.max(0, Math.floor((remainingMs % 60000) / 1000));
                const allUsers = StorageDebugger.getAllUsers();
                const senderUser = Array.isArray(allUsers) ? allUsers.find((u: any) => u.id === req.senderId) : null;
                return (
                  <div key={req.requestId} className="border border-input rounded-xl p-4 bg-input/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <span className="text-sm font-semibold">Verification Request</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Expires in {remainingMin}m {remainingSec}s</div>
                    </div>

                    {/* Parties */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Sender */}
                      <div className="rounded-lg border border-input bg-background/40 p-3">
                        <div className="text-xs text-muted-foreground mb-1">Sender</div>
                        <div className="text-sm font-medium">{senderUser?.realName || 'Unknown User'} <span className="text-muted-foreground">@{req.senderUsername || senderUser?.username || 'unknown'}</span></div>
                        <div className="mt-2">
                          <div className="text-xs text-muted-foreground mb-1">Wallet Address</div>
                          <div className="font-mono text-xs break-all bg-input/40 rounded px-2 py-1">{req.senderWallet || senderUser?.walletAddress || 'N/A'}</div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">Chain: <span className="font-medium text-foreground">{req.fromChain || 'Unknown'}</span></div>
                      </div>

                      {/* Recipient */}
                      <div className="rounded-lg border border-input bg-background/40 p-3">
                        <div className="text-xs text-muted-foreground mb-1">Recipient</div>
                        <div className="text-sm font-medium">{user?.realName} <span className="text-muted-foreground">@{user?.username}</span></div>
                        <div className="mt-2">
                          <div className="text-xs text-muted-foreground mb-1">Wallet Address</div>
                          <div className="font-mono text-xs break-all bg-input/40 rounded px-2 py-1">{user?.walletAddress}</div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">Chain: <span className="font-medium text-foreground">{wallet1Chain}</span></div>
                      </div>
                    </div>

                    {/* Transfer details */}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                      <div className="px-2 py-1 rounded bg-background/50 border border-input">Amount: <span className="font-medium">{req.amount} {req.currency}</span></div>
                      <div className="px-2 py-1 rounded bg-background/50 border border-input">Requested: <span className="text-muted-foreground">{new Date(req.createdAt).toLocaleString()}</span></div>
                    </div>

                    {/* Agreements */}
                    <div className="mt-4 flex items-center gap-4 text-sm">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={agree} onChange={(e) => setAgreeMap((m) => ({...m, [req.requestId]: e.target.checked}))} />
                        <span>I agree to the terms and conditions</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={share} onChange={(e) => setShareMap((m) => ({...m, [req.requestId]: e.target.checked}))} />
                        <span>Allow sharing my image for verification</span>
                      </label>
                    </div>

                    {/* Action */}
                    <div className="mt-3">
                      <SecureButton
                        variant="default"
                        className="bg-green-600 hover:bg-green-600 text-white"
                        disabled={!(agree && share)}
                        onClick={() => handleApproveVerification(req)}
                      >
                        Allow
                      </SecureButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* Wallet Section - Extended to full width with tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Wallet Balance Card - Extended to full width */}
          <GlassCard className="lg:col-span-3 p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Wallet Balance</h3>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">
                    {convertedDisplayBalance.toFixed(6)} {currentDisplayCurrency}
                  </span>
                  <span className="text-muted-foreground mb-1">≈ ${usdBalance} USD</span>
                </div>
              </div>
              {/* Global controls removed; per-wallet controls live inside each tab */}
            </div>
            
            {/* Wallet Tabs */}
            <Tabs value={activeWalletTab} onValueChange={setActiveWalletTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="wallet1" className="flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Wallet 1
                </TabsTrigger>
                <TabsTrigger value="wallet2" className="flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  YOUR ANOTHER WALLET
                </TabsTrigger>
              </TabsList>
              
              {/* Wallet 1 Content */}
              <TabsContent value="wallet1" className="space-y-4">
                {/* Chain setting for Wallet 1 */}
                <div className="flex items-center justify-end">
                  <label className="text-xs text-muted-foreground mr-2">Chain</label>
                  <select 
                    value={wallet1Chain}
                    onChange={(e) => setWallet1Chain(e.target.value)}
                    className="bg-input/50 border border-input rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option>Ethereum</option>
                    <option>Bitcoin</option>
                    <option>Binance Smart Chain</option>
                    <option>Polygon</option>
                    <option>Solana</option>
                  </select>
                </div>
                <div className="bg-input/50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm text-muted-foreground">Primary Wallet</span>
                    <button 
                      onClick={() => copyToClipboard(walletAddress)}
                      className="text-primary hover:text-primary/80 text-sm flex items-center font-medium"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </button>
                  </div>
                  <div className="font-mono text-sm break-all bg-background/50 p-2 rounded">
                    {walletAddress}
                  </div>
                </div>

                {/* Wallet 1 Conversion */}
                <div className="flex items-center justify-between bg-input/30 rounded-lg p-3">
                  <div className="flex items-center">
                    <label className="text-xs text-muted-foreground mr-2">Convert</label>
                    <input
                      type="number"
                      value={wallet1Amount}
                      onChange={(e) => setWallet1Amount(parseFloat(e.target.value) || 0)}
                      className="w-20 bg-input/50 border border-input rounded-l-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <select 
                      value={wallet1Currency}
                      onChange={(e) => setWallet1Currency(e.target.value)}
                      className="bg-input/50 border border-input rounded-r-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary ml-1"
                    >
                      <option value="ETH">ETH</option>
                      <option value="BTC">BTC</option>
                      <option value="USD">USD</option>
                      <option value="INR">INR</option>
                      <option value="SOL">SOL</option>
                      <option value="ADA">ADA</option>
                    </select>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ≈ {computeConvertedAmount(wallet1Currency, wallet1Amount).toFixed(6)} ETH
                  </div>
                </div>
                
                
                {/* Wallet 1 Transaction Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <SecureButton 
                    variant="default" 
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium"
                    onClick={handleSendCrypto}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </SecureButton>
                  <SecureButton 
                    variant="default" 
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-medium"
                  >
                    <PieChart className="w-4 h-4 mr-2" />
                    Receive
                  </SecureButton>
                  <SecureButton 
                    variant="default" 
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium"
                    onClick={handleSelfTransfer}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Self Transfer
                  </SecureButton>
                  <SecureButton 
                    variant="default" 
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium"
                    onClick={handleViewHistory}
                  >
                    <History className="w-4 h-4 mr-2" />
                    History
                  </SecureButton>
                </div>
                <div className="pt-2">
                  {!hasCfrPin ? (
                    <SecureButton 
                      variant="default"
                      glow
                      className="w-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:from-pink-600 hover:via-red-600 hover:to-yellow-600 text-white font-semibold"
                      onClick={handleOpenCfrDialog}
                    >
                      Create / Update CFR PIN
                    </SecureButton>
                  ) : (
                    <div className="w-full text-center text-sm font-medium bg-green-500/10 text-green-600 border border-green-500/30 rounded-lg px-3 py-2">
                      {countdownLabel}
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {/* YOUR ANOTHER WALLET Content */}
              <TabsContent value="wallet2" className="space-y-4">
                {/* Chain setting for YOUR ANOTHER WALLET */}
                <div className="flex items-center justify-end">
                  <label className="text-xs text-muted-foreground mr-2">Chain</label>
                  <select 
                    value={wallet2Chain}
                    onChange={(e) => setWallet2Chain(e.target.value)}
                    className="bg-input/50 border border-input rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option>Ethereum</option>
                    <option>Bitcoin</option>
                    <option>Binance Smart Chain</option>
                    <option>Polygon</option>
                    <option>Solana</option>
                  </select>
                </div>
                <div className="bg-input/50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm text-muted-foreground">YOUR ANOTHER WALLET Address</span>
                    <span className="text-xs text-muted-foreground">Copy disabled</span>
                  </div>
                  <div className="font-mono text-sm break-all bg-background/50 p-2 rounded">
                    {secondWalletAddress}
                  </div>
                </div>

                {/* YOUR ANOTHER WALLET Conversion */}
                <div className="flex items-center justify-between bg-input/30 rounded-lg p-3">
                  <div className="flex items-center">
                    <label className="text-xs text-muted-foreground mr-2">Convert</label>
                    <input
                      type="number"
                      value={wallet2Amount}
                      onChange={(e) => setWallet2Amount(parseFloat(e.target.value) || 0)}
                      className="w-20 bg-input/50 border border-input rounded-l-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <select 
                      value={wallet2Currency}
                      onChange={(e) => setWallet2Currency(e.target.value)}
                      className="bg-input/50 border border-input rounded-r-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary ml-1"
                    >
                      <option value="ETH">ETH</option>
                      <option value="BTC">BTC</option>
                      <option value="USD">USD</option>
                      <option value="INR">INR</option>
                      <option value="SOL">SOL</option>
                      <option value="ADA">ADA</option>
                    </select>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ≈ {computeConvertedAmount(wallet2Currency, wallet2Amount).toFixed(6)} ETH
                  </div>
                </div>
                
                
                {/* Wallet 2 Transaction Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <SecureButton 
                    variant="default" 
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium"
                    onClick={handleSendCrypto}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </SecureButton>
                  <SecureButton 
                    variant="default" 
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-medium"
                  >
                    <PieChart className="w-4 h-4 mr-2" />
                    Receive
                  </SecureButton>
                  <SecureButton 
                    variant="default" 
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium"
                    onClick={handleSelfTransfer}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Self Transfer
                  </SecureButton>
                  <SecureButton 
                    variant="default" 
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium"
                    onClick={handleViewHistory}
                  >
                    <History className="w-4 h-4 mr-2" />
                    History
                  </SecureButton>
                </div>
                <div className="pt-2">
                  {!hasCfrPin ? (
                    <SecureButton 
                      variant="default"
                      glow
                      className="w-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:from-pink-600 hover:via-red-600 hover:to-yellow-600 text-white font-semibold"
                      onClick={handleOpenCfrDialog}
                    >
                      Create / Update CFR PIN
                    </SecureButton>
                  ) : (
                    <div className="w-full text-center text-sm font-medium bg-green-500/10 text-green-600 border border-green-500/30 rounded-lg px-3 py-2">
                      {countdownLabel}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </GlassCard>
          
          {/* Market Prices - Moved from Transfer Crypto column */}
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold mb-4">Market Prices</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mr-3">
                    <span className="text-blue-500 font-bold text-xs">ETH</span>
                  </div>
                  <div>
                    <p className="font-medium">Ethereum</p>
                    <p className="text-xs text-muted-foreground">ETH</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">${cryptoPrices.eth.toLocaleString()}</p>
                  <p className="text-xs text-green-500">+2.5%</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center mr-3">
                    <span className="text-orange-500 font-bold text-xs">BTC</span>
                  </div>
                  <div>
                    <p className="font-medium">Bitcoin</p>
                    <p className="text-xs text-muted-foreground">BTC</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">${cryptoPrices.btc.toLocaleString()}</p>
                  <p className="text-xs text-green-500">+1.2%</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center mr-3">
                    <span className="text-purple-500 font-bold text-xs">SOL</span>
                  </div>
                  <div>
                    <p className="font-medium">Solana</p>
                    <p className="text-xs text-muted-foreground">SOL</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">${cryptoPrices.sol}</p>
                  <p className="text-xs text-red-500">-0.8%</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-300/20 flex items-center justify-center mr-3">
                    <span className="text-blue-300 font-bold text-xs">ADA</span>
                  </div>
                  <div>
                    <p className="font-medium">Cardano</p>
                    <p className="text-xs text-muted-foreground">ADA</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">${cryptoPrices.ada}</p>
                  <p className="text-xs text-green-500">+3.1%</p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Additional Market Data */}
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold mb-4">Portfolio Distribution</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                  <span className="text-sm">Ethereum</span>
                </div>
                <span className="text-sm font-medium">65%</span>
              </div>
              <div className="w-full bg-input/50 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '65%' }}></div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                  <span className="text-sm">Bitcoin</span>
                </div>
                <span className="text-sm font-medium">20%</span>
              </div>
              <div className="w-full bg-input/50 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '20%' }}></div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                  <span className="text-sm">Solana</span>
                </div>
                <span className="text-sm font-medium">10%</span>
              </div>
              <div className="w-full bg-input/50 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '10%' }}></div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-300 mr-2"></div>
                  <span className="text-sm">Cardano</span>
                </div>
                <span className="text-sm font-medium">5%</span>
              </div>
              <div className="w-full bg-input/50 rounded-full h-2">
                <div className="bg-blue-300 h-2 rounded-full" style={{ width: '5%' }}></div>
              </div>
            </div>
          </GlassCard>

          {/* Market Trends */}
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold mb-4">Market Trends</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <div>
                  <p className="font-medium">24h Volume</p>
                  <p className="text-xs text-muted-foreground">Total trading volume</p>
                </div>
                <p className="font-medium">$12.4B</p>
              </div>
              
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <div>
                  <p className="font-medium">Market Cap</p>
                  <p className="text-xs text-muted-foreground">Total market value</p>
                </div>
                <p className="font-medium">$2.1T</p>
              </div>
              
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <div>
                  <p className="font-medium">Active Addresses</p>
                  <p className="text-xs text-muted-foreground">24h active wallets</p>
                </div>
                <p className="font-medium">1.2M</p>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Gas Price</p>
                  <p className="text-xs text-muted-foreground">Average transaction fee</p>
                </div>
                <p className="font-medium">42 Gwei</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Account Overview Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <GlassCard className="p-6 hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Account Status</p>
                <h3 className="text-2xl font-bold mt-1">Active</h3>
                <p className="text-xs text-green-500 mt-1">All systems operational</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6 hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Security Score</p>
                <h3 className="text-2xl font-bold mt-1">85/100</h3>
                <p className="text-xs text-green-500 mt-1">Good security posture</p>
              </div>
              <div className="p-3 bg-secondary/10 rounded-full">
                <TrendingUp className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6 hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Profile Completeness</p>
                <h3 className="text-2xl font-bold mt-1">92%</h3>
                <p className="text-xs text-green-500 mt-1">Almost complete</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <PieChart className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6 hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Login</p>
                <h3 className="text-2xl font-bold mt-1">Today</h3>
                <p className="text-xs text-muted-foreground mt-1">10:24 AM</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}