// useExercises.ts
// 用于获取和管理练习题列表的自定义hook
import { useState, useEffect } from "react";

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

interface UseExercisesOptions {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: string;
  searchTerm: string;
  filterSubject: string;
  filterGrade: string;
}

export function useExercises(options: UseExercisesOptions) {
  /**
   * exercises: 练习题列表
   * loading: 是否加载中
   * error: 错误信息
   * refresh: 手动刷新函数
   */
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExercises = async () => {
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
        `http://localhost:3001/api/content/exercises?${params.toString()}`,
        {
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("获取练习题失败");
      const data = await response.json();
      setExercises(data.data.exercises);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "未知错误");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
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

  return { exercises, loading, error, refresh: fetchExercises };
}
