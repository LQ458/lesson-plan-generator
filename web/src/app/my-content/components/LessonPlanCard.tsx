// LessonPlanCard.tsx
// 教案卡片组件，展示单个教案信息和操作按钮
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
import { formatDate } from "../utils/format";

interface LessonPlanCardProps {
  plan: any;
  onPreview: (plan: any) => void;
  onExport: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * LessonPlanCard 负责展示单个教案的基本信息和操作按钮
 * props:
 *   plan: 教案对象
 *   onPreview: 预览回调
 *   onExport: 导出回调
 *   onDelete: 删除回调
 */
export const LessonPlanCard: React.FC<LessonPlanCardProps> = ({
  plan,
  onPreview,
  onExport,
  onDelete,
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <div onClick={() => onPreview(plan)} style={{ height: "100%" }}>
        <CardHeader>
          <CardTitle className="text-lg">{plan.title}</CardTitle>
          <CardDescription>{plan.topic}</CardDescription>
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
              浏览 {plan.stats.viewCount} · 导出 {plan.stats.exportCount}
            </div>
          </div>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="outline" onClick={() => onPreview(plan)}>
              预览
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onExport(plan._id)}
            >
              导出
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(plan._id)}
            >
              删除
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};
