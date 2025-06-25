"use client";

import { useState, useEffect } from "react";
import {
  AcademicCapIcon,
  SparklesIcon,
  DocumentTextIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import {
  useSettings,
  getGradeLevelLabel,
  getSubjectLabel,
} from "@/lib/settings-context";

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

const grades = [
  "小学一年级",
  "小学二年级",
  "小学三年级",
  "小学四年级",
  "小学五年级",
  "小学六年级",
  "初中一年级",
  "初中二年级",
  "初中三年级",
];

const difficulties = ["简单", "中等", "困难"];
const questionTypes = ["选择题", "填空题", "简答题", "计算题", "综合题"];

export default function ExercisesPage() {
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    subject: "",
    grade: "",
    topic: "",
    difficulty: "中等",
    questionType: "选择题",
    count: "5",
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

    try {
      // 流式调用后端AI API
      const response = await fetch("http://localhost:3001/api/exercises", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || "demo-token"}`,
        },
        body: JSON.stringify({
          subject: formData.subject,
          grade: formData.grade,
          topic: formData.topic,
          difficulty: formData.difficulty,
          questionType: formData.questionType,
          count: parseInt(formData.count),
          requirements: formData.requirements,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `AI服务请求失败: ${response.status} ${response.statusText}\n${errorText}`,
        );
      }

      // 检查是否为流式响应
      if (response.headers.get("content-type")?.includes("text/plain")) {
        // 流式读取响应
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("无法获取响应流");
        }

        let content = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          content += chunk;

          // 实时更新显示内容
          setGeneratedContent(content);
        }

        // 确保最终内容完整
        if (content.trim()) {
          setGeneratedContent(content);
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
      console.error("生成练习题失败:", error);
      alert(
        `练习题生成失败: ${error instanceof Error ? error.message : "未知错误"}\n\n请检查网络连接或稍后重试。`,
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
            <div className="p-4 bg-apple-green/10 rounded-3xl">
              <AcademicCapIcon className="w-12 h-12 text-apple-green" />
            </div>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-4">
            智能练习题生成
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            根据教学内容，AI将为您生成多样化的练习题目
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="card p-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <DocumentTextIcon className="w-6 h-6 text-apple-green" />
              题目设置
            </h2>

            {/* 用户偏好提示 */}
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-600 dark:text-green-400">💡</span>
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  已根据您的偏好预填表单
                </span>
              </div>
              <div className="text-xs text-green-700 dark:text-green-300">
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
                    {grades.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
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

              {/* Difficulty and Question Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    难度等级
                  </label>
                  <select
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleInputChange}
                    className="input"
                  >
                    {difficulties.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>
                        {difficulty}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    题目类型
                  </label>
                  <select
                    name="questionType"
                    value={formData.questionType}
                    onChange={handleInputChange}
                    className="input"
                  >
                    {questionTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Count */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  题目数量
                </label>
                <input
                  type="number"
                  name="count"
                  value={formData.count}
                  onChange={handleInputChange}
                  placeholder="5"
                  min="1"
                  max="20"
                  className="input"
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
                    生成练习题
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result Section */}
          <div className="card p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold flex items-center gap-3">
                <AcademicCapIcon className="w-6 h-6 text-apple-green" />
                生成结果
              </h2>
              {generatedContent && (
                <button onClick={handleCopy} className="btn btn-secondary">
                  复制内容
                </button>
              )}
            </div>

            {generatedContent ? (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {generatedContent}
                </pre>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <ClockIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>填写左侧信息后点击"生成练习题"开始创建</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
