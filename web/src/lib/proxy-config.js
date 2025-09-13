/**
 * Proxy Configuration for Express Backend
 * Handles different ports between development and production
 */

export const getExpressUrl = (endpoint = '') => {
  // Development: Express runs on 3002
  // Production: Express runs on 3001
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'http://localhost:3001/server'
    : 'http://localhost:3002/server';
    
  return endpoint ? `${baseUrl}${endpoint}` : baseUrl;
};

export default getExpressUrl;