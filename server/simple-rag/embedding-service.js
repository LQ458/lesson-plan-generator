/**
 * Self-Hosted Embedding Service
 * Complete embedding solution with multiple model support
 * Optimized for resource-constrained deployment
 */

const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const config = require('./config');

class SelfHostedEmbeddingService {
  constructor() {
    this.pythonProcess = null;
    this.isInitialized = false;
    this.embeddingCache = new Map();
    this.maxCacheSize = 5000;
    this.currentModel = null;
    this.modelProfiles = {
      'ultra-lite': {
        name: 'all-MiniLM-L6-v2',
        dimensions: 384,
        maxLength: 512,
        memoryUsage: '90MB',
        performance: 'fast'
      },
      'balanced': {
        name: 'paraphrase-multilingual-MiniLM-L12-v2',
        dimensions: 384,
        maxLength: 512,
        memoryUsage: '420MB',
        performance: 'good',
        multilingual: true
      },
      'quality': {
        name: 'paraphrase-multilingual-mpnet-base-v2',
        dimensions: 768,
        maxLength: 512,
        memoryUsage: '1.2GB',
        performance: 'best',
        multilingual: true
      }
    };
  }

  /**
   * Initialize the embedding service
   */
  async initialize() {
    try {
      const profile = process.env.EMBEDDING_PROFILE || 'balanced';
      const modelConfig = this.modelProfiles[profile];
      
      if (!modelConfig) {
        throw new Error(`Unknown embedding profile: ${profile}`);
      }

      console.log(`🚀 Initializing self-hosted embedding service (${profile})...`);
      console.log(`   Model: ${modelConfig.name}`);
      console.log(`   Memory: ${modelConfig.memoryUsage}`);
      console.log(`   Dimensions: ${modelConfig.dimensions}`);

      // Check available memory
      await this.checkSystemResources();

      // Initialize Python embedding service
      await this.startPythonService(profile, modelConfig);

      // Test the service
      await this.testEmbeddingService();

      this.currentModel = modelConfig;
      this.isInitialized = true;

      console.log('✅ Self-hosted embedding service initialized successfully');
    } catch (error) {
      console.error('❌ Embedding service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check system resources and adjust model if needed
   */
  async checkSystemResources() {
    try {
      const memInfo = await fs.readFile('/proc/meminfo', 'utf8');
      const availableMatch = memInfo.match(/MemAvailable:\s+(\d+)\s+kB/);
      
      if (availableMatch) {
        const availableGB = Math.floor(parseInt(availableMatch[1]) / 1024 / 1024);
        console.log(`   Available RAM: ${availableGB}GB`);

        // Auto-adjust profile based on available memory
        const profile = process.env.EMBEDDING_PROFILE || 'balanced';
        if (availableGB < 2 && profile !== 'ultra-lite') {
          console.log('⚠️ Low memory detected, switching to ultra-lite profile');
          process.env.EMBEDDING_PROFILE = 'ultra-lite';
        } else if (availableGB >= 4 && profile === 'ultra-lite') {
          console.log('✅ Sufficient memory available, can use balanced profile');
        }
      }
    } catch (error) {
      console.log('ℹ️ Could not read system memory info, proceeding with configured profile');
    }
  }

  /**
   * Start Python embedding service as subprocess
   */
  async startPythonService(profile, modelConfig) {
    return new Promise((resolve, reject) => {
      console.log('   Starting Python embedding process...');
      
      // Create Python script for embedding service
      const pythonScript = this.generatePythonScript(profile, modelConfig);
      
      // Spawn Python process
      this.pythonProcess = spawn('python3', ['-c', pythonScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTORCH_DISABLE_CUDA: '1',
          OMP_NUM_THREADS: '2',
          MKL_NUM_THREADS: '2'
        }
      });

      let initOutput = '';
      let errorOutput = '';

      this.pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        initOutput += output;
        
        if (output.includes('EMBEDDING_SERVICE_READY')) {
          console.log('   ✅ Python embedding process ready');
          resolve();
        }
      });

      this.pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      this.pythonProcess.on('error', (error) => {
        console.error('   ❌ Failed to start Python process:', error);
        reject(error);
      });

      this.pythonProcess.on('exit', (code) => {
        if (code !== 0) {
          console.error('   ❌ Python process exited with code:', code);
          console.error('   Error output:', errorOutput);
          reject(new Error(`Python process failed with code ${code}`));
        }
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        if (!this.isInitialized) {
          reject(new Error('Python embedding service initialization timeout'));
        }
      }, 60000);
    });
  }

