/**
 * 文档数据模型
 */

class DocumentChunk {
  constructor(data) {
    this.content = data.content || "";
    this.metadata = {
      source: data.metadata?.source || "",
      subject: data.metadata?.subject || "其他",
      grade: data.metadata?.grade || "未知",
      chunkIndex: data.metadata?.chunkIndex || 0,
      totalChunks: data.metadata?.totalChunks || 1,
      qualityScore: data.metadata?.qualityScore || 0,
      contentLength: data.content?.length || 0,
      fileSize: data.metadata?.fileSize || 0,
      processingDate: data.metadata?.processingDate || new Date().toISOString(),
      ...data.metadata,
    };
    this.embedding = data.embedding || [];
    this.id = data.id || this.generateId();
  }

  generateId() {
    const source = this.metadata.source.replace(/[^a-zA-Z0-9]/g, "_");
    return `${source}_chunk_${this.metadata.chunkIndex}`;
  }

  validate() {
    const errors = [];

    if (!this.content || this.content.trim().length === 0) {
      errors.push("内容不能为空");
    }

    if (!this.metadata.source) {
      errors.push("来源文件名不能为空");
    }

    if (!Array.isArray(this.embedding) || this.embedding.length === 0) {
      errors.push("嵌入向量不能为空");
    }

    if (this.metadata.qualityScore < 0 || this.metadata.qualityScore > 5) {
      errors.push("质量分数必须在0-5之间");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  toChromaFormat() {
    return {
      id: this.id,
      document: this.content,
      embedding: this.embedding,
      metadata: this.metadata,
    };
  }
}

class SearchResult {
  constructor(data) {
    this.content = data.content || data.document || "";
    this.metadata = data.metadata || {};
    this.similarity = data.similarity || 1 - (data.distance || 1);
    this.distance = data.distance || 1 - (data.similarity || 0);
    this.id = data.id || "";
  }

  formatForAPI() {
    return {
      content: this.content,
      metadata: {
        source: this.metadata.source,
        subject: this.metadata.subject,
        grade: this.metadata.grade,
        qualityScore: this.metadata.qualityScore,
        contentLength: this.metadata.contentLength,
        chunkIndex: this.metadata.chunkIndex,
        processingDate: this.metadata.processingDate,
      },
      similarity: this.similarity,
      relevanceScore: this.calculateRelevanceScore(),
    };
  }

  calculateRelevanceScore() {
    const qualityWeight = 0.3;
    const similarityWeight = 0.7;
    return (
      this.similarity * similarityWeight +
      ((this.metadata.qualityScore || 0) / 5) * qualityWeight
    );
  }
}

class DocumentCollection {
  constructor() {
    this.documents = [];
    this.metadata = {
      totalDocuments: 0,
      totalChunks: 0,
      subjects: new Set(),
      grades: new Set(),
      lastUpdated: null,
    };
  }

  addDocument(documentChunk) {
    if (!(documentChunk instanceof DocumentChunk)) {
      documentChunk = new DocumentChunk(documentChunk);
    }

    const validation = documentChunk.validate();
    if (!validation.isValid) {
      throw new Error(`文档验证失败: ${validation.errors.join(", ")}`);
    }

    this.documents.push(documentChunk);
    this.updateMetadata(documentChunk);

    return documentChunk;
  }

  updateMetadata(documentChunk) {
    this.metadata.totalChunks++;
    this.metadata.subjects.add(documentChunk.metadata.subject);
    this.metadata.grades.add(documentChunk.metadata.grade);
    this.metadata.lastUpdated = new Date().toISOString();

    // 统计唯一文档数
    const uniqueSources = new Set(
      this.documents.map((doc) => doc.metadata.source),
    );
    this.metadata.totalDocuments = uniqueSources.size;
  }

  getStatistics() {
    return {
      totalDocuments: this.metadata.totalDocuments,
      totalChunks: this.metadata.totalChunks,
      subjects: Array.from(this.metadata.subjects),
      grades: Array.from(this.metadata.grades),
      lastUpdated: this.metadata.lastUpdated,
      averageQualityScore: this.calculateAverageQuality(),
      subjectDistribution: this.getSubjectDistribution(),
      gradeDistribution: this.getGradeDistribution(),
    };
  }

  calculateAverageQuality() {
    if (this.documents.length === 0) return 0;
    const totalQuality = this.documents.reduce(
      (sum, doc) => sum + (doc.metadata.qualityScore || 0),
      0,
    );
    return (totalQuality / this.documents.length).toFixed(2);
  }

  getSubjectDistribution() {
    const distribution = {};
    this.documents.forEach((doc) => {
      const subject = doc.metadata.subject;
      distribution[subject] = (distribution[subject] || 0) + 1;
    });
    return distribution;
  }

  getGradeDistribution() {
    const distribution = {};
    this.documents.forEach((doc) => {
      const grade = doc.metadata.grade;
      distribution[grade] = (distribution[grade] || 0) + 1;
    });
    return distribution;
  }
}

module.exports = {
  DocumentChunk,
  SearchResult,
  DocumentCollection,
};
