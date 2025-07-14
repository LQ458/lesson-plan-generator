import React from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ContentCardProps {
  id: string;
  title: string;
  subject: string;
  grade: string;
  topic: string;
  createdAt: string;
  difficulty?: string;
  stats: {
    viewCount: number;
    exportCount: number;
    shareCount?: number;
    useCount?: number;
  };
  type: "lessonPlan" | "exercise";
  isFavorited: boolean;
  onPreview: (e: React.MouseEvent) => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onExport: (e: React.MouseEvent, format: string, ext: string) => void;
  onDelete: (e: React.MouseEvent) => void;
  favoriteLoading?: boolean;
  exportLoading?: { [key: string]: boolean };
}

const exportFormats = [
  { label: "思维导图", icon: "🧠", format: "mindmap", ext: "png" },
  { label: "PDF", icon: "📄", format: "pdf", ext: "pdf" },
  { label: "时间线", icon: "⏰", format: "timeline", ext: "png" },
];

const EyeIcon = () => (
  <svg
    width="20"
    height="20"
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

const StarIcon = ({ filled = false }) => (
  <svg
    width="20"
    height="20"
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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ContentCard({
  id,
  title,
  subject,
  grade,
  topic,
  createdAt,
  difficulty,
  stats,
  type,
  isFavorited,
  onPreview,
  onToggleFavorite,
  onExport,
  onDelete,
  favoriteLoading = false,
  exportLoading = {},
}: ContentCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    if (type === "lessonPlan") {
      router.push(`/my-content/${id}`);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="space-y-2">
          <CardTitle
            className="text-lg truncate cursor-pointer"
            title={title}
            onClick={handleCardClick}
          >
            {title}
          </CardTitle>
          <CardDescription className="truncate" title={topic}>
            {topic}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{subject}</Badge>
            <Badge variant="outline">{grade}</Badge>
            {difficulty && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getDifficultyColor(difficulty)}`}
              >
                {difficulty}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            创建于 {formatDate(createdAt)}
          </div>
          <div className="text-sm text-gray-500">
            浏览 {stats.viewCount} ·
            {type === "exercise" ? ` 使用 ${stats.useCount} · ` : ""}
            导出 {stats.exportCount}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onPreview}
            className="flex items-center gap-1"
          >
            <EyeIcon /> 预览
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onToggleFavorite}
            disabled={favoriteLoading}
            className={`flex items-center gap-1 ${
              isFavorited
                ? "text-yellow-600 border-yellow-300"
                : "text-gray-600"
            }`}
          >
            {favoriteLoading ? (
              <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full"></div>
            ) : (
              <StarIcon filled={isFavorited} />
            )}
            <span className="hidden sm:inline">
              {isFavorited ? "已收藏" : "收藏"}
            </span>
          </Button>

          <div className="flex gap-1">
            {exportFormats.map(({ label, icon, format, ext }) => {
              const key = `${type === "lessonPlan" ? "lesson-plans" : "exercises"}_${id}_${format}`;
              return (
                <Button
                  key={format}
                  size="sm"
                  variant="outline"
                  disabled={!!exportLoading[key]}
                  onClick={(e) => onExport(e, format, ext)}
                  className="flex items-center gap-1 min-w-0"
                  title={`导出${label}`}
                >
                  {exportLoading[key] ? (
                    <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full"></div>
                  ) : (
                    <span className="text-base">{icon}</span>
                  )}
                  <span className="hidden sm:inline">{label}</span>
                </Button>
              );
            })}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="flex items-center gap-1 text-red-600 hover:text-red-700"
          >
            <span className="text-base">🗑️</span>{" "}
            <span className="hidden sm:inline">删除</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
