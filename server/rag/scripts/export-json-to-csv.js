/**
 * Export RAG data from JSON files to CSV files organized by book
 * Each book gets its own CSV file with chunks and metadata
 * This approach bypasses ChromaDB and works directly with the JSON files
 */

const fs = require('fs').promises;
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

class JSONToCSVExporter {
  constructor() {
    this.inputDir = path.join(__dirname, '..', '..', 'rag_data', 'chunks');
    this.outputDir = path.join(__dirname, '..', 'exported_csv');
  }

  async initialize() {
    try {
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
   * Extract book name from filename
   */
  extractBookName(filename) {
    if (!filename) return 'unknown';
    
    // Remove file extension
    let bookName = path.basename(filename, '.json');
    
    // Clean up filename - remove hash suffixes and special characters
    bookName = bookName
      .replace(/_[a-f0-9]{8}$/, '') // Remove 8-char hash suffixes like "_1139e269"
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9·（）()·\-]/g, '_') // Replace special chars
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    
    return bookName || 'unknown';
  }

  /**
   * Parse metadata to extract educational information
   */
  parseEducationalMetadata(filename, metadata) {
    const parsed = {
      source_file: filename,
      book_name: this.extractBookName(filename),
      subject: this.extractSubject(filename),
      grade: this.extractGrade(filename),
      semester: this.extractSemester(filename),
      publisher: this.extractPublisher(filename),
      // Original metadata fields
      ...metadata
    };

    return parsed;
  }

