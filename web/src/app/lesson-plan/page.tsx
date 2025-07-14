"use client";

import { useState, useEffect } from "react";
import {
  DocumentTextIcon,
  SparklesIcon,
  AcademicCapIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import LessonPlanGenerator from "@/components/lesson-plan-generator";
import {
  useSettings,
  getGradeLevelLabel,
  getSubjectLabel,
} from "@/lib/settings-context";
import yaml from "js-yaml";

// 科目定义及其适用年级
const subjectsByGrade = {
  // 小学科目 - 基础学科
  elementary: ["语文", "数学", "英语", "音乐", "美术", "体育"],
  // 初中科目 - 包含所有学科
  secondary: [
    "语文",
    "数学",
    "英语",
    "物理",
    "化学",
    "生物",
    "历史",
    "地理",
    "政治",
    "音乐",
    "美术",
    "体育",
  ],
};

// 获取适用的科目列表
const getAvailableSubjects = (grade: string) => {
  if (grade.includes("小学")) {
    return subjectsByGrade.elementary;
  } else if (grade.includes("初中")) {
    return subjectsByGrade.secondary;
  }
  // 默认返回所有科目
  return subjectsByGrade.secondary;
};

// 检查科目是否适用于选定年级
const isSubjectValidForGrade = (subject: string, grade: string) => {
  const availableSubjects = getAvailableSubjects(grade);
  return availableSubjects.includes(subject);
};

// 解析带有YAML frontmatter的Markdown内容
const parseFrontmatter = (
  content: string,
): { metadata: Record<string, unknown> | null; markdown: string } => {
  if (!content) return { metadata: null, markdown: "" };

  // 检查是否以YAML frontmatter开始
  if (!content.trim().startsWith("---")) {
    return { metadata: null, markdown: content };
  }

  try {
    // 分离frontmatter和markdown内容
    const lines = content.split("\n");
    let frontmatterEnd = -1;

    // 找到第二个 ---
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        frontmatterEnd = i;
        break;
      }
    }

    if (frontmatterEnd === -1) {
      return { metadata: null, markdown: content };
    }

    // 提取frontmatter和markdown
    const frontmatterContent = lines.slice(1, frontmatterEnd).join("\n");
    const markdownContent = lines.slice(frontmatterEnd + 1).join("\n");

    // 解析YAML
    const metadata = yaml.load(frontmatterContent) as Record<
      string,
      unknown
    > | null;

    return { metadata, markdown: markdownContent };
  } catch (error) {
    console.warn("解析frontmatter失败:", error);
    return { metadata: null, markdown: content };
  }
};

// 检查内容是否足够完整可以显示
const isContentReadyToDisplay = (content: string): boolean => {
  if (!content || content.length < 20) return false;

  // 检查是否包含基本的markdown结构
  const hasHeaders = /^#+\s+.+$/m.test(content);
  const hasContent =
    content.split("\n").filter((line) => line.trim()).length > 2;
  const isNotJustFrontmatter =
    !content.trim().startsWith("---") || content.split("---").length >= 3;

  return (
    hasContent && isNotJustFrontmatter && (hasHeaders || content.length > 100)
  );
};

