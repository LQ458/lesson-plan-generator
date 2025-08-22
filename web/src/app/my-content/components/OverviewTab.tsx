import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LessonPlan, Exercise, ContentStats } from "../types";

interface OverviewTabProps {
  stats: ContentStats | null;
  lessonPlans: LessonPlan[];
  exercises: Exercise[];
  onTabChange: (tab: string) => void;
  onPreviewContent: (content: LessonPlan | Exercise) => void;
  isFavorited: (
    contentType: "lessonPlan" | "exercise",
    contentId: string,
  ) => boolean;
  onToggleFavorite: (
    contentType: "lessonPlan" | "exercise",
    contentId: string,
    isFavorited: boolean,
  ) => void;
  onExportContent: (
    type: "lesson-plans" | "exercises",
    id: string,
    format: string,
    ext: string,
  ) => void;
  onDeleteContent: (type: "lesson-plans" | "exercises", id: string) => void;
  favoriteLoading: { [key: string]: boolean };
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const EyeIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const DownloadIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const TrashIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const StarIcon = ({ filled = false }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export default function OverviewTab({
  stats,
  lessonPlans,
  exercises,
  onTabChange,
  onPreviewContent,
  isFavorited,
  onToggleFavorite,
  onExportContent,
  onDeleteContent,
  favoriteLoading,
}: OverviewTabProps) {
  const router = useRouter();

  return (
    <>
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">教案总数</CardTitle>
              <span className="text-2xl">📚</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.lessonPlans.total}
              </div>
              <p className="text-xs text-muted-foreground">
                总浏览量 {stats.lessonPlans.totalViews}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">练习题总数</CardTitle>
              <span className="text-2xl">📝</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.exercises.total}</div>
              <p className="text-xs text-muted-foreground">
                总使用量 {stats.exercises.totalUses}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总导出量</CardTitle>
              <span className="text-2xl">📤</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.lessonPlans.totalExports + stats.exercises.totalExports}
              </div>
              <p className="text-xs text-muted-foreground">
                教案 {stats.lessonPlans.totalExports} · 练习题{" "}
                {stats.exercises.totalExports}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">收藏总数</CardTitle>
              <span className="text-2xl">⭐</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.favorites}</div>
              <p className="text-xs text-muted-foreground">已收藏内容</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">最近的教案</CardTitle>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onTabChange("lesson-plans")}
              className="text-blue-600 hover:text-blue-700 border-0 bg-transparent group"
            >
              <span className="flex items-center gap-1">
                管理全部
                <span className="transition-transform duration-200 group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {lessonPlans.slice(0, 3).map((plan) => {
                if (!plan._id) {
                  console.warn("Plan missing _id:", plan);
                }
                return (
                  <div
                    key={plan._id || Math.random()}
                    className="group flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => router.push(`/my-content/${plan._id}`)}
                    >
                      <h4 className="font-medium text-sm">{plan.title}</h4>
                      <p className="text-xs text-gray-500">
                        {plan.subject} · {plan.grade}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(plan.createdAt)}
                      </p>
                    </div>
                    <div
                      className={`flex items-center gap-2 transition-opacity ${
                        isFavorited("lessonPlan", plan._id)
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 w-10 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreviewContent(plan);
                        }}
                        title="预览"
                      >
                        <EyeIcon />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`h-10 w-10 p-0 ${
                          isFavorited("lessonPlan", plan._id)
                            ? "text-yellow-500 hover:text-yellow-600 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20"
                            : "text-gray-400 hover:text-yellow-500"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(
                            "lessonPlan",
                            plan._id,
                            isFavorited("lessonPlan", plan._id),
                          );
                        }}
                        disabled={favoriteLoading[`lessonPlan_${plan._id}`]}
                        title={
                          isFavorited("lessonPlan", plan._id)
                            ? "取消收藏"
                            : "收藏"
                        }
                      >
                        {favoriteLoading[`lessonPlan_${plan._id}`] ? (
                          <div className="animate-spin w-4 h-4 border border-current border-t-transparent rounded-full"></div>
                        ) : (
                          <StarIcon
                            filled={isFavorited("lessonPlan", plan._id)}
                          />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 w-10 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExportContent(
                            "lesson-plans",
                            plan._id,
                            "pdf",
                            "pdf",
                          );
                        }}
                        title="导出PDF"
                      >
                        <DownloadIcon />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 w-10 p-0 text-red-500 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteContent("lesson-plans", plan._id);
                        }}
                        title="删除"
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {lessonPlans.length === 0 && (
                <div className="text-center text-gray-500 py-4">暂无教案</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">最近的练习题</CardTitle>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onTabChange("exercises")}
              className="text-blue-600 hover:text-blue-700 border-0 bg-transparent group"
            >
              <span className="flex items-center gap-1">
                管理全部
                <span className="transition-transform duration-200 group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {exercises.slice(0, 3).map((exercise) => {
                if (!exercise._id) {
                  console.warn("Exercise missing _id:", exercise);
                }
                return (
                  <div
                    key={exercise._id || Math.random()}
                    className="group flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() =>
                        router.push(`/my-content/exercise/${exercise._id}`)
                      }
                    >
                      <h4 className="font-medium text-sm">{exercise.title}</h4>
                      <p className="text-xs text-gray-500">
                        {exercise.subject} · {exercise.grade}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(exercise.createdAt)}
                      </p>
                    </div>
                    <div
                      className={`flex items-center gap-2 transition-opacity ${
                        isFavorited("exercise", exercise._id)
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 w-10 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreviewContent(exercise);
                        }}
                        title="预览"
                      >
                        <EyeIcon />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`h-10 w-10 p-0 ${
                          isFavorited("exercise", exercise._id)
                            ? "text-yellow-500 hover:text-yellow-600 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20"
                            : "text-gray-400 hover:text-yellow-500"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(
                            "exercise",
                            exercise._id,
                            isFavorited("exercise", exercise._id),
                          );
                        }}
                        disabled={favoriteLoading[`exercise_${exercise._id}`]}
                        title={
                          isFavorited("exercise", exercise._id)
                            ? "取消收藏"
                            : "收藏"
                        }
                      >
                        {favoriteLoading[`exercise_${exercise._id}`] ? (
                          <div className="animate-spin w-4 h-4 border border-current border-t-transparent rounded-full"></div>
                        ) : (
                          <StarIcon
                            filled={isFavorited("exercise", exercise._id)}
                          />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 w-10 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExportContent(
                            "exercises",
                            exercise._id,
                            "pdf",
                            "pdf",
                          );
                        }}
                        title="导出PDF"
                      >
                        <DownloadIcon />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 w-10 p-0 text-red-500 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteContent("exercises", exercise._id);
                        }}
                        title="删除"
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {exercises.length === 0 && (
                <div className="text-center text-gray-500 py-4">暂无练习题</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
