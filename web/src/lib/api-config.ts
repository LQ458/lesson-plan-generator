/**
 * API Configuration Utility
 * Centralized configuration for API endpoints
 */

export const getApiUrl = (endpoint: string = ''): string => {
  // For content API calls, use backend directly during development
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  return endpoint ? `${baseUrl}${endpoint}` : baseUrl;
};

// Common API endpoints
export const API_ENDPOINTS = {
  // Content endpoints
  CONTENT: {
    STATS: '/content/stats',
    LESSON_PLANS: '/content/lesson-plans',
    EXERCISES: '/content/exercises',
    FAVORITES: '/content/favorites',
  },
  
  // AI endpoints
  AI: {
    LESSON_PLAN: '/lesson-plan',
    EXERCISES: '/exercises',
    ANALYZE: '/analyze',
  },
  
  // Export endpoints
  EXPORT: {
    LESSON_PLANS: '/export/lesson-plans',
    EXERCISES: '/export/exercises',
  },
} as const;

export default getApiUrl;