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
import type { FavoriteItem } from "../types";

interface FavoriteCardProps {
  favorite: FavoriteItem;
  onView: (e: React.MouseEvent) => void;
  onUnfavorite: (e: React.MouseEvent) => void;
  unfavoriteLoading?: boolean;
}

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

export default function FavoriteCard({
  favorite,
  onView,
  onUnfavorite,
  unfavoriteLoading = false,
}: FavoriteCardProps) {
  const router = useRouter();

  if (!favorite || !favorite.contentId) {
    return null;
  }

  const content = favorite.contentId;
  const isLessonPlan = favorite.contentType === "lessonPlan";

  const handleCardClick = () => {
    if (isLessonPlan) {
      router.push(`/my-content/${content._id}`);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle
                className="text-lg truncate cursor-pointer"
                title={content.title}
                onClick={handleCardClick}
              >
                {content.title}
              </CardTitle>
              <CardDescription className="truncate" title={content.topic}>
                {content.topic}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="ml-2 shrink-0">
              {isLessonPlan ? "教案" : "练习题"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{content.subject}</Badge>
            <Badge variant="outline">{content.grade}</Badge>
            {!isLessonPlan && content.difficulty && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getDifficultyColor(content.difficulty)}`}
              >
                {content.difficulty}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            收藏于 {formatDate(favorite.createdAt)}
          </div>
          {favorite.notes && (
            <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
              备注: {favorite.notes}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onView}
            className="flex items-center gap-1"
          >
            <EyeIcon /> 查看
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onUnfavorite}
            disabled={unfavoriteLoading}
            className="flex items-center gap-1 text-red-600 hover:text-red-700"
          >
            {unfavoriteLoading ? (
              <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full"></div>
            ) : (
              <StarIcon filled={true} />
            )}
            <span className="hidden sm:inline">取消收藏</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