  /**
   * Generate Python script for embedding service
   */
  generatePythonScript(profile, modelConfig) {
    return `
import sys
import json
import numpy as np
from sentence_transformers import SentenceTransformer
import torch
import warnings
warnings.filterwarnings("ignore")

# Disable CUDA and optimize for CPU
torch.set_num_threads(2)

class EmbeddingService:
    def __init__(self, model_name, model_path):
        try:
            # Load model from local path if available, otherwise download
            import os
            local_model_path = f"${process.env.EMBEDDING_MODEL_PATH || '/app/models'}/${profile}"
            
            if os.path.exists(local_model_path):
                print(f"Loading model from: {local_model_path}", file=sys.stderr)
                self.model = SentenceTransformer(local_model_path)
            else:
                print(f"Downloading model: {model_name}", file=sys.stderr)
                self.model = SentenceTransformer(model_name, cache_folder="${process.env.EMBEDDING_CACHE_DIR || '/app/cache/embeddings'}")
            
            print("EMBEDDING_SERVICE_READY", file=sys.stderr, flush=True)
            
        except Exception as e:
            print(f"Error loading model: {e}", file=sys.stderr)
            sys.exit(1)
    
    def embed_texts(self, texts):
        try:
            embeddings = self.model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
            return embeddings.tolist()
        except Exception as e:
            print(f"Embedding error: {e}", file=sys.stderr)
            return None

# Initialize service
service = EmbeddingService("${modelConfig.name}", "${process.env.EMBEDDING_MODEL_PATH || '/app/models'}")

# Service loop
while True:
    try:
        line = input()
        data = json.loads(line)
        
        if data.get('action') == 'embed':
            texts = data.get('texts', [])
            if texts:
                embeddings = service.embed_texts(texts)
                if embeddings:
                    result = {'status': 'success', 'embeddings': embeddings}
                else:
                    result = {'status': 'error', 'error': 'Embedding failed'}
            else:
                result = {'status': 'error', 'error': 'No texts provided'}
            
            print(json.dumps(result), flush=True)
        
        elif data.get('action') == 'ping':
            print(json.dumps({'status': 'pong'}), flush=True)
            
        elif data.get('action') == 'quit':
            break
            
    except EOFError:
        break
    except Exception as e:
        error_result = {'status': 'error', 'error': str(e)}
        print(json.dumps(error_result), flush=True)
`;
  }

