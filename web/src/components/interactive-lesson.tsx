"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpenIcon,
  ChevronRightIcon,
  ClockIcon,
  ExclamationCircleIcon,
  PlayIcon,
  CheckCircleIcon,
  LightBulbIcon,
  AcademicCapIcon,
  CogIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";

interface TeachingStage {
  stage: string;
  content: string[];
  duration?: number;
}

interface InteractiveLessonProps {
  lessonData: {
    subject: string;
    grade: string;
    title: string;
    duration: number;
    detailedObjectives?: string[];
    keyPoints?: string[];
    difficulties?: string[];
    teachingMethods?: string[];
    teachingProcess?: TeachingStage[];
  };
  className?: string;
}

// 修复any类型
interface Section {
  id: string;
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  items: string[];
  description?: string;
}

const CollapsibleSection = ({
  section,
  isExpanded,
  onToggle,
}: {
  section: Section;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const [hasBeenViewed, setHasBeenViewed] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      setHasBeenViewed(true);
    }
  }, [isExpanded]);

  return (
    <div
      className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all duration-300 ${
        isExpanded ? "shadow-lg scale-[1.02]" : "shadow-sm hover:shadow-md"
      }`}
    >
      {(() => {
        // 在亮色模式下统一使用深色文字，在暗色模式下使用白色文字
        const textColorClass = "text-gray-900 dark:text-white";
        const iconBgClass = "bg-black/10 dark:bg-white/20";
        const badgeBgClass = "bg-black/10 dark:bg-white/20";
        const descriptionClass = "text-gray-700 dark:text-gray-300";
        const badgeTextClass = "text-gray-800 dark:text-gray-200";

        return (
          <button
            onClick={onToggle}
            className={`w-full px-4 py-3 text-left bg-gradient-to-r ${section.color} hover:opacity-90 transition-all duration-200 flex items-center justify-between ${textColorClass}`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-8 h-8 ${iconBgClass} rounded-full`}>
                <section.icon className={`w-4 h-4 ${textColorClass}`} />
              </div>
              <div>
                <span className={`font-medium text-sm ${textColorClass}`}>
                  {section.title}
                </span>
                {section.description && (
                  <div className={`text-xs mt-1 ${descriptionClass}`}>
                    {section.description}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-1 rounded-full ${badgeTextClass} ${badgeBgClass}`}
              >
                {section.items.length} 项
              </span>
              <div
                className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
              >
                <ChevronRightIcon
                  className={`w-4 h-4 ${textColorClass}`}
                />
              </div>
            </div>
          </button>
        );
      })()}

      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
        } overflow-hidden`}
      >
        <div className="p-4 bg-white dark:bg-gray-800">
          {section.items.length > 0 ? (
            <ul className="space-y-3">
              {section.items.map((item, idx) => (
                <li
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-all duration-200 hover:shadow-sm ${
                    hasBeenViewed ? "animate-fadeIn" : ""
                  }`}
                  style={{
                    animationDelay: `${idx * 100}ms`,
                  }}
                >
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r ${section.color} flex items-center justify-center text-gray-900 dark:text-white text-xs font-bold`}
                  >
                    {idx + 1}
                  </div>
                  <span className="text-gray-900 dark:text-gray-200 text-sm leading-relaxed">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6 text-gray-600 dark:text-gray-400">
              {/* DocumentTextIcon was removed, so using LightBulbIcon as a placeholder */}
              <LightBulbIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无内容</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ProcessSection = ({
  stages,
  isExpanded,
  onToggle,
}: {
  stages: TeachingStage[];
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const [currentStage, setCurrentStage] = useState<number | null>(null);
  const [completedStages, setCompletedStages] = useState<Set<number>>(
    new Set(),
  );

  const totalDuration = stages.reduce(
    (sum, stage) => sum + (stage.duration || 0),
    0,
  );

  // 修改函数签名，添加index参数
  const getStageIcon = (stage: string, index: number) => {
    if (completedStages.has(index)) {
      return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
    }
    if (currentStage === index) {
      return <PlayIcon className="w-4 h-4 text-blue-500" />;
    }

    const stageLower = stage.toLowerCase();
    if (stageLower.includes("导入")) {
      return <HomeIcon className="w-4 h-4" />;
    } else if (stageLower.includes("新课")) {
      return <BookOpenIcon className="w-4 h-4" />;
    } else {
      return <AcademicCapIcon className="w-4 h-4" />;
    }
  };

  const handleStageClick = (index: number) => {
    if (currentStage === index) {
      // 标记为完成
      setCompletedStages((prev) => new Set([...Array.from(prev), index]));
      setCurrentStage(null);
    } else {
      setCurrentStage(index);
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 text-left bg-gradient-to-r from-purple-500 to-purple-600 hover:opacity-90 transition-all duration-200 flex items-center justify-between text-gray-900 dark:text-white"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 bg-black/10 dark:bg-white/20 rounded-full">
            <PlayIcon className="w-4 h-4 text-gray-900 dark:text-white" />
          </div>
          <div>
            <span className="text-gray-900 dark:text-white font-medium text-sm">教学过程</span>
            <div className="text-gray-700 dark:text-gray-300 text-xs mt-1">
              {stages.length} 个阶段 • 总计 {totalDuration} 分钟
            </div>
          </div>
        </div>
        <div
          className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
        >
          <ChevronRightIcon className="w-4 h-4 text-gray-900 dark:text-white" />
        </div>
      </button>

      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
        } overflow-hidden`}
      >
        <div className="p-4 bg-white dark:bg-gray-800">
          <div className="space-y-4">
            {stages.map((stage, index) => (
              <div key={index} className="relative">
                <div
                  className={`flex items-center p-4 border-l-4 transition-all duration-200 cursor-pointer ${
                    currentStage === index
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : completedStages.has(index)
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : "border-gray-300 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => handleStageClick(index)}
                >
                  <div className="mr-3 flex-shrink-0">
                    {getStageIcon(stage.stage, index)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {stage.stage}
                    </h4>
                    {stage.duration && (
                      <p className="text-sm text-gray-700 dark:text-gray-400">
                        {stage.duration} 分钟
                      </p>
                    )}
                  </div>
                </div>
                {/* 展开的内容 */}
                {/* expandedStages.has(index) && ( */}
                <div className="ml-12 mt-2 mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <ul className="space-y-2">
                    {stage.content.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start">
                        <span className="text-blue-500 mr-2 text-sm">•</span>
                        <span className="text-sm text-gray-900 dark:text-gray-200">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* ) */}
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-800 dark:text-gray-300">
              <div className="font-medium mb-2">💡 使用提示</div>
              <ul className="space-y-1 text-xs">
                <li>• 点击阶段卡片开始该教学环节</li>
                <li>• 再次点击标记为完成</li>
                <li>
                  • 已完成: {completedStages.size}/{stages.length} 个阶段
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function InteractiveLesson({
  lessonData,
  className = "",
}: InteractiveLessonProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["objectives"]),
  );
  const [progressPercentage, setProgressPercentage] = useState(0);

  const sections: Section[] = [
    {
      id: "objectives",
      title: "教学目标",
      icon: AcademicCapIcon,
      color: "from-blue-500 to-blue-600",
      items: lessonData.detailedObjectives || [],
      description: "本课程要达成的学习目标",
    },
    {
      id: "keypoints",
      title: "教学重点",
      icon: LightBulbIcon,
      color: "from-yellow-500 to-yellow-600",
      items: lessonData.keyPoints || [],
      description: "学生需要重点掌握的内容",
    },
    {
      id: "difficulties",
      title: "教学难点",
      icon: ExclamationCircleIcon,
      color: "from-red-500 to-red-600",
      items: lessonData.difficulties || [],
      description: "教学中的重点突破内容",
    },
    {
      id: "methods",
      title: "教学方法",
      icon: CogIcon,
      color: "from-green-500 to-green-600",
      items: lessonData.teachingMethods || [],
      description: "采用的教学策略和方法",
    },
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // 计算完成进度
  useEffect(() => {
    const totalSections = sections.length + 1; // +1 for process section
    const expandedCount = expandedSections.size;
    setProgressPercentage((expandedCount / totalSections) * 100);
  }, [expandedSections, sections.length]);

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {/* 头部 */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              📚 {lessonData.title}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-800 dark:text-gray-300">
              <span>{lessonData.subject}</span>
              <span>•</span>
              <span>{lessonData.grade}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ClockIcon className="w-4 h-4" />
                {lessonData.duration}分钟
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-800 dark:text-gray-300">
              学习进度
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-900 dark:text-gray-300">
                {Math.round(progressPercentage)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-6">
        <div className="space-y-4">
          {/* 基础信息部分 */}
          {sections.map((section) => (
            <CollapsibleSection
              key={section.id}
              section={section}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
            />
          ))}

          {/* 教学过程部分 */}
          {lessonData.teachingProcess &&
            lessonData.teachingProcess.length > 0 && (
              <ProcessSection
                stages={lessonData.teachingProcess}
                isExpanded={expandedSections.has("process")}
                onToggle={() => toggleSection("process")}
              />
            )}
        </div>

        {/* 底部操作区 */}
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-800 dark:text-gray-300">
              <span className="font-medium">📊 总览: </span>
              已展开 {expandedSections.size} 个部分
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setExpandedSections(
                    new Set([
                      "objectives",
                      "keypoints",
                      "difficulties",
                      "methods",
                      "process",
                    ]),
                  )
                }
                className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                全部展开
              </button>
              <button
                onClick={() => setExpandedSections(new Set())}
                className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                全部折叠
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 添加动画样式
const style = `
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out forwards;
}
`;

// 注入样式
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = style;
  document.head.appendChild(styleSheet);
}
