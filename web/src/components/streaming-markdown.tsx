"use client";

import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface StreamingMarkdownProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

// 防抖函数
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// 骨架屏加载组件
const MarkdownSkeleton = () => {
  return (
    <div className="animate-pulse space-y-4">
      {/* 标题骨架 */}
      <div className="space-y-3">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
      
      {/* 段落骨架 */}
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
        </div>
      </div>
      
      {/* 列表骨架 */}
      <div className="space-y-2">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3"></div>
        <div className="space-y-2 ml-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
      
      {/* 更多段落骨架 */}
      <div className="space-y-3">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
        </div>
      </div>
    </div>
  );
};

// 内容预处理函数 - 修复markdown渲染问题
const preprocessContent = (content: string): string => {
  if (!content) return "";

  let processedContent = content;

  // 1. 移除可能错误包装的代码块标记
  // 检查是否整个内容被包装在代码块中
  const codeBlockPattern = /^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/;
  const match = processedContent.trim().match(codeBlockPattern);
  if (match) {
    processedContent = match[1];
    console.log("🔧 [StreamingMarkdown] 移除了错误的代码块包装");
  }

  // 2. 基本的清理，移除开头的空行
  processedContent = processedContent.replace(/^\s*\n+/, "");

  // 3. 修复数学公式格式问题
  // 处理常见的数学公式转换问题 - 改进版本
  processedContent = processedContent
    // 首先处理已经转义的LaTeX序列 - 将带反斜杠的LaTeX转换为正确格式
    .replace(/\\neq/g, '≠')
    .replace(/\\leq/g, '≤') 
    .replace(/\\geq/g, '≥')
    .replace(/\\pm/g, '±')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\infty/g, '∞')
    .replace(/\\sqrt/g, '√')
    .replace(/\\Delta/g, '∆')
    // 处理常见的数学表达式 - 自动检测并包装在数学模式中
    .replace(/(?<!\$)(\b[a-zA-Z]\s*[≠≤≥±×÷]\s*[a-zA-Z0-9]+\b)(?!\$)/g, '$$$1$$')
    .replace(/(?<!\$)(\b[a-zA-Z0-9]+\s*[≠≤≥±×÷]\s*[a-zA-Z0-9]+\b)(?!\$)/g, '$$$1$$')
    // 处理包含反斜杠的数学表达式
    .replace(/(?<!\$)([a-zA-Z]\s*\\[a-zA-Z]+\s*[0-9a-zA-Z]*\b)(?!\$)/g, '$$$1$$')
    // 修复上标和下标（在非数学模式中）
    .replace(/(?<!\$)(\w+)\^(\d+)(?!\$)/g, '$$$1^{$2}$$')
    .replace(/(?<!\$)(\w+)_(\d+)(?!\$)/g, '$$$1_{$2}$$')
    // 修复分数格式（在非数学模式中）
    .replace(/(?<!\$)(\d+)\/(\d+)(?!\$)/g, '$$\\frac{$1}{$2}$$')
    // 现在将符号转换回LaTeX格式（在数学模式内）
    .replace(/\$\$([^$]*)(≠)([^$]*)\$\$/g, '$$$$1\\neq$3$$')
    .replace(/\$\$([^$]*)(≤)([^$]*)\$\$/g, '$$$$1\\leq$3$$')
    .replace(/\$\$([^$]*)(≥)([^$]*)\$\$/g, '$$$$1\\geq$3$$')
    .replace(/\$\$([^$]*)(±)([^$]*)\$\$/g, '$$$$1\\pm$3$$')
    .replace(/\$\$([^$]*)(×)([^$]*)\$\$/g, '$$$$1\\times$3$$')
    .replace(/\$\$([^$]*)(÷)([^$]*)\$\$/g, '$$$$1\\div$3$$')
    .replace(/\$\$([^$]*)(∞)([^$]*)\$\$/g, '$$$$1\\infty$3$$')
    .replace(/\$\$([^$]*)(√)([^$]*)\$\$/g, '$$$$1\\sqrt$3$$')
    .replace(/\$\$([^$]*)(∆)([^$]*)\$\$/g, '$$$$1\\Delta$3$$')
    // 在内联数学模式中也应用相同的转换
    .replace(/\$([^$]*)(≠)([^$]*)\$/g, '$$$1\\neq$3$$')
    .replace(/\$([^$]*)(≤)([^$]*)\$/g, '$$$1\\leq$3$$')
    .replace(/\$([^$]*)(≥)([^$]*)\$/g, '$$$1\\geq$3$$')
    .replace(/\$([^$]*)(±)([^$]*)\$/g, '$$$1\\pm$3$$')
    .replace(/\$([^$]*)(×)([^$]*)\$/g, '$$$1\\times$3$$')
    .replace(/\$([^$]*)(÷)([^$]*)\$/g, '$$$1\\div$3$$')
    .replace(/\$([^$]*)(∞)([^$]*)\$/g, '$$$1\\infty$3$$')
    .replace(/\$([^$]*)(√)([^$]*)\$/g, '$$$1\\sqrt$3$$')
    .replace(/\$([^$]*)(∆)([^$]*)\$/g, '$$$1\\Delta$3$$')
    // 处理化学分子式（避免在已有数学模式中重复处理）
    .replace(/(?<!\$)([A-Z][a-z]?)(\d+)(?!\$)/g, '$$$1_{$2}$$')
    // 清理多余的嵌套数学标记
    .replace(/\$\$\$+/g, '$$')
    .replace(/\$\$\$/g, '$');

  return processedContent;
};

