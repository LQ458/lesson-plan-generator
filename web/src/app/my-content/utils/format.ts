// format.ts
// 工具函数：日期格式化、难度颜色

/**
 * 格式化日期为中文简短格式
 */
export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 根据难度返回对应的颜色class
 */
export function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case "简单":
    case "easy":
      return "bg-green-100 text-green-800";
    case "中等":
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "困难":
    case "hard":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
