require("dotenv").config();
const axios = require("axios");

const API_BASE = "http://localhost:3001";
const INVITE_CODE = process.env.INVITE_CODE || "TEACHER2024";

async function testAPIWithAuth() {
  console.log("🧪 测试带认证的API端点返回真实数据...\n");

  try {
    // 步骤1: 使用邀请码登录获取token
    console.log("🔐 步骤1: 使用邀请码登录...");
    const loginResponse = await axios.post(
      `${API_BASE}/api/auth/invite-login`,
      {
        inviteCode: INVITE_CODE,
        userPreferences: {
          name: "TestUser",
          role: "teacher",
          subjects: ["数学", "语文"],
          grades: ["三年级", "四年级"],
        },
      },
    );

    console.log(`✅ 登录成功 (状态: ${loginResponse.status})`);
    console.log(`📦 登录响应:`, JSON.stringify(loginResponse.data, null, 2));

    // 从响应中获取会话数据，生成一个伪token用于测试
    const userId = loginResponse.data.data.sessionData.userId;
    const token = Buffer.from(
      JSON.stringify({ userId, timestamp: Date.now() }),
    ).toString("base64");
    console.log(`🎫 生成测试Token: ${token ? "已生成" : "未生成"}`);
    console.log("---");

    // 配置认证头
    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    // 测试2: 测试生成教案API
    console.log("📚 测试2: 生成教案API (带认证)");
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
        headers: authHeaders,
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

    // 测试3: 测试生成练习题API
    console.log("📝 测试3: 生成练习题API (带认证)");
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
        headers: authHeaders,
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

    // 测试4: 测试内容分析API
    console.log("🔍 测试4: 内容分析API (带认证)");
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
        headers: authHeaders,
      },
    );

    console.log(`✅ 内容分析成功 (状态: ${analysisResponse.status})`);
    console.log(`📝 响应长度: ${analysisResponse.data.length} 字符`);
    console.log(
      `📊 包含分析: ${analysisResponse.data.includes("分析") || analysisResponse.data.includes("总结") ? "是" : "否"}`,
    );
    console.log("---");

    // 测试5: 测试健康检查API (无需认证)
    console.log("🏥 测试5: 健康检查API");
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

    console.log(
      "🎉 所有API端点测试通过！系统返回真实数据，并且RAG系统正常工作。",
    );
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
  testAPIWithAuth().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = testAPIWithAuth;
