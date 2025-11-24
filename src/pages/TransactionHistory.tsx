import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import { GlassCard } from "@/components/ui/glass-card";
import { SecureButton } from "@/components/ui/secure-button";
import { TrendingUp, Send, Copy } from "lucide-react";
import { authService } from "@/services/authService";

export default function TransactionHistory() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Array<{
    id: number;
    type: 'Sent' | 'Received';
    amount: string;
    from?: string;
    to?: string;
    date: string;
    status: string;
    context?: string;
  }>>([]);

  const user = authService.getCurrentUser();
  const keyPrefix = user?.id ? `user:${user.id}:` : 'user:anon:';

  const handleBackToDashboard = () => {
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

  // Load transaction history from localStorage
  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(`${keyPrefix}txHistory`);
        const parsed = raw ? JSON.parse(raw) : [];
        setTransactions(Array.isArray(parsed) ? parsed : []);
      } catch { setTransactions([]); }
    };
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === `${keyPrefix}txHistory`) load();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [keyPrefix]);

  // Helpers: token USD prices and conversion to ETH (static demo prices)
  const getTokenUsdPrice = (symbol: string) => {
    const map: Record<string, number> = {
      ETH: 2847.32,
      BTC: 43250.75,
      SOL: 98.45,
      ADA: 0.52,
      BNB: 585.0,
      MATIC: 0.75,
      USDT: 1.0,
      USD: 1.0,
    };
    return map[symbol] ?? map.ETH;
  };
  const parseAmountToken = (amt: string): { amount: number; token: string } => {
    const parts = amt.trim().split(/\s+/);
    const amount = parseFloat(parts[0] || '0');
    const token = parts[1] || 'ETH';
    return { amount: isNaN(amount) ? 0 : amount, token };
  };
  const toEth = (amount: number, token: string) => {
    const usd = getTokenUsdPrice(token) * amount;
    const ethUsd = getTokenUsdPrice('ETH');
    return usd / ethUsd;
  };

  // Derive totals from transactions
  const totals = (() => {
    let sentEth = 0;
    let recvEth = 0;
    let sentCount = 0;
    for (const t of transactions) {
      const { amount, token } = parseAmountToken(t.amount);
      const eth = toEth(amount, token);
      if (t.type === 'Sent') { sentEth += eth; sentCount += 1; }
      if (t.type === 'Received') recvEth += eth;
    }
    const feeEth = sentCount * 0.0012; // base demo fee per successful send
    return { sentEth, recvEth, feeEth };
  })();

  // Net balance from dashboard stored balances (wallet1 + wallet2 in ETH)
  const getWalletBalanceEth = () => {
    try {
      const w1 = parseFloat(localStorage.getItem(`${keyPrefix}dashboard:wallet1BalanceETH`) || '100');
      const w2 = parseFloat(localStorage.getItem(`${keyPrefix}dashboard:wallet2BalanceETH`) || '50');
      return (isNaN(w1) ? 0 : w1) + (isNaN(w2) ? 0 : w2);
    } catch { return 0; }
  };
  const netBalanceEth = getWalletBalanceEth();

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Transaction History
            </h1>
            <p className="text-muted-foreground mt-2">
              View all your cryptocurrency transactions
            </p>
          </div>
          <div className="flex gap-3">
            <SecureButton variant="outline" onClick={handleBackToDashboard}>
              Back to Dashboard
            </SecureButton>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Transaction History Card */}
          <GlassCard className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Recent Transactions</h3>
              <div className="flex gap-2">
                <select className="bg-input/50 border border-input rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>All Transactions</option>
                  <option>Sent</option>
                  <option>Received</option>
                </select>
                <select className="bg-input/50 border border-input rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Last 30 Days</option>
                  <option>Last 7 Days</option>
                  <option>Last 90 Days</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Transaction</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Amount</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Date</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => {
                    const isReceived = transaction.type === 'Received';
                    return (
                      <tr key={transaction.id} className="border-b border-border last:border-0 hover:bg-input/30">
                        <td className="py-4 px-2">
                          <div className="flex items-center">
                            <div className={`p-2 rounded-lg mr-3 ${isReceived ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                              {isReceived ? (
                                <TrendingUp className={`h-5 w-5 ${isReceived ? 'text-green-500' : 'text-red-500'}`} />
                              ) : (
                                <Send className={`h-5 w-5 ${isReceived ? 'text-green-500' : 'text-red-500'}`} />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{transaction.type}{transaction.context ? ` · ${transaction.context}` : ''}</p>
                              <p className="text-sm text-muted-foreground flex items-center">
                                {isReceived ? `From: ${transaction.from}` : `To: ${transaction.to}`}
                                <button 
                                  onClick={() => copyToClipboard(isReceived ? (transaction.from || '') : (transaction.to || ''))}
                                  className="ml-2 text-primary hover:text-primary/80"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <p className="font-medium">{transaction.amount}</p>
                        </td>
                        <td className="py-4 px-2">
                          <p>{new Date(transaction.date).toLocaleString()}</p>
                        </td>
                        <td className="py-4 px-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
              <p className="text-sm text-muted-foreground">
                Showing 1 to {transactions.length} of {transactions.length} transactions
              </p>
              <div className="flex gap-2">
                <SecureButton variant="outline" size="sm" disabled>
                  Previous
                </SecureButton>
                <SecureButton variant="outline" size="sm">
                  Next
                </SecureButton>
              </div>
            </div>
          </GlassCard>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-4">Total Sent</h3>
              <p className="text-2xl font-bold text-red-500">{totals.sentEth.toFixed(6)} ETH</p>
              <p className="text-sm text-muted-foreground">≈ ${(totals.sentEth * getTokenUsdPrice('ETH')).toFixed(2)} USD</p>
            </GlassCard>
            
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-4">Total Received</h3>
              <p className="text-2xl font-bold text-green-500">{totals.recvEth.toFixed(6)} ETH</p>
              <p className="text-sm text-muted-foreground">≈ ${(totals.recvEth * getTokenUsdPrice('ETH')).toFixed(2)} USD</p>
            </GlassCard>
            
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-4">Net Balance</h3>
              <p className="text-2xl font-bold text-blue-500">{netBalanceEth.toFixed(6)} ETH</p>
              <p className="text-sm text-muted-foreground">≈ ${(netBalanceEth * getTokenUsdPrice('ETH')).toFixed(2)} USD</p>
            </GlassCard>
          </div>

          {/* Fee Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-4">Total Network Fee</h3>
              <p className="text-2xl font-bold text-amber-600">{totals.feeEth.toFixed(6)} ETH</p>
              <p className="text-sm text-muted-foreground">≈ ${(totals.feeEth * getTokenUsdPrice('ETH')).toFixed(2)} USD</p>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}