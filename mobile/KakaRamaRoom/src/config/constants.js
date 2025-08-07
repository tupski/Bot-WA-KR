// App Constants
export const APP_CONFIG = {
  name: 'KakaRama Room',
  version: '1.1.0',
  company: 'KakaRama Room',
  website: 'https://kakaramaroom.com',
  logo: require('../assets/images/logo-placeholder.png'), // Placeholder
};

// API Configuration (for future integrations)
export const API_CONFIG = {
  baseURL: 'http://localhost:3000/api', // For future API integrations
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Function untuk load API config dari AsyncStorage
export const loadApiConfig = async () => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const savedConfig = await AsyncStorage.getItem('api_config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      API_CONFIG.baseURL = config.baseURL;
      API_CONFIG.timeout = config.timeout;
    }
  } catch (error) {
    console.warn('Failed to load API config:', error);
  }
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  FIELD_TEAM: 'field_team',
};

// Apartment Codes
export const APARTMENTS = {
  TREEPARK: {
    code: 'TREEPARK',
    name: 'Treepark BSD',
    color: '#4CAF50',
  },
  SKYHOUSE: {
    code: 'SKYHOUSE', 
    name: 'Sky House BSD',
    color: '#2196F3',
  },
  SPRINGWOOD: {
    code: 'SPRINGWOOD',
    name: 'Springwood',
    color: '#87CEEB',
  },
  EMERALD: {
    code: 'EMERALD',
    name: 'Emerald Bintaro',
    color: '#009688',
  },
  TOKYO: {
    code: 'TOKYO',
    name: 'Tokyo PIK 2',
    color: '#D2691E',
  },
  SERPONG: {
    code: 'SERPONG',
    name: 'Serpong Garden',
    color: '#FF9800',
  },
  TRANSPARK: {
    code: 'TRANSPARK',
    name: 'Transpark Bintaro',
    color: '#9C27B0',
  },
};

// Unit Status
export const UNIT_STATUS = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  CLEANING: 'cleaning',
  MAINTENANCE: 'maintenance',
};

export const UNIT_STATUS_LABELS = {
  [UNIT_STATUS.AVAILABLE]: 'Tersedia',
  [UNIT_STATUS.OCCUPIED]: 'Terisi',
  [UNIT_STATUS.CLEANING]: 'Cleaning',
  [UNIT_STATUS.MAINTENANCE]: 'Maintenance',
};

export const UNIT_STATUS_COLORS = {
  [UNIT_STATUS.AVAILABLE]: '#4CAF50',
  [UNIT_STATUS.OCCUPIED]: '#F44336',
  [UNIT_STATUS.CLEANING]: '#FF9800',
  [UNIT_STATUS.MAINTENANCE]: '#9E9E9E',
};

// Payment Methods
export const PAYMENT_METHODS = [
  'Cash',
  'Cash Amel',
  'Transfer KR',
  'Transfer Amel',
  'APK',
];

// Checkin Status
export const CHECKIN_STATUS = {
  ACTIVE: 'active',
  EXTENDED: 'extended',
  COMPLETED: 'completed',
  EARLY_CHECKOUT: 'early_checkout',
};

export const CHECKIN_STATUS_LABELS = {
  [CHECKIN_STATUS.ACTIVE]: 'Aktif',
  [CHECKIN_STATUS.EXTENDED]: 'Diperpanjang',
  [CHECKIN_STATUS.COMPLETED]: 'Selesai',
  [CHECKIN_STATUS.EARLY_CHECKOUT]: 'Checkout Awal',
};

// Activity Actions
export const ACTIVITY_ACTIONS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  CREATE_CHECKIN: 'create_checkin',
  EXTEND_CHECKIN: 'extend_checkin',
  EARLY_CHECKOUT: 'early_checkout',
  CREATE_APARTMENT: 'create_apartment',
  UPDATE_APARTMENT: 'update_apartment',
  DELETE_APARTMENT: 'delete_apartment',
  CREATE_TEAM: 'create_team',
  UPDATE_TEAM: 'update_team',
  DELETE_TEAM: 'delete_team',
  ASSIGN_TEAM: 'assign_team',
  CREATE_UNIT: 'create_unit',
  UPDATE_UNIT: 'update_unit',
  DELETE_UNIT: 'delete_unit',
  UPDATE_UNIT_STATUS: 'update_unit_status',
  EXPORT_REPORT: 'export_report',
};

// Time Constants
export const TIME_CONSTANTS = {
  CLEANING_DURATION_MINUTES: 25, // 20-30 menit cleaning
  AUTO_CHECKOUT_CHECK_INTERVAL: 60000, // Check setiap 1 menit
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 jam
};

// Screen Names
export const SCREENS = {
  // Auth
  LOGIN: 'Login',
  
  // Admin
  ADMIN_DASHBOARD: 'AdminDashboard',
  ADMIN_REPORTS: 'AdminReports',
  ADMIN_APARTMENTS: 'AdminApartments',
  ADMIN_TEAMS: 'AdminTeams',
  ADMIN_UNITS: 'AdminUnits',
  ADMIN_ACTIVITY_LOGS: 'AdminActivityLogs',
  ADMIN_TOP_MARKETING: 'AdminTopMarketing',
  
  // Field Team
  FIELD_DASHBOARD: 'FieldDashboard',
  FIELD_CHECKIN: 'FieldCheckin',
  FIELD_EXTEND: 'FieldExtend',
  FIELD_UNITS: 'FieldUnits',
  
  // Shared
  PROFILE: 'Profile',
  SETTINGS: 'Settings',
};

// Colors
export const COLORS = {
  primary: '#1976D2',
  primaryDark: '#1565C0',
  secondary: '#FFC107',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  
  // Grays
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',
  
  // Background
  background: '#FFFFFF',
  surface: '#FFFFFF',
  
  // Text
  textPrimary: '#212121',
  textSecondary: '#757575',
  textDisabled: '#BDBDBD',
  
  // Status colors for apartments
  apartment: {
    TREEPARK: '#4CAF50',
    SKYHOUSE: '#2196F3',
    SPRINGWOOD: '#87CEEB',
    EMERALD: '#009688',
    TOKYO: '#D2691E',
    SERPONG: '#FF9800',
    TRANSPARK: '#9C27B0',
  },
};

// Fonts
export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  light: 'System',
};

// Sizes
export const SIZES = {
  // Font sizes
  h1: 32,
  h2: 24,
  h3: 20,
  h4: 18,
  h5: 16,
  h6: 14,
  body: 14,
  caption: 12,
  
  // Spacing
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  
  // Border radius
  radius: 8,
  radiusLarge: 16,
  
  // Icon sizes
  iconSmall: 16,
  iconMedium: 24,
  iconLarge: 32,
};

export default {
  APP_CONFIG,
  API_CONFIG,
  USER_ROLES,
  APARTMENTS,
  UNIT_STATUS,
  UNIT_STATUS_LABELS,
  UNIT_STATUS_COLORS,
  PAYMENT_METHODS,
  CHECKIN_STATUS,
  CHECKIN_STATUS_LABELS,
  ACTIVITY_ACTIONS,
  TIME_CONSTANTS,
  SCREENS,
  COLORS,
  FONTS,
  SIZES,
};
