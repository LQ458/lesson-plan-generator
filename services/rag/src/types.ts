export interface CurriculumFixture {
  id: string;
  subject: string;
  grade: string;
  topic: string;
  content: string;
  sourceType: "synthetic" | "open-license";
  synthetic: boolean;
  license: string;
}

export interface RetrievalQuery {
  subject: string;
  grade: string;
  topic: string;
  limit?: number;
}

export interface SourceMetadata {
  id: string;
  subject: string;
  grade: string;
  topic: string;
  sourceType: CurriculumFixture["sourceType"];
  synthetic: boolean;
  license: string;
  score: number;
}

export interface RetrievedChunk {
  content: string;
  source: SourceMetadata;
}

export type RetrievalMode = "fixture" | "external";

export interface RetrievalResult {
  mode: RetrievalMode;
  status: "ok" | "empty";
  chunks: RetrievedChunk[];
  sources: SourceMetadata[];
}
