"use client";

import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
        setDisplayContent(debouncedContent);
        setLastProcessedLength(debouncedContent.length);
      } else {
        // 非流式模式：处理全部内容
        setDisplayContent(debouncedContent);
        setLastProcessedLength(debouncedContent.length);
      }
    } else if (debouncedContent.length < lastProcessedLength) {
      // 内容被重置
      setDisplayContent(debouncedContent);
      setLastProcessedLength(debouncedContent.length);
    }
  }, [debouncedContent, lastProcessedLength, isStreaming]);

  // 流式结束时处理剩余内容
  useEffect(() => {
    if (!isStreaming && content && displayContent !== content) {
      setDisplayContent(content);
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
        <ul className="space-y-2 my-4" {...props} />
      ),
      li: (props: React.ComponentProps<"li">) => (
        <li
          className="text-gray-700 dark:text-gray-300 flex items-start"
          {...props}
        >
          <span className="text-blue-500 mr-2 mt-1">•</span>
          <div className="flex-1">{props.children}</div>
        </li>
      ),
      table: (props: React.ComponentProps<"table">) => (
        <div className="overflow-x-auto my-6">
          <table
            className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg"
            {...props}
          />
        </div>
      ),
      th: (props: React.ComponentProps<"th">) => (
        <th
          className="bg-gray-50 dark:bg-gray-800 p-3 text-left font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700"
          {...props}
        />
      ),
      td: (props: React.ComponentProps<"td">) => (
        <td
          className="p-3 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700"
          {...props}
        />
      ),
      code: (props: React.ComponentProps<"code">) => (
        <code
          className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono"
          {...props}
        />
      ),
      pre: (props: React.ComponentProps<"pre">) => (
        <pre
          className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto my-4"
          {...props}
        />
      ),
      blockquote: (props: React.ComponentProps<"blockquote">) => (
        <blockquote
          className="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-600 dark:text-gray-400"
          {...props}
        />
      ),
    }),
    [],
  );

  return (
    <div className={`streaming-markdown ${className}`}>
      <div className="prose prose-lg max-w-none dark:prose-invert">
        {displayContent ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
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
