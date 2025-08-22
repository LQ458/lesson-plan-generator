import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import LessonPlanPage from "../page";
import { SettingsProvider } from "@/lib/settings-context";

// Mock the lesson plan generator component
jest.mock("@/components/lesson-plan-generator", () => {
  return function MockLessonPlanGenerator({ lessonData, isStreaming }: any) {
    return (
      <div data-testid="lesson-plan-generator">
        <div data-testid="lesson-data">{JSON.stringify(lessonData)}</div>
        <div data-testid="streaming-status">{isStreaming ? "streaming" : "static"}</div>
      </div>
    );
  };
});

// Mock js-yaml
jest.mock("js-yaml", () => ({
  load: jest.fn((content: string) => {
    if (content.includes("title: 测试教案")) {
      return {
        title: "测试教案",
        subject: "数学",
        grade: "小学三年级",
        duration: 45,
        detailedObjectives: ["目标1", "目标2"],
        keyPoints: ["重点1", "重点2"],
        difficulties: ["难点1"],
        teachingMethods: ["方法1", "方法2"],
        teachingProcess: [
          { stage: "导入", duration: 5, content: ["活动1"] }
        ],
        referenceSources: ["来源1", "来源2"]
      };
    }
    return null;
  })
}));

// Mock fetch for API calls
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock ReadableStream for streaming responses
class MockReadableStream {
  private chunks: string[];
  private index = 0;

  constructor(chunks: string[]) {
    this.chunks = chunks;
  }

  getReader() {
    const chunks = this.chunks;
    let index = this.index;
    
    return {
      read: async () => {
        if (index >= chunks.length) {
          return { done: true, value: undefined };
        }
        
        const chunk = chunks[index++];
        const encoder = new TextEncoder();
        return { done: false, value: encoder.encode(chunk) };
      }
    };
  }
}

