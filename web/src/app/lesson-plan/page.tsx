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

const subjects = [
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
];
const durations = [30, 40, 45, 50, 60];

// 解析带有YAML frontmatter的Markdown内容
const parseFrontmatter = (
  content: string,
): { metadata: any; markdown: string } => {
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
    const metadata = yaml.load(frontmatterContent);

    return { metadata, markdown: markdownContent };
  } catch (error) {
    console.warn("解析frontmatter失败:", error);
    return { metadata: null, markdown: content };
  }
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
  const [parsedLessonData, setParsedLessonData] = useState<any>(null);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGenerate = async () => {
    if (!formData.subject || !formData.grade || !formData.topic) {
      alert("请填写必要信息：学科、年级和课题");
      return;
    }

    setIsGenerating(true);
    setGeneratedContent(""); // 清空之前的内容
    setParsedLessonData(null); // 清空之前的解析数据

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
        // 文本格式的流式响应（向后兼容）
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("无法获取响应流");
        }

        let content = "";
        let displayContent = "";
        let frontmatterParsed = false;

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          content += chunk;

          // 实时处理内容显示
          if (!frontmatterParsed) {
            // 检查是否包含完整的frontmatter
            if (content.includes("---") && content.split("---").length >= 3) {
              const { metadata, markdown } = parseFrontmatter(content);
              if (metadata) {
                setParsedLessonData(metadata);
                displayContent = markdown;
                frontmatterParsed = true;
                console.log("流式输出中解析frontmatter成功");
              } else {
                displayContent = content;
              }
            } else if (content.trim() && !content.trim().startsWith("---")) {
              // 如果不是frontmatter格式，直接显示
              displayContent = content;
              frontmatterParsed = true;
            }
          } else {
            // 已经解析过frontmatter，继续追加到markdown内容
            if (frontmatterParsed && displayContent !== content) {
              const { metadata, markdown } = parseFrontmatter(content);
              displayContent = markdown || content;
            }
          }

          // 更新显示内容
          setGeneratedContent(displayContent);
        }

        if (!content.trim()) {
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
                    学科 <span className="text-apple-red">*</span>
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="input"
                    required
                  >
                    <option value="">请选择学科</option>
                    {subjects.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>

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
                className="btn btn-primary w-full text-lg py-4 flex items-center justify-center gap-3"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    生成中...
                  </>
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
              <LessonPlanGenerator
                lessonData={
                  parsedLessonData
                    ? {
                        ...parsedLessonData,
                        textContent: generatedContent, // 传递完整的Markdown内容用于传统文本显示
                      }
                    : {
                        subject: formData.subject,
                        grade: formData.grade,
                        title: formData.topic,
                        textContent: generatedContent,
                        detailedObjectives: formData.objectives
                          .split("\n")
                          .filter((obj) => obj.trim()),
                        keyPoints: [
                          `理解${formData.topic}的基本概念`,
                          "掌握相关的解题方法",
                          "能够运用所学知识解决实际问题",
                        ],
                        difficulties: [
                          `${formData.topic}的深层理解`,
                          "知识点之间的联系",
                          "实际应用能力的培养",
                        ],
                        teachingProcess: [
                          {
                            stage: "导入新课",
                            duration: 5,
                            content: ["复习相关知识", "引入新课题"],
                          },
                          {
                            stage: "新课讲解",
                            duration: 25,
                            content: ["讲解核心概念", "演示实例"],
                          },
                          {
                            stage: "练习巩固",
                            duration: 10,
                            content: ["学生练习", "答疑解惑"],
                          },
                          {
                            stage: "课堂小结",
                            duration: 5,
                            content: ["总结要点", "布置作业"],
                          },
                        ],
                      }
                }
              />
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