// Loading动画组件 - 增强版
const LoadingAnimation = () => {
  const [loadingText, setLoadingText] = useState("正在分析课题...");

  useEffect(() => {
    const messages = [
      "正在分析课题...",
      "检索教学资料...",
      "构建教学大纲...",
      "优化教学流程...",
      "完善教案结构...",
      "即将完成...",
    ];

    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingText(messages[index]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center gap-3">
      {/* 主要的旋转圆圈 */}
      <div className="relative">
        <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
        {/* 内部小点 */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/60 rounded-full animate-pulse" />
      </div>

      {/* 脉冲点组 */}
      <div className="flex gap-1">
        <div
          className="w-1 h-1 bg-white/80 rounded-full animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <div
          className="w-1 h-1 bg-white/80 rounded-full animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="w-1 h-1 bg-white/80 rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>

      {/* 动态文字 */}
      <span className="text-white/90 font-medium transition-all duration-500">
        {loadingText}
      </span>
    </div>
  );
};

export default function LessonPlanPage() {
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    subject: "",
    grade: "",
    topic: "",
    duration: "45",
    objectives: "",
    requirements: "",
  });

  // 当设置改变时，更新表单默认值
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      subject: getSubjectLabel(settings.subject),
      grade: getGradeLevelLabel(settings.gradeLevel),
    }));
  }, [settings]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [parsedLessonData, setParsedLessonData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [referenceSources, setReferenceSources] = useState<string[]>([]);

  // 获取当前可用的科目
  const availableSubjects = getAvailableSubjects(formData.grade);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: value,
      };

      // 如果年级改变了，检查当前科目是否还有效
      if (name === "grade" && prev.subject) {
        if (!isSubjectValidForGrade(prev.subject, value)) {
          // 如果当前科目不适用于新年级，清空科目选择
          newData.subject = "";
        }
      }

      return newData;
    });
  };

  // 移除未使用的变量
  // 修复 230:9 和 238:14 的错误
  // const extractReferenceSources = (content: string) => {
  //   // 暂时保留此函数，可能在其他地方使用
  //   return [];
  // };

  // 修复错误处理
  // const handleError = (error: unknown) => {
  //   console.error("Error:", error);
  //   // 处理错误逻辑
  // };

  const handleGenerate = async () => {
    if (!formData.subject || !formData.grade || !formData.topic) {
      alert("请填写必要信息：学科、年级和课题");
      return;
    }

    // 验证科目与年级的匹配性
    if (!isSubjectValidForGrade(formData.subject, formData.grade)) {
      alert(`${formData.subject} 不适用于 ${formData.grade}，请重新选择科目`);
      return;
    }

    setIsGenerating(true);
    setGeneratedContent(""); // 清空之前的内容
    setParsedLessonData(null); // 清空之前的解析数据
    setIsStreaming(true); // 开始流式传输

    try {
      // 流式调用后端AI API
      const response = await fetch("http://localhost:3001/api/lesson-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || "demo-token"}`,
        },
        body: JSON.stringify({
          subject: formData.subject,
          grade: formData.grade,
          topic: formData.topic,
          requirements: formData.requirements,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `AI服务请求失败: ${response.status} ${response.statusText}\n${errorText}`,
        );
      }

      // 检查响应类型
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text/plain")) {
        // 实时流式处理和渲染
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("无法获取响应流");
        }

        let content = "";
        let hasValidContent = false; // 标记是否有有效的格式化内容

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          content += chunk;

          // 实时处理和格式化内容
          if (content.includes("---") && content.split("---").length >= 3) {
            // 包含frontmatter的情况
            const { metadata, markdown } = parseFrontmatter(content);
            if (metadata && isContentReadyToDisplay(markdown)) {
              if (!hasValidContent) {
                setParsedLessonData(metadata);
                hasValidContent = true;
              }
              setGeneratedContent(markdown);
            }
          } else if (isContentReadyToDisplay(content)) {
            // 不包含frontmatter但内容足够完整的情况
            if (!hasValidContent) {
              hasValidContent = true;
            }
            setGeneratedContent(content);
          }
          // 如果内容太短或不完整，不更新UI
        }

        // 最终处理 - 确保内容完整
        if (content.trim()) {
          const { metadata, markdown } = parseFrontmatter(content);
          if (metadata) {
            setParsedLessonData(metadata);
            setGeneratedContent(markdown);
            console.log("解析frontmatter成功");
            // 提取引用来源
            if (metadata.referenceSources) {
              setReferenceSources(metadata.referenceSources as string[]);
            }
          } else {
            setGeneratedContent(content);
          }
        } else {
          throw new Error("AI未返回任何内容");
        }
      } else {
        // 兼容非流式响应
        const data = await response.json();
        if (data.success && data.data.content) {
          setGeneratedContent(data.data.content);
        } else {
          throw new Error("AI响应格式错误或未返回内容");
        }
      }
    } catch (error) {
      console.error("生成教案失败:", error);
      alert(
        `教案生成失败: ${error instanceof Error ? error.message : "未知错误"}\n\n请检查网络连接或稍后重试。`,
      );
    } finally {
      setIsGenerating(false);
      setIsStreaming(false); // 停止流式传输
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    alert("已复制到剪贴板");
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-apple-blue/10 rounded-3xl">
              <DocumentTextIcon className="w-12 h-12 text-apple-blue" />
            </div>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-4">智能教案生成</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            填写教学信息，AI将为您生成结构化、专业的教案内容
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="card p-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <AcademicCapIcon className="w-6 h-6 text-apple-blue" />
              教学信息
            </h2>

            {/* 用户偏好提示 */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-600 dark:text-blue-400">💡</span>
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  已根据您的偏好预填表单
                </span>
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                默认科目: {getSubjectLabel(settings.subject)} · 默认阶段:{" "}
                {getGradeLevelLabel(settings.gradeLevel)}
                {!settings.easyMode && " · 完整模式"}
                {settings.easyMode && " · 简易模式"}
              </div>
            </div>

            <div className="space-y-6">
              {/* Subject and Grade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    年级 <span className="text-apple-red">*</span>
                  </label>
                  <select
                    name="grade"
                    value={formData.grade}
                    onChange={handleInputChange}
                    className="input"
                    required
                  >
                    <option value="">请选择年级</option>
                    <option value="小学一年级">小学一年级</option>
                    <option value="小学二年级">小学二年级</option>
                    <option value="小学三年级">小学三年级</option>
                    <option value="小学四年级">小学四年级</option>
                    <option value="小学五年级">小学五年级</option>
                    <option value="小学六年级">小学六年级</option>
                    <option value="初中一年级">初中一年级</option>
                    <option value="初中二年级">初中二年级</option>
                    <option value="初中三年级">初中三年级</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    学科 <span className="text-apple-red">*</span>
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="input"
                    required
                    disabled={!formData.grade}
                  >
                    <option value="">
                      {!formData.grade ? "请先选择年级" : "请选择学科"}
                    </option>
                    {availableSubjects.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                  {formData.grade && formData.grade.includes("小学") && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      💡 小学阶段主要开设基础学科课程
                    </p>
                  )}
                </div>
              </div>

              {/* Topic */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  课题 <span className="text-apple-red">*</span>
                </label>
                <input
                  type="text"
                  name="topic"
                  value={formData.topic}
                  onChange={handleInputChange}
                  placeholder="请输入课题名称"
                  className="input"
                  required
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  课时（分钟）
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  placeholder="45"
                  min="1"
                  max="120"
                  className="input"
                />
              </div>

              {/* Objectives */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  教学目标
                </label>
                <textarea
                  name="objectives"
                  value={formData.objectives}
                  onChange={handleInputChange}
                  placeholder="请输入教学目标（可选）"
                  rows={3}
                  className="input resize-none"
                />
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  特殊要求
                </label>
                <textarea
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleInputChange}
                  placeholder="请输入特殊要求或补充说明（可选）"
                  rows={3}
                  className="input resize-none"
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="btn btn-primary w-full text-lg py-4 flex items-center justify-center gap-3 relative overflow-hidden"
              >
                {isGenerating ? (
                  <LoadingAnimation />
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    生成教案
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result Section */}
          <div className="card p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold flex items-center gap-3">
                <DocumentTextIcon className="w-6 h-6 text-apple-green" />
                生成结果
              </h2>
              {generatedContent && (
                <button onClick={handleCopy} className="btn btn-secondary">
                  复制内容
                </button>
              )}
            </div>

            {generatedContent ? (
              <div className="mt-8">
                {/* 引用来源显示 */}
                {referenceSources.length > 0 && (
                  <div className="mb-6 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <DocumentTextIcon className="h-5 w-5 text-green-600" />
                      <h3 className="font-medium text-green-800 dark:text-green-200">
                        本教案参考了以下教学资料：
                      </h3>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-sm text-green-700 dark:text-green-300">
                      {referenceSources.map((source, index) => (
                        <li key={index}>{source}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                      💡 RAG技术已自动为您匹配相关教学资料，提升教案专业性
                    </p>
                  </div>
                )}

                <LessonPlanGenerator
                  lessonData={
                    parsedLessonData
                      ? {
                          subject:
                            (parsedLessonData.subject as string) ||
                            formData.subject,
                          grade:
                            (parsedLessonData.grade as string) ||
                            formData.grade,
                          title:
                            (parsedLessonData.title as string) ||
                            formData.topic,
                          duration: (parsedLessonData.duration as number) || 45,
                          textContent: generatedContent, // 传递完整的Markdown内容用于传统文本显示
                          detailedObjectives:
                            (parsedLessonData.detailedObjectives as string[]) ||
                            [],
                          keyPoints:
                            (parsedLessonData.keyPoints as string[]) || [],
                          difficulties:
                            (parsedLessonData.difficulties as string[]) || [],
                          teachingMethods:
                            (parsedLessonData.teachingMethods as string[]) ||
                            [],
                          teachingProcess:
                            (parsedLessonData.teachingProcess as Array<{
                              stage: string;
                              duration: number;
                              content: string[];
                            }>) || [],
                        }
                      : {
                          subject: formData.subject,
                          grade: formData.grade,
                          title: formData.topic,
                          duration: 45,
                          textContent: generatedContent,
                          // 如果没有解析到AI结构化数据，使用空数组，不使用模板内容
                          detailedObjectives: formData.objectives
                            .split("\n")
                            .filter((obj) => obj.trim()),
                          keyPoints: [],
                          difficulties: [],
                          teachingMethods: [],
                          teachingProcess: [],
                        }
                  }
                  isStreaming={isStreaming}
                />
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <ClockIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>填写左侧信息后点击"生成教案"开始创建</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
