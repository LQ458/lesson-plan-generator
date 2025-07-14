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
import { Card } from "@/components/ui/card";
import StreamingMarkdown from "@/components/streaming-markdown";

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
  const [savingExercise, setSavingExercise] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

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

    try {
      // 流式调用后端AI API
      const response = await fetch("http://localhost:3001/api/exercises", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // 使用cookie认证
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

  // 保存练习题
  const handleSaveExercise = async () => {
    if (!generatedContent) return;

    setSavingExercise(true);
    try {
      const response = await fetch(
        "http://localhost:3001/api/content/exercises",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // 确保发送cookies
          body: JSON.stringify({
            title: `${formData.subject}练习题 - ${formData.topic}`,
            subject: formData.subject,
            grade: formData.grade,
            topic: formData.topic,
            difficulty: formData.difficulty,
            questionType: formData.questionType,
            questionCount: parseInt(formData.count),
            content: generatedContent,
            requirements: formData.requirements,
            tags: [formData.subject, formData.grade, formData.difficulty],
          }),
        },
      );

      if (response.ok) {
        // 简单的成功提示
        const successDiv = document.createElement("div");
        successDiv.className =
          "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
        successDiv.textContent = "✅ 练习题保存成功";
        document.body.appendChild(successDiv);
        setTimeout(() => {
          document.body.removeChild(successDiv);
        }, 3000);
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "保存失败" }));
        throw new Error(errorData.error || errorData.message || "保存失败");
      }
    } catch (error) {
      console.error("保存练习题失败:", error);
      // 简单的错误提示
      const errorDiv = document.createElement("div");
      errorDiv.className =
        "fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
      errorDiv.textContent = `❌ ${error instanceof Error ? error.message : "保存失败，请重试"}`;
      document.body.appendChild(errorDiv);
      setTimeout(() => {
        document.body.removeChild(errorDiv);
      }, 3000);
    } finally {
      setSavingExercise(false);
    }
  };

  // 导出练习题
  const handleExportExercise = () => {
    setExportDialogOpen(true);
  };

  // 执行导出
  const executeExport = async (format: string) => {
    if (!generatedContent) return;

    try {
      // 先保存练习题以获取ID
      const saveResponse = await fetch(
        "http://localhost:3001/api/content/exercises",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            title: `${formData.subject}练习题 - ${formData.topic}`,
            subject: formData.subject,
            grade: formData.grade,
            topic: formData.topic,
            difficulty: formData.difficulty,
            questionType: formData.questionType,
            questionCount: parseInt(formData.count),
            content: generatedContent,
            requirements: formData.requirements,
            tags: [formData.subject, formData.grade, formData.difficulty],
          }),
        },
      );

      if (!saveResponse.ok) {
        throw new Error("保存练习题失败，无法导出");
      }

      const saveData = await saveResponse.json();
      const exerciseId = saveData.data?._id || saveData.data?.id;

      if (!exerciseId) {
        throw new Error("未能获取练习题ID");
      }

      // 调用后端导出API
      const exportResponse = await fetch(
        `http://localhost:3001/api/export/exercises/${exerciseId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ format }),
        },
      );

      if (!exportResponse.ok) {
        const errorText = await exportResponse.text().catch(() => "未知错误");
        throw new Error(`导出失败: ${exportResponse.status} ${errorText}`);
      }

      // 下载文件
      const blob = await exportResponse.blob();
      
      if (blob.size === 0) {
        throw new Error("导出文件为空");
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `练习题_${formData.subject}_${formData.topic}_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // 简单的成功提示
      const successDiv = document.createElement("div");
      successDiv.className =
        "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
      successDiv.textContent = "✅ 导出成功";
      document.body.appendChild(successDiv);
      setTimeout(() => {
        document.body.removeChild(successDiv);
      }, 3000);
    } catch (error) {
      console.error("导出失败:", error);
      // 简单的错误提示
      const errorDiv = document.createElement("div");
      errorDiv.className =
        "fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
      errorDiv.textContent = `❌ ${error instanceof Error ? error.message : "导出失败，请重试"}`;
      document.body.appendChild(errorDiv);
      setTimeout(() => {
        document.body.removeChild(errorDiv);
      }, 3000);
    }
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
          <Card className="p-8">
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
              {/* Grade and Subject */}
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
                    {grades.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
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
          </Card>

          {/* Result Section */}
          <Card className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold flex items-center gap-3">
                <AcademicCapIcon className="w-6 h-6 text-apple-green" />
                生成结果
              </h2>
              {generatedContent && (
                <div className="flex gap-2">
                  <button onClick={handleCopy} className="btn btn-secondary">
                    复制内容
                  </button>
                  <button
                    onClick={handleSaveExercise}
                    disabled={savingExercise}
                    className="btn bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white"
                  >
                    {savingExercise ? "保存中..." : "💾 保存"}
                  </button>
                  <button
                    onClick={handleExportExercise}
                    className="btn bg-green-600 hover:bg-green-700 text-white"
                  >
                    📤 导出
                  </button>
                </div>
              )}
            </div>

            {generatedContent ? (
              <StreamingMarkdown 
                content={generatedContent} 
                isStreaming={isGenerating}
              />
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <ClockIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>填写左侧信息后点击"生成练习题"开始创建</p>
              </div>
            )}
          </Card>
        </div>

        {/* 导出对话框 */}
        {exportDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                导出练习题
              </h3>
              <div className="space-y-4">
                <div className="export-formats">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    选择导出格式
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        executeExport("pdf");
                        setExportDialogOpen(false);
                      }}
                      className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 text-center"
                    >
                      <div className="text-lg mb-1">📄</div>
                      <div className="text-sm font-medium">PDF文档</div>
                      <div className="text-xs text-gray-500">适合打印使用</div>
                    </button>
                    <button
                      onClick={() => {
                        executeExport("docx");
                        setExportDialogOpen(false);
                      }}
                      className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 text-center"
                    >
                      <div className="text-lg mb-1">📝</div>
                      <div className="text-sm font-medium">Word文档</div>
                      <div className="text-xs text-gray-500">可编辑修改</div>
                    </button>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setExportDialogOpen(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
