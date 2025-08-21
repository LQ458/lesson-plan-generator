const axios = require('axios');

// Simple embedding function - works anywhere
function generateEmbedding(text) {
  const embedding = new Array(384).fill(0);
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    embedding[char % 384] += Math.sin(char / 100) * 0.1;
  }
  const mag = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / (mag || 1));
}

/**
 * ChromaDB HTTP API Client v2
 * Bypasses Node.js client dependencies by using direct HTTP requests
 * v2 API uses tenant/database/collection hierarchy
 */
class ChromaDBHTTPClient {
  constructor(baseURL = 'http://localhost:8000') {
    this.baseURL = baseURL;
    this.apiBase = `${baseURL}/api/v2`;
    this.collectionsEndpoint = `${this.apiBase}/tenants/default_tenant/databases/chroma/collections`;
  }

  async heartbeat() {
    const response = await axios.get(`${this.apiBase}/heartbeat`);
    return response.data;
  }

  // List all collections
  async listCollections() {
    try {
      const response = await axios.get(this.collectionsEndpoint);
      return response.data || [];
    } catch (error) {
      // v2 API might return empty array instead of 404
      if (error.response?.status === 404) {
        return []; // No collections exist yet
      }
      throw new Error(`Failed to list collections: ${error.message}`);
    }
  }

  // Create collection with embedding function
  async createCollection(name, metadata = {}) {
    try {
      // ChromaDB requires non-empty metadata
      const finalMetadata = Object.keys(metadata).length === 0 
        ? { description: "TeachAI RAG Collection", created: new Date().toISOString() }
        : metadata;
        
      const payload = {
        name: name,
        metadata: finalMetadata,
        get_or_create: true // Allow getting existing collection
      };
      
      console.log(`🔧 Creating/getting collection: ${name}`);
      const response = await axios.post(this.collectionsEndpoint, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log(`✅ Collection ready: ${name}`);
      return response.data;
    } catch (error) {
      console.log(`❌ Collection creation error:`, error.response?.status, error.response?.data);
      if (error.response?.status === 409) {
        // Collection exists, try to get it
        try {
          return await this.getCollection(name);
        } catch (getError) {
          throw new Error(`Collection '${name}' exists but cannot access it`);
        }
      }
      throw new Error(`Failed to create collection: ${error.response?.data?.detail || error.message}`);
    }
  }

  // Delete collection
  async deleteCollection(name) {
    try {
      await axios.delete(`${this.collectionsEndpoint}/${name}`);
      return true;
    } catch (error) {
      if (error.response?.status === 404) {
        return false; // Collection doesn't exist
      }
      throw new Error(`Failed to delete collection: ${error.message}`);
    }
  }

  // Get collection
  async getCollection(name) {
    try {
      const response = await axios.get(`${this.collectionsEndpoint}/${name}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`Collection '${name}' not found`);
      }
      throw new Error(`Failed to get collection: ${error.message}`);
    }
  }

  async addDocuments(collectionName, { ids, documents, metadatas = [], embeddings = null }) {
    const collectionInfo = await this.getCollection(collectionName);
    const collectionId = collectionInfo.id || collectionName;
    
    const finalEmbeddings = embeddings || documents.map(doc => generateEmbedding(doc));

    const response = await axios.post(`${this.collectionsEndpoint}/${collectionId}/add`, {
      ids,
      documents,
      metadatas,
      embeddings: finalEmbeddings
    });
    
    return response.data;
  }

  async queryCollection(collectionName, { queryTexts, nResults = 10, where = null, include = ['documents', 'metadatas', 'distances'] }) {
    const collectionInfo = await this.getCollection(collectionName);
    const collectionId = collectionInfo.id || collectionName;
    
    const queryEmbeddings = queryTexts.map(text => generateEmbedding(text));
    
    const payload = {
      query_embeddings: queryEmbeddings,
      n_results: nResults,
      include: include
    };

    if (where) payload.where = where;

    const response = await axios.post(`${this.collectionsEndpoint}/${collectionId}/query`, payload);
    return response.data;
  }

  // Count documents in collection
  async countCollection(collectionName) {
    try {
      // Get collection info to find the actual collection ID
      const collectionInfo = await this.getCollection(collectionName);
      const collectionId = collectionInfo.id || collectionName;
      
      const response = await axios.get(`${this.collectionsEndpoint}/${collectionId}/count`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to count collection: ${error.message}`);
    }
  }

  // Get documents from collection
  async getDocuments(collectionName, { ids = null, where = null, limit = null, offset = null, include = ['documents', 'metadatas'] }) {
    try {
      const payload = {
        include: include
      };

      if (ids) payload.ids = ids;
      if (where) payload.where = where;
      if (limit) payload.limit = limit;
      if (offset) payload.offset = offset;

      const response = await axios.post(
        `${this.collectionsEndpoint}/${collectionName}/get`,
        payload
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get documents: ${error.message}`);
    }
  }
}

module.exports = ChromaDBHTTPClient;