/**
 * API Configuration Utility
 * Centralized configuration for API endpoints
 */

export const getApiUrl = (endpoint: string = ''): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.bijielearn.com';
  return endpoint ? `${baseUrl}${endpoint}` : baseUrl;
};

// Common API endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    VERIFY_INVITE: '/api/auth/verify-invite',
    VERIFY_TOKEN: '/api/auth/verify-token',
  },
  
  // Content endpoints
  CONTENT: {
    STATS: '/api/content/stats',
    LESSON_PLANS: '/api/content/lesson-plans',
    EXERCISES: '/api/content/exercises',
    FAVORITES: '/api/content/favorites',
  },
  
  // AI endpoints
  AI: {
    LESSON_PLAN: '/api/lesson-plan',
    EXERCISES: '/api/exercises',
    ANALYZE: '/api/analyze',
  },
  
  // Export endpoints
  EXPORT: {
    LESSON_PLANS: '/api/export/lesson-plans',
    EXERCISES: '/api/export/exercises',
  },
} as const;

export default getApiUrl;