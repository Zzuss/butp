#!/bin/bash

# 优化的依赖安装脚本
set -e

echo "📦 安装Node.js依赖..."

# 设置npm镜像源（使用淘宝镜像加速）
npm config set registry https://registry.npmmirror.com

# 跳过Puppeteer的Chromium下载，我们使用系统Chrome
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# 安装依赖（排除Puppeteer）
echo "安装基础依赖..."
npm install express cors helmet express-rate-limit compression --save

# 单独安装Puppeteer（跳过Chromium下载）
echo "安装Puppeteer（跳过Chromium下载）..."
npm install puppeteer --save

echo "✅ 依赖安装完成！"
