// ExerciseCard.tsx
// 练习题卡片组件，展示单个练习题信息和操作按钮
import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, getDifficultyColor } from "../utils/format";
import { Exercise } from "../hooks/useExercises";

interface ExerciseCardProps {
  exercise: Exercise;
  onPreview: (exercise: Exercise) => void;
  onExport: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * ExerciseCard 负责展示单个练习题的基本信息和操作按钮
 * props:
 *   exercise: 练习题对象
 *   onPreview: 预览回调
 *   onExport: 导出回调
 *   onDelete: 删除回调
 */
export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  onPreview,
  onExport,
  onDelete,
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <div onClick={() => onPreview(exercise)} style={{ height: "100%" }}>
        <CardHeader>
          <CardTitle className="text-lg">{exercise.title}</CardTitle>
          <CardDescription>{exercise.topic}</CardDescription>
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
              浏览 {exercise.stats.viewCount} · 使用 {exercise.stats.useCount} ·
              导出 {exercise.stats.exportCount}
            </div>
            {exercise.relatedLessonPlan && (
              <div className="text-sm text-blue-600">
                关联教案: {exercise.relatedLessonPlan.title}
              </div>
            )}
          </div>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPreview(exercise)}
            >
              预览
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onExport(exercise._id)}
            >
              导出
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(exercise._id)}
            >
              删除
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};
