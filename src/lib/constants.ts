import { CryptoNetwork } from '@/types';

export const CRYPTO_NETWORKS: Record<CryptoNetwork, {
  name: string;
  symbol: string;
  color: string;
  icon: string;
}> = {
  ETH: {
    name: 'Ethereum',
    symbol: 'ETH',
    color: '#627EEA',
    icon: '⟠',
  },
  BTC: {
    name: 'Bitcoin',
    symbol: 'BTC',
    color: '#F7931A',
    icon: '₿',
  },
  SOL: {
    name: 'Solana',
    symbol: 'SOL',
    color: '#14F195',
    icon: '◎',
  },
  BNB: {
    name: 'BNB Chain',
    symbol: 'BNB',
    color: '#F3BA2F',
    icon: '◈',
  },
  MATIC: {
    name: 'Polygon',
    symbol: 'MATIC',
    color: '#8247E5',
    icon: '⬟',
  },
  AVAX: {
    name: 'Avalanche',
    symbol: 'AVAX',
    color: '#E84142',
    icon: '△',
  },
};

export const INITIAL_BALANCE = 50;

export const CFR_CONFIG = {
  SIMILARITY_THRESHOLD: 0.6, // Lowered from 0.75 to 0.6 for easier matching
  MAX_CAPTURE_TIME: 20000, // 20 seconds
  LIVENESS_CHALLENGES: [
    'Blink your eyes slowly',
    'Turn your head slightly left',
    'Turn your head slightly right',
    'Smile',
    'Raise your eyebrows',
  ],
};

export const TRANSACTION_CONFIG = {
  APPROVAL_TIMEOUT: 30000, // 30 seconds
  PIN_LENGTH: 4,
};

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROFILE: '/dashboard/profile',
  WALLETS: '/dashboard/wallets',
  PIN_SETUP: '/dashboard/pin',
  USER_SEARCH: '/dashboard/search',
  TRANSACTION: '/dashboard/transaction',
  HISTORY: '/dashboard/history',
};