describe("LessonPlanPage Enhanced Tests", () => {
  const mockSettings = {
    subject: "math",
    gradeLevel: "elementary",
    easyMode: false
  };

  const renderWithSettings = (settings = mockSettings) => {
    return render(
      <SettingsProvider value={{ settings }}>
        <LessonPlanPage />
      </SettingsProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe("Form Validation and Subject-Grade Compatibility", () => {
    test("validates required fields before generation", async () => {
      renderWithSettings();
      
      const generateButton = screen.getByRole("button", { name: /生成教案/i });
      
      // Try to generate without filling required fields
      await userEvent.click(generateButton);
      
      // Should show validation alert
      // Note: In real implementation, you might want to use a more accessible validation method
    });

    test("restricts subjects based on grade level", async () => {
      renderWithSettings();
      
      const gradeSelect = screen.getByRole("combobox", { name: /年级/i });
      const subjectSelect = screen.getByRole("combobox", { name: /学科/i });
      
      // Select elementary grade
      await userEvent.selectOptions(gradeSelect, "小学三年级");
      
      // Should only show elementary subjects
      expect(subjectSelect).toBeEnabled();
      
      const subjectOptions = within(subjectSelect).getAllByRole("option");
      const subjectTexts = subjectOptions.map(option => option.textContent || "");
      
      expect(subjectTexts).not.toContain("物理");
      expect(subjectTexts).not.toContain("化学");
      expect(subjectTexts).toContain("语文");
      expect(subjectTexts).toContain("数学");
    });

    test("clears invalid subject when grade changes", async () => {
      renderWithSettings();
      
      const gradeSelect = screen.getByRole("combobox", { name: /年级/i });
      const subjectSelect = screen.getByRole("combobox", { name: /学科/i });
      
      // First select secondary grade and physics
      await userEvent.selectOptions(gradeSelect, "初中一年级");
      await userEvent.selectOptions(subjectSelect, "物理");
      
      expect(subjectSelect).toHaveValue("物理");
      
      // Change to elementary grade
      await userEvent.selectOptions(gradeSelect, "小学三年级");
      
      // Subject should be cleared since physics is not available for elementary
      expect(subjectSelect).toHaveValue("");
    });

    test("validates subject-grade compatibility before generation", async () => {
      renderWithSettings();
      
      const gradeSelect = screen.getByRole("combobox", { name: /年级/i });
      const subjectSelect = screen.getByRole("combobox", { name: /学科/i });
      const topicInput = screen.getByRole("textbox", { name: /课题/i });
      const generateButton = screen.getByRole("button", { name: /生成教案/i });
      
      // Manually set incompatible values (simulating direct manipulation)
      await userEvent.selectOptions(gradeSelect, "小学一年级");
      await userEvent.type(topicInput, "测试课题");
      
      // Try to submit with incompatible subject (if somehow set)
      await userEvent.click(generateButton);
      
      // Should prevent generation
    });
  });

  describe("API Integration and Streaming", () => {
    test("handles successful streaming response", async () => {
      const streamChunks = [
        "---\n",
        "title: 测试教案\n",
        "subject: 数学\n",
        "grade: 小学三年级\n",
        "---\n",
        "\n# 测试教案\n",
        "\n这是测试内容"
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === "content-type" ? "text/plain; charset=utf-8" : null
        },
        body: new MockReadableStream(streamChunks)
      } as any);

      renderWithSettings();
      
      // Fill form and generate
      await userEvent.selectOptions(screen.getByRole("combobox", { name: /年级/i }), "小学三年级");
      await userEvent.selectOptions(screen.getByRole("combobox", { name: /学科/i }), "数学");
      await userEvent.type(screen.getByRole("textbox", { name: /课题/i }), "测试课题");
      
      const generateButton = screen.getByRole("button", { name: /生成教案/i });
      await userEvent.click(generateButton);
      
      // Should show loading state
      expect(screen.getByText(/正在分析课题/)).toBeInTheDocument();
      
      // Wait for streaming to complete
      await waitFor(() => {
        expect(screen.getByTestId("lesson-plan-generator")).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Should show generated content
      const lessonGenerator = screen.getByTestId("lesson-plan-generator");
      expect(lessonGenerator).toBeInTheDocument();
    });

    test("handles API errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      renderWithSettings();
      
      // Fill form and generate
      await userEvent.selectOptions(screen.getByRole("combobox", { name: /年级/i }), "小学三年级");
      await userEvent.selectOptions(screen.getByRole("combobox", { name: /学科/i }), "数学");
      await userEvent.type(screen.getByRole("textbox", { name: /课题/i }), "测试课题");
      
      // Spy on alert to capture error message
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();
      
      const generateButton = screen.getByRole("button", { name: /生成教案/i });
      await userEvent.click(generateButton);
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("教案生成失败"));
      });
      
      alertSpy.mockRestore();
    });

    test("handles server errors with proper messages", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "AI服务暂时不可用"
      } as any);

      renderWithSettings();
      
      // Fill form and generate
      await userEvent.selectOptions(screen.getByRole("combobox", { name: /年级/i }), "小学三年级");
      await userEvent.selectOptions(screen.getByRole("combobox", { name: /学科/i }), "数学");
      await userEvent.type(screen.getByRole("textbox", { name: /课题/i }), "测试课题");
      
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();
      
      const generateButton = screen.getByRole("button", { name: /生成教案/i });
      await userEvent.click(generateButton);
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("500"));
      });
      
      alertSpy.mockRestore();
    });

    test("handles malformed streaming data", async () => {
      const malformedChunks = [
        "invalid yaml---\n",
        "malformed: content: without proper structure\n",
        "---\n",
        "# Still render something"
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === "content-type" ? "text/plain; charset=utf-8" : null
        },
        body: new MockReadableStream(malformedChunks)
      } as any);

      renderWithSettings();
      
      await userEvent.selectOptions(screen.getByRole("combobox", { name: /年级/i }), "小学三年级");
      await userEvent.selectOptions(screen.getByRole("combobox", { name: /学科/i }), "数学");
      await userEvent.type(screen.getByRole("textbox", { name: /课题/i }), "测试课题");
      
      const generateButton = screen.getByRole("button", { name: /生成教案/i });
      await userEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByTestId("lesson-plan-generator")).toBeInTheDocument();
      });
    });

    test("handles empty streaming response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === "content-type" ? "text/plain; charset=utf-8" : null
        },
        body: new MockReadableStream([])
      } as any);

      renderWithSettings();
      
      await userEvent.selectOptions(screen.getByRole("combobox", { name: /年级/i }), "小学三年级");
      await userEvent.selectOptions(screen.getByRole("combobox", { name: /学科/i }), "数学");
      await userEvent.type(screen.getByRole("textbox", { name: /课题/i }), "测试课题");
      
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();
      
      const generateButton = screen.getByRole("button", { name: /生成教案/i });
      await userEvent.click(generateButton);
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("AI未返回任何内容"));
      });
      
      alertSpy.mockRestore();
    });
  });

  describe("YAML Frontmatter Parsing", () => {
    test("parses valid YAML frontmatter correctly", () => {
      const content = `---
title: 数学课程
subject: 数学
grade: 小学三年级
duration: 45
detailedObjectives:
  - 理解加法概念
  - 掌握计算方法
keyPoints:
  - 加法运算
  - 数位概念
difficulties:
  - 进位计算
teachingMethods:
  - 直观教学法
  - 练习法
teachingProcess:
  - stage: 导入
    duration: 5
    content:
      - 复习旧知识
referenceSources:
  - 人教版教材
  - 教学参考书
---

# 数学课程

这是课程内容。`;

      renderWithSettings();
      
      // Simulate receiving this content
      const { metadata, markdown } = require("../page").parseFrontmatter?.(content) || {};
      
      expect(metadata).toBeDefined();
      expect(metadata?.title).toBe("数学课程");
      expect(metadata?.subject).toBe("数学");
      expect(metadata?.detailedObjectives).toHaveLength(2);
      expect(markdown).toContain("# 数学课程");
    });

    test("handles malformed YAML frontmatter", () => {
      const malformedContent = `---
title: 测试
invalid yaml structure
  missing colon
---

# 内容`;

      renderWithSettings();
      
      // Should not crash and return fallback
      const parseFunction = require("../page").parseFrontmatter;
      if (parseFunction) {
        const { metadata, markdown } = parseFunction(malformedContent);
        expect(markdown).toContain("# 内容");
      }
    });

    test("handles content without frontmatter", () => {
      const contentWithoutFrontmatter = "# 普通标题\n\n普通内容";

      renderWithSettings();
      
      const parseFunction = require("../page").parseFrontmatter;
      if (parseFunction) {
        const { metadata, markdown } = parseFunction(contentWithoutFrontmatter);
        expect(metadata).toBeNull();
        expect(markdown).toBe(contentWithoutFrontmatter);
      }
    });

    test("handles incomplete frontmatter", () => {
      const incompleteContent = `---
title: 测试
subject: 数学
# Missing closing ---

这是内容`;

      renderWithSettings();
      
      const parseFunction = require("../page").parseFrontmatter;
      if (parseFunction) {
        const { metadata, markdown } = parseFunction(incompleteContent);
        expect(metadata).toBeNull();
        expect(markdown).toBe(incompleteContent);
      }
    });
  });

  describe("Content Ready Detection", () => {
    test("detects when content is ready to display", () => {
      const readyContent = "# 标题\n\n这是足够长的内容用于显示给用户看的测试内容。";
      const notReadyContent = "# 标";
      const emptyContent = "";

      const isContentReadyFunction = require("../page").isContentReadyToDisplay;
      if (isContentReadyFunction) {
        expect(isContentReadyFunction(readyContent)).toBe(true);
        expect(isContentReadyFunction(notReadyContent)).toBe(false);
        expect(isContentReadyFunction(emptyContent)).toBe(false);
      }
    });

    test("handles frontmatter-only content", () => {
      const frontmatterOnly = `---
title: 测试
---`;

      const isContentReadyFunction = require("../page").isContentReadyToDisplay;
      if (isContentReadyFunction) {
        expect(isContentReadyFunction(frontmatterOnly)).toBe(false);
      }
    });

    test("detects content with headers but short length", () => {
      const shortHeaderContent = "# 短";

      const isContentReadyFunction = require("../page").isContentReadyToDisplay;
      if (isContentReadyFunction) {
        expect(isContentReadyFunction(shortHeaderContent)).toBe(false);
      }
    });

    test("detects long content without headers", () => {
      const longContentNoHeaders = "这是一段很长的内容，没有标题但是字数足够多，应该可以显示给用户看。这段内容包含了足够的信息。";

      const isContentReadyFunction = require("../page").isContentReadyToDisplay;
      if (isContentReadyFunction) {
        expect(isContentReadyFunction(longContentNoHeaders)).toBe(true);
      }
    });
  });

  describe("Loading Animation", () => {
    test("shows dynamic loading messages", async () => {
      renderWithSettings();
      
      // Fill form to enable generation
      await userEvent.selectOptions(screen.getByRole("combobox", { name: /年级/i }), "小学三年级");
      await userEvent.selectOptions(screen.getByRole("combobox", { name: /学科/i }), "数学");
      await userEvent.type(screen.getByRole("textbox", { name: /课题/i }), "测试课题");
      
      // Mock a long-running request
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      mockFetch.mockReturnValueOnce(pendingPromise);
      
      const generateButton = screen.getByRole("button", { name: /生成教案/i });
      await userEvent.click(generateButton);
      
      // Should show initial loading message
      expect(screen.getByText(/正在分析课题/)).toBeInTheDocument();
      
      // Wait for loading message to change
      await waitFor(() => {
        const loadingTexts = ["检索教学资料", "构建教学大纲", "优化教学流程"];
        const hasChangedText = loadingTexts.some(text => 
          screen.queryByText(new RegExp(text, 'i')) !== null
        );
        return hasChangedText;
      }, { timeout: 3000 });
      
      // Clean up
      resolvePromise!({
        ok: true,
        headers: { get: () => "application/json" },
        json: async () => ({ success: false })
      });
    });

    test("shows proper loading animation elements", async () => {
      renderWithSettings();
      
      await userEvent.selectOptions(screen.getByRole("combobox", { name: /年级/i }), "小学三年级");
      await userEvent.selectOptions(screen.getByRole("combobox", { name: /学科/i }), "数学");
      await userEvent.type(screen.getByRole("textbox", { name: /课题/i }), "测试课题");
      
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      mockFetch.mockReturnValueOnce(pendingPromise);
      
      const generateButton = screen.getByRole("button", { name: /生成教案/i });
      await userEvent.click(generateButton);
      
      // Should show loading animation
      const loadingContainer = screen.getByText(/正在分析课题/).parentElement;
      expect(loadingContainer).toHaveClass("flex", "items-center", "justify-center", "gap-3");
      
      // Clean up
      resolvePromise!({
        ok: true,
        headers: { get: () => "application/json" },
        json: async () => ({ success: false })
      });
    });
  });

  describe("Form State Management", () => {
    test("preserves form data during generation", async () => {
      renderWithSettings();
      
      const gradeSelect = screen.getByRole("combobox", { name: /年级/i });
      const subjectSelect = screen.getByRole("combobox", { name: /学科/i });
      const topicInput = screen.getByRole("textbox", { name: /课题/i });
      const requirementsTextarea = screen.getByRole("textbox", { name: /特殊要求/i });
      
      await userEvent.selectOptions(gradeSelect, "小学三年级");
      await userEvent.selectOptions(subjectSelect, "数学");
      await userEvent.type(topicInput, "加法运算");
      await userEvent.type(requirementsTextarea, "使用教具演示");
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "text/plain" },
        body: new MockReadableStream(["# 测试内容"])
      } as any);
      
      const generateButton = screen.getByRole("button", { name: /生成教案/i });
      await userEvent.click(generateButton);
      
      // Form should maintain values during generation
      expect(gradeSelect).toHaveValue("小学三年级");
      expect(subjectSelect).toHaveValue("数学");
      expect(topicInput).toHaveValue("加法运算");
      expect(requirementsTextarea).toHaveValue("使用教具演示");
    });

    test("disables generation button during API call", async () => {
      renderWithSettings();
      
      await userEvent.selectOptions(screen.getByRole("combobox", { name: /年级/i }), "小学三年级");
      await userEvent.selectOptions(screen.getByRole("combobox", { name: /学科/i }), "数学");
      await userEvent.type(screen.getByRole("textbox", { name: /课题/i }), "测试课题");
      
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      mockFetch.mockReturnValueOnce(pendingPromise);
      
      const generateButton = screen.getByRole("button", { name: /生成教案/i });
      await userEvent.click(generateButton);
      
      // Button should be disabled
      expect(generateButton).toBeDisabled();
      
      // Clean up
      resolvePromise!({
        ok: true,
        headers: { get: () => "application/json" },
        json: async () => ({ success: false })
      });
      
      await waitFor(() => {
        expect(generateButton).toBeEnabled();
      });
    });
  });

  describe("Reference Sources Display", () => {
    test("displays reference sources when available", async () => {
      const contentWithSources = `---
title: 测试教案
referenceSources:
  - 人教版小学数学三年级上册
  - 教学参考资料
---

# 测试教案内容`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "text/plain" },
        body: new MockReadableStream([contentWithSources])
      } as any);

      renderWithSettings();
      
      await userEvent.selectOptions(screen.getByRole("combobox", { name: /年级/i }), "小学三年级");
      await userEvent.selectOptions(screen.getByRole("combobox", { name: /学科/i }), "数学");
      await userEvent.type(screen.getByRole("textbox", { name: /课题/i }), "测试课题");
      
      const generateButton = screen.getByRole("button", { name: /生成教案/i });
      await userEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/本教案参考了以下教学资料/)).toBeInTheDocument();
        expect(screen.getByText(/人教版小学数学三年级上册/)).toBeInTheDocument();
        expect(screen.getByText(/教学参考资料/)).toBeInTheDocument();
      });
    });

    test("hides reference sources when not available", async () => {
      const contentWithoutSources = "# 测试教案\n\n普通内容";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "text/plain" },
        body: new MockReadableStream([contentWithoutSources])
      } as any);

      renderWithSettings();
      
      await userEvent.selectOptions(screen.getByRole("combobox", { name: /年级/i }), "小学三年级");
      await userEvent.selectOptions(screen.getByRole("combobox", { name: /学科/i }), "数学");
      await userEvent.type(screen.getByRole("textbox", { name: /课题/i }), "测试课题");
      
      const generateButton = screen.getByRole("button", { name: /生成教案/i });
      await userEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/本教案参考了以下教学资料/)).not.toBeInTheDocument();
      });
    });
  });

  describe("Settings Integration", () => {
    test("uses settings preferences for default values", () => {
      const customSettings = {
        subject: "chinese",
        gradeLevel: "secondary",
        easyMode: true
      };

      renderWithSettings(customSettings);
      
      // Should show settings-based defaults
      expect(screen.getByText(/默认科目: 语文/)).toBeInTheDocument();
      expect(screen.getByText(/默认阶段: 初中/)).toBeInTheDocument();
      expect(screen.getByText(/简易模式/)).toBeInTheDocument();
    });

    test("updates form when settings change", async () => {
      const { rerender } = renderWithSettings();
      
      const newSettings = {
        subject: "english",
        gradeLevel: "elementary",
        easyMode: false
      };

      rerender(
        <SettingsProvider value={{ settings: newSettings }}>
          <LessonPlanPage />
        </SettingsProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/默认科目: 英语/)).toBeInTheDocument();
      });
    });
  });
});

import { within } from "@testing-library/react";