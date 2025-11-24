// Authentication service for handling user registration and login
// This implementation can work with both localStorage (for demo) and a backend API

import { StorageDebugger } from '@/utils/storageDebugger';

export interface User {
  id: string;
  username: string;
  realName: string;
  email: string;
  password: string;
  phone: string;
  country: string;
  dateOfBirth: string;
  faceEmbedding?: number[];
  referencePhoto?: string;
  createdAt: string;
  walletAddress: string; // Primary wallet address
  secondaryWalletAddress?: string; // Secondary wallet address
}

export interface RegisterUserData {
  username: string;
  realName: string;
  email: string;
  password: string;
  phone: string;
  country: string;
  dateOfBirth: string;
  faceEmbedding?: number[];
  referencePhoto?: string;
  walletAddress: string; // Primary wallet address
  secondaryWalletAddress?: string; // Secondary wallet address
}

// For demo purposes, we'll use a mock API
// In a real implementation, this would point to your backend server
const API_BASE_URL = 'http://localhost:5000/api';

class AuthService {
  private readonly USERS_KEY = 'users';
  private readonly CURRENT_USER_KEY = 'currentUser';
  private useBackend = false; // Set to true when backend is ready
  private sessionKey: string | null = null;
  setSessionKey(key: string) { this.sessionKey = key; }
  private nsKey(base: string) { return this.sessionKey ? `${base}:${this.sessionKey}` : base; }

  // Register a new user
  async register(userData: RegisterUserData): Promise<{ success: boolean; message: string }> {
    if (this.useBackend) {
      // Use backend API
      try {
        const response = await fetch(`${API_BASE_URL}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...userData,
            password: this.hashPassword(userData.password), // In a real app, this would be hashed server-side
          }),
        });
        
        const result = await response.json();
        return result;
      } catch (error) {
        console.error('Backend registration error:', error);
        return { success: false, message: 'Registration failed. Please try again.' };
      }
    } else {
      // Use localStorage (current implementation) with debugging
      return this.registerWithDebugging(userData);
    }
  }

  // Register with comprehensive debugging
  private async registerWithDebugging(userData: RegisterUserData): Promise<{ success: boolean; message: string }> {
    try {
      // Process the reference photo if provided
      let processedUserData = { ...userData };
      if (userData.password) {
        processedUserData = { ...processedUserData, password: this.hashPassword(userData.password) };
      }
      
      const debugResult = StorageDebugger.debugRegistration(processedUserData);
      
      if (debugResult.success) {
        console.log('User registered successfully:', debugResult.user.username);
        return { success: true, message: 'Registration successful! Please login.' };
      } else {
        console.error('Registration failed:', debugResult.error);
        return { success: false, message: debugResult.error === 'Username already exists' ? 'Username already exists. Please choose a different username.' : 'Registration failed. Please try again.' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed. Please try again.' };
    }
  }

  // Login user
  async login(identifier: string, password: string): Promise<{ success: boolean; message: string; user?: User }> {
    if (this.useBackend) {
      // Use backend API
      try {
        const response = await fetch(`${API_BASE_URL}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ identifier, password: this.hashPassword(password) }),
        });
        
        const result = await response.json();
        if (result.success && result.user) {
          this.saveCurrentUser(result.user);
        }
        return result;
      } catch (error) {
        console.error('Backend login error:', error);
        return { success: false, message: 'Login failed. Please try again.' };
      }
    } else {
      // Use localStorage (current implementation) with debugging
      return this.loginWithDebugging(identifier, password);
    }
  }

  // Login with comprehensive debugging
  private async loginWithDebugging(identifier: string, password: string): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      // Debug: Show current storage state
      console.log('=== LOGIN DEBUG ===');
      console.log('Attempting login with identifier:', identifier);
      StorageDebugger.showStorageState();
      
      const hashedPassword = this.hashPassword(password);
      
      // Try to find user by phone, email, or wallet address
      const user = StorageDebugger.findUserByIdentifier(identifier);
      
      if (!user) {
        return { success: false, message: 'User not found. Please check your phone number, email, or wallet address.' };
      }
      
      // Verify password
      const passwordMatch = user.password === hashedPassword;
      console.log('Password match:', passwordMatch);
      console.log('Stored password:', user.password);
      console.log('Provided password:', hashedPassword);
      
      if (!passwordMatch) {
        return { success: false, message: 'Invalid password. Please try again.' };
      }
      
      // Save current user
      this.saveCurrentUser(user);
      console.log('Current user saved');
      
      return { success: true, message: 'Login successful!', user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed. Please try again.' };
    }
  }

  // Logout user
  logout(): void {
    const key = this.nsKey(this.CURRENT_USER_KEY);
    try { sessionStorage.removeItem(key); } catch {}
    try { localStorage.removeItem(key); } catch {}
  }

  // Get current user
  getCurrentUser(): User | null {
    try {
      const key = this.nsKey(this.CURRENT_USER_KEY);
      const userStr = sessionStorage.getItem(key) || localStorage.getItem(key);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }

  // Get all users (for debugging purposes)
  getUsers(): User[] {
    try {
      return StorageDebugger.getAllUsers();
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  // Find user by username (case-insensitive)
  findUserByUsername(username: string): User | undefined {
    try {
      const user = StorageDebugger.findUserByUsername(username);
      return user || undefined;
    } catch (error) {
      console.error('Error finding user:', error);
      return undefined;
    }
  }
  
  // Find user by identifier (phone, email, or wallet address)
  findUserByIdentifier(identifier: string): User | undefined {
    try {
      const user = StorageDebugger.findUserByIdentifier(identifier);
      return user || undefined;
    } catch (error) {
      console.error('Error finding user by identifier:', error);
      return undefined;
    }
  }

  // Clear all users (for testing purposes)
  clearAllUsers(): void {
    StorageDebugger.clearAll();
  }

  // Private methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private saveUsers(users: User[]): void {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  }

  private saveCurrentUser(user: User): void {
    const key = this.nsKey(this.CURRENT_USER_KEY);
    try {
      sessionStorage.setItem(key, JSON.stringify(user));
    } catch {
      localStorage.setItem(key, JSON.stringify(user));
    }
  }

  private verifyPassword(plainPassword: string, hashedPassword: string): boolean {
    // This is a simplified implementation
    // In a real application, this would be done server-side with proper hashing
    return plainPassword === atob(hashedPassword); // Simple base64 decode for demo
  }

  // Simple password hashing for demo purposes
  hashPassword(password: string): string {
    // This is a simplified implementation for demo purposes
    // In a real application, use proper hashing like bcrypt
    return btoa(password); // Simple base64 encode for demo
  }
  
  // Generate a unique wallet address
  generateWalletAddress(): string {
    return StorageDebugger.generateWalletAddress();
  }
}

// Export singleton instance
export const authService = new AuthService();