"use client";

import React, { useState, useEffect } from "react";
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

  // 预览内容
  const previewContent = (content: LessonPlan | Exercise) => {
    setSelectedContent(content);
    setPreviewDialogOpen(true);
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
    if (selectedId) {
      setDetailLesson(null);
      fetch(`http://localhost:3001/api/content/lesson-plans/${selectedId}`, {
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
            _id: finalLesson._id || selectedId,
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
    }
  }, [selectedId]);

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
    const content = favorite.contentId;
    const isLessonPlan = favorite.contentType === "lessonPlan";

    if (isLessonPlan) {
      router.push(`/my-content/${content._id}`);
    } else {
      const exercisePreview: Exercise = {
        _id: content._id,
        title: content.title || "未知标题",
        subject: content.subject || "未知科目",
        grade: content.grade || "未知年级",
        topic: content.topic || "未知主题",
        difficulty: content.difficulty || "中等",
        content: content.content || "",
        createdAt: content.createdAt || new Date().toISOString(),
        updatedAt: content.updatedAt || new Date().toISOString(),
        stats: {
          viewCount: 0,
          exportCount: 0,
          shareCount: 0,
          useCount: 0,
        },
        tags: [],
      };
      previewContent(exercisePreview);
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
  if (selectedId) {
    return (
      <div className="container mx-auto px-4 py-8">
        {detailLesson ? (
          <div className="mt-8">
            <LessonPlanGenerator
              lessonData={{
                ...detailLesson,
                _id: detailLesson._id || selectedId,
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((favorite) => {
              const favoriteKey = favorite?._id || `favorite-${Math.random()}`;
              if (!favorite || !favorite.contentId) {
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
                      `${favorite.contentType === "lessonPlan" ? "lessonPlan" : "exercise"}_${favorite.contentId._id}`
                    ]
                  }
                />
              );
            })}
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
