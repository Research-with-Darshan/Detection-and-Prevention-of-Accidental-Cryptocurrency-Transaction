import CryptoJS from 'crypto-js';

// Generate a secure random wallet address
export function generateWalletAddress(network: string): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2);
  const seed = `${network}_${timestamp}_${random}`;
  
  const prefixes: Record<string, string> = {
    ETH: '0x',
    BTC: '1',
    SOL: '',
    BNB: '0x',
    MATIC: '0x',
    AVAX: '0x',
  };
  
  const prefix = prefixes[network] || '0x';
  const hash = CryptoJS.SHA256(seed).toString(CryptoJS.enc.Hex);
  
  if (network === 'BTC') {
    return '1' + hash.substring(0, 33);
  } else if (network === 'SOL') {
    return hash.substring(0, 44).toUpperCase();
  } else {
    return prefix + hash.substring(0, 40);
  }
}

// Hash password with salt
export function hashPassword(password: string): string {
  const salt = CryptoJS.lib.WordArray.random(128/8);
  const hash = CryptoJS.PBKDF2(password, salt, {
    keySize: 256/32,
    iterations: 1000
  });
  return salt.toString() + ':' + hash.toString();
}

// Verify password
export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const newHash = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(salt), {
    keySize: 256/32,
    iterations: 1000
  }).toString();
  return hash === newHash;
}

// Hash PIN
export function hashPin(pin: string): string {
  return CryptoJS.SHA256(pin).toString();
}

// Verify PIN
export function verifyPin(pin: string, hashedPin: string): boolean {
  return CryptoJS.SHA256(pin).toString() === hashedPin;
}

// Encrypt sensitive data
export function encryptData(data: string, key: string): string {
  return CryptoJS.AES.encrypt(data, key).toString();
}

// Decrypt sensitive data
export function decryptData(encryptedData: string, key: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Generate secure token
export function generateSecureToken(): string {
  return CryptoJS.lib.WordArray.random(256/8).toString();
}

// Mask email
export function maskEmail(email: string): string {
  const [username, domain] = email.split('@');
  const [domainName, tld] = domain.split('.');
  
  const maskedUsername = username.substring(0, 2) + '***';
  const maskedDomain = domainName.substring(0, 2) + '***';
  
  return `${maskedUsername}@${maskedDomain}.${tld}`;
}

// Mask phone number (show only last 2 digits)
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return '*'.repeat(digits.length - 2) + digits.slice(-2);
}

// Validate password strength
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letters');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain numbers');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain special characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}