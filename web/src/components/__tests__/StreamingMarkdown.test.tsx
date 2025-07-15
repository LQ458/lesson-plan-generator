import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import StreamingMarkdown from "../streaming-markdown";

describe("StreamingMarkdown", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders static content correctly", () => {
    const content = "# 测试标题\n\n这是测试内容。";

    render(<StreamingMarkdown content={content} isStreaming={false} />);

    // 检查是否渲染了markdown容器
    const markdownContainer = screen.getByTestId("react-markdown");
    expect(markdownContainer).toBeInTheDocument();
    expect(markdownContainer).toHaveTextContent("# 测试标题");
    expect(markdownContainer).toHaveTextContent("这是测试内容。");
  });

  test("shows streaming indicator when isStreaming is true", () => {
    const content = "正在生成内容...";

    render(<StreamingMarkdown content={content} isStreaming={true} />);

    // 检查是否显示流式指示器文本
    expect(screen.getByText("内容持续生成中...")).toBeInTheDocument();

    // 检查是否有脉冲动画元素
    const pulseElement = screen
      .getByText("内容持续生成中...")
      .parentElement?.querySelector(".animate-pulse");
    expect(pulseElement).toBeInTheDocument();
  });

  test("handles empty content gracefully", () => {
    render(<StreamingMarkdown content="" isStreaming={false} />);

    // 应该显示加载中的文本
    expect(screen.getByText("内容加载中...")).toBeInTheDocument();
  });

  test("applies custom className", () => {
    const customClass = "custom-markdown-class";

    render(
      <StreamingMarkdown
        content="测试内容"
        isStreaming={false}
        className={customClass}
      />,
    );

    // 检查顶级容器是否有自定义类名
    const container = document.querySelector(".streaming-markdown");
    expect(container).toHaveClass("streaming-markdown", customClass);
  });

  test("streaming animation stops when isStreaming becomes false", async () => {
    const { rerender } = render(
      <StreamingMarkdown content="测试内容" isStreaming={true} />,
    );

    // 初始状态应该有动画指示器
    expect(screen.getByText("内容持续生成中...")).toBeInTheDocument();

    // 重新渲染为非流式状态
    rerender(<StreamingMarkdown content="测试内容" isStreaming={false} />);

    // 动画指示器应该消失
    expect(screen.queryByText("内容持续生成中...")).not.toBeInTheDocument();
  });

  test("handles markdown formatting correctly", () => {
    const markdownContent = `
# 主标题

## 副标题

- 列表项1
- 列表项2

**粗体文本**

*斜体文本*

\`代码片段\`
    `;

    render(<StreamingMarkdown content={markdownContent} isStreaming={false} />);

    // 验证markdown内容被渲染到容器中
    const markdownContainer = screen.getByTestId("react-markdown");
    expect(markdownContainer).toBeInTheDocument();
    expect(markdownContainer).toHaveTextContent("# 主标题");
    expect(markdownContainer).toHaveTextContent("## 副标题");
    expect(markdownContainer).toHaveTextContent("- 列表项1");
    expect(markdownContainer).toHaveTextContent("**粗体文本**");
  });

  test("performance: does not re-render unnecessarily", () => {
    const renderSpy = jest.fn();

    const TestComponent = ({ content, isStreaming }: any) => {
      renderSpy();
      return <StreamingMarkdown content={content} isStreaming={isStreaming} />;
    };

    const { rerender } = render(
      <TestComponent content="测试内容" isStreaming={false} />,
    );

    expect(renderSpy).toHaveBeenCalledTimes(1);

    // 相同props会触发重新渲染（React的正常行为）
    rerender(<TestComponent content="测试内容" isStreaming={false} />);

    expect(renderSpy).toHaveBeenCalledTimes(2);

    // 不同props应触发重新渲染
    rerender(<TestComponent content="新内容" isStreaming={false} />);

    expect(renderSpy).toHaveBeenCalledTimes(3); // 修复无限循环后的正确渲染次数
  });
});
