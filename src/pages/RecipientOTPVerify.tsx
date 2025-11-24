import { useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { SecureButton } from "@/components/ui/secure-button";
import { Input } from "@/components/ui/input";

export default function RecipientOTPVerify() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendIn, setResendIn] = useState(0);

  const sessionKey = "otpSession:selfTransfer";
  const session = useMemo(() => {
    try {
      const raw = localStorage.getItem(sessionKey);
      return raw ? JSON.parse(raw) as {
        otp: string;
        expiresAt: number;
        canResendAt: number;
        info: {
          fromWallet: string;
          toWallet: string;
          amount: string;
          networkFee: string;
          toAddress: string;
          userMaskedPhone: string;
          userMaskedEmail: string;
        };
      } : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      if (!session) return;
      const now = Date.now();
      const remain = Math.max(0, Math.ceil((session.canResendAt - now) / 1000));
      setResendIn(remain);
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [session]);

  const handleVerify = () => {
    setError("");
    setSuccess("");
    if (!session) {
      setError("Session expired. Please request a new OTP.");
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }
    const now = Date.now();
    if (now > session.expiresAt) {
      setError("OTP has expired. Please resend.");
      return;
    }
    if (otp !== session.otp) {
      setError("Invalid OTP. Please try again.");
      return;
    }
    setSuccess("Recipient verified successfully.");
  };

  const handleResend = () => {
    setError("");
    setSuccess("");
    if (!session) {
      return;
    }
    const now = Date.now();
    if (now < session.canResendAt) return;

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const next = {
      ...session,
      otp: newOtp,
      expiresAt: now + 5 * 60 * 1000,
      canResendAt: now + 30 * 1000,
    };
    localStorage.setItem(sessionKey, JSON.stringify(next));
    alert(`OTP re-sent to your registered phone and email. OTP: ${newOtp}`);
  };

  if (!session) {
    return (
      <div className="min-h-screen p-4 md:p-6 flex items-center justify-center">
        <GlassCard className="p-6 md:p-8 max-w-lg w-full text-center">
          <h1 className="text-2xl font-bold mb-2">Session Expired</h1>
          <p className="text-muted-foreground">Please go back and start verification again.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-xl mx-auto">
        <GlassCard className="p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold">Verify Recipient</h1>
          <p className="text-muted-foreground mt-2">Check your email and phone. We sent a 6-digit OTP.</p>

          <div className="mt-6 space-y-4">
            <div className="bg-input/50 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-muted-foreground">Transfer Summary</h2>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">From</div>
                <div className="font-medium">{session.info.fromWallet}</div>
                <div className="text-muted-foreground">To</div>
                <div className="font-medium">{session.info.toWallet}</div>
                <div className="text-muted-foreground">To Address</div>
                <div className="font-mono break-all">{session.info.toAddress}</div>
                <div className="text-muted-foreground">Amount</div>
                <div className="font-medium">{session.info.amount}</div>
                <div className="text-muted-foreground">Network Fee</div>
                <div className="font-medium">{session.info.networkFee}</div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                OTP sent to {session.info.userMaskedPhone} and {session.info.userMaskedEmail}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Enter 6-digit OTP</label>
              <Input
                type="password"
                inputMode="numeric"
                pattern="\\d*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                className="mt-1"
                placeholder="000000"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded px-3 py-2">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-600 text-sm rounded px-3 py-2">
                {success}
              </div>
            )}

            <div className="flex items-center gap-3">
              <SecureButton onClick={handleVerify} glow className="bg-primary text-primary-foreground">
                Verify OTP
              </SecureButton>
              <SecureButton 
                variant="outline"
                onClick={handleResend}
                disabled={resendIn > 0}
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'}
              </SecureButton>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}



