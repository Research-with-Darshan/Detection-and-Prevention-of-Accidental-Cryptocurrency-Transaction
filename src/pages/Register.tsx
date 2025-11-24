import { useState, useRef, useEffect } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { SecureButton } from '@/components/ui/secure-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StorageDebugger } from '@/utils/storageDebugger';
import { authService } from '@/services/authService';
import { Upload, User, Image as ImageIcon, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { ROUTES } from '@/lib/constants';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FaceRecognitionModal } from '@/components/FaceRecognitionModal';
import { enhancedFaceRecognition } from '@/lib/enhanced-face-recognition';

export default function Register() {
  const navigate = useNavigate();
  const [registrationData, setRegistrationData] = useState({
    username: '',
    realName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    country: 'US',
    dateOfBirth: '',
    referencePhoto: null as File | null
  });
  
  // Create a ref to hold the current registration data
  const registrationDataRef = useRef(registrationData);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceEmbedding, setFaceEmbedding] = useState<Float32Array | null>(null);
  const [debugOutput, setDebugOutput] = useState<string>('');
  const [referencePhotoEmbedding, setReferencePhotoEmbedding] = useState<Float32Array | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Update the ref whenever registrationData changes
  useEffect(() => {
    registrationDataRef.current = registrationData;
  }, [registrationData]);
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // Log the form data before opening face recognition
    console.log('Form data before opening face recognition:', registrationData);
    
    // Open face recognition modal
    setShowFaceModal(true);
  };
  
  // Handle face recognition success
  const handleFaceSuccess = (embedding: Float32Array) => {
    setFaceEmbedding(embedding);
    setShowFaceModal(false);
    
    // Use the ref to get the latest registration data
    console.log('Current registration data in face success (from ref):', registrationDataRef.current);
    console.log('Current registration data in state:', registrationData);
    
    // Continue with registration after face verification using the ref data
    handleRegister(registrationDataRef.current);
  };
  
  // Handle registration
  const handleRegister = async (formData: any) => {
    setIsLoading(true);
    
    // Log the form data received
    console.log('Form data received in handleRegister:', formData);
    
    // Validate that we have actual data
    if (!formData || !formData.username || !formData.email || !formData.phone) {
      console.error('ERROR: Missing required form data:', formData);
      // Show detailed error message with what's missing
      const missingFields = [];
      if (!formData) missingFields.push('form data');
      else {
        if (!formData.username) missingFields.push('username');
        if (!formData.email) missingFields.push('email');
        if (!formData.phone) missingFields.push('phone');
      }
      
      toast.error(`Registration data is missing: ${missingFields.join(', ')}. Please try again.`);
      setIsLoading(false);
      return;
    }
    
    try {
      // Convert file to base64 for storage
      let referencePhotoBase64 = null;
      if (formData.referencePhoto) {
        referencePhotoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(formData.referencePhoto!);
        });
      }
      
      // Generate a unique wallet address
      const walletAddress = authService.generateWalletAddress();
      
      // Prepare user data (exclude confirmPassword)
      const { confirmPassword, ...userDataWithoutConfirm } = formData;
      
      const userData = {
        ...userDataWithoutConfirm,
        password: authService.hashPassword(formData.password),
        referencePhoto: referencePhotoBase64,
        faceEmbedding: faceEmbedding ? Array.from(faceEmbedding) : undefined,
        walletAddress // Add wallet address to user data
      };
      
      console.log('Registering user with processed data:', userData);
      
      const result = StorageDebugger.debugRegistration(userData);
      
      setDebugOutput(JSON.stringify(result, null, 2));
      
      if (result.success) {
        toast.success('Registration successful! Please login.');
        setTimeout(() => {
          navigate(ROUTES.LOGIN);
        }, 1500);
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Show storage state
  const handleShowStorage = () => {
    StorageDebugger.showStorageState();
    setDebugOutput('Check browser console for detailed storage information');
  };
  
  // Show all registered users
  const handleShowAllUsers = () => {
    const usersInfo = StorageDebugger.getAllUsersFormatted();
    setDebugOutput(usersInfo);
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
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setDebugOutput('File size must be less than 5MB');
        toast.error('File size must be less than 5MB');
        return;
      }
      
      // Extract embedding from reference photo
      try {
        const { embedding, quality } = await enhancedFaceRecognition.extractEmbedding(file);
        setReferencePhotoEmbedding(embedding);
        
        if (quality < 0.3) {
          toast.warning('Reference photo quality is low. This may affect face verification accuracy.');
        }
        
        setRegistrationData(prev => ({ ...prev, referencePhoto: file }));
        setDebugOutput(`Photo uploaded: ${file.name}`);
        toast.success(`Photo uploaded: ${file.name}`);
      } catch (error) {
        console.error('Error processing reference photo:', error);
        toast.error('Failed to process reference photo. Please try another image.');
      }
    }
  };
  
  // Trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  // Check password strength
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, message: '' };
    
    let score = 0;
    const suggestions = [];
    
    if (password.length >= 8) score++;
    else suggestions.push('At least 8 characters');
    
    if (/[a-z]/.test(password)) score++;
    else suggestions.push('Lowercase letter');
    
    if (/[A-Z]/.test(password)) score++;
    else suggestions.push('Uppercase letter');
    
    if (/[0-9]/.test(password)) score++;
    else suggestions.push('Number');
    
    if (/[^A-Za-z0-9]/.test(password)) score++;
    else suggestions.push('Special character');
    
    const messages = [
      'Very Weak',
      'Weak',
      'Fair',
      'Good',
      'Strong',
      'Very Strong'
    ];
    
    return {
      score,
      message: messages[score],
      suggestions
    };
  };
  
  // Validate form
  const validateForm = () => {
    if (!registrationData.username || registrationData.username.length < 3) {
      toast.error('Username must be at least 3 characters');
      return false;
    }
    
    if (!registrationData.realName) {
      toast.error('Real name is required');
      return false;
    }
    
    if (!registrationData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registrationData.email)) {
      toast.error('Invalid email address');
      return false;
    }
    
    if (!registrationData.password) {
      toast.error('Password is required');
      return false;
    }
    
    const passwordStrength = getPasswordStrength(registrationData.password);
    if (passwordStrength.score < 3) {
      toast.error(`Password is too weak. Missing: ${passwordStrength.suggestions.join(', ')}`);
      return false;
    }
    
    if (registrationData.password !== registrationData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    
    if (!registrationData.phone || registrationData.phone.length < 10) {
      toast.error('Invalid phone number');
      return false;
    }
    
    if (!registrationData.country) {
      toast.error('Please select your country');
      return false;
    }
    
    if (!registrationData.dateOfBirth) {
      toast.error('Date of birth is required');
      return false;
    }
    
    const age = new Date().getFullYear() - new Date(registrationData.dateOfBirth).getFullYear();
    if (age < 18) {
      toast.error('You must be 18 or older to register');
      return false;
    }
    
    if (!registrationData.referencePhoto) {
      toast.error('Please upload a reference photo');
      return false;
    }
    
    return true;
  };
  
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center mb-8">Create Account</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registration Form */}
          <GlassCard>
            <h2 className="text-2xl font-semibold mb-4">Register User</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <div className="relative">
                  <Input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    value={registrationData.password}
                    onChange={(e) => setRegistrationData({...registrationData, password: e.target.value})}
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {registrationData.password && (
                  <div className="pt-1">
                    <div className="flex justify-between text-xs">
                      <span>Password strength:</span>
                      <span className={
                        getPasswordStrength(registrationData.password).score < 3 ? "text-destructive" :
                        getPasswordStrength(registrationData.password).score < 4 ? "text-warning" :
                        "text-success"
                      }>
                        {getPasswordStrength(registrationData.password).message}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                      <div 
                        className={
                          getPasswordStrength(registrationData.password).score < 3 ? "bg-destructive h-1.5 rounded-full transition-all duration-300" :
                          getPasswordStrength(registrationData.password).score < 4 ? "bg-warning h-1.5 rounded-full transition-all duration-300" :
                          "bg-success h-1.5 rounded-full transition-all duration-300"
                        } 
                        style={{ 
                          width: `${(getPasswordStrength(registrationData.password).score / 5) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reg-confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="reg-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={registrationData.confirmPassword}
                    onChange={(e) => setRegistrationData({...registrationData, confirmPassword: e.target.value})}
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
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
              
              <SecureButton 
                type="submit" 
                className="w-full"
                glow
                loading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : (
                  <>
                    Continue to Face Verification
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </SecureButton>
            </form>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to={ROUTES.LOGIN} className="text-primary hover:underline">
                  Login here
                </Link>
              </p>
            </div>
          </GlassCard>
          
          {/* Debug Actions */}
          <GlassCard>
            <h2 className="text-2xl font-semibold mb-4">Debug Actions</h2>
            <div className="flex flex-wrap gap-2">
              <SecureButton variant="outline" onClick={handleShowStorage}>
                Show Storage State
              </SecureButton>
              <SecureButton variant="outline" onClick={handleShowAllUsers}>
                Show All Users
              </SecureButton>
              <SecureButton variant="outline" onClick={handleExport}>
                Export Data
              </SecureButton>
              <SecureButton variant="destructive" onClick={handleClearAll}>
                Clear All Data
              </SecureButton>
            </div>
            
            {/* Debug Output */}
            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-2">Debug Output</h3>
              <div className="bg-input/50 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {debugOutput || 'Perform an action to see debug output'}
                </pre>
              </div>
            </div>
            
            {/* Instructions */}
            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-2">Instructions</h3>
              <div className="space-y-2 text-sm">
                <p>1. Fill in all registration fields</p>
                <p>2. Upload a reference photo</p>
                <p>3. Click "Continue to Face Verification" to register your face</p>
                <p>4. Follow the on-screen instructions for face capture</p>
                <p>5. Use debug actions to inspect storage state</p>
                <p className="text-destructive mt-4">
                  Note: All data is stored in your browser's localStorage and will be cleared when you clear browser data
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
      
      {/* Face Recognition Modal */}
      <FaceRecognitionModal
        isOpen={showFaceModal}
        onClose={() => setShowFaceModal(false)}
        onSuccess={handleFaceSuccess}
        mode="register"
      />
    </div>
  );
}