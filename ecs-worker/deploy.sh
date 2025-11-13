#!/bin/bash

# 阿里云ECS部署脚本

echo "🚀 开始部署ECS工作进程..."

# 1. 更新系统包
sudo yum update -y

# 2. 安装Node.js (如果未安装)
if ! command -v node &> /dev/null; then
    echo "📦 安装Node.js..."
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
fi

# 3. 安装PM2 (如果未安装)
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装PM2..."
    sudo npm install -g pm2
fi

# 4. 创建应用目录
APP_DIR="/opt/butp-worker"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# 5. 复制文件
echo "📁 复制应用文件..."
cp -r ./* $APP_DIR/
cd $APP_DIR

# 6. 安装依赖
echo "📦 安装依赖..."
npm install --production

# 7. 创建日志目录
mkdir -p logs
mkdir -p temp

# 8. 设置环境变量
if [ ! -f .env ]; then
    echo "⚠️  请创建.env文件并配置环境变量"
    cp .env.example .env
    echo "请编辑 $APP_DIR/.env 文件"
    exit 1
fi

# 9. 启动服务
echo "🚀 启动服务..."
pm2 start ecosystem.config.js

# 10. 设置开机自启
pm2 startup
pm2 save

# 11. 配置防火墙（如果需要）
# sudo firewall-cmd --permanent --add-port=3000/tcp
# sudo firewall-cmd --reload

echo "✅ 部署完成！"
echo "📊 查看状态: pm2 status"
echo "📋 查看日志: pm2 logs butp-worker"
echo "🔄 重启服务: pm2 restart butp-worker"
