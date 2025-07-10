"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import StreamingMarkdown from "@/components/streaming-markdown";
import LessonPlanGenerator from "@/components/lesson-plan-generator";

// 简单的通知函数
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

interface LessonPlan {
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

interface Exercise {
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

interface ContentStats {
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

// 1. 在文件顶部引入SVG组件
const EyeIcon = () => (
  <svg width="2em" height="2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
);
const DownloadIcon = () => (
  <svg width="2em" height="2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);
const TrashIcon = () => (
  <svg width="2em" height="2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
);

export default function MyContentPage() {
  const router = useRouter();
  const params = useParams();
  const selectedId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  console.log(selectedId);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedContent, setSelectedContent] = useState<
    LessonPlan | Exercise | null
  >(null);
  const [previewLessonPlan, setPreviewLessonPlan] = useState<LessonPlan | null>(
    null,
  );
  // 定义导出格式
  const exportFormats = [
    { label: "思维导图", icon: "🧠", format: "mindmap", ext: "png" },
    { label: "PDF", icon: "📄", format: "pdf", ext: "pdf" },
    { label: "时间线", icon: "⏰", format: "timeline", ext: "png" },
  ];
  // 导出内容（支持多按钮 loading）
  const [exporting, setExporting] = useState<{ [key: string]: boolean }>({});
  const [detailLesson, setDetailLesson] = useState<LessonPlan | null>(null);

  // 获取用户内容统计
  const fetchStats = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/content/stats", {
        credentials: "include", // 使用cookie认证
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
  };

  // 获取教案列表
  const fetchLessonPlans = async () => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/content/lesson-plans?page=${currentPage}&limit=${pageSize}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
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
  };

  // 获取练习题列表
  const fetchExercises = async () => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/content/exercises?page=${currentPage}&limit=${pageSize}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
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
  };

