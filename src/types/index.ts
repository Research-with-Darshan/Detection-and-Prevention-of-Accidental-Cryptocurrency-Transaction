export interface User {
  id: string;
  username: string;
  realName: string;
  email: string;
  phone: string;
  country: string;
  dateOfBirth: string;
  referencePhoto?: string;
  faceEmbedding?: Float32Array;
  hasPin: boolean;
  createdAt: Date;
  lastLogin?: Date;
  walletAddress: string; // Primary wallet address
  secondaryWalletAddress?: string; // Secondary wallet address
}

export interface Wallet {
  id: string;
  userId: string;
  network: CryptoNetwork;
  address: string;
  balance: number;
  createdAt: Date;
}

export type CryptoNetwork = 'ETH' | 'BTC' | 'SOL' | 'BNB' | 'MATIC' | 'AVAX';

export interface Transaction {
  id: string;
  senderId: string;
  receiverId: string;
  network: CryptoNetwork;
  amount: number;
  status: TransactionStatus;
  approvalToken?: string;
  approvalExpiry?: Date;
  createdAt: Date;
  completedAt?: Date;
}

export type TransactionStatus = 
  | 'pending_approval' 
  | 'approved' 
  | 'released' 
  | 'terminated' 
  | 'expired';

export interface CFRResult {
  success: boolean;
  similarity?: number;
  livenessDetected?: boolean;
  error?: string;
}

export interface RegistrationData {
  username: string;
  realName: string;
  password: string;
  email: string;
  phone: string;
  country: string;
  dateOfBirth: string;
  referencePhoto: File;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}