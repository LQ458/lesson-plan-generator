import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
  LessonPlan,
  Exercise,
  ContentStats,
  FavoriteItem,
} from "../types";
import { getApiUrl, API_ENDPOINTS } from "@/lib/api-config";

// 通知函数
const showNotification = (
  message: string,
  type: "success" | "error" = "success",
) => {
  const notificationDiv = document.createElement("div");
  notificationDiv.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 text-white ${
    type === "success" ? "bg-green-500" : "bg-red-500"
  }`;
  notificationDiv.textContent = message;
  document.body.appendChild(notificationDiv);

  setTimeout(() => {
    if (document.body.contains(notificationDiv)) {
      document.body.removeChild(notificationDiv);
    }
  }, 3000);
};

export function useContent() {
  const router = useRouter();
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteLoading, setFavoriteLoading] = useState<{
    [key: string]: boolean;
  }>({});
  const [exporting, setExporting] = useState<{ [key: string]: boolean }>({});

  // 获取统计数据
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.CONTENT.STATS), {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      } else if (response.status === 401) {
        router.push("/login");
      } else {
        throw new Error("获取统计数据失败");
      }
    } catch (error) {
      console.error("获取统计数据失败:", error);
      showNotification("获取统计数据失败", "error");
    }
  }, [router]);

  // 获取教案列表
  const fetchLessonPlans = useCallback(
    async (
      currentPage: number = 1,
      pageSize: number = 10,
      sortBy: string = "createdAt",
      sortOrder: string = "desc",
    ) => {
      try {
        const response = await fetch(
          getApiUrl(`${API_ENDPOINTS.CONTENT.LESSON_PLANS}?page=${currentPage}&limit=${pageSize}&sortBy=${sortBy}&sortOrder=${sortOrder}`),
          {
            credentials: "include",
          },
        );

        if (response.ok) {
          const data = await response.json();
          // 去重：按 title+subject+grade
          const uniqueLessonPlans = [];
          const seen = new Set();
          for (const plan of data.data.lessonPlans) {
            const key = `${plan.title}-${plan.subject}-${plan.grade}`;
            if (!seen.has(key)) {
              seen.add(key);
              uniqueLessonPlans.push(plan);
            }
          }
          setLessonPlans(uniqueLessonPlans);
        } else if (response.status === 401) {
          router.push("/login");
        } else {
          throw new Error("获取教案失败");
        }
      } catch (error) {
        console.error("获取教案失败:", error);
        showNotification("获取教案失败", "error");
      }
    },
    [router],
  );

  // 获取练习题列表
  const fetchExercises = useCallback(
    async (
      currentPage: number = 1,
      pageSize: number = 10,
      sortBy: string = "createdAt",
      sortOrder: string = "desc",
    ) => {
      try {
        const response = await fetch(
          getApiUrl(`${API_ENDPOINTS.CONTENT.EXERCISES}?page=${currentPage}&limit=${pageSize}&sortBy=${sortBy}&sortOrder=${sortOrder}`),
          {
            credentials: "include",
          },
        );

        if (response.ok) {
          const data = await response.json();
          setExercises(data.data.exercises);
        } else if (response.status === 401) {
          router.push("/login");
        } else {
          throw new Error("获取练习题失败");
        }
      } catch (error) {
        console.error("获取练习题失败:", error);
        showNotification("获取练习题失败", "error");
      }
    },
    [router],
  );

  // 获取收藏列表
  const fetchFavorites = useCallback(async () => {
    try {
      const response = await fetch(
        getApiUrl(API_ENDPOINTS.CONTENT.FAVORITES),
        {
          credentials: "include",
        },
      );

      if (response.ok) {
        const data = await response.json();
        // 过滤掉无效的收藏数据
        const validFavorites = (data.data.favorites || []).filter(
          (favorite: FavoriteItem) => {
            if (!favorite || !favorite.contentType) {
              console.warn("跳过无效的收藏项:", favorite);
              return false;
            }

            if (!favorite.contentId) {
              console.warn("收藏项缺少contentId:", favorite);
              return false;
            }

            return true;
          },
        );

        if (process.env.NODE_ENV === "development") {
          console.log("🔍 收藏数据处理结果:", {
            原始数据: data.data.favorites?.length || 0,
            有效数据: validFavorites.length,
            有效数据样本: validFavorites.slice(0, 2),
          });
        }
        setFavorites(validFavorites);
      } else if (response.status === 401) {
        router.push("/login");
      } else {
        throw new Error("获取收藏失败");
      }
    } catch (error) {
      console.error("获取收藏失败:", error);
      showNotification("获取收藏失败", "error");
    }
  }, [router]);

  // 删除内容
  const deleteContent = useCallback(
    async (type: "lesson-plans" | "exercises", id: string) => {
      if (!confirm("确定要删除这个内容吗？")) return;

      try {
        const response = await fetch(
          getApiUrl(`/api/content/${type}/${id}`),
          {
            method: "DELETE",
            credentials: "include",
          },
        );

        if (response.ok) {
          showNotification("内容删除成功", "success");
          // 重新加载数据
          if (type === "lesson-plans") {
            fetchLessonPlans();
          } else {
            fetchExercises();
          }
          fetchStats();
          // 重新加载收藏列表，确保删除的内容不再显示在收藏中
          fetchFavorites();
        } else if (response.status === 401) {
          router.push("/login");
        } else {
          throw new Error("删除失败");
        }
      } catch (error) {
        console.error("删除失败:", error);
        showNotification("删除失败", "error");
      }
    },
    [router, fetchLessonPlans, fetchExercises, fetchStats, fetchFavorites],
  );

  // 导出内容
  const exportContent = useCallback(
    async (
      type: "lesson-plans" | "exercises",
      id: string,
      format: string = "mindmap",
      ext: string = "png",
    ) => {
      const key = `${type}_${id}_${format}`;
      setExporting((prev) => ({ ...prev, [key]: true }));

      try {
        const API_BASE_URL = getApiUrl();
        const response = await fetch(
          `${API_BASE_URL}/api/export/${type}/${id}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ format }),
          },
        );

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${type}_${id}_${Date.now()}.${ext}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          showNotification("导出成功", "success");
        } else if (response.status === 401) {
          router.push("/login");
        } else {
          throw new Error("导出失败");
        }
      } catch (error) {
        console.error("导出失败:", error);
        showNotification("导出失败", "error");
      } finally {
        setExporting((prev) => ({ ...prev, [key]: false }));
      }
    },
    [router],
  );

  // 添加/取消收藏
  const toggleFavorite = useCallback(
    async (
      contentType: "lessonPlan" | "exercise",
      contentId: string,
      isFavorited: boolean,
    ) => {
      if (
        !contentId ||
        contentId === "undefined" ||
        typeof contentId !== "string"
      ) {
        if (process.env.NODE_ENV === "development") {
          console.warn("ContentId is undefined or invalid:", {
            contentType,
            contentId,
            isFavorited,
          });
        }
        showNotification("操作失败：内容ID无效", "error");
        return;
      }

      const key = `${contentType}_${contentId}`;
      setFavoriteLoading((prev) => ({ ...prev, [key]: true }));

      try {
        if (isFavorited) {
          // 取消收藏
          const response = await fetch(
            getApiUrl(`${API_ENDPOINTS.CONTENT.FAVORITES}/${contentType}/${contentId}`),
            {
              method: "DELETE",
              credentials: "include",
            },
          );

          if (response.ok) {
            showNotification("取消收藏成功", "success");
            fetchFavorites();
            fetchStats();
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error("取消收藏失败:", errorData);
            throw new Error(errorData.message || "取消收藏失败");
          }
        } else {
          // 添加收藏
          const response = await fetch(
            getApiUrl(API_ENDPOINTS.CONTENT.FAVORITES),
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                contentType,
                contentId,
              }),
            },
          );

          if (response.ok) {
            showNotification("收藏成功", "success");
            fetchFavorites();
            fetchStats();
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error("添加收藏失败:", errorData);
            throw new Error(errorData.message || "收藏失败");
          }
        }
      } catch (error) {
        console.error("收藏操作失败:", error);
        showNotification(
          error instanceof Error ? error.message : "操作失败",
          "error",
        );
      } finally {
        setFavoriteLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [fetchFavorites, fetchStats],
  );

  // 检查是否已收藏
  const isFavorited = useCallback(
    (contentType: "lessonPlan" | "exercise", contentId: string) => {
      if (!contentId || contentId === "undefined") {
        return false;
      }

      const found = favorites.some((fav) => {
        if (!fav || !fav.contentType || !fav.contentId) {
          return false;
        }

        // 现在 contentId 直接是内容对象，不再是嵌套的 { _id: ... } 结构
        const favContentId = fav.contentId._id || fav.contentId.toString();
        const match =
          fav.contentType === contentType && favContentId === contentId;

        return match;
      });

      if (process.env.NODE_ENV === "development") {
        console.log("🔍 检查收藏状态:", {
          contentType,
          contentId,
          found,
          favoritesCount: favorites.length,
          sampleFavorite: favorites[0]
            ? {
                contentType: favorites[0].contentType,
                contentId:
                  favorites[0].contentId?._id || favorites[0].contentId,
              }
            : null,
        });
      }

      return found;
    },
    [favorites],
  );

  return {
    // 状态
    lessonPlans,
    exercises,
    stats,
    favorites,
    loading,
    favoriteLoading,
    exporting,

    // 方法
    setLoading,
    fetchStats,
    fetchLessonPlans,
    fetchExercises,
    fetchFavorites,
    deleteContent,
    exportContent,
    toggleFavorite,
    isFavorited,
  };
}
