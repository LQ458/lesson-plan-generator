/**
 * Export ChromaDB data to CSV files organized by book
 * Each book gets its own CSV file with chunks, embeddings, and metadata
 */

const fs = require('fs').promises;
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const VectorStoreService = require('../services/vector-store');
const logger = require('../../utils/logger');

class ChromaDBToCSVExporter {
  constructor() {
    this.vectorStore = new VectorStoreService();
    this.outputDir = path.join(__dirname, '..', 'exported_csv');
    this.batchSize = 100; // Process documents in batches to avoid memory issues
  }

  async initialize() {
    try {
      await this.vectorStore.initialize();
      
      // Create output directory
      await fs.mkdir(this.outputDir, { recursive: true });
      console.log(`✅ Output directory created: ${this.outputDir}`);
      
      return true;
    } catch (error) {
      console.error(`❌ Initialization failed:`, error.message);
      throw error;
    }
  }

  /**
   * Extract book name from source filename
   */
  extractBookName(source) {
    if (!source) return 'unknown';
    
    // Remove file extension and path
    let bookName = path.basename(source, '.json');
    
    // Clean up filename - remove common prefixes and special characters
    bookName = bookName
      .replace(/^.*?_/, '') // Remove hash prefixes
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9·（）()·\-]/g, '_') // Replace special chars
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    
    return bookName || 'unknown';
  }

  /**
   * Get all documents from ChromaDB collection
   */
  async getAllDocuments() {
    try {
      console.log('🔍 Fetching all documents from ChromaDB...');
      
      // First get the total count
      const totalCount = await this.vectorStore.client.countCollection(this.vectorStore.collection);
      console.log(`📊 Total documents in collection: ${totalCount}`);
      
      if (totalCount === 0) {
        throw new Error('No documents found in ChromaDB collection');
      }

      // Get all documents with metadata and embeddings
      const allDocuments = await this.vectorStore.client.getDocuments(this.vectorStore.collection, {
        limit: totalCount,
        include: ['documents', 'metadatas', 'embeddings', 'ids']
      });

      console.log(`✅ Retrieved ${allDocuments.documents?.length || 0} documents`);
      return allDocuments;
      
    } catch (error) {
      console.error(`❌ Failed to fetch documents:`, error.message);
      throw error;
    }
  }

  /**
   * Organize documents by book source
   */
  organizeDocumentsByBook(allDocuments) {
    const bookGroups = new Map();
    
    if (!allDocuments.documents || !Array.isArray(allDocuments.documents)) {
      throw new Error('Invalid document format from ChromaDB');
    }

    const documentCount = allDocuments.documents.length;
    console.log(`📚 Organizing ${documentCount} documents by book...`);

    for (let i = 0; i < documentCount; i++) {
      const document = allDocuments.documents[i];
      const metadata = allDocuments.metadatas?.[i] || {};
      const embedding = allDocuments.embeddings?.[i] || [];
      const id = allDocuments.ids?.[i] || `doc_${i}`;

      // Extract book name from source
      const source = metadata.source || 'unknown';
      const bookName = this.extractBookName(source);

      // Initialize book group if not exists
      if (!bookGroups.has(bookName)) {
        bookGroups.set(bookName, {
          bookName,
          source,
          documents: [],
          totalChunks: 0
        });
      }

      // Add document to book group
      const bookGroup = bookGroups.get(bookName);
      bookGroup.documents.push({
        id,
        content: document,
        metadata,
        embedding,
        chunkIndex: metadata.chunk_index || bookGroup.totalChunks
      });
      bookGroup.totalChunks++;
    }

    console.log(`📖 Found ${bookGroups.size} unique books:`);
    for (const [bookName, group] of bookGroups) {
      console.log(`  - ${bookName}: ${group.totalChunks} chunks`);
    }

    return bookGroups;
  }

  /**
   * Convert embedding array to string representation
   */
  embeddingToString(embedding) {
    if (!Array.isArray(embedding) || embedding.length === 0) {
      return '';
    }
    return embedding.map(val => typeof val === 'number' ? val.toFixed(6) : val).join('|');
  }

  /**
   * Flatten metadata object to CSV-friendly format
   */
  flattenMetadata(metadata) {
    const flattened = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      if (value === null || value === undefined) {
        flattened[key] = '';
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // Flatten nested objects
        for (const [subKey, subValue] of Object.entries(value)) {
          flattened[`${key}_${subKey}`] = String(subValue || '');
        }
      } else if (Array.isArray(value)) {
        flattened[key] = value.join('|');
      } else {
        flattened[key] = String(value);
      }
    }
    
    return flattened;
  }

  /**
   * Create CSV file for a specific book
   */
  async createBookCSV(bookName, bookData) {
    try {
      console.log(`📝 Creating CSV for: ${bookName}...`);
      
      const csvFilePath = path.join(this.outputDir, `${bookName}.csv`);
      
      // Prepare data for CSV
      const csvData = [];
      const allMetadataKeys = new Set();
      
      // First pass: collect all metadata keys to ensure consistent CSV headers
      for (const doc of bookData.documents) {
        const flattenedMetadata = this.flattenMetadata(doc.metadata);
        Object.keys(flattenedMetadata).forEach(key => allMetadataKeys.add(key));
      }
      
      // Sort metadata keys for consistent column order
      const sortedMetadataKeys = Array.from(allMetadataKeys).sort();
      
      // Second pass: create CSV rows
      for (const doc of bookData.documents) {
        const flattenedMetadata = this.flattenMetadata(doc.metadata);
        
        const row = {
          id: doc.id,
          content: doc.content.replace(/\n/g, '\\n').replace(/\r/g, '\\r'), // Escape newlines
          embedding: this.embeddingToString(doc.embedding),
          embedding_dimensions: Array.isArray(doc.embedding) ? doc.embedding.length : 0,
          content_length: doc.content.length,
          chunk_index: doc.chunkIndex
        };
        
        // Add all metadata fields
        for (const key of sortedMetadataKeys) {
          row[`metadata_${key}`] = flattenedMetadata[key] || '';
        }
        
        csvData.push(row);
      }
      
      // Define CSV headers
      const headers = [
        { id: 'id', title: 'ID' },
        { id: 'content', title: 'Content' },
        { id: 'embedding', title: 'Embedding' },
        { id: 'embedding_dimensions', title: 'Embedding_Dimensions' },
        { id: 'content_length', title: 'Content_Length' },
        { id: 'chunk_index', title: 'Chunk_Index' }
      ];
      
      // Add metadata headers
      for (const key of sortedMetadataKeys) {
        headers.push({ id: `metadata_${key}`, title: `Metadata_${key}` });
      }
      
      // Create CSV writer
      const csvWriter = createCsvWriter({
        path: csvFilePath,
        header: headers,
        encoding: 'utf8'
      });
      
      // Write CSV file
      await csvWriter.writeRecords(csvData);
      
      console.log(`✅ Created CSV: ${csvFilePath}`);
      console.log(`   - Records: ${csvData.length}`);
      console.log(`   - Columns: ${headers.length}`);
      console.log(`   - File size: ${(await fs.stat(csvFilePath)).size} bytes`);
      
      return {
        filePath: csvFilePath,
        recordCount: csvData.length,
        columnCount: headers.length
      };
      
    } catch (error) {
      console.error(`❌ Failed to create CSV for ${bookName}:`, error.message);
      throw error;
    }
  }

  /**
   * Create summary report of the export
   */
  async createSummaryReport(exportResults) {
    const summaryPath = path.join(this.outputDir, 'export_summary.json');
    
    const summary = {
      exportDate: new Date().toISOString(),
      totalBooks: exportResults.length,
      totalRecords: exportResults.reduce((sum, result) => sum + result.recordCount, 0),
      books: exportResults.map(result => ({
        bookName: path.basename(result.filePath, '.csv'),
        filePath: result.filePath,
        recordCount: result.recordCount,
        columnCount: result.columnCount
      }))
    };
    
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`📋 Export summary saved: ${summaryPath}`);
    
    return summary;
  }

  /**
   * Main export function
   */
  async exportToCSV() {
    console.log('🚀 Starting ChromaDB to CSV export...');
    
    try {
      // Initialize
      await this.initialize();
      
      // Get all documents
      const allDocuments = await this.getAllDocuments();
      
      // Organize by book
      const bookGroups = this.organizeDocumentsByBook(allDocuments);
      
      // Export each book to CSV
      const exportResults = [];
      let processedBooks = 0;
      
      for (const [bookName, bookData] of bookGroups) {
        try {
          const result = await this.createBookCSV(bookName, bookData);
          exportResults.push(result);
          processedBooks++;
          
          console.log(`📈 Progress: ${processedBooks}/${bookGroups.size} books processed`);
          
        } catch (error) {
          console.error(`⚠️ Skipped book ${bookName}:`, error.message);
        }
      }
      
      // Create summary report
      const summary = await this.createSummaryReport(exportResults);
      
      console.log('\n🎉 Export completed successfully!');
      console.log(`📁 Output directory: ${this.outputDir}`);
      console.log(`📚 Books exported: ${exportResults.length}/${bookGroups.size}`);
      console.log(`📄 Total records: ${summary.totalRecords}`);
      console.log(`📊 Summary report: ${path.join(this.outputDir, 'export_summary.json')}`);
      
      return {
        success: true,
        outputDir: this.outputDir,
        summary
      };
      
    } catch (error) {
      console.error('❌ Export failed:', error.message);
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const exporter = new ChromaDBToCSVExporter();
  
  exporter.exportToCSV()
    .then((result) => {
      console.log('\n✨ Export process completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Export process failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = ChromaDBToCSVExporter;