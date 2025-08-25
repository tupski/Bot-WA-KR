// Environment configuration for React Native
// This file loads configuration from environment variables or defaults

// Load from process.env if available (for development)
const getEnvVar = (key, defaultValue) => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue;
  }
  return defaultValue;
};

// Supabase configuration
export const SUPABASE_CONFIG = {
  url: getEnvVar('SUPABASE_URL', 'https://rvcknyuinfssgpgkfetx.supabase.co'),
  anonKey: getEnvVar('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Y2tueXVpbmZzc2dwZ2tmZXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MjE2OTgsImV4cCI6MjA3MDA5NzY5OH0.FXWPp9L4xZ3uw34Iob7QvlEsePTdBmGmgRufXBZZ34c'),
};

// API configuration
export const API_CONFIG = {
  baseURL: getEnvVar('API_BASE_URL', 'http://localhost:3000/api'),
  timeout: parseInt(getEnvVar('API_TIMEOUT', '30000')),
};

// App configuration
export const APP_ENV = {
  isDevelopment: getEnvVar('NODE_ENV', 'development') === 'development',
  isProduction: getEnvVar('NODE_ENV', 'development') === 'production',
  logLevel: getEnvVar('LOG_LEVEL', 'info'),
};

// Export all configs
export default {
  SUPABASE_CONFIG,
  API_CONFIG,
  APP_ENV,
};
