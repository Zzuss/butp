#!/bin/bash

echo "🔧 重新安装所有依赖..."

# 清理旧的安装
echo "🧹 清理旧的node_modules..."
rm -rf node_modules
rm -f package-lock.json

# 设置npm配置（使用国内镜像加速）
echo "⚙️ 配置npm镜像..."
npm config set registry https://registry.npmmirror.com
npm config set puppeteer_download_host https://cdn.npmmirror.com

# 跳过Puppeteer的Chromium下载（我们使用系统Chrome）
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

echo "📦 重新安装依赖..."

# 逐个安装依赖，避免网络问题
echo "安装Express..."
npm install express@^4.18.2 --save

echo "安装Puppeteer..."
npm install puppeteer@^21.0.0 --save

echo "安装其他依赖..."
npm install cors@^2.8.5 --save
npm install helmet@^7.0.0 --save
npm install express-rate-limit@^6.8.0 --save
npm install compression@^1.7.4 --save

echo "安装开发依赖..."
npm install nodemon@^3.0.0 --save-dev

echo "🔍 验证安装..."

# 检查关键模块
if node -e "require('express')" 2>/dev/null; then
    echo "✅ Express已安装"
else
    echo "❌ Express安装失败"
    exit 1
fi

if node -e "require('puppeteer')" 2>/dev/null; then
    echo "✅ Puppeteer已安装"
else
    echo "❌ Puppeteer安装失败"
    exit 1
fi

echo "✅ 所有依赖安装完成！"

# 显示安装的包
echo "📋 已安装的包:"
npm list --depth=0

echo ""
echo "🚀 现在可以启动服务:"
echo "bash start-simple.sh"
