// 简单的通知函数
export const showNotification = (
  message: string,
  type: "success" | "error" = "success",
) => {
  const notificationDiv = document.createElement("div");
  notificationDiv.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 text-white ${
    type === "success" ? "bg-green-500" : "bg-red-500"
  }`;
  notificationDiv.textContent = message;
  document.body.appendChild(notificationDiv);

  setTimeout(() => {
    if (document.body.contains(notificationDiv)) {
      document.body.removeChild(notificationDiv);
    }
  }, 3000);
};
