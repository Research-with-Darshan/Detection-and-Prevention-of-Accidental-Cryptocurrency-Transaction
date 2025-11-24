import { GlassCard } from '@/components/ui/glass-card';
import { SecureButton } from '@/components/ui/secure-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROUTES } from '@/lib/constants';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { StorageDebugger } from '@/utils/storageDebugger';

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
    countryCode: '+1', // Default to US
  });
  
  const countryCodes = [
    { code: '+1', name: 'US/Canada' },
    { code: '+44', name: 'UK' },
    { code: '+91', name: 'India' },
    { code: '+61', name: 'Australia' },
    { code: '+81', name: 'Japan' },
    { code: '+49', name: 'Germany' },
    { code: '+33', name: 'France' },
    { code: '+86', name: 'China' },
    { code: '+55', name: 'Brazil' },
    { code: '+27', name: 'South Africa' },
    { code: '+39', name: 'Italy' },
    { code: '+34', name: 'Spain' },
    { code: '+82', name: 'South Korea' },
    { code: '+65', name: 'Singapore' },
    { code: '+60', name: 'Malaysia' },
  ];
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Debug: Show all users in localStorage
      console.log('=== DEBUGGING LOGIN ATTEMPT ===');
      StorageDebugger.showStorageState();
      
      // Format the identifier based on login method
      let formattedIdentifier = formData.identifier;
      if (loginMethod === 'phone' && formData.identifier) {
        // Remove any non-digit characters and add country code
        const cleanPhone = formData.identifier.replace(/\D/g, '');
        formattedIdentifier = `${formData.countryCode}${cleanPhone}`;
        console.log('Formatted phone number:', formattedIdentifier);
      }
      
      // Debug: Check what we're searching for
      console.log('Attempting to login with identifier:', formattedIdentifier);
      
      const result = await authService.login(formattedIdentifier, formData.password);
      
      if (result.success) {
        toast.success(result.message);
        navigate(ROUTES.DASHBOARD);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to clear all users (for testing)
  const clearAllUsers = () => {
    StorageDebugger.clearAll();
    toast.success('All user data cleared');
  };
  
  // Function to show storage state
  const showStorageState = () => {
    StorageDebugger.showStorageState();
    toast.info('Check browser console for storage details');
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-gradient">Welcome Back</h1>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Login method toggle */}
          <div className="flex rounded-md overflow-hidden border border-input bg-input/50">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                loginMethod === 'phone' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-input'
              }`}
              onClick={() => setLoginMethod('phone')}
            >
              Phone
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                loginMethod === 'email' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-input'
              }`}
              onClick={() => setLoginMethod('email')}
            >
              Email
            </button>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="identifier">
              {loginMethod === 'phone' ? 'Phone Number' : 'Email Address'}
            </Label>
            
            {loginMethod === 'phone' ? (
              <div className="flex gap-2">
                <Select 
                  value={formData.countryCode} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, countryCode: value }))}
                >
                  <SelectTrigger className="w-[100px] bg-input/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countryCodes.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.code} ({country.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="identifier"
                  value={formData.identifier}
                  onChange={(e) => setFormData(prev => ({ ...prev, identifier: e.target.value }))}
                  placeholder="Enter phone number"
                  className="flex-1 bg-input/50"
                  required
                />
              </div>
            ) : (
              <Input
                id="identifier"
                type="email"
                value={formData.identifier}
                onChange={(e) => setFormData(prev => ({ ...prev, identifier: e.target.value }))}
                placeholder="Enter your email"
                className="bg-input/50"
                required
              />
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter your password"
                className="bg-input/50 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          <SecureButton
            type="submit"
            className="w-full"
            glow
            loading={isLoading}
          >
            Login
          </SecureButton>
          
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to={ROUTES.REGISTER} className="text-primary hover:underline">
              Register here
            </Link>
          </p>
          
          {/* Debug links */}
          <div className="flex flex-col gap-2 mt-4">
            <button
              type="button"
              onClick={showStorageState}
              className="text-xs text-muted-foreground hover:underline"
            >
              Debug: Show Storage State
            </button>
            <button
              type="button"
              onClick={clearAllUsers}
              className="text-xs text-destructive hover:underline"
            >
              Debug: Clear All Users
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}