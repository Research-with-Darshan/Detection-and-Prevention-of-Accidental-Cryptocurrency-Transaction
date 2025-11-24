// Comprehensive storage debugger to track user registration and storage issues
export class StorageDebugger {
  static USERS_KEY = 'users';
  static CURRENT_USER_KEY = 'currentUser';
  
  // Debug user registration process
  static debugRegistration(userData: any) {
    console.log('=== REGISTRATION DEBUG ===');
    console.log('Input user data:', userData);
    
    // Check if user data is empty
    if (!userData || Object.keys(userData).length === 0) {
      console.error('ERROR: Empty user data received for registration');
      return { success: false, error: 'No user data provided' };
    }
    
    // Check if required fields are empty
    const requiredFields = ['username', 'realName', 'email', 'password', 'phone'];
    const emptyFields = requiredFields.filter(field => !userData[field] || userData[field].toString().trim() === '');
    
    if (emptyFields.length > 0) {
      console.error('ERROR: Empty required fields detected:', emptyFields);
      return { success: false, error: `Missing required fields: ${emptyFields.join(', ')}` };
    }
    
    // Check current localStorage state before registration
    console.log('LocalStorage state BEFORE registration:');
    this.showStorageState();
    
    // Try to register user
    try {
      // Get existing users
      let existingUsers: any[] = [];
      try {
        const usersStr = localStorage.getItem(this.USERS_KEY);
        existingUsers = usersStr ? JSON.parse(usersStr) : [];
        console.log('Existing users count:', existingUsers.length);
      } catch (e) {
        console.log('No existing users or parse error:', e);
        existingUsers = [];
      }
      
      // Check if username already exists (case-insensitive)
      const usernameExists = existingUsers.some(u => u.username.toLowerCase() === userData.username.toLowerCase());
      console.log('Username already exists (case-insensitive check):', usernameExists);
      
      if (usernameExists) {
        return { success: false, error: 'Username already exists' };
      }
      
      // Generate wallet address if not provided
      const walletAddress = userData.walletAddress || this.generateWalletAddress();
      
      // Generate secondary wallet address if not provided
      const secondaryWalletAddress = userData.secondaryWalletAddress || this.generateSecondaryWalletAddress(walletAddress);
      
      // Check if wallet address already exists
      const walletExists = existingUsers.some(u => u.walletAddress === walletAddress);
      if (walletExists) {
        return { success: false, error: 'Wallet address already exists' };
      }
      
      // Add new user (store username as provided, but search will be case-insensitive)
      const newUser = {
        ...userData,
        walletAddress, // Add wallet address to user
        secondaryWalletAddress, // Add secondary wallet address to user
        id: this.generateId(),
        createdAt: new Date().toISOString()
      };
      
      existingUsers.push(newUser);
      console.log('New user to be stored:', newUser);
      
      // Save to localStorage
      localStorage.setItem(this.USERS_KEY, JSON.stringify(existingUsers));
      console.log('Saved to localStorage successfully');
      
      // Verify storage
      console.log('LocalStorage state AFTER registration:');
      this.showStorageState();
      
      return { success: true, user: newUser };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error };
    }
  }
  
  // Debug user login process
  static debugLogin(username: string, password: string) {
    console.log('=== LOGIN DEBUG ===');
    console.log('Attempting login with:', { username, password });
    
    // Show current storage state
    console.log('Current localStorage state:');
    this.showStorageState();
    
    try {
      // Get users
      const usersStr = localStorage.getItem(this.USERS_KEY);
      console.log('Raw users string from localStorage:', usersStr);
      
      if (!usersStr) {
        console.log('No users found in localStorage');
        return { success: false, message: 'No users registered' };
      }
      
      const users = JSON.parse(usersStr);
      console.log('Parsed users array:', users);
      console.log('Users count:', users.length);
      
      // Search for user (case-insensitive)
      console.log(`Searching for username: "${username}" (case-insensitive)`);
      const user = users.find((u: any) => {
        const match = u.username.toLowerCase() === username.toLowerCase();
        console.log(`Comparing "${u.username.toLowerCase()}" with "${username.toLowerCase()}" - Match: ${match}`);
        return match;
      });
      
      console.log('Found user:', user);
      
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      
      // Verify password
      const passwordMatch = user.password === password;
      console.log('Password match:', passwordMatch);
      console.log('Stored password:', user.password);
      console.log('Provided password:', password);
      
      if (!passwordMatch) {
        return { success: false, message: 'Invalid password' };
      }
      
      // Save current user
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
      console.log('Current user saved');
      
      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error };
    }
  }
  
  // Show complete storage state
  static showStorageState() {
    console.log('--- STORAGE STATE ---');
    
    // Show all localStorage items
    console.log('All localStorage items:');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        console.log(`  ${key}:`, value);
      }
    }
    
    // Show users specifically
    try {
      const usersStr = localStorage.getItem(this.USERS_KEY);
      if (usersStr) {
        const users = JSON.parse(usersStr);
        console.log(`Users in storage (${users.length}):`);
        users.forEach((user: any, index: number) => {
          console.log(`  ${index + 1}. Username: "${user.username}", ID: ${user.id}, Wallet: ${user.walletAddress}`);
        });
      } else {
        console.log('No users in storage');
      }
    } catch (e) {
      console.log('Error parsing users:', e);
    }
    
    // Show current user
    try {
      const currentUserStr = localStorage.getItem(this.CURRENT_USER_KEY);
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        console.log('Current user:', currentUser.username);
      } else {
        console.log('No current user');
      }
    } catch (e) {
      console.log('Error parsing current user:', e);
    }
    
    console.log('--- END STORAGE STATE ---');
  }
  
  // Clear all user data
  static clearAll() {
    console.log('=== CLEARING ALL USER DATA ===');
    localStorage.removeItem(this.USERS_KEY);
    localStorage.removeItem(this.CURRENT_USER_KEY);
    console.log('Cleared all user data');
    this.showStorageState();
  }
  
  // Export all data
  static exportData() {
    const data: any = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        data[key] = localStorage.getItem(key);
      }
    }
    return data;
  }
  
  // Import data
  static importData(data: any) {
    Object.keys(data).forEach(key => {
      localStorage.setItem(key, data[key]);
    });
  }
  
  // Find user by username (case-insensitive)
  static findUserByUsername(username: string): any | null {
    try {
      const usersStr = localStorage.getItem(this.USERS_KEY);
      if (!usersStr) return null;
      
      const users = JSON.parse(usersStr);
      return users.find((u: any) => u.username.toLowerCase() === username.toLowerCase()) || null;
    } catch (e) {
      console.error('Error finding user by username:', e);
      return null;
    }
  }
  
  // Find user by phone number
  static findUserByPhone(phone: string): any | null {
    try {
      const usersStr = localStorage.getItem(this.USERS_KEY);
      if (!usersStr) return null;
      const users = JSON.parse(usersStr);
      const norm = (s: string) => (s || '').replace(/\D/g, '');
      const inNorm = norm(phone);
      const inTail = inNorm.slice(-10);
      return users.find((u: any) => {
        const uNorm = norm(u.phone || '');
        const uTail = uNorm.slice(-10);
        return uNorm === inNorm || uTail === inTail;
      }) || null;
    } catch (e) {
      console.error('Error finding user by phone:', e);
      return null;
    }
  }
  
  // Find user by email (case-insensitive)
  static findUserByEmail(email: string): any | null {
    try {
      const usersStr = localStorage.getItem(this.USERS_KEY);
      if (!usersStr) return null;
      
      const users = JSON.parse(usersStr);
      return users.find((u: any) => u.email.toLowerCase() === email.toLowerCase()) || null;
    } catch (e) {
      console.error('Error finding user by email:', e);
      return null;
    }
  }
  
  // Find user by wallet address
  static findUserByWalletAddress(walletAddress: string): any | null {
    try {
      const usersStr = localStorage.getItem(this.USERS_KEY);
      if (!usersStr) return null;
      
      const users = JSON.parse(usersStr);
      return users.find((u: any) => u.walletAddress === walletAddress) || null;
    } catch (e) {
      console.error('Error finding user by wallet address:', e);
      return null;
    }
  }
  
  // Find user by phone, email, or wallet address
  static findUserByIdentifier(identifier: string): any | null {
    if (!identifier) return null;
    if (identifier.startsWith('0x') && identifier.length === 42) {
      return this.findUserByWalletAddress(identifier);
    }
    const isPhone = /^[\d\s\-\+\(\)]+$/.test(identifier);
    if (isPhone) {
      const byPhone = this.findUserByPhone(identifier);
      if (byPhone) return byPhone;
    }
    if (identifier.includes('@')) {
      const byEmail = this.findUserByEmail(identifier);
      if (byEmail) return byEmail;
    }
    return this.findUserByUsername(identifier);
  }
  
  // Get all users with formatted output
  static getAllUsersFormatted(): string {
    try {
      const users = this.getAllUsers();
      if (users.length === 0) {
        return "No users registered yet.";
      }
      
      let output = `Total users registered: ${users.length}\n\n`;
      users.forEach((user: any, index: number) => {
        output += `User ${index + 1}:\n`;
        output += `  Username: ${user.username || 'N/A'}\n`;
        output += `  Real Name: ${user.realName || 'N/A'}\n`;
        output += `  Email: ${user.email || 'N/A'}\n`;
        output += `  Phone: ${user.phone || 'N/A'}\n`;
        output += `  Country: ${user.country || 'N/A'}\n`;
        output += `  Date of Birth: ${user.dateOfBirth || 'N/A'}\n`;
        output += `  ID: ${user.id}\n`;
        output += `  Wallet Address: ${user.walletAddress || 'N/A'}\n`;
        output += `  Created: ${user.createdAt || 'N/A'}\n`;
        output += `  Has Reference Photo: ${user.referencePhoto ? 'Yes' : 'No'}\n`;
        output += `  Has Face Embedding: ${user.faceEmbedding ? 'Yes' : 'No'}\n`;
        output += `\n`;
      });
      
      return output;
    } catch (error) {
      console.error('Error getting formatted users:', error);
      return "Error retrieving user data.";
    }
  }
  
  // Get all users
  static getAllUsers(): any[] {
    try {
      const usersStr = localStorage.getItem(this.USERS_KEY);
      return usersStr ? JSON.parse(usersStr) : [];
    } catch (e) {
      console.error('Error getting users:', e);
      return [];
    }
  }
  
  // Generate a unique wallet address
  static generateWalletAddress(): string {
    // Generate a unique wallet address (simplified for demo)
    const prefix = "0x";
    const characters = "0123456789abcdef";
    let address = prefix;
    
    for (let i = 0; i < 40; i++) {
      address += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return address;
  }
  
  // Generate a secondary wallet address based on the primary wallet address
  static generateSecondaryWalletAddress(primaryWalletAddress: string): string {
    // For demo purposes, we'll create a deterministic secondary address
    // based on the primary address by reversing it and changing some characters
    if (!primaryWalletAddress || primaryWalletAddress.length < 42) {
      // Generate a random secondary address if primary is invalid
      return this.generateWalletAddress();
    }
    
    // Take the primary address and create a variation for the secondary
    const prefix = "0x";
    const primaryBody = primaryWalletAddress.slice(2); // Remove '0x' prefix
    
    // Create a deterministic variation by:
    // 1. Reversing the string
    // 2. Changing some characters to ensure it's different
    let secondaryBody = primaryBody.split("").reverse().join("");
    
    // Modify some characters to ensure it's different from primary
    // (This is a simple approach for demo purposes)
    secondaryBody = secondaryBody.substring(0, 20) + 
                   "abcd" + 
                   secondaryBody.substring(24);
    
    return prefix + secondaryBody;
  }
  
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}