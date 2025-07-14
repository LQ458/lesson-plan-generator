"use client";

import { useEffect, useRef, useState } from "react";

interface DiagramRendererProps {
  content: string;
  type: "mindmap" | "flowchart" | "timeline" | "gantt";
  className?: string;
}

// SVG sanitization function to prevent XSS
function sanitizeSvg(svgContent: string): string {
  // Remove script tags and their content
  let sanitized = svgContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove event handlers (onclick, onload, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: URLs that could contain scripts
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  sanitized = sanitized.replace(/data:application\/javascript/gi, '');
  
  // Remove external references that could be malicious
  sanitized = sanitized.replace(/<use[^>]*href\s*=\s*["'][^"']*["'][^>]*>/gi, '');
  
  return sanitized;
}

export default function DiagramRenderer({
  content,
  className,
}: DiagramRendererProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const effectRan = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [lastClickTime, setLastClickTime] = useState(0);

  useEffect(() => {
    // React 18 严格模式防护 - 防止useEffect双重执行
    if (effectRan.current) {
      return;
    }

    const renderDiagram = async () => {
      // 提前检查错误状态
      if (!content) {
        setError("没有图表内容可显示");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        setSvgContent("");

        // 等待组件完全挂载
        await new Promise((resolve) => setTimeout(resolve, 100));

        // 动态导入并初始化 Mermaid
        const mermaid = (await import("mermaid")).default;

        // 重置Mermaid状态
        mermaid.mermaidAPI.reset();

        // 重新初始化
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
        const id = `diagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 直接渲染获取SVG字符串，不使用临时DOM节点
        const { svg } = await mermaid.render(id, content);

        // 安全处理SVG内容
        const sanitizedSvg = sanitizeSvg(svg);

        // 设置SVG内容到状态中
        setSvgContent(sanitizedSvg);
      } catch (error) {
        console.error("Mermaid 渲染错误:", error);
        setError(
          `图表渲染失败: ${error instanceof Error ? error.message : "未知错误"}`,
        );
      } finally {
        setIsLoading(false);
      }
    };

    // 标记effect已执行，防止严格模式下的双重执行
    effectRan.current = true;

    // 延迟渲染确保DOM准备就绪
    const timer = setTimeout(renderDiagram, 100);

    return () => {
      clearTimeout(timer);
      // 重置标记，为下次内容变化做准备
      effectRan.current = false;
    };
  }, [content]);

  // 组件卸载时恢复背景滚动
  useEffect(() => {
    return () => {
      if (isFullscreen) {
        document.body.style.overflow = "";
      }
    };
  }, [isFullscreen]);

  const handleSvgClick = (e: React.MouseEvent) => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastClickTime;

    // 检测双击（500ms内的两次点击）
    if (timeDiff < 500 && timeDiff > 50) {
      // 双击处理
      if (isFullscreen) {
        toggleFullscreen(); // 双击退出全屏
      } else {
        toggleFullscreen(); // 双击进入全屏
      }
    } else {
      // 单击处理（非全屏模式下的缩放）
      if (!isFullscreen) {
        const svg = e.currentTarget as SVGElement;
        if (svg.style.transform === "scale(1.5)") {
          svg.style.transform = "scale(1)";
          svg.style.cursor = "zoom-in";
        } else {
          svg.style.transform = "scale(1.5)";
          svg.style.cursor = "zoom-out";
          svg.style.transformOrigin = "center";
        }
      }
    }

    setLastClickTime(currentTime);
  };

  // 处理滚轮缩放（仅在全屏模式下启用）
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation(); // 始终阻止事件冒泡

    if (!isFullscreen) {
      e.preventDefault(); // 非全屏时也阻止默认滚动
      return;
    }

    e.preventDefault();
    const delta = e.deltaY;
    setZoomScale((prev) => {
      const next = delta > 0 ? prev * 0.9 : prev * 1.1;
      return Math.max(0.2, Math.min(next, 5)); // 限制最大缩放为5倍
    });
  };

  // 切换全屏
  const toggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const newState = !prev;
      // 控制背景页面滚动
      if (newState) {
        // 进入全屏时禁用背景滚动
        document.body.style.overflow = "hidden";
      } else {
        // 退出全屏时恢复背景滚动
        document.body.style.overflow = "";
      }
      return newState;
    });
    setZoomScale(1);
  };

  // 手机端按钮操作
  const zoomIn = () => {
    setZoomScale((prev) => Math.min(prev * 1.2, 10));
  };

  const zoomOut = () => {
    setZoomScale((prev) => Math.max(prev * 0.8, 0.2));
  };

  const resetZoom = () => {
    setZoomScale(1);
  };

  const containerStyle: React.CSSProperties = isFullscreen
    ? {
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(255,255,255,0.95)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        touchAction: "none", // 禁用触摸默认行为
      }
    : {
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "300px",
        background: "white",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        overflow: "auto",
      };

  // 阻止触摸滑动事件
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isFullscreen) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // 阻止所有滚动事件传播
  const handleScroll = (e: React.UIEvent) => {
    if (isFullscreen) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div
      className={`diagram-container ${className || ""}`}
      style={containerStyle}
      onWheel={handleWheel}
      onTouchMove={handleTouchMove}
      onScroll={handleScroll}
    >
      {isLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "rgba(255,255,255,0.8)",
          }}
        >
          <div className="loading-spinner" />
          <div style={{ fontSize: "14px", color: "#6b7280", marginTop: "8px" }}>
            正在生成图表...
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "rgba(255,255,255,0.8)",
          }}
        >
          <div style={{ textAlign: "center", color: "#ef4444" }}>
            <div style={{ fontSize: "14px", marginBottom: "10px" }}>
              ⚠️ {error}
            </div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>
              请检查图表内容或稍后重试
            </div>
          </div>
        </div>
      )}

      {svgContent && !isLoading && !error && (
        <div
          onClick={isFullscreen ? handleSvgClick : undefined}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            height: "100%",
            overflow: isFullscreen ? "hidden" : "auto",
            cursor: isFullscreen ? "pointer" : "default",
          }}
        >
          <div
            dangerouslySetInnerHTML={{ __html: svgContent }}
            onClick={!isFullscreen ? handleSvgClick : undefined}
            style={{
              cursor: isFullscreen ? "grab" : "zoom-in",
              transform: `scale(${zoomScale})`,
              transformOrigin: "center",
              maxWidth: isFullscreen ? "none" : "100%",
              height: "auto",
              display: "block",
              transition: isFullscreen ? "transform 0.2s ease" : "none",
              pointerEvents: "all",
            }}
          />
        </div>
      )}

      {/* 全屏/退出按钮 - 增强移动端体验 */}
      {svgContent && !isLoading && !error && (
        <button
          onClick={toggleFullscreen}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFullscreen();
          }}
          style={{
            position: isFullscreen ? "fixed" : "absolute",
            top: isFullscreen ? 20 : 10,
            right: isFullscreen ? 20 : 10,
            zIndex: 1100,
            background: "rgba(0,0,0,0.8)",
            color: "#fff",
            border: "2px solid rgba(255,255,255,0.2)",
            borderRadius: "8px",
            padding: isFullscreen ? "12px 16px" : "8px 12px",
            fontSize: isFullscreen ? "14px" : "12px",
            cursor: "pointer",
            minWidth: isFullscreen ? "100px" : "80px",
            minHeight: isFullscreen ? "44px" : "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "manipulation",
            userSelect: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            transform: "none",
          }}
        >
          {isFullscreen ? "✕ 退出" : "⛶ 全屏"}
        </button>
      )}

      {/* 全屏时的额外退出选项 */}
      {svgContent && !isLoading && !error && isFullscreen && (
        <>
          {/* 左上角退出按钮 */}
          <button
            onClick={toggleFullscreen}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFullscreen();
            }}
            style={{
              position: "fixed",
              top: 20,
              left: 20,
              zIndex: 1100,
              background: "rgba(255,0,0,0.7)",
              color: "#fff",
              border: "none",
              borderRadius: "50%",
              width: "44px",
              height: "44px",
              fontSize: "20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              touchAction: "manipulation",
              userSelect: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            ✕
          </button>

          {/* 双击退出提示 */}
          <div
            style={{
              position: "fixed",
              top: 80,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1100,
              background: "rgba(0,0,0,0.7)",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "12px",
              opacity: 0.7,
              pointerEvents: "none",
            }}
          >
            双击图表或点击退出按钮可退出全屏
          </div>
        </>
      )}

      {/* 手机端控制按钮组 */}
      {svgContent && !isLoading && !error && isFullscreen && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1100,
            display: "flex",
            gap: "8px",
            background: "rgba(0,0,0,0.7)",
            borderRadius: "24px",
            padding: "8px 12px",
            pointerEvents: "auto",
          }}
        >
          <button
            onClick={zoomOut}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              zoomOut();
            }}
            style={{
              background: "transparent",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "20px",
              width: "40px",
              height: "40px",
              fontSize: "18px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              touchAction: "manipulation",
            }}
          >
            −
          </button>
          <button
            onClick={resetZoom}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              resetZoom();
            }}
            style={{
              background: "transparent",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "20px",
              padding: "8px 16px",
              fontSize: "12px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              touchAction: "manipulation",
            }}
          >
            {Math.round(zoomScale * 100)}%
          </button>
          <button
            onClick={zoomIn}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              zoomIn();
            }}
            style={{
              background: "transparent",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "20px",
              width: "40px",
              height: "40px",
              fontSize: "18px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              touchAction: "manipulation",
            }}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
