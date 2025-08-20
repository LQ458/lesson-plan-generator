const axios = require('axios');

/**
 * ChromaDB HTTP API Client v2
 * Bypasses Node.js client dependencies by using direct HTTP requests
 * v2 API uses tenant/database/collection hierarchy
 */
class ChromaDBHTTPClient {
  constructor(baseURL = 'http://localhost:8000', tenant = 'default_tenant', database = 'default_database') {
    this.baseURL = baseURL;
    this.apiBase = `${baseURL}/api/v2`;
    this.apiV1Base = `${baseURL}/api/v1`;
    this.tenant = tenant;
    this.database = database;
    this.collectionsEndpoint = `${this.apiBase}/tenants/${this.tenant}/databases/${this.database}/collections`;
  }

  // Force v1 API usage to avoid embedding requirements
  async heartbeat() {
    try {
      console.log('🔧 Forcing ChromaDB API v1 usage (avoids embedding requirements)');
      this.apiBase = this.apiV1Base; // Force v1 usage
      this.collectionsEndpoint = `${this.apiBase}/collections`; // Update collections endpoint
      
      const response = await axios.get(`${this.apiBase}/heartbeat`);
      console.log('✅ Using ChromaDB API v1');
      return response.data;
    } catch (error) {
      throw new Error(`ChromaDB v1 heartbeat failed: ${error.message}`);
    }
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
      const payload = {
        name: name,
        metadata: metadata,
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

      const endpoint = `${this.collectionsEndpoint}/${collectionName}/add`;
      
      const response = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Add documents error details:`);
      console.error(`   Endpoint: ${this.collectionsEndpoint}/${collectionName}/add`);
      console.error(`   Status: ${error.response?.status}`);
      console.error(`   Data: ${JSON.stringify(error.response?.data, null, 2)}`);
      console.error(`   Sample IDs: ${ids.slice(0, 3)}`);
      console.error(`   Documents count: ${documents.length}`);
      console.error(`   Metadatas count: ${metadatas.length}`);
      
      throw new Error(`Failed to add documents: ${error.response?.data?.detail || error.message}`);
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
        `${this.collectionsEndpoint}/${collectionName}/query`,
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
      const response = await axios.get(`${this.collectionsEndpoint}/${collectionName}/count`);
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