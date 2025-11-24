import { useState, useRef } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { SecureButton } from '@/components/ui/secure-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StorageDebugger } from '@/utils/storageDebugger';
import { authService } from '@/services/authService';
import { Upload, User, Image as ImageIcon } from 'lucide-react';

export default function StorageDebuggerPage() {
  const [registrationData, setRegistrationData] = useState({
    username: '',
    realName: '',
    email: '',
    password: '',
    phone: '',
    country: 'US',
    dateOfBirth: '1990-01-01',
    referencePhoto: null as File | null
  });
  
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  
  const [debugOutput, setDebugOutput] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle registration
  const handleRegister = () => {
    // Convert file to base64 for storage
    if (registrationData.referencePhoto) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Image = e.target?.result as string;
        const userData = {
          ...registrationData,
          referencePhoto: base64Image
        };
        
        const result = StorageDebugger.debugRegistration({
          ...userData,
          password: authService.hashPassword(userData.password)
        });
        
        setDebugOutput(JSON.stringify(result, null, 2));
      };
      reader.readAsDataURL(registrationData.referencePhoto);
    } else {
      const result = StorageDebugger.debugRegistration({
        ...registrationData,
        password: authService.hashPassword(registrationData.password)
      });
      
      setDebugOutput(JSON.stringify(result, null, 2));
    }
  };
  
  // Handle login
  const handleLogin = () => {
    const result = StorageDebugger.debugLogin(
      loginData.username,
      authService.hashPassword(loginData.password)
    );
    
    setDebugOutput(JSON.stringify(result, null, 2));
  };
  
  // Show storage state
  const handleShowStorage = () => {
    StorageDebugger.showStorageState();
    setDebugOutput('Check browser console for detailed storage information');
  };
  
  // Clear all data
  const handleClearAll = () => {
    StorageDebugger.clearAll();
    setDebugOutput('All user data cleared');
  };
  
  // Export data
  const handleExport = () => {
    const data = StorageDebugger.exportData();
    setDebugOutput(JSON.stringify(data, null, 2));
  };
  
  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setDebugOutput('File size must be less than 5MB');
        return;
      }
      setRegistrationData(prev => ({ ...prev, referencePhoto: file }));
      setDebugOutput(`Photo uploaded: ${file.name}`);
    }
  };
  
  // Trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center mb-8">Storage Debugger</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registration Form */}
          <GlassCard>
            <h2 className="text-2xl font-semibold mb-4">Register User</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-username">Username</Label>
                <Input
                  id="reg-username"
                  value={registrationData.username}
                  onChange={(e) => setRegistrationData({...registrationData, username: e.target.value})}
                  placeholder="Enter username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reg-realname">Real Name</Label>
                <Input
                  id="reg-realname"
                  value={registrationData.realName}
                  onChange={(e) => setRegistrationData({...registrationData, realName: e.target.value})}
                  placeholder="Enter real name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  value={registrationData.email}
                  onChange={(e) => setRegistrationData({...registrationData, email: e.target.value})}
                  placeholder="Enter email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reg-password">Password</Label>
                <Input
                  id="reg-password"
                  type="password"
                  value={registrationData.password}
                  onChange={(e) => setRegistrationData({...registrationData, password: e.target.value})}
                  placeholder="Enter password"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reg-phone">Phone</Label>
                <Input
                  id="reg-phone"
                  value={registrationData.phone}
                  onChange={(e) => setRegistrationData({...registrationData, phone: e.target.value})}
                  placeholder="Enter phone"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reg-country">Country</Label>
                <Select value={registrationData.country} onValueChange={(value) => setRegistrationData(prev => ({ ...prev, country: value }))}>
                  <SelectTrigger className="bg-input/50">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">India</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="UK">United Kingdom</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="JP">Japan</SelectItem>
                    <SelectItem value="SG">Singapore</SelectItem>
                    <SelectItem value="CN">China</SelectItem>
                    <SelectItem value="BR">Brazil</SelectItem>
                    <SelectItem value="ZA">South Africa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reg-dob">Date of Birth</Label>
                <Input
                  id="reg-dob"
                  type="date"
                  value={registrationData.dateOfBirth}
                  onChange={(e) => setRegistrationData({...registrationData, dateOfBirth: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reg-photo">
                  Reference Photo <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="reg-photo"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    ref={fileInputRef}
                  />
                  <SecureButton
                    type="button"
                    variant="outline"
                    onClick={triggerFileInput}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {registrationData.referencePhoto ? registrationData.referencePhoto.name : 'Upload Photo'}
                  </SecureButton>
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a clear photo for your profile
                </p>
              </div>
              
              <SecureButton onClick={handleRegister} className="w-full">
                Register User
              </SecureButton>
            </div>
          </GlassCard>
          
          {/* Login Form */}
          <GlassCard>
            <h2 className="text-2xl font-semibold mb-4">Login User</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-username">Username</Label>
                <Input
                  id="login-username"
                  value={loginData.username}
                  onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                  placeholder="Enter username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  placeholder="Enter password"
                />
              </div>
              
              <SecureButton onClick={handleLogin} className="w-full">
                Login User
              </SecureButton>
            </div>
          </GlassCard>
        </div>
        
        {/* Debug Actions */}
        <GlassCard>
          <h2 className="text-2xl font-semibold mb-4">Debug Actions</h2>
          <div className="flex flex-wrap gap-2">
            <SecureButton variant="outline" onClick={handleShowStorage}>
              Show Storage State
            </SecureButton>
            <SecureButton variant="outline" onClick={handleExport}>
              Export Data
            </SecureButton>
            <SecureButton variant="destructive" onClick={handleClearAll}>
              Clear All Data
            </SecureButton>
          </div>
        </GlassCard>
        
        {/* Debug Output */}
        <GlassCard>
          <h2 className="text-2xl font-semibold mb-4">Debug Output</h2>
          <div className="bg-input/50 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {debugOutput || 'Perform an action to see debug output'}
            </pre>
          </div>
        </GlassCard>
        
        {/* Instructions */}
        <GlassCard>
          <h2 className="text-2xl font-semibold mb-4">Instructions</h2>
          <div className="space-y-2 text-sm">
            <p>1. Register a user using the form on the left</p>
            <p>2. Check the browser console for detailed registration logs</p>
            <p>3. Try to login with the same username and password</p>
            <p>4. Check the browser console for detailed login logs</p>
            <p>5. Use "Show Storage State" to see exactly what's in localStorage</p>
            <p className="text-destructive mt-4">
              Note: All data is stored in your browser's localStorage and will be cleared when you clear browser data
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}