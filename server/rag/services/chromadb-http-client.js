const axios = require('axios');

/**
 * ChromaDB HTTP API Client
 * Bypasses Node.js client dependencies by using direct HTTP requests
 */
class ChromaDBHTTPClient {
  constructor(baseURL = 'http://localhost:8000') {
    this.baseURL = baseURL;
    this.apiBase = `${baseURL}/api/v1`;
  }

  // Health check
  async heartbeat() {
    try {
      const response = await axios.get(`${this.apiBase}/heartbeat`);
      return response.data;
    } catch (error) {
      throw new Error(`ChromaDB heartbeat failed: ${error.message}`);
    }
  }

  // List all collections
  async listCollections() {
    try {
      const response = await axios.get(`${this.apiBase}/collections`);
      return response.data || [];
    } catch (error) {
      throw new Error(`Failed to list collections: ${error.message}`);
    }
  }

  // Create collection
  async createCollection(name, metadata = {}) {
    try {
      const payload = {
        name: name,
        metadata: metadata
      };
      
      const response = await axios.post(`${this.apiBase}/collections`, payload);
      return response.data;
    } catch (error) {
      if (error.response?.status === 409) {
        throw new Error(`Collection '${name}' already exists`);
      }
      throw new Error(`Failed to create collection: ${error.message}`);
    }
  }

  // Delete collection
  async deleteCollection(name) {
    try {
      await axios.delete(`${this.apiBase}/collections/${name}`);
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
      const response = await axios.get(`${this.apiBase}/collections/${name}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`Collection '${name}' not found`);
      }
      throw new Error(`Failed to get collection: ${error.message}`);
    }
  }

  // Add documents to collection
  async addDocuments(collectionName, { ids, documents, metadatas = [], embeddings = null }) {
    try {
      const payload = {
        ids: ids,
        documents: documents,
        metadatas: metadatas
      };

      // If embeddings are provided, include them
      if (embeddings) {
        payload.embeddings = embeddings;
      }

      const response = await axios.post(
        `${this.apiBase}/collections/${collectionName}/add`,
        payload
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to add documents: ${error.message}`);
    }
  }

  // Query collection
  async queryCollection(collectionName, { queryTexts, nResults = 10, where = null, include = ['documents', 'metadatas', 'distances'] }) {
    try {
      const payload = {
        query_texts: queryTexts,
        n_results: nResults,
        include: include
      };

      if (where) {
        payload.where = where;
      }

      const response = await axios.post(
        `${this.apiBase}/collections/${collectionName}/query`,
        payload
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to query collection: ${error.message}`);
    }
  }

  // Count documents in collection
  async countCollection(collectionName) {
    try {
      const response = await axios.get(`${this.apiBase}/collections/${collectionName}/count`);
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
        `${this.apiBase}/collections/${collectionName}/get`,
        payload
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get documents: ${error.message}`);
    }
  }
}

module.exports = ChromaDBHTTPClient;