  extractSubject(filename) {
    const subjects = ['数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '美术', '音乐', '体育', '科学', '道德与法治', '书法', '俄语', '日语'];
    return subjects.find(s => filename.includes(s)) || 'unknown';
  }

  extractGrade(filename) {
    const gradeMatch = filename.match(/(一年级|二年级|三年级|四年级|五年级|六年级|七年级|八年级|九年级|高一|高二|高三)/);
    return gradeMatch ? gradeMatch[1] : 'unknown';
  }

  extractSemester(filename) {
    if (filename.includes('上册')) return '上册';
    if (filename.includes('下册')) return '下册';
    if (filename.includes('全一册')) return '全一册';
    return 'unknown';
  }

  extractPublisher(filename) {
    const publisherPatterns = [
      /人教版/,
      /北师大版/,
      /苏教版/,
      /鲁教版/,
      /青岛版/,
      /湘教版/,
      /中图版/,
      /人民教育出版社/,
      /北京师范大学出版社/,
      /江苏凤凰教育出版社/
    ];
    
    for (const pattern of publisherPatterns) {
      const match = filename.match(pattern);
      if (match) return match[0];
    }
    
    // Extract publisher from parentheses like "（主编：王民）"
    const editorMatch = filename.match(/（主编：([^）]+)）/);
    if (editorMatch) return `主编:${editorMatch[1]}`;
    
    return 'unknown';
  }

  /**
   * Flatten nested metadata object to CSV-friendly format
   */
  flattenMetadata(metadata) {
    const flattened = {};
    
    for (const [key, value] of Object.entries(metadata || {})) {
      if (value === null || value === undefined) {
        flattened[key] = '';
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // Flatten nested objects with dot notation
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
   * Read and process a single JSON file
   */
  async processJsonFile(filename) {
    try {
      const filePath = path.join(this.inputDir, filename);
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      
      // Handle enhanced format - data is array of chunks directly
      let chunks;
      if (Array.isArray(data)) {
        chunks = data;
      } else if (data.chunks && Array.isArray(data.chunks)) {
        // Legacy format support
        chunks = data.chunks;
      } else {
        console.warn(`⚠️ Invalid format in ${filename} - expected array or object with chunks property`);
        return null;
      }

      if (chunks.length === 0) {
        console.warn(`⚠️ No chunks found in ${filename}`);
        return null;
      }

      console.log(`📖 Processing ${filename}: ${chunks.length} chunks`);
      
      return {
        filename,
        bookName: this.extractBookName(filename),
        chunks: chunks.filter(chunk => chunk.content && chunk.content.trim().length > 0)
      };
      
    } catch (error) {
      console.error(`❌ Failed to process ${filename}:`, error.message);
      return null;
    }
  }

  /**
   * Create CSV file for a book
   */
  async createBookCSV(bookData) {
    try {
      const { filename, bookName, chunks } = bookData;
      console.log(`📝 Creating CSV for: ${bookName}...`);
      
      const csvFilePath = path.join(this.outputDir, `${bookName}.csv`);
      
      // Prepare data for CSV
      const csvData = [];
      const allMetadataKeys = new Set();
      
      // First pass: collect all metadata keys to ensure consistent CSV headers
      for (const chunk of chunks) {
        const educationalMeta = this.parseEducationalMetadata(filename, chunk.metadata);
        const flattenedMetadata = this.flattenMetadata(educationalMeta);
        Object.keys(flattenedMetadata).forEach(key => allMetadataKeys.add(key));
        
        // Also collect semantic features keys
        if (chunk.semanticFeatures) {
          const semanticFlat = this.flattenMetadata({ semanticFeatures: chunk.semanticFeatures });
          Object.keys(semanticFlat).forEach(key => allMetadataKeys.add(key));
        }
      }
      
      // Sort metadata keys for consistent column order
      const sortedMetadataKeys = Array.from(allMetadataKeys).sort();
      
      // Second pass: create CSV rows
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Parse educational metadata
        const educationalMeta = this.parseEducationalMetadata(filename, chunk.metadata);
        const flattenedMetadata = this.flattenMetadata(educationalMeta);
        
        // Add semantic features
        if (chunk.semanticFeatures) {
          const semanticFlat = this.flattenMetadata({ semanticFeatures: chunk.semanticFeatures });
          Object.assign(flattenedMetadata, semanticFlat);
        }
        
        const row = {
          chunk_id: `${bookName}_chunk_${i}`,
          chunk_index: i,
          content: chunk.content.replace(/\n/g, '\\n').replace(/\r/g, '\\r'), // Escape newlines
          content_length: chunk.content.length,
          quality_score: chunk.qualityScore || 0,
          reliability: chunk.reliability || 'unknown',
          source_type: chunk.sourceType || 'text-extracted',
          original_content: chunk.originalContent ? chunk.originalContent.replace(/\n/g, '\\n').replace(/\r/g, '\\r') : '',
          enhancement_version: chunk.metadata?.enhancementVersion || 'unknown'
        };
        
        // Add all metadata fields
        for (const key of sortedMetadataKeys) {
          row[key] = flattenedMetadata[key] || '';
        }
        
        csvData.push(row);
      }
      
      // Define CSV headers
      const headers = [
        { id: 'chunk_id', title: 'Chunk_ID' },
        { id: 'chunk_index', title: 'Chunk_Index' },
        { id: 'content', title: 'Content' },
        { id: 'content_length', title: 'Content_Length' },
        { id: 'quality_score', title: 'Quality_Score' },
        { id: 'reliability', title: 'Reliability' },
        { id: 'source_type', title: 'Source_Type' },
        { id: 'original_content', title: 'Original_Content' },
        { id: 'enhancement_version', title: 'Enhancement_Version' }
      ];
      
      // Add metadata headers
      for (const key of sortedMetadataKeys) {
        headers.push({ id: key, title: key });
      }
      
      // Create CSV writer
      const csvWriter = createCsvWriter({
        path: csvFilePath,
        header: headers,
        encoding: 'utf8'
      });
      
      // Write CSV file
      await csvWriter.writeRecords(csvData);
      
      const fileStats = await fs.stat(csvFilePath);
      console.log(`✅ Created CSV: ${csvFilePath}`);
      console.log(`   - Records: ${csvData.length}`);
      console.log(`   - Columns: ${headers.length}`);
      console.log(`   - File size: ${fileStats.size} bytes`);
      
      return {
        bookName,
        filePath: csvFilePath,
        recordCount: csvData.length,
        columnCount: headers.length,
        fileSize: fileStats.size
      };
      
    } catch (error) {
      console.error(`❌ Failed to create CSV for ${bookData.bookName}:`, error.message);
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
      exportType: 'JSON_to_CSV_Direct',
      totalBooks: exportResults.length,
      totalRecords: exportResults.reduce((sum, result) => sum + result.recordCount, 0),
      totalFileSize: exportResults.reduce((sum, result) => sum + result.fileSize, 0),
      books: exportResults.map(result => ({
        bookName: result.bookName,
        fileName: path.basename(result.filePath),
        recordCount: result.recordCount,
        columnCount: result.columnCount,
        fileSizeBytes: result.fileSize
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
    console.log('🚀 Starting JSON to CSV export...');
    
    try {
      // Initialize
      await this.initialize();
      
      // Get all JSON files
      const files = await fs.readdir(this.inputDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      console.log(`📚 Found ${jsonFiles.length} JSON files to process`);
      
      if (jsonFiles.length === 0) {
        throw new Error('No JSON files found in the input directory');
      }
      
      // Group files by book name to avoid duplicates
      const bookGroups = new Map();
      
      for (const filename of jsonFiles) {
        const bookName = this.extractBookName(filename);
        if (!bookGroups.has(bookName)) {
          bookGroups.set(bookName, []);
        }
        bookGroups.get(bookName).push(filename);
      }
      
      console.log(`📖 Organized into ${bookGroups.size} unique books`);
      
      // Process each book group
      const exportResults = [];
      let processedBooks = 0;
      
      for (const [bookName, filenames] of bookGroups) {
        try {
          console.log(`\n📚 Processing book group: ${bookName} (${filenames.length} files)`);
          
          // For now, process the first file in each book group
          // In the future, we could merge multiple files for the same book
          const primaryFile = filenames[0];
          if (filenames.length > 1) {
            console.log(`   📝 Note: Using primary file ${primaryFile}, others: ${filenames.slice(1).join(', ')}`);
          }
          
          const bookData = await this.processJsonFile(primaryFile);
          if (!bookData) {
            console.log(`   ⚠️ Skipped ${bookName}: No valid data`);
            continue;
          }
          
          const result = await this.createBookCSV(bookData);
          exportResults.push(result);
          processedBooks++;
          
          console.log(`   ✅ Completed ${bookName}: ${result.recordCount} records`);
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
      console.log(`📊 Total file size: ${(summary.totalFileSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📋 Summary report: ${path.join(this.outputDir, 'export_summary.json')}`);
      
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
  const exporter = new JSONToCSVExporter();
  
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

module.exports = JSONToCSVExporter;