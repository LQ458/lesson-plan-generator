// useLessonPlans.ts
// 用于获取和管理教案列表的自定义hook
import { useState, useEffect } from "react";

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
}

interface UseLessonPlansOptions {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: string;
  searchTerm: string;
  filterSubject: string;
  filterGrade: string;
}

export function useLessonPlans(options: UseLessonPlansOptions) {
  /**
   * lessonPlans: 教案列表
   * loading: 是否加载中
   * error: 错误信息
   * refresh: 手动刷新函数
   */
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLessonPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        page,
        pageSize,
        sortBy,
        sortOrder,
        searchTerm,
        filterSubject,
        filterGrade,
      } = options;
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        sortBy,
        sortOrder,
      });
      if (searchTerm) params.append("search", searchTerm);
      if (filterSubject && filterSubject !== "all")
        params.append("subject", filterSubject);
      if (filterGrade && filterGrade !== "all")
        params.append("grade", filterGrade);
      const response = await fetch(
        `http://localhost:3001/api/content/lesson-plans?${params.toString()}`,
        {
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("获取教案失败");
      const data = await response.json();
      // 去重
      const uniqueLessonPlans: LessonPlan[] = [];
      const seen = new Set();
      for (const plan of data.data.lessonPlans) {
        const key = `${plan.title}-${plan.subject}-${plan.grade}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueLessonPlans.push(plan);
        }
      }
      setLessonPlans(uniqueLessonPlans);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "未知错误");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessonPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    options.page,
    options.pageSize,
    options.sortBy,
    options.sortOrder,
    options.searchTerm,
    options.filterSubject,
    options.filterGrade,
  ]);

  return { lessonPlans, loading, error, refresh: fetchLessonPlans };
}
