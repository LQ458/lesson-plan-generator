// useContentStats.ts
// 用于获取内容统计信息的自定义hook
import { useState, useEffect } from "react";
import { getApiUrl, API_ENDPOINTS } from "@/lib/api-config";

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

export function useContentStats() {
  /**
   * stats: 内容统计信息
   * loading: 是否加载中
   * error: 错误信息
   * refresh: 手动刷新函数
   */
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.CONTENT.STATS), {
        credentials: "include",
      });
      if (!response.ok) throw new Error("获取统计数据失败");
      const data = await response.json();
      setStats(data.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "未知错误");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, error, refresh: fetchStats };
}
