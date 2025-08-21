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
import StreamingMarkdown from "@/components/streaming-markdown";
import yaml from "js-yaml";
import { getApiUrl, API_ENDPOINTS } from "@/lib/api-config";

// 清理引用来源名称 - 移除文件扩展名和ID后缀
const cleanReferenceSourceName = (sourceName: string): string => {
  if (!sourceName) return "";
  
  // 移除 .json 扩展名
  let cleaned = sourceName.replace(/\.json$/, "");
  
  // 移除各种ID模式 - 更全面的清理
  cleaned = cleaned
    // 移除下划线和8位十六进制ID (如 _c8702551, _47aa9b66)
    .replace(/_[a-f0-9]{8}$/i, "")
    // 移除下划线和6-12位混合ID
    .replace(/_[a-zA-Z0-9]{6,12}$/, "")
    // 移除纯数字ID
    .replace(/_\d+$/, "")
    // 移除带连字符的ID (如 -abc123)
    .replace(/-[a-zA-Z0-9]{6,}$/, "")
    // 移除括号内的ID (如 (12345))
    .replace(/\s*\([a-zA-Z0-9_-]+\)$/, "")
    // 移除方括号内的ID (如 [abc123])
    .replace(/\s*\[[a-zA-Z0-9_-]+\]$/, "");
  
  return cleaned.trim();
};

// 去重引用来源 - 合并相同的教材引用
const deduplicateReferenceSources = (sources: string[]): string[] => {
  if (!Array.isArray(sources) || sources.length === 0) {
    return [];
  }
  
  const uniqueSources = new Set<string>();
  
  sources.forEach(source => {
    if (source && typeof source === 'string') {
      const cleaned = cleanReferenceSourceName(source);
      if (cleaned && cleaned.length > 0) {
        uniqueSources.add(cleaned);
      }
    }
  });
  
  const result = Array.from(uniqueSources);
  console.log('Deduplication results:', {
    input: sources,
    output: result,
    removedDuplicates: sources.length - result.length
  });
  
  return result;
};

// 清理markdown内容中的引用来源
const cleanMarkdownReferences = (content: string): string => {
  if (!content) return "";
  
  // 匹配并清理markdown中的引用模式
  // 匹配列表项中的引用 (如 "- 义务教育教科书·数学七年级下册_c8702551.json")
  let cleaned = content.replace(
    /^(\s*[-*+]\s*)([^_\n]+)_[a-zA-Z0-9]{6,}\.json/gm,
    '$1$2'
  );
  
  // 匹配引用部分的标题下的内容
  cleaned = cleaned.replace(
    /(#{1,6}\s*.*?引用.*?[\r\n]+)([\s\S]*?)(?=\n#{1,6}|\n\n|$)/gi,
    (match, header, content) => {
      const cleanedContent = content.replace(
        /([^_\n]+)_[a-zA-Z0-9]{6,}\.json/g,
        '$1'
      );
      return header + cleanedContent;
    }
  );
  
  // 清理其他可能的引用模式
  cleaned = cleaned
    // 清理行内引用
    .replace(/([《》【】（）]*[^_\n]+)_[a-zA-Z0-9]{6,}\.json/g, '$1')
    // 清理引号内的引用
    .replace(/"([^"_]+)_[a-zA-Z0-9]{6,}\.json"/g, '"$1"')
    // 清理括号内的引用
    .replace(/\(([^)_]+)_[a-zA-Z0-9]{6,}\.json\)/g, '($1)');
  
  return cleaned;
};

