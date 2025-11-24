import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CFRPinSetup from "./pages/CFRPinSetup";
import NotFound from "./pages/NotFound";
import TestLocalStorage from "./pages/TestLocalStorage";
// Import the Register component (formerly StorageDebugger)
import Register from "./pages/Register";
// Import the new TransferCrypto component
import TransferCrypto from "./pages/TransferCrypto";
// Import the new TransactionHistory component
import TransactionHistory from "./pages/TransactionHistory";
// Import the new SelfTransfer component
import SelfTransfer from "./pages/SelfTransfer";
import RecipientOTPVerify from "./pages/RecipientOTPVerify";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/*" element={<Dashboard />} />
            <Route path="/cfr-pin-setup" element={<CFRPinSetup />} />
            <Route path="/transfer" element={<TransferCrypto />} />
            <Route path="/self-transfer" element={<SelfTransfer />} />
            <Route path="/transaction-history" element={<TransactionHistory />} />
            <Route path="/verify-recipient" element={<RecipientOTPVerify />} />
            <Route path="/test" element={<TestLocalStorage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;