const { execSync } = require("child_process");
const os = require("os");

if (os.platform() === "linux") {
  // Linux 下自动用 xvfb-run
  execSync(
    'xvfb-run --auto-servernum --server-args="-screen 0 1024x768x24" node server.js',
    { stdio: "inherit" },
  );
} else {
  // macOS/Windows 直接运行
  execSync("node server.js", { stdio: "inherit" });
}
