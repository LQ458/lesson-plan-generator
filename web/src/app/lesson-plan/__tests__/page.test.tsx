import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import LessonPlanPage from "../page";

// Mock fetch
global.fetch = jest.fn();

describe("LessonPlanPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders lesson plan form", () => {
    render(<LessonPlanPage />);

    expect(screen.getByText("课程计划生成器")).toBeInTheDocument();
    expect(screen.getByLabelText(/主题/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/年级/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/学科/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /生成课程计划/i }),
    ).toBeInTheDocument();
  });

  it("submits form with correct data", async () => {
    const mockResponse = {
      lessonPlan: "这是一个测试课程计划",
      references: [],
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<LessonPlanPage />);

    // 填写表单
    fireEvent.change(screen.getByLabelText(/主题/i), {
      target: { value: "数学基础" },
    });
    fireEvent.change(screen.getByLabelText(/年级/i), {
      target: { value: "小学三年级" },
    });
    fireEvent.change(screen.getByLabelText(/学科/i), {
      target: { value: "数学" },
    });

    // 提交表单
    fireEvent.click(screen.getByRole("button", { name: /生成课程计划/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/generate-lesson-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: "数学基础",
          grade: "小学三年级",
          subject: "数学",
        }),
      });
    });
  });

  it("displays error message on API failure", async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error("API Error"));

    render(<LessonPlanPage />);

    fireEvent.change(screen.getByLabelText(/主题/i), {
      target: { value: "测试主题" },
    });
    fireEvent.click(screen.getByRole("button", { name: /生成课程计划/i }));

    await waitFor(() => {
      expect(screen.getByText(/生成失败/i)).toBeInTheDocument();
    });
  });
});
