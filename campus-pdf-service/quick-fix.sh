#!/bin/bash

echo "⚡ 快速修复PDF服务..."

# 方法1: 重新安装依赖
echo "🔧 方法1: 重新安装依赖"
echo "执行: bash install-fresh.sh"
echo ""

# 方法2: 检查当前目录
echo "🔍 方法2: 检查当前状态"
echo "当前目录: $(pwd)"
echo "package.json是否存在: $([ -f package.json ] && echo "✅ 存在" || echo "❌ 不存在")"
echo "node_modules是否存在: $([ -d node_modules ] && echo "✅ 存在" || echo "❌ 不存在")"

if [ -f package.json ]; then
    echo "📋 package.json内容:"
    cat package.json
fi

echo ""

# 方法3: 手动安装最小依赖
echo "🔧 方法3: 手动安装最小依赖"
echo "npm init -y"
echo "npm install express puppeteer"

echo ""
echo "请选择修复方法:"
echo "1) bash install-fresh.sh     # 完整重新安装"
echo "2) npm install              # 基于现有package.json安装"
echo "3) 手动安装最小依赖"

read -p "请选择 [1-3]: " choice

case $choice in
    1)
        echo "执行完整重新安装..."
        bash install-fresh.sh
        ;;
    2)
        echo "基于package.json安装..."
        export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
        npm config set registry https://registry.npmmirror.com
        npm install
        ;;
    3)
        echo "手动安装最小依赖..."
        export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
        npm config set registry https://registry.npmmirror.com
        npm init -y
        npm install express puppeteer
        ;;
    *)
        echo "无效选择"
        exit 1
        ;;
esac

echo ""
echo "🧪 安装完成后运行测试:"
echo "bash start-simple.sh"
