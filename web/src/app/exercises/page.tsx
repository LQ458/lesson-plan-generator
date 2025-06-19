"use client";

import { useState } from "react";
import {
  AcademicCapIcon,
  SparklesIcon,
  DocumentTextIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

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
  "高中一年级",
  "高中二年级",
  "高中三年级",
];

const difficulties = ["简单", "中等", "困难"];
const questionTypes = ["选择题", "填空题", "简答题", "计算题", "综合题"];

export default function ExercisesPage() {
  const [formData, setFormData] = useState({
    subject: "",
    grade: "",
    topic: "",
    difficulty: "中等",
    questionType: "选择题",
    count: "5",
    requirements: "",
  });

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

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockContent = `# ${formData.subject} 练习题

## 基本信息
- **学科**: ${formData.subject}
- **年级**: ${formData.grade}
- **课题**: ${formData.topic}
- **难度**: ${formData.difficulty}
- **题型**: ${formData.questionType}
- **题目数量**: ${formData.count}题

## 练习题目

${Array.from({ length: parseInt(formData.count) }, (_, i) => {
  const questionNum = i + 1;

  if (formData.questionType === "选择题") {
    return `### 第${questionNum}题（选择题）
关于${formData.topic}，下列说法正确的是（）

A. 选项A的内容描述
B. 选项B的内容描述  
C. 选项C的内容描述
D. 选项D的内容描述

**答案**: C
**解析**: 这里是详细的解题思路和知识点说明。`;
  } else if (formData.questionType === "填空题") {
    return `### 第${questionNum}题（填空题）
请根据${formData.topic}的相关知识，完成下列填空：

1. ________是${formData.topic}的重要特征。
2. 在实际应用中，${formData.topic}主要用于________。

**答案**: 
1. [答案1]
2. [答案2]

**解析**: 这里是详细的解题思路和知识点说明。`;
  } else if (formData.questionType === "简答题") {
    return `### 第${questionNum}题（简答题）
请简要说明${formData.topic}的基本概念和主要特点。

**参考答案**: 
${formData.topic}是指...（这里是详细的答案内容）

**评分要点**: 
1. 概念表述准确（3分）
2. 特点描述完整（4分）
3. 举例说明恰当（3分）`;
  } else {
    return `### 第${questionNum}题（${formData.questionType}）
结合${formData.topic}的相关知识，解决以下问题：

[这里是具体的题目内容，根据学科特点设计]

**解答过程**: 
1. 分析题目条件
2. 运用相关公式或理论
3. 计算或推理过程
4. 得出结论

**答案**: [最终答案]`;
  }
}).join("\n\n")}

## 教学建议
1. 建议学生先复习${formData.topic}的基本概念
2. 逐题完成，注意解题思路的培养
3. 完成后对照答案，重点理解错题
4. 可以适当拓展相关知识点

${formData.requirements ? `\n## 特殊要求\n${formData.requirements}` : ""}`;

      setGeneratedContent(mockContent);
    } catch (error) {
      alert("生成失败，请重试");
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