// 移除引用部分和确保frontmatter被移除
const cleanContentForDisplay = (content: string): string => {
  if (!content) return content;
  
  let cleaned = content;
  
  // 1. 移除YAML frontmatter块 - 更严格的匹配
  cleaned = cleaned.replace(/^---[\s\S]*?---\n*/m, '');
  
  // 2. 移除末尾的参考资料部分
  cleaned = cleaned.replace(/\n\s*##?\s*📚?\s*参考资料[\s\S]*$/i, '');
  cleaned = cleaned.replace(/\n\s*##?\s*参考文献[\s\S]*$/i, '');
  cleaned = cleaned.replace(/\n\s*##?\s*引用来源[\s\S]*$/i, '');
  cleaned = cleaned.replace(/\n\s*##?\s*Reference[\s\S]*$/i, '');
  
  // 3. 移除可能的其他参考部分变体
  cleaned = cleaned.replace(/\n\s*本教案参考了以下教学资料：[\s\S]*$/i, '');
  
  // 4. 清理末尾多余的空行
  cleaned = cleaned.replace(/\n\s*\n\s*$/, '\n');
  
  // 5. 确保不显示原始YAML内容
  if (cleaned.trim().startsWith('title:') || cleaned.trim().startsWith('---')) {
    console.warn('Content still contains YAML after cleaning, removing completely');
    return '';
  }
  
  return cleaned;
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

    // 清理metadata中的引用来源
    if (metadata && metadata.referenceSources && Array.isArray(metadata.referenceSources)) {
      metadata.referenceSources = deduplicateReferenceSources(metadata.referenceSources as string[]);
    }

    return { metadata, markdown: markdownContent };
  } catch (error) {
    console.warn("解析frontmatter失败:", error);
    // 即使解析失败，也要尝试移除可能的frontmatter标记，避免显示给用户
    const cleanContent = content.replace(/^---[\s\S]*?---\n?/, '');
    return { metadata: null, markdown: cleanContent.length > 0 ? cleanContent : content };
  }
};

// 检查内容是否足够完整可以显示
const isContentReadyToDisplay = (content: string): boolean => {
  if (!content || content.length < 20) return false;

  // 先尝试解析frontmatter，检查实际的markdown内容
  const { markdown } = parseFrontmatter(content);
  const actualContent = markdown || content;

  // 确保不会显示原始的YAML frontmatter
  if (content.trim().startsWith("---") && !markdown) {
    console.log('Content still contains raw frontmatter, not ready to display');
    return false;
  }

  // 检查是否包含基本的markdown结构
  const hasHeaders = /^#+\s+.+$/m.test(actualContent);
  const hasContent =
    actualContent.split("\n").filter((line) => line.trim()).length > 2;
  
  // 如果有frontmatter，内容长度要求可以更宽松
  const hasValidLength = content.includes("---") ? actualContent.length > 50 : actualContent.length > 100;

  return hasContent && (hasHeaders || hasValidLength);
};

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

// Static subjects list (currently unused but available for future use)
// const subjects = [
//   "语文", 
//   "数学",
//   "英语",
//   "物理",
//   "化学",
//   "生物",
//   "历史",
//   "地理",
//   "政治",
//   "音乐",
//   "美术",
//   "体育",
// ];

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
  const [, setParsedExerciseData] = useState<Record<
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
    setParsedExerciseData(null); // 清空之前的解析数据
    setIsStreaming(true); // 开始流式传输

    try {
      // 流式调用后端AI API
      const response = await fetch(getApiUrl(API_ENDPOINTS.AI.EXERCISES), {
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

          // 实时处理和格式化内容 - 添加调试日志
          console.log(`Content length: ${content.length}, first 100 chars:`, content.substring(0, 100));
          
          if (content.includes("---") && content.split("---").length >= 3) {
            // 包含frontmatter的情况
            const { metadata, markdown } = parseFrontmatter(content);
            console.log('Parsed frontmatter:', !!metadata, 'Markdown length:', markdown.length);
            
            if (metadata && isContentReadyToDisplay(markdown)) {
              if (!hasValidContent) {
                setParsedExerciseData(metadata);
                // 实时更新引用来源 - 清理并去重
                if (metadata.referenceSources) {
                  const deduplicatedSources = deduplicateReferenceSources(metadata.referenceSources as string[]);
                  setReferenceSources(deduplicatedSources);
                }
                hasValidContent = true;
              }
              // 只有当内容有意义时才更新显示
              const cleanedContent = cleanContentForDisplay(cleanMarkdownReferences(markdown));
              console.log('Cleaned content length:', cleanedContent.length, 'starts with ---:', cleanedContent.trim().startsWith('---'));
              
              if (cleanedContent.length > 20 && !cleanedContent.trim().startsWith('---')) {
                setGeneratedContent(cleanedContent);
                console.log('Content updated with frontmatter');
              }
            }
          } else if (isContentReadyToDisplay(content)) {
            // 不包含frontmatter但内容足够完整的情况
            if (!hasValidContent) {
              hasValidContent = true;
            }
            const cleanedContent = cleanContentForDisplay(cleanMarkdownReferences(content));
            console.log('Non-frontmatter cleaned content length:', cleanedContent.length);
            
            // 放宽验证条件以进行调试
            if (cleanedContent.length > 20 && !cleanedContent.includes('---') && !cleanedContent.startsWith('title:')) {
              setGeneratedContent(cleanedContent);
              console.log('Content updated without frontmatter');
            }
          } else {
            // 如果内容不符合ready条件，显示调试信息
            console.log('Content not ready to display. isContentReadyToDisplay:', isContentReadyToDisplay(content));
          }
          // 如果内容太短或不完整，不更新UI
        }

        // 最终处理 - 确保内容完整且格式正确
        console.log('Final processing - content length:', content.length);
        if (content.trim()) {
          const { metadata, markdown } = parseFrontmatter(content);
          console.log('Final: Has metadata:', !!metadata, 'Markdown length:', markdown?.length || 0);
          
          if (metadata) {
            setParsedExerciseData(metadata);
            const finalContent = cleanContentForDisplay(cleanMarkdownReferences(markdown));
            console.log('Final content length:', finalContent.length, 'Contains ---:', finalContent.includes('---'));
            
            // 放宽最终验证以确保内容能显示
            if (finalContent.length > 20 && !finalContent.includes('---') && !finalContent.startsWith('title:')) {
              setGeneratedContent(finalContent);
              console.log("解析frontmatter成功 - 内容已设置");
            } else {
              console.log("Final content failed validation:", { 
                length: finalContent.length, 
                hasTripleDash: finalContent.includes('---'), 
                startsWithTitle: finalContent.startsWith('title:')
              });
            }
            // 提取引用来源并清理文件名，去重
            if (metadata.referenceSources) {
              const deduplicatedSources = deduplicateReferenceSources(metadata.referenceSources as string[]);
              setReferenceSources(deduplicatedSources);
            }
          } else {
            const finalContent = cleanContentForDisplay(cleanMarkdownReferences(content));
            console.log('No metadata - final content length:', finalContent.length);
            
            // 同样放宽验证
            if (finalContent.length > 20 && !finalContent.includes('---') && !finalContent.startsWith('title:')) {
              setGeneratedContent(finalContent);
              console.log("无frontmatter内容已设置");
            } else {
              console.log("Non-frontmatter content failed validation");
              // 最后的fallback - 如果所有验证都失败，显示原始内容以便调试
              if (content.length > 100) {
                console.log("Using fallback - displaying raw content for debugging");
                setGeneratedContent(content);
              }
            }
          }
        } else {
          throw new Error("AI未返回任何内容");
        }
      } else {
        // 兼容非流式响应
        const data = await response.json();
        if (data.success && data.data.content) {
          setGeneratedContent(cleanContentForDisplay(cleanMarkdownReferences(data.data.content)));
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
      setIsStreaming(false); // 停止流式传输
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    alert("已复制到剪贴板");
  };

  // 保存练习题
  const handleSaveExercise = async () => {
    if (!generatedContent) return;

    // Validate required fields
    if (!formData.subject || !formData.grade || !formData.topic || !formData.difficulty) {
      alert("缺少必要信息：学科、年级、课题或难度等级");
      return;
    }

    setSavingExercise(true);
    try {
      const response = await fetch(
        getApiUrl(API_ENDPOINTS.CONTENT.EXERCISES),
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
            questionCount: parseInt(formData.count) || 5,
            content: generatedContent,
            requirements: formData.requirements || "",
            tags: [formData.subject, formData.grade, formData.difficulty].filter(Boolean),
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

    // Validate required fields before making the request
    if (!formData.subject || !formData.grade || !formData.topic || !formData.difficulty) {
      throw new Error("缺少必要信息：学科、年级、课题或难度等级");
    }

    try {
      // 先保存练习题以获取ID
      const saveResponse = await fetch(
        getApiUrl(API_ENDPOINTS.CONTENT.EXERCISES),
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
            questionCount: parseInt(formData.count) || 5,
            content: generatedContent,
            requirements: formData.requirements || "",
            tags: [formData.subject, formData.grade, formData.difficulty].filter(Boolean),
          }),
        },
      );

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || "保存练习题失败";
        throw new Error(`保存失败 (${saveResponse.status}): ${errorMessage}`);
      }

      const saveData = await saveResponse.json();
      const exerciseId = saveData.data?._id || saveData.data?.id;

      if (!exerciseId) {
        throw new Error("未能获取练习题ID");
      }

      // 调用后端导出API
      const exportResponse = await fetch(
        getApiUrl(`${API_ENDPOINTS.EXPORT.EXERCISES}/${exerciseId}`),
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
        const errorData = await exportResponse.json().catch(async () => {
          const text = await exportResponse.text().catch(() => "未知错误");
          return { message: text };
        });
        const errorMessage = errorData.message || errorData.error || "导出失败";
        throw new Error(`导出失败 (${exportResponse.status}): ${errorMessage}`);
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
                className="btn btn-primary w-full text-lg py-4 flex items-center justify-center gap-3 relative overflow-hidden"
              >
                {isGenerating ? (
                  <LoadingAnimation />
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
              {generatedContent && !isStreaming && (
                <div className="flex gap-2">
                  <button onClick={handleCopy} className="btn btn-secondary">
                    复制内容
                  </button>
                  <button
                    onClick={handleSaveExercise}
                    disabled={savingExercise || isGenerating}
                    className="btn bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white"
                  >
                    {savingExercise ? "保存中..." : "💾 保存"}
                  </button>
                  <button
                    onClick={handleExportExercise}
                    disabled={isGenerating}
                    className="btn bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white"
                  >
                    📤 导出
                  </button>
                </div>
              )}
            </div>

            {generatedContent ? (
              <div>
                {/* 引用来源显示 */}
                {referenceSources.length > 0 && (
                  <div className="mb-6 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <DocumentTextIcon className="h-5 w-5 text-green-600" />
                      <h3 className="font-medium text-green-800 dark:text-green-200">
                        本练习题参考了以下教学资料：
                      </h3>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-sm text-green-700 dark:text-green-300">
                      {referenceSources.map((source, index) => (
                        <li key={index}>{source}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                      💡 RAG技术已自动为您匹配相关教学资料，提升练习题专业性
                    </p>
                  </div>
                )}

                <div className="prose prose-lg max-w-none dark:prose-invert lesson-plan-content">
                  <StreamingMarkdown
                    content={generatedContent}
                    isStreaming={isStreaming}
                  />
                </div>

                {/* RAG使用提示 - 只在没有引用来源时显示 */}
                {!isStreaming && referenceSources.length === 0 && (
                  <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">
                        💡 RAG技术已自动为您匹配相关教学资料，提升练习题专业性
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <ClockIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>填写左侧信息后点击"生成练习题"开始创建</p>
              </div>
            )}
          </div>
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

// Loading动画组件 - 与教案页面保持一致
const LoadingAnimation = () => {
  const [loadingText, setLoadingText] = useState("正在分析题目要求...");

  useEffect(() => {
    const messages = [
      "正在分析题目要求...",
      "检索相关知识点...",
      "构建题目结构...",
      "生成题目内容...",
      "优化答案解析...",
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
