 #!/bin/bash

# 快速修复iOS CocoaPods同步问题
# 使用方法: ./scripts/quick_ios_fix.sh

echo "🔧 开始修复iOS CocoaPods同步问题..."

# 确保在项目根目录
if [ ! -f "pubspec.yaml" ]; then
    echo "❌ 请在Flutter项目根目录下运行此脚本"
    exit 1
fi

# 步骤1: 清理Flutter缓存
echo "📦 清理Flutter缓存..."
flutter clean

# 步骤2: 更新依赖
echo "📱 更新Flutter依赖..."
flutter pub get

# 步骤3: 修复CocoaPods
echo "🍎 修复CocoaPods问题..."
cd ios

# 删除旧文件
rm -rf Pods Podfile.lock .symlinks

# 重新安装
pod install

cd ..

echo "✅ 修复完成！"
echo ""
echo "💡 现在可以运行："
echo "   flutter run -d ios          # iOS模拟器"
echo "   flutter run -d chrome       # Chrome浏览器"
echo ""