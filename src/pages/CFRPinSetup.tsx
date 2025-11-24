import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/ui/glass-card";
import { SecureButton } from "@/components/ui/secure-button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/authService";

export default function CFRPinSetup() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const username = currentUser?.username || 'global';

  const [useSamePin, setUseSamePin] = useState(true);
  const [pin1, setPin1] = useState("");
  const [pin1Confirm, setPin1Confirm] = useState("");
  const [pin2, setPin2] = useState("");
  const [pin2Confirm, setPin2Confirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  const isValidPin = (pin: string) => /^\d{4}$/.test(pin);

  const handleSubmit = async () => {
    setError(null);
    if (!isValidPin(pin1)) {
      setError('Wallet 1 PIN must be exactly 4 digits');
      return;
    }
    if (pin1 !== pin1Confirm) {
      setError('Wallet 1 PIN and confirmation do not match');
      return;
    }
    if (!useSamePin) {
      if (!isValidPin(pin2)) {
        setError('Wallet 2 PIN must be exactly 4 digits');
        return;
      }
      if (pin2 !== pin2Confirm) {
        setError('Wallet 2 PIN and confirmation do not match');
        return;
      }
    }

    setSubmitting(true);
    try {
      const { hashPassword } = await import("@/lib/crypto");
      const key1 = `cfrPin:wallet1:${username}`;
      const key2 = `cfrPin:wallet2:${username}`;
      const createdKey = `cfrPinCreatedAt:${username}`;

      const hashed1 = hashPassword(pin1);
      localStorage.setItem(key1, hashed1);
      if (useSamePin) {
        localStorage.setItem(key2, hashed1);
      } else {
        const hashed2 = hashPassword(pin2);
        localStorage.setItem(key2, hashed2);
      }
      localStorage.setItem(createdKey, Date.now().toString());

      alert('CFR PINs created successfully');
      navigate('/dashboard');
    } catch (e) {
      setError('Failed to save PIN securely. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <GlassCard className="p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Create CFR PIN</h1>
          <p className="text-muted-foreground mb-6">Secure your transfers with a 4-digit PIN.</p>

          <div className="flex items-center gap-2 mb-6">
            <input
              id="samePin"
              type="checkbox"
              checked={useSamePin}
              onChange={(e) => setUseSamePin(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="samePin" className="text-sm">Use the same PIN for Wallet 1 and Wallet 2</label>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="font-semibold mb-2">Wallet 1 PIN</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="\\d*"
                  placeholder="Enter 4-digit PIN"
                  value={pin1}
                  onChange={(e) => setPin1(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                />
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="\\d*"
                  placeholder="Confirm PIN"
                  value={pin1Confirm}
                  onChange={(e) => setPin1Confirm(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                />
              </div>
            </div>

            {!useSamePin && (
              <div>
                <h2 className="font-semibold mb-2">Wallet 2 PIN</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="\\d*"
                    placeholder="Enter 4-digit PIN"
                    value={pin2}
                    onChange={(e) => setPin2(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  />
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="\\d*"
                    placeholder="Confirm PIN"
                    value={pin2Confirm}
                    onChange={(e) => setPin2Confirm(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  />
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

          <div className="mt-6 flex gap-3">
            <SecureButton
              variant="outline"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </SecureButton>
            <SecureButton
              variant="default"
              glow
              className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white font-semibold"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save PIN'}
            </SecureButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}



