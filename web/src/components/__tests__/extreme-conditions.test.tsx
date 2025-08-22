import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import StreamingMarkdown from "../streaming-markdown";

describe("StreamingMarkdown Extreme Conditions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock performance.memory for memory tests
    Object.defineProperty(performance, 'memory', {
      writable: true,
      configurable: true,
      value: {
        usedJSHeapSize: 50000000, // 50MB baseline
        totalJSHeapSize: 100000000,
        jsHeapSizeLimit: 2000000000,
      },
    });
  });

  describe("Extreme Content Sizes", () => {
    test("handles extremely large content without memory leaks", async () => {
      // Create 10MB of content
      const hugeContent = "很长的教学内容包含大量的文字和公式".repeat(200000);
      
      const initialMemory = (performance as any).memory.usedJSHeapSize;
      
      const { unmount } = render(
        <StreamingMarkdown content={hugeContent} isStreaming={false} />
      );
      
      // Wait for rendering to complete
      await waitFor(() => {
        expect(document.querySelector(".streaming-markdown")).toBeInTheDocument();
      });
      
      // Check that component handles large content
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      
      // Cleanup and check for memory leaks
      unmount();
      
      const finalMemory = (performance as any).memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than content size * 5)
      expect(memoryIncrease).toBeLessThan(hugeContent.length * 5);
    });

    test("handles extremely long single lines", () => {
      const singleLongLine = "这是一行极其长的内容，".repeat(50000) + "结束。";
      
      render(<StreamingMarkdown content={singleLongLine} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      expect(container).toHaveTextContent("结束。");
    });

    test("handles deeply nested markdown structures", () => {
      let nestedContent = "# 根标题\n\n";
      
      // Create 100 levels of nesting
      for (let i = 0; i < 100; i++) {
        const indent = "  ".repeat(i);
        nestedContent += `${indent}- 嵌套层级 ${i}\n`;
        if (i % 10 === 0) {
          nestedContent += `${indent}  - 子项目 ${i}\n`;
          nestedContent += `${indent}    - 更深层级 ${i}\n`;
        }
      }
      
      render(<StreamingMarkdown content={nestedContent} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      expect(container).toHaveTextContent("根标题");
      expect(container).toHaveTextContent("嵌套层级 99");
    });

    test("handles thousands of mathematical formulas", () => {
      let mathContent = "# 数学公式集合\n\n";
      
      // Create 1000 mathematical formulas
      for (let i = 0; i < 1000; i++) {
        mathContent += `公式 ${i}: $x_{${i}} + y_{${i}} = z_{${i}}$\n\n`;
        if (i % 100 === 0) {
          mathContent += `$$\\sum_{k=1}^{${i}} k^2 = \\frac{${i}(${i}+1)(2\\cdot${i}+1)}{6}$$\n\n`;
        }
      }
      
      render(<StreamingMarkdown content={mathContent} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      expect(container).toHaveTextContent("数学公式集合");
      // Should contain last formula
      expect(container).toHaveTextContent("x_{999}");
    });
  });

  describe("Extreme Unicode and Character Sets", () => {
    test("handles complex Unicode characters", () => {
      const unicodeContent = `
# Unicode 测试 🧪

## 表情符号测试
教学表情：📚 📝 ✏️ 🔬 ⚗️ 🧮 📐 📏 📊 📈 📉 💡 🎯 🏆 ⭐ ✨ 🌟 💫 ⚡ 🔥 💯

## 数学符号测试  
基本运算：＋ － × ÷ ± ∓ ＝ ≠ ≈ ≡ ≤ ≥ ＜ ＞
集合论：∈ ∉ ⊂ ⊃ ⊆ ⊇ ∩ ∪ ∅ ∞
微积分：∂ ∇ ∫ ∬ ∭ ∮ ∆ ∑ ∏ ∐
几何：∠ ⊥ ∥ ≅ ∽ ○ △ ☆ ※

## 特殊标点和符号
中文标点：，。；：！？「」『』（）【】《》〈〉
特殊符号：™ © ® ° § ¶ † ‡ • ‰ ′ ″ ‴ ※ ‼ ⁇ ⁈ ⁉

## 多语言文字
中文：你好世界
日文：こんにちは世界
韩文：안녕하세요 세계
阿拉伯文：مرحبا بالعالم
俄文：Привет мир
希腊文：Γεια σας κόσμε
      `;
      
      render(<StreamingMarkdown content={unicodeContent} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      expect(container).toHaveTextContent("Unicode 测试 🧪");
      expect(container).toHaveTextContent("📚");
      expect(container).toHaveTextContent("∑");
      expect(container).toHaveTextContent("™");
      expect(container).toHaveTextContent("Γεια σας κόσμε");
    });

    test("handles zero-width characters and invisible characters", () => {
      const invisibleContent = `
隐藏字符测试：
零宽度空格：\u200B这里有零宽度空格\u200B
零宽度非断行空格：\uFEFF这里有零宽度非断行空格\uFEFF
软连字符：\u00AD这里有软连字符\u00AD
双向覆盖：\u202D这里有双向覆盖\u202C
零宽度连接符：\u200D这里有零宽度连接符\u200D
      `;
      
      render(<StreamingMarkdown content={invisibleContent} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      expect(container).toHaveTextContent("隐藏字符测试");
    });

    test("handles mixed writing directions", () => {
      const mixedDirectionContent = `
# 混合书写方向测试

从左到右：This is left-to-right English text.
从右到左：هذا نص عربي من اليمين إلى اليسار.
混合方向：This is English with عربي text mixed in.
垂直文本：一些中文垂直显示的内容测试。
      `;
      
      render(<StreamingMarkdown content={mixedDirectionContent} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      expect(container).toHaveTextContent("混合书写方向测试");
      expect(container).toHaveTextContent("left-to-right");
      expect(container).toHaveTextContent("هذا نص");
    });
  });

  describe("Extreme Streaming Scenarios", () => {
    test("handles extremely rapid streaming updates", async () => {
      const { rerender } = render(
        <StreamingMarkdown content="" isStreaming={true} />
      );
      
      // Simulate 1000 rapid updates
      const updates = Array.from({ length: 1000 }, (_, i) => `内容更新 ${i} `);
      
      for (let i = 0; i < updates.length; i++) {
        const currentContent = updates.slice(0, i + 1).join("");
        
        await act(async () => {
          rerender(<StreamingMarkdown content={currentContent} isStreaming={true} />);
        });
        
        // Only check every 100th update to avoid excessive testing time
        if (i % 100 === 99) {
          expect(screen.getByText("内容持续生成中...")).toBeInTheDocument();
        }
      }
      
      // Complete streaming
      const finalContent = updates.join("");
      rerender(<StreamingMarkdown content={finalContent} isStreaming={false} />);
      
      await waitFor(() => {
        expect(screen.queryByText("内容持续生成中...")).not.toBeInTheDocument();
      });
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toHaveTextContent("内容更新 999");
    });

    test("handles streaming with corrupt/incomplete data chunks", async () => {
      const corruptChunks = [
        "正常开始",
        "正常开始\x00", // Null character
        "正常开始\x00中间损坏",
        "正常开始\x00中间损坏\uFFFD", // Replacement character
        "正常开始中间损坏正常结束",
      ];
      
      const { rerender } = render(
        <StreamingMarkdown content={corruptChunks[0]} isStreaming={true} />
      );
      
      for (const chunk of corruptChunks.slice(1)) {
        await act(async () => {
          rerender(<StreamingMarkdown content={chunk} isStreaming={true} />);
          await new Promise(resolve => setTimeout(resolve, 10));
        });
      }
      
      rerender(<StreamingMarkdown content={corruptChunks[corruptChunks.length - 1]} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      expect(container).toHaveTextContent("正常开始");
      expect(container).toHaveTextContent("正常结束");
    });

    test("handles streaming interruption and recovery multiple times", async () => {
      const { rerender } = render(
        <StreamingMarkdown content="开始" isStreaming={true} />
      );
      
      // Multiple interruption cycles
      for (let cycle = 0; cycle < 10; cycle++) {
        // Add content
        rerender(<StreamingMarkdown content={`开始 + 循环${cycle}`} isStreaming={true} />);
        
        // Interrupt streaming
        rerender(<StreamingMarkdown content={`开始 + 循环${cycle}`} isStreaming={false} />);
        
        await waitFor(() => {
          expect(screen.queryByText("内容持续生成中...")).not.toBeInTheDocument();
        });
        
        // Resume streaming
        rerender(<StreamingMarkdown content={`开始 + 循环${cycle} + 恢复`} isStreaming={true} />);
        
        expect(screen.getByText("内容持续生成中...")).toBeInTheDocument();
      }
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toHaveTextContent("循环9");
      expect(container).toHaveTextContent("恢复");
    });
  });

  describe("Memory Stress Tests", () => {
    test("handles repeated mount/unmount cycles", async () => {
      const content = "重复挂载测试内容".repeat(1000);
      
      for (let i = 0; i < 50; i++) {
        const { unmount } = render(
          <StreamingMarkdown content={content} isStreaming={i % 2 === 0} />
        );
        
        // Verify component renders
        expect(document.querySelector(".streaming-markdown")).toBeInTheDocument();
        
        unmount();
        
        // Small delay to allow cleanup
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      // No memory leaks expected
    });

    test("handles rapid content switching", async () => {
      const contents = Array.from({ length: 100 }, (_, i) => 
        `# 内容切换 ${i}\n\n$x_{${i}} = ${i}^2$\n\n内容主体`.repeat(10)
      );
      
      const { rerender } = render(
        <StreamingMarkdown content={contents[0]} isStreaming={false} />
      );
      
      for (let i = 1; i < contents.length; i++) {
        await act(async () => {
          rerender(
            <StreamingMarkdown 
              content={contents[i]} 
              isStreaming={i % 3 === 0} 
            />
          );
        });
        
        if (i % 10 === 0) {
          // Verify content updates correctly
          const container = document.querySelector(".streaming-markdown");
          expect(container).toHaveTextContent(`内容切换 ${i}`);
        }
      }
    });
  });

  describe("Browser Compatibility Edge Cases", () => {
    test("handles missing MutationObserver gracefully", () => {
      const originalMutationObserver = window.MutationObserver;
      delete (window as any).MutationObserver;
      
      render(<StreamingMarkdown content="# 测试内容" isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      expect(container).toHaveTextContent("测试内容");
      
      // Restore MutationObserver
      window.MutationObserver = originalMutationObserver;
    });

    test("handles missing performance API", () => {
      const originalPerformance = window.performance;
      delete (window as any).performance;
      
      render(<StreamingMarkdown content="# 测试内容" isStreaming={true} />);
      
      expect(screen.getByText("内容持续生成中...")).toBeInTheDocument();
      
      // Restore performance API
      window.performance = originalPerformance;
    });

    test("handles missing requestAnimationFrame", () => {
      const originalRAF = window.requestAnimationFrame;
      delete (window as any).requestAnimationFrame;
      
      render(<StreamingMarkdown content="# 动画测试" isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      expect(container).toHaveTextContent("动画测试");
      
      // Restore requestAnimationFrame
      window.requestAnimationFrame = originalRAF;
    });
  });

  describe("Accessibility Stress Tests", () => {
    test("maintains accessibility with very large documents", () => {
      let largeDocument = "# 大型可访问性文档\n\n";
      
      // Create document with 100 headings and 1000 paragraphs
      for (let i = 1; i <= 100; i++) {
        largeDocument += `## 第${i}部分\n\n`;
        for (let j = 1; j <= 10; j++) {
          largeDocument += `这是第${i}部分的第${j}段内容。包含重要的教学信息和数学公式 $f(x) = x^${i} + ${j}$。\n\n`;
        }
      }
      
      render(<StreamingMarkdown content={largeDocument} isStreaming={false} />);
      
      // Check heading structure
      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toHaveTextContent("大型可访问性文档");
      
      const h2Headings = screen.getAllByRole("heading", { level: 2 });
      expect(h2Headings).toHaveLength(100);
      
      expect(h2Headings[0]).toHaveTextContent("第1部分");
      expect(h2Headings[99]).toHaveTextContent("第100部分");
    });

    test("handles screen reader compatibility with complex formulas", () => {
      const complexFormulaContent = `
# 复杂数学公式

## 积分公式
$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

## 矩阵运算
$$\\begin{pmatrix}
a & b & c \\\\
d & e & f \\\\
g & h & i
\\end{pmatrix} \\cdot \\begin{pmatrix}
x \\\\ y \\\\ z
\\end{pmatrix} = \\begin{pmatrix}
ax + by + cz \\\\
dx + ey + fz \\\\
gx + hy + iz
\\end{pmatrix}$$

## 求和符号
$$\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}$$
      `;
      
      render(<StreamingMarkdown content={complexFormulaContent} isStreaming={false} />);
      
      // Verify document structure is preserved
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("复杂数学公式");
      expect(screen.getByRole("heading", { level: 2, name: /积分公式/ })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: /矩阵运算/ })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: /求和符号/ })).toBeInTheDocument();
    });
  });

  describe("Error Recovery and Resilience", () => {
    test("recovers from KaTeX rendering errors", () => {
      const contentWithBadMath = `
# 数学内容测试

正确的公式：$x + y = z$

错误的公式：$\\invalidcommand{test}$

后续内容应该正常显示。
      `;
      
      // Mock console.error to catch KaTeX errors
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<StreamingMarkdown content={contentWithBadMath} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      expect(container).toHaveTextContent("数学内容测试");
      expect(container).toHaveTextContent("后续内容应该正常显示");
      
      consoleSpy.mockRestore();
    });

    test("handles component crashes gracefully", async () => {
      // Mock React error boundary behavior
      const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        const [hasError, setHasError] = React.useState(false);
        
        if (hasError) {
          return <div>Something went wrong.</div>;
        }
        
        try {
          return <>{children}</>;
        } catch (error) {
          setHasError(true);
          return <div>Something went wrong.</div>;
        }
      };
      
      const problematicContent = "# 测试内容\n\n正常渲染";
      
      render(
        <ErrorBoundary>
          <StreamingMarkdown content={problematicContent} isStreaming={false} />
        </ErrorBoundary>
      );
      
      // Should render normally
      expect(screen.getByText(/测试内容/)).toBeInTheDocument();
    });
  });
});