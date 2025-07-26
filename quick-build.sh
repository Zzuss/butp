#!/bin/bash

# 快速构建脚本 - 只构建不部署
# 使用方法: bash quick-build.sh

echo "=== 快速构建CAS认证系统 ==="
echo ""

# 检查环境变量文件
if [ ! -f ".env.local" ]; then
    echo "⚠️  未找到 .env.local 文件"
    echo ""
    echo "请执行以下步骤配置环境变量："
    echo "1. 复制模板文件: cp env.template .env.local"
    echo "2. 编辑配置文件: nano .env.local"
    echo "3. 填入正确的 Supabase URL 和密钥"
    echo ""
    read -p "是否现在创建默认的 .env.local 文件? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp env.template .env.local
        echo "✅ 已创建 .env.local 文件"
        echo "⚠️  请编辑此文件并填入正确的 Supabase 配置"
        echo ""
    else
        echo "❌ 请先配置 .env.local 文件"
        exit 1
    fi
fi

# 安装依赖
echo "📦 安装依赖..."
npm install

# 构建项目
echo "🔨 构建项目..."
export NODE_ENV=production
npm run build

echo ""
echo "✅ 构建完成！"
echo ""
echo "接下来可以:"
echo "1. 本地测试: npm start"
echo "2. 完整部署: bash build-and-deploy.sh"
echo "3. 只上传代码: bash build-and-deploy.sh --local-only"
echo "" 