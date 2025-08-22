const fetch = require("node-fetch");

async function testFavorites() {
  const baseUrl = "http://localhost:3001/api/content";

  try {
    console.log("🧪 测试收藏功能修复...\n");

    // 测试获取收藏列表
    console.log("1. 测试获取收藏列表...");
    const response = await fetch(`${baseUrl}/favorites`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // 注意：这里需要实际的认证cookie，在实际环境中会自动携带
      },
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ 收藏列表获取成功");
      console.log(`📊 收藏数量: ${data.data.favorites.length}`);

      if (data.data.favorites.length > 0) {
        const sample = data.data.favorites[0];
        console.log("📝 样本收藏记录:");
        console.log(`   - 类型: ${sample.contentType}`);
        console.log(`   - 内容ID: ${sample.contentId?._id || "N/A"}`);
        console.log(`   - 内容标题: ${sample.contentId?.title || "N/A"}`);
        console.log(`   - 内容存在: ${!!sample.contentId}`);

        // 测试取消收藏
        if (sample.contentId && sample.contentId._id) {
          console.log("\n2. 测试取消收藏...");
          const unfavoriteResponse = await fetch(
            `${baseUrl}/favorites/${sample.contentType}/${sample.contentId._id}`,
            {
              method: "DELETE",
              credentials: "include",
            },
          );

          if (unfavoriteResponse.ok) {
            console.log("✅ 取消收藏成功");

            // 重新添加收藏
            console.log("\n3. 测试重新添加收藏...");
            const addResponse = await fetch(`${baseUrl}/favorites`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                contentType: sample.contentType,
                contentId: sample.contentId._id,
              }),
            });

            if (addResponse.ok) {
              console.log("✅ 重新添加收藏成功");
            } else {
              console.log("❌ 重新添加收藏失败");
            }
          } else {
            console.log("❌ 取消收藏失败");
          }
        }
      } else {
        console.log("ℹ️ 暂无收藏记录");
      }
    } else {
      console.log("❌ 获取收藏列表失败:", response.status, response.statusText);
    }

    // 测试清理功能
    console.log("\n4. 测试清理孤立收藏记录...");
    const cleanupResponse = await fetch(`${baseUrl}/favorites/cleanup`, {
      method: "DELETE",
      credentials: "include",
    });

    if (cleanupResponse.ok) {
      const cleanupData = await cleanupResponse.json();
      console.log("✅ 清理完成");
      console.log(`📊 清理统计: ${cleanupData.message}`);
    } else {
      console.log("❌ 清理失败:", cleanupResponse.status);
    }
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
  }
}

// 延迟执行，等待服务器启动
setTimeout(testFavorites, 2000);
