export interface LessonPlan {
  _id: string;
  title: string;
  subject: string;
  grade: string;
  topic: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  stats: {
    viewCount: number;
    exportCount: number;
    shareCount: number;
  };
  tags: string[];
  status: string;
  duration?: number;
}

export interface Exercise {
  _id: string;
  title: string;
  subject: string;
  grade: string;
  topic: string;
  difficulty: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  stats: {
    viewCount: number;
    exportCount: number;
    shareCount: number;
    useCount: number;
  };
  tags: string[];
  relatedLessonPlan?: {
    _id: string;
    title: string;
    topic: string;
  };
}

export interface ContentStats {
  lessonPlans: {
    total: number;
    totalViews: number;
    totalExports: number;
    subjects: string[];
    grades: string[];
  };
  exercises: {
    total: number;
    totalViews: number;
    totalExports: number;
    totalUses: number;
    byDifficulty: Array<{ difficulty: string; count: number }>;
  };
  favorites: number;
}

export interface FavoriteItem {
  _id: string;
  contentType: "lessonPlan" | "exercise";
  contentId: {
    _id: string;
    title: string;
    subject: string;
    grade: string;
    topic: string;
    difficulty?: string;
    content?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  createdAt: string;
  notes?: string;
}