export default function StreamingMarkdown({
  content,
  isStreaming = false,
  className = "",
}: StreamingMarkdownProps) {
  const [displayContent, setDisplayContent] = useState("");
  const [lastProcessedLength, setLastProcessedLength] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);

  // 对流式内容使用轻微的防抖，非流式内容立即更新
  const debouncedContent = useDebounce(content, isStreaming ? 100 : 0);

  // 实时处理新增内容 - 减少频繁更新避免抖动
  useEffect(() => {
    if (debouncedContent.length > lastProcessedLength) {
      // 只在内容有显著变化时才处理，避免频繁更新
      const contentDiff = debouncedContent.length - lastProcessedLength;
      if (contentDiff < 5 && isStreaming && displayContent) {
        // 对于小的增量更新，只更新长度，不重新渲染
        setLastProcessedLength(debouncedContent.length);
        return;
      }

      setIsProcessing(true);
      
      // 使用 requestAnimationFrame 确保在下一个渲染帧更新，减少抖动
      requestAnimationFrame(() => {
        const processedContent = preprocessContent(debouncedContent);
        
        // 批量更新状态，减少重渲染次数
        setDisplayContent(processedContent);
        setLastProcessedLength(debouncedContent.length);
        setIsProcessing(false);
      });
    } else if (debouncedContent.length < lastProcessedLength) {
      // 内容被重置
      setIsProcessing(true);
      requestAnimationFrame(() => {
        const processedContent = preprocessContent(debouncedContent);
        setDisplayContent(processedContent);
        setLastProcessedLength(debouncedContent.length);
        setIsProcessing(false);
      });
    }
  }, [debouncedContent, lastProcessedLength, isStreaming, displayContent]);

  // 流式结束时处理剩余内容
  useEffect(() => {
    if (
      !isStreaming &&
      content &&
      displayContent !== preprocessContent(content)
    ) {
      const processedContent = preprocessContent(content);
      setDisplayContent(processedContent);
      setLastProcessedLength(content.length);
    }
  }, [isStreaming, content, displayContent]);

  // 优化的markdown渲染配置
  const markdownComponents = useMemo(
    () => ({
      h1: (props: React.ComponentProps<"h1">) => (
        <h1
          className="text-2xl font-bold text-gray-900 dark:text-white border-b border-gray-200 pb-2 mb-4"
          {...props}
        />
      ),
      h2: (props: React.ComponentProps<"h2">) => (
        <h2
          className="text-xl font-semibold text-blue-600 dark:text-blue-400 mt-8 mb-4"
          {...props}
        />
      ),
      h3: (props: React.ComponentProps<"h3">) => (
        <h3
          className="text-lg font-semibold text-green-600 dark:text-green-400 mt-6 mb-3"
          {...props}
        />
      ),
      p: (props: React.ComponentProps<"p">) => (
        <p
          className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4"
          {...props}
        />
      ),
      ul: (props: React.ComponentProps<"ul">) => (
        <ul className="list-disc ml-6 space-y-2 my-4" {...props} />
      ),
      li: (props: React.ComponentProps<"li">) => (
        <li className="text-gray-700 dark:text-gray-300" {...props} />
      ),
    }),
    [],
  );

  return (
    <div className={`streaming-markdown ${className}`}>
      <div 
        className="prose prose-lg max-w-none dark:prose-invert"
        style={{ 
          minHeight: containerHeight || 'auto',
          transition: isStreaming ? 'none' : 'min-height 0.3s ease'
        }}
      >
        {displayContent ? (
          <div className="markdown-content">
            {/* 只在非流式模式下显示处理指示器，避免频繁闪烁 */}
            {isProcessing && !isStreaming && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                  <span>正在处理数学公式和格式...</span>
                </div>
              </div>
            )}
            
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={markdownComponents}
            >
              {displayContent}
            </ReactMarkdown>
          </div>
        ) : isStreaming ? (
          <div className="space-y-6">
            {/* 改进的加载指示器 */}
            <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm font-medium">AI正在生成教案内容...</p>
                <p className="text-xs mt-2 text-gray-400">
                  请稍候，内容将实时显示
                </p>
              </div>
            </div>
            
            {/* 骨架屏预览 - 固定高度避免抖动 */}
            <div className="opacity-40" style={{ minHeight: '400px' }}>
              <MarkdownSkeleton />
            </div>
          </div>
        ) : (
          <div style={{ minHeight: '400px' }}>
            <MarkdownSkeleton />
          </div>
        )}

        {/* 简化的流式指示器，减少视觉干扰 */}
        {isStreaming && displayContent && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-700 dark:text-green-300">
                生成中
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