  // 删除内容
  const deleteContent = async (
    type: "lesson-plans" | "exercises",
    id: string,
  ) => {
    if (!confirm("确定要删除这个内容吗？")) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/content/${type}/${id}`,
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
      } else if (response.status === 401) {
        router.push("/login");
      } else {
        throw new Error("删除失败");
      }
    } catch (error) {
      console.error("删除失败:", error);
      showNotification("删除失败", "error");
    }
  };

  // 导出内容（支持多按钮 loading）
  const exportContent = async (
    type: "lesson-plans" | "exercises",
    id: string,
    format: string = "mindmap",
    ext: string = "png",
  ) => {
    const key = `${type}_${id}_${format}`;
    setExporting((prev) => ({ ...prev, [key]: true }));
    try {
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${API_BASE_URL}/api/export/${type}/${id}`, {
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
  };

  // 预览内容
  const previewContent = (content: LessonPlan | Exercise) => {
    setSelectedContent(content);
    // setPreviewDialogOpen(true); // 移除 Dialog 预览
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 获取难度颜色
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "简单":
      case "easy":
        return "bg-green-100 text-green-800";
      case "中等":
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "困难":
      case "hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchLessonPlans(), fetchExercises()]);
      setLoading(false);
    };

    loadData();
  }, [currentPage, searchTerm, filterSubject, filterGrade, sortBy, sortOrder]);

  useEffect(() => {
    if (selectedId) {
      setDetailLesson(null);
      fetch(`http://localhost:3001/api/content/lesson-plans/${selectedId}`, {
        credentials: "include",
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then((data) => {
          console.log("🔍 [Debug] 原始后端数据:", data);
          let lesson = data.data || data;
          if (lesson.lessonPlan) lesson = lesson.lessonPlan;
          console.log("🔍 [Debug] 解析后的 lesson:", lesson);
          // 修复提取content的逻辑，兼容多种字段
          let content =
            lesson.content ||
            lesson.rawContent ||
            lesson.markdown ||
            lesson.textContent ||
            lesson.planContent ||
            lesson.body ||
            "";
          console.log("🔍 [Debug] 提取的 content:", content);
          const finalLesson = {
            ...lesson,
            _id: lesson._id || selectedId, // 确保_id字段存在
            content,
            textContent: content,
            title: lesson.title || lesson.name || "",
            subject: lesson.subject || "",
            grade: lesson.grade || "",
            duration: lesson.duration ?? 45,
            // 确保包含结构化数据，优先使用保存的数据，如果没有则使用空数组
            detailedObjectives:
              lesson.structuredData?.detailedObjectives ||
              lesson.detailedObjectives ||
              [],
            keyPoints:
              lesson.structuredData?.keyPoints || lesson.keyPoints || [],
            difficulties:
              lesson.structuredData?.difficulties || lesson.difficulties || [],
            teachingMethods:
              lesson.structuredData?.teachingMethods ||
              lesson.teachingMethods ||
              [],
            teachingProcess:
              lesson.structuredData?.teachingProcess ||
              lesson.teachingProcess ||
              [],
          };
          console.log("🔍 [Debug] 最终传给组件的 detailLesson:", finalLesson);
          console.log("🔍 [Debug] 结构化数据检查:", {
            hasStructuredData: !!lesson.structuredData,
            detailedObjectives: finalLesson.detailedObjectives?.length || 0,
            keyPoints: finalLesson.keyPoints?.length || 0,
            difficulties: finalLesson.difficulties?.length || 0,
            teachingMethods: finalLesson.teachingMethods?.length || 0,
            teachingProcess: finalLesson.teachingProcess?.length || 0,
          });
          setDetailLesson(finalLesson);
        })
        .catch((err) => {
          console.error("❌ [Debug] 获取教案失败:", err);
          setDetailLesson(null);
        });
    }
  }, [selectedId]);

  // 预览对话框
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  useEffect(() => {
    if (selectedContent) setPreviewDialogOpen(true);
  }, [selectedContent]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          我的内容
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          管理您保存的教案和练习题
        </p>
      </div>

      {selectedId ? (
        detailLesson ? (
          <div className="mt-8">
            <LessonPlanGenerator
              lessonData={{
                ...detailLesson,
                _id: detailLesson._id || selectedId, // 明确确保_id字段存在
                duration: (detailLesson as any).duration ?? 45,
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
        )
      ) : (
        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="lesson-plans">教案</TabsTrigger>
            <TabsTrigger value="exercises">练习题</TabsTrigger>
            <TabsTrigger value="favorites">收藏</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      教案总数
                    </CardTitle>
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
                    <CardTitle className="text-sm font-medium">
                      练习题总数
                    </CardTitle>
                    <span className="text-2xl">📝</span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.exercises.total}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      总使用量 {stats.exercises.totalUses}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      总导出量
                    </CardTitle>
                    <span className="text-2xl">📤</span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.lessonPlans.totalExports +
                        stats.exercises.totalExports}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      教案 {stats.lessonPlans.totalExports} · 练习题{" "}
                      {stats.exercises.totalExports}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      收藏总数
                    </CardTitle>
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
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>最近的教案</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTab("lesson-plans")}
                    className="text-xs"
                  >
                    管理全部
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lessonPlans.slice(0, 3).map((plan) => (
                      <div
                        key={plan._id}
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
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-12 w-12 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              previewContent(plan);
                            }}
                            title="预览"
                          >
                            <EyeIcon />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-12 w-12 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              exportContent(
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
                            className="h-12 w-12 p-0 text-red-500 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteContent("lesson-plans", plan._id);
                            }}
                            title="删除"
                          >
                            <TrashIcon />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {lessonPlans.length === 0 && (
                      <div className="text-center text-gray-500 py-4">
                        暂无教案
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>最近的练习题</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {exercises.slice(0, 3).map((exercise) => (
                      <div
                        key={exercise._id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => previewContent(exercise)}
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">
                            {exercise.title}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {exercise.subject} · {exercise.grade}
                          </p>
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDate(exercise.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="lesson-plans" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Input
                placeholder="搜索教案..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <SelectTrigger
                value={filterSubject}
                onValueChange={setFilterSubject}
                className="w-32"
              >
                <SelectValue placeholder="科目" />
                <SelectContent>
                  <SelectItem value="all">全部科目</SelectItem>
                  <SelectItem value="语文">语文</SelectItem>
                  <SelectItem value="数学">数学</SelectItem>
                  <SelectItem value="英语">英语</SelectItem>
                  <SelectItem value="物理">物理</SelectItem>
                  <SelectItem value="化学">化学</SelectItem>
                  <SelectItem value="生物">生物</SelectItem>
                </SelectContent>
              </SelectTrigger>
              <SelectTrigger
                value={sortBy}
                onValueChange={setSortBy}
                className="w-32"
              >
                <SelectValue placeholder="排序" />
                <SelectContent>
                  <SelectItem value="createdAt">创建时间</SelectItem>
                  <SelectItem value="updatedAt">更新时间</SelectItem>
                  <SelectItem value="title">标题</SelectItem>
                </SelectContent>
              </SelectTrigger>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lessonPlans.map((plan) => (
                <Card
                  key={plan._id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/my-content/${plan._id}`)}
                >
                  <div
                    onClick={() => previewContent(plan)}
                    style={{ height: "100%" }}
                  >
                    <CardHeader>
                      <CardTitle
                        className="text-lg truncate"
                        title={plan.title}
                      >
                        {plan.title}
                      </CardTitle>
                      <CardDescription className="truncate" title={plan.topic}>
                        {plan.topic}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{plan.subject}</Badge>
                          <Badge variant="outline">{plan.grade}</Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          创建于 {formatDate(plan.createdAt)}
                        </div>
                        <div className="text-sm text-gray-500">
                          浏览 {plan.stats.viewCount} · 导出{" "}
                          {plan.stats.exportCount}
                        </div>
                      </div>
                      <div
                        className="flex flex-wrap gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => previewContent(plan)}
                          className="flex items-center gap-1"
                        >
                          👁️ 预览
                        </Button>
                        <div className="flex gap-1">
                          {exportFormats.map(({ label, icon, format, ext }) => {
                            const key = `lesson-plans_${plan._id}_${format}`;
                            return (
                              <Button
                                key={format}
                                size="sm"
                                variant="outline"
                                disabled={!!exporting[key]}
                                onClick={() =>
                                  exportContent(
                                    "lesson-plans",
                                    plan._id,
                                    format,
                                    ext,
                                  )
                                }
                                className="flex items-center gap-1 min-w-0"
                                title={`导出${label}`}
                              >
                                {exporting[key] ? (
                                  <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full"></div>
                                ) : (
                                  <span className="text-sm">{icon}</span>
                                )}
                                <span className="hidden sm:inline">
                                  {label}
                                </span>
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            deleteContent("lesson-plans", plan._id)
                          }
                          className="flex items-center gap-1 text-red-600 hover:text-red-700"
                        >
                          🗑️ <span className="hidden sm:inline">删除</span>
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="exercises" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Input
                placeholder="搜索练习题..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <SelectTrigger
                value={filterSubject}
                onValueChange={setFilterSubject}
                className="w-32"
              >
                <SelectValue placeholder="科目" />
                <SelectContent>
                  <SelectItem value="all">全部科目</SelectItem>
                  <SelectItem value="语文">语文</SelectItem>
                  <SelectItem value="数学">数学</SelectItem>
                  <SelectItem value="英语">英语</SelectItem>
                  <SelectItem value="物理">物理</SelectItem>
                  <SelectItem value="化学">化学</SelectItem>
                  <SelectItem value="生物">生物</SelectItem>
                </SelectContent>
              </SelectTrigger>
              <SelectTrigger
                value={sortBy}
                onValueChange={setSortBy}
                className="w-32"
              >
                <SelectValue placeholder="排序" />
                <SelectContent>
                  <SelectItem value="createdAt">创建时间</SelectItem>
                  <SelectItem value="updatedAt">更新时间</SelectItem>
                  <SelectItem value="title">标题</SelectItem>
                </SelectContent>
              </SelectTrigger>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exercises.map((exercise) => (
                <Card
                  key={exercise._id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div
                    onClick={() => previewContent(exercise)}
                    style={{ height: "100%" }}
                  >
                    <CardHeader>
                      <CardTitle
                        className="text-lg truncate"
                        title={exercise.title}
                      >
                        {exercise.title}
                      </CardTitle>
                      <CardDescription
                        className="truncate"
                        title={exercise.topic}
                      >
                        {exercise.topic}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{exercise.subject}</Badge>
                          <Badge variant="outline">{exercise.grade}</Badge>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getDifficultyColor(exercise.difficulty)}`}
                          >
                            {exercise.difficulty}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          创建于 {formatDate(exercise.createdAt)}
                        </div>
                        <div className="text-sm text-gray-500">
                          浏览 {exercise.stats.viewCount} · 使用{" "}
                          {exercise.stats.useCount} · 导出{" "}
                          {exercise.stats.exportCount}
                        </div>
                        {exercise.relatedLessonPlan && (
                          <div className="text-sm text-blue-600">
                            关联教案: {exercise.relatedLessonPlan.title}
                          </div>
                        )}
                      </div>
                      <div
                        className="flex flex-wrap gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => previewContent(exercise)}
                          className="flex items-center gap-1"
                        >
                          👁️ 预览
                        </Button>
                        <div className="flex gap-1">
                          {exportFormats.map(({ label, icon, format, ext }) => {
                            const key = `exercises_${exercise._id}_${format}`;
                            return (
                              <Button
                                key={format}
                                size="sm"
                                variant="outline"
                                disabled={!!exporting[key]}
                                onClick={() =>
                                  exportContent(
                                    "exercises",
                                    exercise._id,
                                    format,
                                    ext,
                                  )
                                }
                                className="flex items-center gap-1 min-w-0"
                                title={`导出${label}`}
                              >
                                {exporting[key] ? (
                                  <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full"></div>
                                ) : (
                                  <span className="text-sm">{icon}</span>
                                )}
                                <span className="hidden sm:inline">
                                  {label}
                                </span>
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            deleteContent("exercises", exercise._id)
                          }
                          className="flex items-center gap-1 text-red-600 hover:text-red-700"
                        >
                          🗑️ <span className="hidden sm:inline">删除</span>
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="space-y-6">
            <div className="text-center py-8">
              <p className="text-gray-500">收藏功能即将上线...</p>
            </div>
          </TabsContent>
        </Tabs>
      )}

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
    </div>
  );
}
