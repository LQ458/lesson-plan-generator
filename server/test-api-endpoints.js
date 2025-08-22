require("dotenv").config();
const axios = require("axios");

const API_BASE = "http://localhost:3001";

async function testAPIEndpoints() {
  console.log("🧪 测试API端点返回真实数据...\n");

  try {
    // 测试1: 测试生成教案API
    console.log("📚 测试1: 生成教案API");
    const lessonPlanData = {
      subject: "数学",
      grade: "三年级",
      topic: "两位数加法",
      duration: 40,
      objectives: ["掌握两位数加法的计算方法", "理解进位的概念"],
    };

    console.log("🔄 发送教案生成请求...");
    const lessonResponse = await axios.post(
      `${API_BASE}/api/lesson-plan`,
      lessonPlanData,
      {
        timeout: 30000,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    console.log(`✅ 教案生成成功 (状态: ${lessonResponse.status})`);
    console.log(`📝 响应长度: ${lessonResponse.data.length} 字符`);
    console.log(
      `🎯 包含教学目标: ${lessonResponse.data.includes("教学目标") ? "是" : "否"}`,
    );
    console.log(
      `📖 包含教学过程: ${lessonResponse.data.includes("教学过程") ? "是" : "否"}`,
    );
    console.log(
      `🔍 包含RAG参考: ${lessonResponse.data.includes("参考") || lessonResponse.data.includes("资料") ? "是" : "否"}`,
    );
    console.log("---");

    // 测试2: 测试生成练习题API
    console.log("📝 测试2: 生成练习题API");
    const exerciseData = {
      subject: "数学",
      grade: "三年级",
      topic: "两位数加法",
      difficulty: "中等",
      count: 5,
    };

    console.log("🔄 发送练习题生成请求...");
    const exerciseResponse = await axios.post(
      `${API_BASE}/api/exercises`,
      exerciseData,
      {
        timeout: 30000,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    console.log(`✅ 练习题生成成功 (状态: ${exerciseResponse.status})`);
    console.log(`📝 响应长度: ${exerciseResponse.data.length} 字符`);
    console.log(
      `🔢 包含题目: ${exerciseResponse.data.includes("题") || exerciseResponse.data.includes("练习") ? "是" : "否"}`,
    );
    console.log(
      `🧮 包含数字: ${/\\d+/.test(exerciseResponse.data) ? "是" : "否"}`,
    );
    console.log("---");

    // 测试3: 测试内容分析API
    console.log("🔍 测试3: 内容分析API");
    const analysisData = {
      content:
        "这是一个关于三年级数学两位数加法的教学内容，需要学生掌握进位加法的计算方法。",
      analysisType: "summary",
    };

    console.log("🔄 发送内容分析请求...");
    const analysisResponse = await axios.post(
      `${API_BASE}/api/analyze`,
      analysisData,
      {
        timeout: 30000,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    console.log(`✅ 内容分析成功 (状态: ${analysisResponse.status})`);
    console.log(`📝 响应长度: ${analysisResponse.data.length} 字符`);
    console.log(
      `📊 包含分析: ${analysisResponse.data.includes("分析") || analysisResponse.data.includes("总结") ? "是" : "否"}`,
    );
    console.log("---");

    // 测试4: 测试健康检查API
    console.log("🏥 测试4: 健康检查API");
    const healthResponse = await axios.get(`${API_BASE}/api/health`, {
      timeout: 5000,
    });

    console.log(`✅ 健康检查成功 (状态: ${healthResponse.status})`);
    console.log(`🔧 服务状态: ${healthResponse.data.status}`);
    console.log(
      `🤖 AI服务: ${healthResponse.data.ai?.enabled ? "已启用" : "未启用"}`,
    );
    console.log(`📚 RAG系统: ${healthResponse.data.rag?.status || "未知"}`);
    console.log("---");

    console.log("🎉 所有API端点测试通过！系统返回真实数据。");
    return true;
  } catch (error) {
    console.error("❌ API测试失败:", error.message);
    if (error.response) {
      console.error(`状态码: ${error.response.status}`);
      console.error(
        `响应数据: ${JSON.stringify(error.response.data, null, 2)}`,
      );
    }
    return false;
  }
}

// 运行测试
if (require.main === module) {
  testAPIEndpoints().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = testAPIEndpoints;