  /**
   * Test embedding service
   */
  async testEmbeddingService() {
    try {
      const testText = ['测试中文文本', 'Test English text'];
      const embeddings = await this.embed(testText);
      
      if (embeddings && embeddings.length === 2 && embeddings[0].length > 0) {
        console.log(`   ✅ Service test passed (${embeddings[0].length} dimensions)`);
      } else {
        throw new Error('Service test failed - invalid embeddings');
      }
    } catch (error) {
      throw new Error(`Service test failed: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for text(s)
   */
  async embed(texts) {
    if (!this.isInitialized) {
      throw new Error('Embedding service not initialized');
    }

    const inputTexts = Array.isArray(texts) ? texts : [texts];
    const uncachedTexts = [];
    const results = new Array(inputTexts.length);

    // Check cache first
    inputTexts.forEach((text, i) => {
      const cacheKey = this.getCacheKey(text);
      const cached = this.embeddingCache.get(cacheKey);
      if (cached) {
        results[i] = cached;
      } else {
        uncachedTexts.push({ text, index: i });
      }
    });

    // Generate embeddings for uncached texts
    if (uncachedTexts.length > 0) {
      try {
        const textsToEmbed = uncachedTexts.map(item => item.text);
        const newEmbeddings = await this.generateEmbeddings(textsToEmbed);
        
        uncachedTexts.forEach((item, i) => {
          const embedding = newEmbeddings[i];
          results[item.index] = embedding;
          
          // Cache the result
          this.cacheEmbedding(item.text, embedding);
        });
      } catch (error) {
        console.error('Embedding generation failed:', error);
        throw error;
      }
    }

    return Array.isArray(texts) ? results : results[0];
  }

  /**
   * Generate embeddings using Python service
   */
  async generateEmbeddings(texts) {
    return new Promise((resolve, reject) => {
      if (!this.pythonProcess || this.pythonProcess.killed) {
        reject(new Error('Python embedding process not available'));
        return;
      }

      const request = {
        action: 'embed',
        texts: texts
      };

      let responseData = '';
      
      const onData = (data) => {
        responseData += data.toString();
        const lines = responseData.split('\n');
        
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line) {
            try {
              const response = JSON.parse(line);
              
              // Remove listener after getting response
              this.pythonProcess.stdout.removeListener('data', onData);
              
              if (response.status === 'success') {
                resolve(response.embeddings);
              } else {
                reject(new Error(response.error || 'Embedding failed'));
              }
              return;
            } catch (parseError) {
              // Continue if JSON parse fails (partial data)
            }
          }
        }
        
        // Keep last partial line
        responseData = lines[lines.length - 1];
      };

      this.pythonProcess.stdout.on('data', onData);

      // Send request
      this.pythonProcess.stdin.write(JSON.stringify(request) + '\n');

      // Timeout after 30 seconds
      setTimeout(() => {
        this.pythonProcess.stdout.removeListener('data', onData);
        reject(new Error('Embedding request timeout'));
      }, 30000);
    });
  }

  /**
   * Get cache key for text
   */
  getCacheKey(text) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(text).digest('hex');
  }

  /**
   * Cache embedding with LRU eviction
   */
  cacheEmbedding(text, embedding) {
    const cacheKey = this.getCacheKey(text);
    
    if (this.embeddingCache.size >= this.maxCacheSize) {
      // Remove oldest entry (LRU)
      const firstKey = this.embeddingCache.keys().next().value;
      this.embeddingCache.delete(firstKey);
    }
    
    this.embeddingCache.set(cacheKey, embedding);
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        return { status: 'unhealthy', error: 'Not initialized' };
      }

      // Ping Python service
      const pingRequest = { action: 'ping' };
      this.pythonProcess.stdin.write(JSON.stringify(pingRequest) + '\n');

      // Test with small embedding
      const testEmbedding = await this.embed('健康检查');
      
      return {
        status: 'healthy',
        model: this.currentModel.name,
        profile: process.env.EMBEDDING_PROFILE,
        dimensions: testEmbedding.length,
        cacheSize: this.embeddingCache.size,
        memoryUsage: this.currentModel.memoryUsage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('🧹 Cleaning up embedding service...');
    
    if (this.pythonProcess && !this.pythonProcess.killed) {
      try {
        // Send quit signal
        const quitRequest = { action: 'quit' };
        this.pythonProcess.stdin.write(JSON.stringify(quitRequest) + '\n');
        
        // Wait for graceful shutdown
        await new Promise((resolve) => {
          this.pythonProcess.on('exit', resolve);
          setTimeout(resolve, 5000); // Force exit after 5 seconds
        });
      } catch (error) {
        console.log('Force killing Python process...');
        this.pythonProcess.kill('SIGKILL');
      }
    }

    this.embeddingCache.clear();
    this.isInitialized = false;
    this.pythonProcess = null;

    console.log('✅ Embedding service cleaned up');
  }
}

module.exports = SelfHostedEmbeddingService;