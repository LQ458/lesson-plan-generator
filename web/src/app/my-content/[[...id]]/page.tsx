"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import StreamingMarkdown from "@/components/streaming-markdown";
import LessonPlanGenerator from "@/components/lesson-plan-generator";
import ContentLayout from "../components/ContentLayout";
import OverviewTab from "../components/OverviewTab";
import ContentCard from "../components/ContentCard";
import FavoriteCard from "../components/FavoriteCard";
import { useContent } from "../hooks/useContent";
import type { LessonPlan, Exercise } from "../types";

export default function MyContentPage() {
  const router = useRouter();
  const params = useParams();
  const selectedId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  // 解析路径类型和ID
  const pathInfo = useMemo(() => {
    if (!params?.id) return { type: 'list', id: null };
    
    const pathArray = Array.isArray(params.id) ? params.id : [params.id];
    
    if (pathArray.length === 2 && pathArray[0] === 'exercise') {
      return { type: 'exercise', id: pathArray[1] };
    } else if (pathArray.length === 1) {
      return { type: 'lesson', id: pathArray[0] };
    }
    
    return { type: 'list', id: null };
  }, [params?.id]);

  // 使用自定义hook
  const {
    lessonPlans,
    exercises,
    stats,
    favorites,
    loading,
    favoriteLoading,
    exporting,
    setLoading,
    fetchStats,
    fetchLessonPlans,
    fetchExercises,
    fetchFavorites,
    deleteContent,
    exportContent,
    toggleFavorite,
    isFavorited,
  } = useContent();

  // 本地状态
  const [selectedTab, setSelectedTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [selectedContent, setSelectedContent] = useState<
    LessonPlan | Exercise | null
  >(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [detailLesson, setDetailLesson] = useState<LessonPlan | null>(null);
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);
  const [exportLoading, setExportLoading] = useState<{
    [key: string]: boolean;
  }>({});

  // 预览内容
  const previewContent = (content: LessonPlan | Exercise) => {
    setSelectedContent(content);
    setPreviewDialogOpen(true);
  };

  // 练习题导出功能
  const exportExercise = async (format: string, ext: string) => {
    if (!pathInfo.id) {
      alert("无法导出：练习题ID缺失");
      return;
    }

    setExportLoading((prev) => ({ ...prev, [format]: true }));

    try {
      const API_BASE_URL = "http://localhost:3001";
      const exportUrl = `${API_BASE_URL}/api/export/exercises/${pathInfo.id}`;

      const response = await fetch(exportUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ format }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `exercise_${pathInfo.id}_${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // 简单的成功提示
        const successDiv = document.createElement("div");
        successDiv.className = "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
        successDiv.textContent = "✅ 导出成功";
        document.body.appendChild(successDiv);
        setTimeout(() => {
          document.body.removeChild(successDiv);
        }, 3000);
      } else {
        throw new Error(`导出失败: ${response.status}`);
      }
    } catch (error) {
      console.error("导出失败:", error);
      const errorDiv = document.createElement("div");
      errorDiv.className = "fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
      errorDiv.textContent = `❌ 导出失败: ${error instanceof Error ? error.message : "网络错误"}`;
      document.body.appendChild(errorDiv);
      setTimeout(() => {
        document.body.removeChild(errorDiv);
      }, 3000);
    } finally {
      setExportLoading((prev) => ({ ...prev, [format]: false }));
    }
  };

  // 加载初始数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchLessonPlans(),
        fetchExercises(),
        fetchFavorites(),
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  // 响应筛选条件变化
  useEffect(() => {
    const loadFilteredData = async () => {
      await Promise.all([fetchLessonPlans(), fetchExercises()]);
    };
    loadFilteredData();
  }, [searchTerm, filterSubject, sortBy]);

  // 获取详细教案数据
  useEffect(() => {
    if (pathInfo.type === 'lesson' && pathInfo.id) {
      setDetailLesson(null);
      setDetailExercise(null);
      fetch(`http://localhost:3001/api/content/lesson-plans/${pathInfo.id}`, {
        credentials: "include",
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then((data) => {
          const lesson = data.data || data;
          const finalLesson = lesson.lessonPlan || lesson;
          const content =
            finalLesson.content ||
            finalLesson.rawContent ||
            finalLesson.markdown ||
            finalLesson.textContent ||
            finalLesson.planContent ||
            finalLesson.body ||
            "";

          const enrichedLesson = {
            ...finalLesson,
            _id: finalLesson._id || pathInfo.id,
            content,
            textContent: content,
            title: finalLesson.title || finalLesson.name || "",
            subject: finalLesson.subject || "",
            grade: finalLesson.grade || "",
            duration: finalLesson.duration ?? 45,
            detailedObjectives:
              finalLesson.structuredData?.detailedObjectives ||
              finalLesson.detailedObjectives ||
              [],
            keyPoints:
              finalLesson.structuredData?.keyPoints ||
              finalLesson.keyPoints ||
              [],
            difficulties:
              finalLesson.structuredData?.difficulties ||
              finalLesson.difficulties ||
              [],
            teachingMethods:
              finalLesson.structuredData?.teachingMethods ||
              finalLesson.teachingMethods ||
              [],
            teachingProcess:
              finalLesson.structuredData?.teachingProcess ||
              finalLesson.teachingProcess ||
              [],
          };
          setDetailLesson(enrichedLesson);
        })
        .catch((err) => {
          console.error("获取教案失败:", err);
          setDetailLesson(null);
        });
    } else if (pathInfo.type === 'exercise' && pathInfo.id) {
      setDetailLesson(null);
      setDetailExercise(null);
      fetch(`http://localhost:3001/api/content/exercises/${pathInfo.id}`, {
        credentials: "include",
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then((data) => {
          const exerciseData = data.data || data;
          const finalExercise = exerciseData.exercise || exerciseData;
          
          const enrichedExercise = {
            ...finalExercise,
            _id: finalExercise._id || pathInfo.id,
            title: finalExercise.title || "未知练习题",
            subject: finalExercise.subject || "未知科目",
            grade: finalExercise.grade || "未知年级",
            topic: finalExercise.topic || "未知主题",
            difficulty: finalExercise.difficulty || "中等",
            content: finalExercise.content || finalExercise.textContent || finalExercise.body || "暂无内容",
            createdAt: finalExercise.createdAt || new Date().toISOString(),
            updatedAt: finalExercise.updatedAt || new Date().toISOString(),
            stats: finalExercise.stats || {
              viewCount: 0,
              exportCount: 0,
              shareCount: 0,
              useCount: 0,
            },
            tags: finalExercise.tags || [],
          };
          setDetailExercise(enrichedExercise);
        })
        .catch((err) => {
          console.error("获取练习题失败:", err);
          setDetailExercise(null);
        });
    }
  }, [pathInfo]);

  // 处理事件的包装函数
  const handlePreview =
    (content: LessonPlan | Exercise) => (e: React.MouseEvent) => {
      e.stopPropagation();
      previewContent(content);
    };

  const handleToggleFavorite =
    (contentType: "lessonPlan" | "exercise", contentId: string) =>
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleFavorite(
        contentType,
        contentId,
        isFavorited(contentType, contentId),
      );
    };

  const handleExport =
    (type: "lesson-plans" | "exercises", id: string) =>
    (e: React.MouseEvent, format: string, ext: string) => {
      e.stopPropagation();
      exportContent(type, id, format, ext);
    };

  const handleDelete =
    (type: "lesson-plans" | "exercises", id: string) =>
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteContent(type, id);
    };

  const handleFavoriteView = (favorite: any) => (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 数据完整性检查
    if (!favorite || !favorite.contentId || !favorite.contentId._id) {
      console.error("收藏内容数据不完整:", favorite);
      // 显示错误提示
      const errorDiv = document.createElement("div");
      errorDiv.className = "fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
      errorDiv.textContent = "❌ 内容已被删除或不存在";
      document.body.appendChild(errorDiv);
      setTimeout(() => {
        if (document.body.contains(errorDiv)) {
          document.body.removeChild(errorDiv);
        }
      }, 3000);
      
      // 重新加载收藏列表，清理无效数据
      fetchFavorites();
      return;
    }
    
    const content = favorite.contentId;
    const isLessonPlan = favorite.contentType === "lessonPlan";

    if (isLessonPlan) {
      router.push(`/my-content/${content._id}`);
    } else {
      // 导航到练习题详情页面
      router.push(`/my-content/exercise/${content._id}`);
    }
  };

  const handleFavoriteUnfavorite = (favorite: any) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const content = favorite.contentId;
    const isLessonPlan = favorite.contentType === "lessonPlan";
    toggleFavorite(isLessonPlan ? "lessonPlan" : "exercise", content._id, true);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // 如果有selectedId，显示详细教案
  if (pathInfo.type === 'lesson' && pathInfo.id) {
    return (
      <div className="container mx-auto px-4 py-8">
        {detailLesson ? (
          <div className="mt-8">
            <LessonPlanGenerator
              lessonData={{
                ...detailLesson,
                _id: detailLesson._id || pathInfo.id,
                duration: (detailLesson as LessonPlan).duration ?? 45,
              }}
              isStreaming={false}
              showSaveButton={false}
            />
            <Button
              onClick={() => router.push("/my-content")}
              className="mt-4"
              variant="secondary"
            >
              返回列表
            </Button>
          </div>
        ) : (
          <div className="mt-8 text-center text-gray-500">加载中...</div>
        )}
      </div>
    );
  }

  // 如果有练习题ID，显示练习题详情页面
  if (pathInfo.type === 'exercise' && pathInfo.id) {
    return (
      <div className="container mx-auto px-4 py-8">
        {detailExercise ? (
          <div className="max-w-4xl mx-auto">
            {/* 头部信息 */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <Button
                  variant="outline"
                  onClick={() => router.push("/my-content")}
                >
                  ← 返回
                </Button>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {detailExercise.title || "未知练习题"}
                  </h1>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>📝 {detailExercise.subject || "未知科目"}</span>
                    <span>🎓 {detailExercise.grade || "未知年级"}</span>
                    <span>📊 {detailExercise.difficulty || "未知难度"}</span>
                    <span>📅 {detailExercise.createdAt ? new Date(detailExercise.createdAt).toLocaleDateString("zh-CN") : "未知时间"}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => exportExercise("pdf", "pdf")}
                    disabled={exportLoading["pdf"]}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {exportLoading["pdf"] ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        导出中...
                      </>
                    ) : (
                      "📄 PDF"
                    )}
                  </Button>
                  <Button
                    onClick={() => exportExercise("word", "docx")}
                    disabled={exportLoading["word"]}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {exportLoading["word"] ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        导出中...
                      </>
                    ) : (
                      "📝 Word"
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* 练习题内容 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div 
                className="text-white p-6"
                style={{
                  background: 'linear-gradient(to right, #16a34a, #15803d)',
                  color: '#ffffff'
                }}
              >
                <h2 className="text-xl font-bold text-white">📝 练习题内容</h2>
                <p className="text-sm mt-1 text-white opacity-90">
                  {detailExercise.subject || "未知科目"} · {detailExercise.grade || "未知年级"} · {detailExercise.difficulty || "未知难度"}
                </p>
              </div>
              <div className="p-8">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <StreamingMarkdown
                    content={detailExercise.content || "暂无内容"}
                    isStreaming={false}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 text-center text-gray-500">加载中...</div>
        )}
      </div>
    );
  }

  // 主要内容页面
  return (
    <ContentLayout
      selectedTab={selectedTab}
      onTabChange={setSelectedTab}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      filterSubject={filterSubject}
      onFilterSubjectChange={setFilterSubject}
      sortBy={sortBy}
      onSortByChange={setSortBy}
    >
      <TabsContent value="overview" className="space-y-6">
        <OverviewTab
          stats={stats}
          lessonPlans={lessonPlans}
          exercises={exercises}
          onTabChange={setSelectedTab}
          onPreviewContent={previewContent}
          isFavorited={isFavorited}
          onToggleFavorite={(contentType, contentId, isFav) =>
            toggleFavorite(contentType, contentId, isFav)
          }
          onExportContent={exportContent}
          onDeleteContent={deleteContent}
          favoriteLoading={favoriteLoading}
        />
      </TabsContent>

      <TabsContent value="lesson-plans" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lessonPlans.map((plan) => (
            <ContentCard
              key={plan._id}
              id={plan._id}
              title={plan.title}
              subject={plan.subject}
              grade={plan.grade}
              topic={plan.topic}
              createdAt={plan.createdAt}
              stats={plan.stats}
              type="lessonPlan"
              isFavorited={isFavorited("lessonPlan", plan._id)}
              onPreview={handlePreview(plan)}
              onToggleFavorite={handleToggleFavorite("lessonPlan", plan._id)}
              onExport={handleExport("lesson-plans", plan._id)}
              onDelete={handleDelete("lesson-plans", plan._id)}
              favoriteLoading={favoriteLoading[`lessonPlan_${plan._id}`]}
              exportLoading={exporting}
            />
          ))}
        </div>
      </TabsContent>

      <TabsContent value="exercises" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exercises.map((exercise) => (
            <ContentCard
              key={exercise._id}
              id={exercise._id}
              title={exercise.title}
              subject={exercise.subject}
              grade={exercise.grade}
              topic={exercise.topic}
              difficulty={exercise.difficulty}
              createdAt={exercise.createdAt}
              stats={exercise.stats}
              type="exercise"
              isFavorited={isFavorited("exercise", exercise._id)}
              onPreview={handlePreview(exercise)}
              onToggleFavorite={handleToggleFavorite("exercise", exercise._id)}
              onExport={handleExport("exercises", exercise._id)}
              onDelete={handleDelete("exercises", exercise._id)}
              favoriteLoading={favoriteLoading[`exercise_${exercise._id}`]}
              exportLoading={exporting}
            />
          ))}
        </div>
      </TabsContent>

      <TabsContent value="favorites" className="space-y-6">
        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⭐</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              暂无收藏内容
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              收藏您喜欢的教案和练习题，方便以后查看
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 收藏的教案 */}
            {(() => {
              const lessonPlanFavorites = favorites.filter(
                (favorite) => favorite && favorite.contentType === "lessonPlan" && favorite.contentId
              );
              return lessonPlanFavorites.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    📚 收藏的教案 ({lessonPlanFavorites.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lessonPlanFavorites.map((favorite) => {
                      const favoriteKey = favorite?._id || `favorite-${Math.random()}`;
                      // 双重检查，确保数据完整性
                      if (!favorite || !favorite.contentId || !favorite.contentId._id) {
                        console.warn("收藏的教案数据不完整，跳过渲染:", favorite);
                        return null;
                      }

                      return (
                        <FavoriteCard
                          key={favoriteKey}
                          favorite={favorite}
                          onView={handleFavoriteView(favorite)}
                          onUnfavorite={handleFavoriteUnfavorite(favorite)}
                          unfavoriteLoading={
                            favoriteLoading[
                              `lessonPlan_${favorite.contentId._id}`
                            ]
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null;
            })()}

            {/* 收藏的练习题 */}
            {(() => {
              const exerciseFavorites = favorites.filter(
                (favorite) => favorite && favorite.contentType === "exercise" && favorite.contentId
              );
              return exerciseFavorites.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    📝 收藏的练习题 ({exerciseFavorites.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {exerciseFavorites.map((favorite) => {
                      const favoriteKey = favorite?._id || `favorite-${Math.random()}`;
                      // 双重检查，确保数据完整性
                      if (!favorite || !favorite.contentId || !favorite.contentId._id) {
                        console.warn("收藏的练习题数据不完整，跳过渲染:", favorite);
                        return null;
                      }

                      return (
                        <FavoriteCard
                          key={favoriteKey}
                          favorite={favorite}
                          onView={handleFavoriteView(favorite)}
                          onUnfavorite={handleFavoriteUnfavorite(favorite)}
                          unfavoriteLoading={
                            favoriteLoading[
                              `exercise_${favorite.contentId._id}`
                            ]
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        )}
      </TabsContent>

      {/* 预览对话框 */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedContent?.title}</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <StreamingMarkdown
              content={selectedContent?.content || "暂无内容"}
              isStreaming={false}
            />
          </div>
        </DialogContent>
      </Dialog>
    </ContentLayout>
  );
}
