#!/bin/bash

# Flutter iOS 开发同步脚本
# 使用方法: ./scripts/dev_sync.sh

echo "🚀 启动Flutter iOS开发环境同步..."

# 检查Flutter环境
if ! command -v flutter &> /dev/null; then
    echo "❌ Flutter未安装或未在PATH中"
    exit 1
fi

# 检查模拟器是否运行
if ! xcrun simctl list devices | grep "iPhone X" | grep "Booted" &> /dev/null; then
    echo "📱 启动iPhone X模拟器..."
    xcrun simctl boot "5AA0259F-98ED-4CCB-A948-84351C989AF0"
    sleep 5
fi

# 打开Xcode工作空间（如果需要）
if [ "$1" == "--xcode" ]; then
    echo "🛠️ 打开Xcode工作空间..."
    open ios/Runner.xcworkspace
    echo "⏳ 等待Xcode启动应用（30秒）..."
    sleep 30
fi

# 附加Flutter调试器
echo "🔗 附加Flutter调试器到运行中的应用..."
flutter attach -d "5AA0259F-98ED-4CCB-A948-84351C989AF0" --debug

echo "✅ 开发环境同步完成！"
echo "💡 现在你可以在Cursor中编辑代码，使用以下快捷键："
echo "   - Cmd+R: 热重载"
echo "   - Cmd+Shift+R: 热重启"
echo "   - r: 在终端中手动热重载"
echo "   - R: 在终端中手动热重启" 