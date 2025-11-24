import { SecureButton } from '@/components/ui/secure-button';
import { GlassCard } from '@/components/ui/glass-card';
import { ROUTES } from '@/lib/constants';
import { ArrowRight, Lock, Shield, Zap, Globe, Smartphone, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute h-2 w-2 bg-primary/20 rounded-full animate-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${100 + Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-gradient">SecureTX</span>
          </div>
          
          <div className="flex gap-4">
            <SecureButton
              variant="outline"
              onClick={() => navigate(ROUTES.LOGIN)}
              className="border-primary/50 hover:border-primary"
            >
              Login
            </SecureButton>
            <SecureButton
              onClick={() => navigate(ROUTES.REGISTER)}
              glow
            >
              Get Started
            </SecureButton>
          </div>
        </header>
        
        {/* Hero Section */}
        <section className="text-center mb-20 space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-gradient">Biometric-Secured</span>
            <br />
            <span className="text-foreground">Crypto Transactions</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience the future of secure digital transactions with cutting-edge face recognition,
            liveness detection, and military-grade encryption.
          </p>
          
          <div className="flex justify-center gap-4">
            <SecureButton
              size="lg"
              onClick={() => navigate(ROUTES.REGISTER)}
              glow
              className="text-lg px-8"
            >
              Start Free Demo
              <ArrowRight className="ml-2 h-5 w-5" />
            </SecureButton>
          </div>
          
          <div className="flex justify-center gap-8 pt-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-gradient">100%</div>
              <div className="text-sm text-muted-foreground">Secure</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gradient">6</div>
              <div className="text-sm text-muted-foreground">Crypto Networks</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gradient">0.1s</div>
              <div className="text-sm text-muted-foreground">Verification</div>
            </div>
          </div>
        </section>
        
        {/* Features Grid */}
        <section className="grid md:grid-cols-3 gap-6 mb-20">
          <GlassCard className="hover:scale-105 transition-transform duration-300">
            <Lock className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Face Recognition</h3>
            <p className="text-muted-foreground">
              State-of-the-art facial recognition with liveness detection ensures only you can access your funds.
            </p>
          </GlassCard>
          
          <GlassCard className="hover:scale-105 transition-transform duration-300">
            <Zap className="h-12 w-12 text-accent mb-4" />
            <h3 className="text-xl font-semibold mb-2">Instant Transactions</h3>
            <p className="text-muted-foreground">
              Send crypto across multiple networks with real-time approval and instant settlement.
            </p>
          </GlassCard>
          
          <GlassCard className="hover:scale-105 transition-transform duration-300">
            <Shield className="h-12 w-12 text-secondary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Military-Grade Security</h3>
            <p className="text-muted-foreground">
              End-to-end encryption, secure PINs, and multi-factor authentication protect every transaction.
            </p>
          </GlassCard>
        </section>
        
        {/* Supported Networks */}
        <section className="text-center mb-20">
          <h2 className="text-3xl font-bold mb-8">Supported Networks</h2>
          <div className="flex justify-center gap-8 flex-wrap">
            {['ETH', 'BTC', 'SOL', 'BNB', 'MATIC', 'AVAX'].map((network) => (
              <GlassCard
                key={network}
                variant="subtle"
                className="px-6 py-3 hover:scale-110 transition-transform"
              >
                <span className="text-lg font-semibold">{network}</span>
              </GlassCard>
            ))}
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="text-center glass rounded-2xl p-12 mb-12">
          <h2 className="text-4xl font-bold mb-4">Ready to Experience the Future?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of users already using SecureTX for secure crypto transactions.
          </p>
          <SecureButton
            size="lg"
            onClick={() => navigate(ROUTES.REGISTER)}
            glow
            className="text-lg px-12"
          >
            Create Free Account
            <ArrowRight className="ml-2 h-5 w-5" />
          </SecureButton>
        </section>
        
        {/* Footer */}
        <footer className="text-center text-muted-foreground py-8 border-t border-border">
          <p>&copy; 2024 SecureTX. All rights reserved. | Demo Platform</p>
        </footer>
      </div>
    </div>
  );
}