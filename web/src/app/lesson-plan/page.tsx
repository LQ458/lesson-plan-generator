"use client";

import { useState } from "react";
import {
  DocumentTextIcon,
  SparklesIcon,
  AcademicCapIcon,
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

export default function LessonPlanPage() {
  const [formData, setFormData] = useState({
    subject: "",
    grade: "",
    topic: "",
    duration: "45",
    objectives: "",
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

    // 模拟API调用
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockContent = `# ${formData.subject} 教案

## 基本信息
- **学科**: ${formData.subject}
- **年级**: ${formData.grade}
- **课题**: ${formData.topic}
- **课时**: ${formData.duration}分钟

## 教学目标
${formData.objectives || "1. 掌握本课重点知识\n2. 培养学生的思维能力\n3. 提高学生的实践技能"}

## 教学重点
- 理解${formData.topic}的基本概念
- 掌握相关的解题方法
- 能够运用所学知识解决实际问题

## 教学难点
- ${formData.topic}的深层理解
- 知识点之间的联系
- 实际应用能力的培养

## 教学过程

### 一、导入新课（5分钟）
1. 复习相关知识点
2. 引出本课主题
3. 明确学习目标

### 二、新课讲授（25分钟）
1. **概念讲解**
   - 详细解释${formData.topic}的定义
   - 举例说明相关概念
   
2. **方法介绍**
   - 介绍解决问题的基本方法
   - 演示具体操作步骤
   
3. **练习巩固**
   - 课堂练习题
   - 学生互动讨论

### 三、课堂小结（10分钟）
1. 总结本课重点内容
2. 强调易错点
3. 布置课后作业

### 四、作业布置（5分钟）
1. 完成课后练习题
2. 预习下一课内容
3. 思考拓展问题

## 教学反思
本课通过理论讲解和实践练习相结合的方式，帮助学生掌握${formData.topic}的相关知识。在今后的教学中，应该：
1. 加强学生的参与度
2. 注重知识的实际应用
3. 及时反馈学生的学习情况

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
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {generatedContent}
                </pre>
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
