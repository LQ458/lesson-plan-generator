"use client";

import { useEffect, useRef, useState } from "react";

interface DiagramRendererProps {
  content: string;
  type: "mindmap" | "flowchart" | "timeline" | "gantt";
  className?: string;
}

export default function DiagramRenderer({
  content,
  className,
}: DiagramRendererProps) {
  const diagramRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!content || !diagramRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        // 清理容器
        if (diagramRef.current) {
          diagramRef.current.innerHTML = "";
        }

        // 初始化 Mermaid
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          fontFamily: "Arial, sans-serif",
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: "cardinal",
          },
          mindmap: {
            useMaxWidth: true,
          },
          timeline: {
            useMaxWidth: true,
          },
        });

        // 生成唯一ID
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 渲染图表
        const { svg } = await mermaid.render(id, content);

        if (diagramRef.current) {
          diagramRef.current.innerHTML = svg;

          // 设置SVG样式
          const svgElement = diagramRef.current.querySelector("svg");
          if (svgElement) {
            svgElement.style.maxWidth = "100%";
            svgElement.style.height = "auto";
            svgElement.style.display = "block";
            svgElement.style.margin = "0 auto";

            // 添加缩放支持
            svgElement.style.cursor = "zoom-in";
            svgElement.onclick = () => {
              if (svgElement.style.transform === "scale(1.5)") {
                svgElement.style.transform = "scale(1)";
                svgElement.style.cursor = "zoom-in";
              } else {
                svgElement.style.transform = "scale(1.5)";
                svgElement.style.cursor = "zoom-out";
                svgElement.style.transformOrigin = "center";
              }
            };
          }
        }
      } catch (error) {
        console.error("Mermaid 渲染错误:", error);
        setError(
          `图表渲染失败: ${error instanceof Error ? error.message : "未知错误"}`,
        );
      } finally {
        setIsLoading(false);
      }
    };

    // 添加延迟以确保DOM已准备就绪
    const timer = setTimeout(renderDiagram, 100);
    return () => clearTimeout(timer);
  }, [content]);

  if (isLoading) {
    return (
      <div
        className={`diagram-container ${className || ""}`}
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "300px", // 减少最小高度
          background: "white",
          borderRadius: "12px",
          padding: "20px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          overflow: "auto",
        }}
      >
        <div style={{ textAlign: "center", color: "#6b7280" }}>
          <div className="loading-spinner"></div>
          <div style={{ fontSize: "14px" }}>正在生成图表...</div>
          <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "5px" }}>
            首次加载可能需要几秒钟
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={diagramRef}
      className={`diagram-container ${className || ""}`}
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "300px",
        background: "white",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        overflow: "auto",
      }}
    />
  );
}
