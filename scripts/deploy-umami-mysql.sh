#!/bin/bash

# Umami MySQL 自动部署脚本
# 用于快速部署一个使用MySQL数据库的Umami实例

set -e

echo "🚀 Umami MySQL 自动部署工具"
echo "============================="

# 检查必需的工具
command -v git >/dev/null 2>&1 || { echo "❌ 需要git命令" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ 需要Node.js" >&2; exit 1; }

# 配置参数
UMAMI_REPO="https://github.com/umami-software/umami.git"
WORK_DIR="./umami-mysql-deployment"
BRANCH="master"

# 提示用户输入MySQL配置
read -p "📋 请输入MySQL主机地址: " MYSQL_HOST
read -p "📋 请输入MySQL端口 (默认3306): " MYSQL_PORT
MYSQL_PORT=${MYSQL_PORT:-3306}
read -p "📋 请输入MySQL用户名: " MYSQL_USER
read -s -p "📋 请输入MySQL密码: " MYSQL_PASSWORD
echo
read -p "📋 请输入MySQL数据库名 (默认umami): " MYSQL_DATABASE
MYSQL_DATABASE=${MYSQL_DATABASE:-umami}

# 构建DATABASE_URL
DATABASE_URL="mysql://${MYSQL_USER}:$(node -pe "encodeURIComponent('${MYSQL_PASSWORD}')")@${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}?charset=utf8mb4"

echo
echo "🔍 配置确认:"
echo "   主机: ${MYSQL_HOST}"
echo "   端口: ${MYSQL_PORT}"
echo "   用户: ${MYSQL_USER}"
echo "   数据库: ${MYSQL_DATABASE}"
echo "   连接字符串: ${DATABASE_URL}"
echo

read -p "🤔 确认配置正确吗? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消部署"
    exit 1
fi

# 清理旧的工作目录
if [ -d "$WORK_DIR" ]; then
    echo "🧹 清理旧的工作目录..."
    rm -rf "$WORK_DIR"
fi

# 克隆Umami仓库
echo "📥 克隆Umami仓库..."
git clone --depth 1 --branch "$BRANCH" "$UMAMI_REPO" "$WORK_DIR"
cd "$WORK_DIR"

# 安装依赖
echo "📦 安装依赖..."
npm install

# 创建环境变量文件
echo "📝 创建环境变量文件..."
cat > .env << EOF
# MySQL数据库配置
DATABASE_URL=${DATABASE_URL}

# Umami配置
HASH_SALT=$(node -pe "require('crypto').randomBytes(32).toString('hex')")
DISABLE_LOGIN=0
IGNORE_HOSTNAME=0
IGNORE_IP=0

# 数据库连接优化
DATABASE_POOL_MIN=0
DATABASE_POOL_MAX=10
DATABASE_CONNECTION_TIMEOUT=60000
EOF

echo "✅ 环境变量文件已创建"

# 测试数据库连接
echo "🔌 测试数据库连接..."
cat > test-db.js << 'EOF'
const mysql = require('mysql2/promise');

async function testConnection() {
  const url = new URL(process.env.DATABASE_URL);
  const config = {
    host: url.hostname,
    port: url.port || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    charset: 'utf8mb4'
  };

  try {
    const connection = await mysql.createConnection(config);
    await connection.execute('SELECT 1');
    await connection.end();
    console.log('✅ 数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
EOF

# 运行数据库连接测试
if ! node test-db.js; then
    echo "❌ 数据库连接失败，请检查配置"
    exit 1
fi

# 初始化数据库
echo "🏗️  初始化数据库结构..."
if [ -f "sql/schema.mysql.sql" ]; then
    echo "📋 找到MySQL schema文件"
    # 这里需要用户手动执行SQL，因为需要命令行访问MySQL
    echo "💡 请在另一个终端执行以下命令来初始化数据库:"
    echo "   mysql -h ${MYSQL_HOST} -P ${MYSQL_PORT} -u ${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE} < sql/schema.mysql.sql"
    echo ""
    read -p "数据库初始化完成后，按回车键继续..." -r
else
    echo "⚠️  未找到MySQL schema文件，请手动创建表结构"
fi

# 构建应用
echo "🔨 构建应用..."
npm run build

# 生成部署配置
echo "📋 生成Vercel部署配置..."
cat > vercel.json << EOF
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "env": {
    "DATABASE_URL": "${DATABASE_URL}",
    "HASH_SALT": "$(node -pe "require('crypto').randomBytes(32).toString('hex')")",
    "DISABLE_LOGIN": "0",
    "IGNORE_HOSTNAME": "0",
    "IGNORE_IP": "0",
    "DATABASE_POOL_MIN": "0",
    "DATABASE_POOL_MAX": "10",
    "DATABASE_CONNECTION_TIMEOUT": "60000"
  }
}
EOF

# 生成package.json脚本
echo "📦 更新package.json..."
npm pkg set scripts.deploy="vercel --prod"

echo
echo "🎉 部署准备完成！"
echo "==================="
echo
echo "📋 接下来的步骤:"
echo "1. 安装Vercel CLI: npm i -g vercel"
echo "2. 登录Vercel: vercel login"
echo "3. 部署应用: vercel --prod"
echo "4. 设置域名 (可选)"
echo "5. 更新你的项目配置，使用新的Umami URL"
echo
echo "📂 工作目录: $(pwd)"
echo "🔧 环境变量文件: .env"
echo "⚙️  Vercel配置: vercel.json"
echo
echo "💡 部署后，别忘了:"
echo "   - 登录Umami管理界面"
echo "   - 添加你的网站"
echo "   - 更新tracking代码"
echo "   - 测试数据收集功能"

# 创建快速验证脚本
cat > verify-deployment.js << 'EOF'
const https = require('https');

const UMAMI_URL = process.argv[2];
if (!UMAMI_URL) {
  console.log('用法: node verify-deployment.js <UMAMI_URL>');
  process.exit(1);
}

console.log('🔍 验证Umami部署...');

const testEndpoints = [
  '/api/auth/login',
  '/api/heartbeat',
  '/login'
];

async function testEndpoint(path) {
  return new Promise((resolve) => {
    const url = `${UMAMI_URL}${path}`;
    https.get(url, (res) => {
      console.log(`✅ ${path}: ${res.statusCode}`);
      resolve(res.statusCode < 500);
    }).on('error', (err) => {
      console.log(`❌ ${path}: ${err.message}`);
      resolve(false);
    });
  });
}

async function verify() {
  console.log(`📡 测试URL: ${UMAMI_URL}`);
  
  let successCount = 0;
  for (const endpoint of testEndpoints) {
    if (await testEndpoint(endpoint)) {
      successCount++;
    }
  }
  
  console.log(`\n📊 测试结果: ${successCount}/${testEndpoints.length} 成功`);
  
  if (successCount === testEndpoints.length) {
    console.log('🎉 部署验证成功！');
  } else {
    console.log('⚠️  部分测试失败，请检查部署状态');
  }
}

verify();
EOF

echo "📋 验证脚本已创建: verify-deployment.js"
echo "用法: node verify-deployment.js https://your-umami.vercel.app"

echo
echo "🚀 准备就绪！开始部署吧！" 