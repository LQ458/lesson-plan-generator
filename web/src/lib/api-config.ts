/**
 * API Configuration Utility
 * Centralized configuration for API endpoints
 */

export const getApiUrl = (endpoint: string = ''): string => {
  // Use /server prefix for Express backend to avoid NextAuth /api conflicts
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/server';
  return endpoint ? `${baseUrl}${endpoint}` : baseUrl;
};

// Common API endpoints - all use /server prefix to avoid NextAuth conflicts
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