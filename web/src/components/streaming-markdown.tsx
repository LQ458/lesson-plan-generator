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

  return processedContent;
};

export default function StreamingMarkdown({
  content,
  isStreaming = false,
  className = "",
}: StreamingMarkdownProps) {
  const [displayContent, setDisplayContent] = useState("");
  const [lastProcessedLength, setLastProcessedLength] = useState(0);

  // 对流式内容使用轻微的防抖，非流式内容立即更新
  const debouncedContent = useDebounce(content, isStreaming ? 50 : 0);

  // 实时处理新增内容
  useEffect(() => {
    if (debouncedContent.length > lastProcessedLength) {
      if (isStreaming) {
        // 流式模式：直接更新显示内容，不需要复杂的行处理
        const processedContent = preprocessContent(debouncedContent);
        setDisplayContent(processedContent);
        setLastProcessedLength(debouncedContent.length);
      } else {
        // 非流式模式：处理全部内容
        const processedContent = preprocessContent(debouncedContent);
        setDisplayContent(processedContent);
        setLastProcessedLength(debouncedContent.length);
      }
    } else if (debouncedContent.length < lastProcessedLength) {
      // 内容被重置
      const processedContent = preprocessContent(debouncedContent);
      setDisplayContent(processedContent);
      setLastProcessedLength(debouncedContent.length);
    }
  }, [debouncedContent, lastProcessedLength, isStreaming]);

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
  }, [isStreaming, content]);

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
      <div className="prose prose-lg max-w-none dark:prose-invert">
        {displayContent ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={markdownComponents}
          >
            {displayContent}
          </ReactMarkdown>
        ) : isStreaming ? (
          <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm">AI正在生成教案内容...</p>
              <p className="text-xs mt-2 text-gray-400">
                请稍候，内容将实时显示
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">内容加载中...</p>
        )}

        {/* 流式指示器 - 只在有内容且正在流式传输时显示 */}
        {isStreaming && displayContent && (
          <div className="flex items-center gap-2 mt-4 text-sm text-gray-500 border-t pt-4">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>内容持续生成中...</span>
          </div>
        )}
      </div>
    </div>
  );
}
