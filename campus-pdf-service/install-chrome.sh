#!/bin/bash

# Chrome安装脚本
set -e

echo "🌐 安装Google Chrome..."

# 检查是否已安装Chrome
if command -v google-chrome &> /dev/null; then
    echo "✅ Google Chrome已安装: $(google-chrome --version)"
    exit 0
fi

# 检查是否已安装Chromium
if command -v chromium-browser &> /dev/null; then
    echo "✅ Chromium已安装: $(chromium-browser --version)"
    echo "将使用Chromium作为PDF渲染引擎"
    exit 0
fi

echo "开始安装Google Chrome..."

# 更新包列表
sudo apt-get update

# 安装必要的依赖
sudo apt-get install -y wget gnupg

# 添加Google Chrome仓库
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list

# 更新包列表
sudo apt-get update

# 安装Google Chrome
sudo apt-get install -y google-chrome-stable

# 验证安装
if command -v google-chrome &> /dev/null; then
    echo "✅ Google Chrome安装成功: $(google-chrome --version)"
else
    echo "❌ Google Chrome安装失败，尝试安装Chromium..."
    sudo apt-get install -y chromium-browser
    if command -v chromium-browser &> /dev/null; then
        echo "✅ Chromium安装成功: $(chromium-browser --version)"
    else
        echo "❌ 浏览器安装失败"
        exit 1
    fi
fi

echo "🎉 浏览器安装完成！"
