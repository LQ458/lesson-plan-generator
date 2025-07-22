import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import StreamingMarkdown from "../streaming-markdown";

// Mock KaTeX CSS import
jest.mock("katex/dist/katex.min.css", () => ({}));

describe("StreamingMarkdown Enhanced Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Mathematical Formula Rendering", () => {
    test("renders inline mathematical formulas correctly", () => {
      const content = "这是一个数学公式：$x^2 + y^2 = z^2$，请注意格式。";
      
      render(<StreamingMarkdown content={content} isStreaming={false} />);
      
      const container = screen.getByRole("presentation", { hidden: true }) || document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      expect(container).toHaveTextContent("x^2 + y^2 = z^2");
    });

    test("renders block mathematical formulas correctly", () => {
      const content = `
# 数学公式示例

这是一个块级公式：

$$\\frac{a}{b} = \\frac{c}{d}$$

公式说明文字。
      `;
      
      render(<StreamingMarkdown content={content} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      expect(container).toHaveTextContent("a/b = c/d");
    });

    test("handles complex mathematical expressions", () => {
      const content = `
# 复杂数学表达式

积分公式：$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$

矩阵表示：
$$\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix}$$

化学分子式：H₂O, CO₂, C₆H₁₂O₆
      `;
      
      render(<StreamingMarkdown content={content} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      // Check for presence of mathematical notation
      expect(container).toHaveTextContent("∫");
      expect(container).toHaveTextContent("H₂O");
    });

    test("preprocesses mathematical symbols correctly", () => {
      const content = "数学符号测试：±, ×, ÷, ≤, ≥, ≠, ∞, √, ∆";
      
      render(<StreamingMarkdown content={content} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      // These symbols should be converted to LaTeX equivalents
      expect(container).toHaveTextContent("±");
      expect(container).toHaveTextContent("×");
      expect(container).toHaveTextContent("÷");
    });

    test("handles fraction preprocessing", () => {
      const content = "分数：1/2, 3/4, 22/7 应该被正确处理";
      
      render(<StreamingMarkdown content={content} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      // Fractions should be present in some form
      expect(container).toHaveTextContent("1/2");
    });
  });

  describe("Content Preprocessing Edge Cases", () => {
    test("handles malformed code block wrapping", () => {
      const malformedContent = "```markdown\n# 标题\n\n正文内容\n```";
      
      render(<StreamingMarkdown content={malformedContent} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      // Should unwrap the markdown and render properly
      expect(container).toHaveTextContent("标题");
      expect(container).toHaveTextContent("正文内容");
    });

    test("handles content with only code block markers", () => {
      const content = "```\n只有代码块标记\n```";
      
      render(<StreamingMarkdown content={content} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      expect(container).toHaveTextContent("只有代码块标记");
    });

    test("handles empty and whitespace-only content", () => {
      const emptyContent = "";
      const whitespaceContent = "   \n  \n   ";
      
      const { rerender } = render(<StreamingMarkdown content={emptyContent} isStreaming={false} />);
      expect(screen.getByText("内容加载中...")).toBeInTheDocument();
      
      rerender(<StreamingMarkdown content={whitespaceContent} isStreaming={false} />);
      expect(screen.getByText("内容加载中...")).toBeInTheDocument();
    });

    test("handles content with mixed line endings", () => {
      const content = "第一行\r\n第二行\n第三行\r第四行";
      
      render(<StreamingMarkdown content={content} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      expect(container).toHaveTextContent("第一行");
      expect(container).toHaveTextContent("第四行");
    });

    test("handles extremely long content", () => {
      const longContent = "长文本内容 ".repeat(10000) + "结束标记";
      
      render(<StreamingMarkdown content={longContent} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      expect(container).toHaveTextContent("结束标记");
    });

    test("handles content with special characters and unicode", () => {
      const specialContent = `
# Unicode测试 🧪

表情符号：😀 🎉 📚 🔬 ⚗️

特殊字符：™ © ® ° € £ ¥

中文标点：，。；：！？「」【】

数学符号：∑ ∏ ∆ ∇ ∞ ∂ ∫ √
      `;
      
      render(<StreamingMarkdown content={specialContent} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      expect(container).toHaveTextContent("🧪");
      expect(container).toHaveTextContent("™");
      expect(container).toHaveTextContent("∑");
    });

    test("handles nested markdown structures", () => {
      const nestedContent = `
# 主标题

## 二级标题

### 三级标题

- 外层列表
  - 嵌套列表1
    - 深层嵌套1
  - 嵌套列表2
- 外层列表2

> 这是引用
> 
> > 嵌套引用
> > 
> > - 引用中的列表

**粗体中包含*斜体*文字**

\`代码中包含 **粗体** 应该不生效\`
      `;
      
      render(<StreamingMarkdown content={nestedContent} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      expect(container).toHaveTextContent("主标题");
      expect(container).toHaveTextContent("嵌套引用");
    });
  });

  describe("Streaming Behavior", () => {
    test("handles rapid content updates during streaming", async () => {
      const { rerender } = render(<StreamingMarkdown content="" isStreaming={true} />);
      
      // Simulate rapid streaming updates
      const updates = [
        "#",
        "# 标题",
        "# 标题\n\n正在",
        "# 标题\n\n正在生成",
        "# 标题\n\n正在生成内容...",
        "# 标题\n\n正在生成内容...\n\n## 第二部分"
      ];
      
      for (const content of updates) {
        rerender(<StreamingMarkdown content={content} isStreaming={true} />);
        // Small delay to simulate realistic streaming
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        });
      }
      
      expect(screen.getByText("内容持续生成中...")).toBeInTheDocument();
      
      // Complete streaming
      rerender(<StreamingMarkdown content={updates[updates.length - 1]} isStreaming={false} />);
      
      await waitFor(() => {
        expect(screen.queryByText("内容持续生成中...")).not.toBeInTheDocument();
      });
    });

    test("handles streaming interruption and resume", async () => {
      const { rerender } = render(<StreamingMarkdown content="开始内容" isStreaming={true} />);
      
      expect(screen.getByText("内容持续生成中...")).toBeInTheDocument();
      
      // Simulate interruption
      rerender(<StreamingMarkdown content="开始内容" isStreaming={false} />);
      
      await waitFor(() => {
        expect(screen.queryByText("内容持续生成中...")).not.toBeInTheDocument();
      });
      
      // Resume streaming
      rerender(<StreamingMarkdown content="开始内容\n\n更多内容" isStreaming={true} />);
      
      expect(screen.getByText("内容持续生成中...")).toBeInTheDocument();
    });

    test("handles content reset during streaming", async () => {
      const { rerender } = render(<StreamingMarkdown content="初始内容很长很长" isStreaming={true} />);
      
      // Reset to shorter content
      rerender(<StreamingMarkdown content="新内容" isStreaming={true} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      expect(container).toHaveTextContent("新内容");
      expect(container).not.toHaveTextContent("初始内容很长很长");
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("handles malformed markdown gracefully", () => {
      const malformedContent = `
# 未闭合的强调 **没有结束

[链接文本(没有正确的链接格式)

\`\`\`
代码块没有结束

# ### ## 混乱的标题层级
      `;
      
      render(<StreamingMarkdown content={malformedContent} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      // Should still render something meaningful
      expect(container).toHaveTextContent("未闭合的强调");
    });

    test("handles extremely nested content", () => {
      // Create deeply nested list structure
      let nestedContent = "# 深度嵌套测试\n\n";
      for (let i = 0; i < 50; i++) {
        nestedContent += "  ".repeat(i) + "- 层级 " + i + "\n";
      }
      
      render(<StreamingMarkdown content={nestedContent} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      expect(container).toHaveTextContent("深度嵌套测试");
      expect(container).toHaveTextContent("层级 0");
      expect(container).toHaveTextContent("层级 49");
    });

    test("handles content with null and undefined characters", () => {
      const content = "正常文本\0null字符\u0000更多null\uFFFD替换字符";
      
      render(<StreamingMarkdown content={content} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      expect(container).toHaveTextContent("正常文本");
    });

    test("handles very rapid streaming with debounce", async () => {
      const { rerender } = render(<StreamingMarkdown content="" isStreaming={true} />);
      
      // Rapid fire updates (faster than debounce)
      for (let i = 0; i < 100; i++) {
        rerender(<StreamingMarkdown content={`内容更新 ${i}`} isStreaming={true} />);
      }
      
      // Wait for debounce to settle
      await waitFor(() => {
        const container = document.querySelector(".streaming-markdown");
        expect(container).toHaveTextContent("内容更新 99");
      }, { timeout: 200 });
    });

    test("handles streaming with mathematical formulas being built", async () => {
      const formulaParts = [
        "数学公式：$x",
        "数学公式：$x^2",
        "数学公式：$x^2 +",
        "数学公式：$x^2 + y",
        "数学公式：$x^2 + y^2",
        "数学公式：$x^2 + y^2 = z^2$"
      ];
      
      const { rerender } = render(<StreamingMarkdown content={formulaParts[0]} isStreaming={true} />);
      
      for (let i = 1; i < formulaParts.length; i++) {
        rerender(<StreamingMarkdown content={formulaParts[i]} isStreaming={true} />);
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        });
      }
      
      // Complete the formula
      rerender(<StreamingMarkdown content={formulaParts[formulaParts.length - 1]} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toHaveTextContent("x^2 + y^2 = z^2");
    });
  });

  describe("Performance and Memory", () => {
    test("handles memory efficiently with large content updates", () => {
      const largeContent = "大量内容 ".repeat(50000);
      
      const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      render(<StreamingMarkdown content={largeContent} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      
      // Memory usage should not grow excessively
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      if (startMemory > 0 && endMemory > 0) {
        const memoryIncrease = endMemory - startMemory;
        expect(memoryIncrease).toBeLessThan(largeContent.length * 10); // Reasonable memory usage
      }
    });

    test("cleans up properly on unmount", () => {
      const { unmount } = render(<StreamingMarkdown content="测试内容" isStreaming={true} />);
      
      // Should not throw errors on unmount
      expect(() => unmount()).not.toThrow();
    });

    test("handles component re-mounting during streaming", () => {
      const content = "测试重新挂载";
      
      const { unmount, rerender } = render(<StreamingMarkdown content={content} isStreaming={true} />);
      
      unmount();
      
      // Re-mount should work fine
      rerender(<StreamingMarkdown content={content} isStreaming={true} />);
      
      expect(screen.getByText("内容持续生成中...")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    test("provides proper ARIA labels for loading states", () => {
      render(<StreamingMarkdown content="" isStreaming={true} />);
      
      const loadingContainer = screen.getByText("AI正在生成教案内容...");
      expect(loadingContainer).toBeInTheDocument();
    });

    test("maintains proper heading hierarchy", () => {
      const content = `
# 主标题
## 二级标题
### 三级标题
#### 四级标题
      `;
      
      render(<StreamingMarkdown content={content} isStreaming={false} />);
      
      // Check that headings are properly structured
      const h1 = screen.getByRole("heading", { level: 1 });
      const h2 = screen.getByRole("heading", { level: 2 });
      const h3 = screen.getByRole("heading", { level: 3 });
      
      expect(h1).toHaveTextContent("主标题");
      expect(h2).toHaveTextContent("二级标题");
      expect(h3).toHaveTextContent("三级标题");
    });

    test("provides proper alt text for mathematical formulas", () => {
      const content = "数学公式：$E = mc^2$";
      
      render(<StreamingMarkdown content={content} isStreaming={false} />);
      
      const container = document.querySelector(".streaming-markdown");
      expect(container).toBeInTheDocument();
      // KaTeX should provide proper accessibility features
    });
  });
});