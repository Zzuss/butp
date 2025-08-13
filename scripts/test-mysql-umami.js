#!/usr/bin/env node

/**
 * Umami MySQL 连接测试工具
 * 用于验证MySQL数据库连接和Umami表结构
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 配置信息
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'umami',
  charset: 'utf8mb4'
};

// 构建DATABASE_URL
const DATABASE_URL = `mysql://${MYSQL_CONFIG.user}:${encodeURIComponent(MYSQL_CONFIG.password)}@${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}/${MYSQL_CONFIG.database}?charset=utf8mb4`;

console.log('🚀 Umami MySQL 连接测试工具');
console.log('================================');
console.log('📋 配置信息:');
console.log(`   主机: ${MYSQL_CONFIG.host}`);
console.log(`   端口: ${MYSQL_CONFIG.port}`);
console.log(`   用户: ${MYSQL_CONFIG.user}`);
console.log(`   数据库: ${MYSQL_CONFIG.database}`);
console.log(`   连接字符串: ${DATABASE_URL}`);
console.log('');

async function testConnection() {
  let connection;
  
  try {
    console.log('🔌 测试数据库连接...');
    connection = await mysql.createConnection(MYSQL_CONFIG);
    console.log('✅ 数据库连接成功！');
    
    // 测试基本查询
    console.log('🔍 测试基本查询...');
    const [rows] = await connection.execute('SELECT VERSION() as version, NOW() as current_time');
    console.log(`✅ MySQL版本: ${rows[0].version}`);
    console.log(`✅ 当前时间: ${rows[0].current_time}`);
    
    // 检查数据库是否存在
    console.log('📚 检查数据库...');
    const [databases] = await connection.execute('SHOW DATABASES LIKE ?', [MYSQL_CONFIG.database]);
    if (databases.length === 0) {
      console.log(`⚠️  数据库 '${MYSQL_CONFIG.database}' 不存在，需要创建`);
      await connection.execute(`CREATE DATABASE ${MYSQL_CONFIG.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`✅ 数据库 '${MYSQL_CONFIG.database}' 创建成功`);
    } else {
      console.log(`✅ 数据库 '${MYSQL_CONFIG.database}' 已存在`);
    }
    
    // 切换到目标数据库
    await connection.execute(`USE ${MYSQL_CONFIG.database}`);
    
    // 检查Umami表结构
    console.log('🏗️  检查Umami表结构...');
    const requiredTables = ['account', 'session', 'website', 'website_event', 'session_data'];
    const [existingTables] = await connection.execute('SHOW TABLES');
    const existingTableNames = existingTables.map(row => Object.values(row)[0]);
    
    const missingTables = requiredTables.filter(table => !existingTableNames.includes(table));
    
    if (missingTables.length > 0) {
      console.log(`⚠️  缺少Umami表: ${missingTables.join(', ')}`);
      console.log('📝 你需要运行Umami的初始化脚本来创建表结构');
      console.log('   可以从这里获取: https://github.com/umami-software/umami/blob/master/sql/schema.mysql.sql');
    } else {
      console.log('✅ 所有Umami表都存在');
      
      // 检查表数据
      for (const table of requiredTables) {
        const [count] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   📊 ${table}: ${count[0].count} 条记录`);
      }
    }
    
    // 测试性能
    console.log('⚡ 测试查询性能...');
    const start = Date.now();
    await connection.execute('SELECT 1');
    const duration = Date.now() - start;
    console.log(`✅ 查询延迟: ${duration}ms ${duration < 100 ? '(优秀)' : duration < 500 ? '(良好)' : '(需要优化)'}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ 连接测试失败:', error.message);
    
    // 提供详细的错误分析
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 解决建议:');
      console.log('   1. 检查MySQL服务器是否运行');
      console.log('   2. 检查主机和端口是否正确');
      console.log('   3. 检查防火墙设置');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 解决建议:');
      console.log('   1. 检查用户名和密码是否正确');
      console.log('   2. 检查用户是否有数据库访问权限');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('💡 解决建议:');
      console.log('   1. 数据库不存在，需要先创建');
      console.log('   2. 检查数据库名称是否正确');
    }
    
    return false;
    
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function generateEnvExample() {
  console.log('📝 生成环境变量示例...');
  
  const envExample = `# Umami MySQL 环境变量配置
# 复制到你的 .env.local 文件

# MySQL 数据库配置
MYSQL_HOST=${MYSQL_CONFIG.host}
MYSQL_PORT=${MYSQL_CONFIG.port}
MYSQL_USER=${MYSQL_CONFIG.user}
MYSQL_PASSWORD=${MYSQL_CONFIG.password}
MYSQL_DATABASE=${MYSQL_CONFIG.database}

# Umami 环境变量 (用于Vercel部署)
DATABASE_URL=${DATABASE_URL}
HASH_SALT=replace-with-your-32-character-random-string

# 可选配置
DISABLE_LOGIN=0
IGNORE_HOSTNAME=0  
IGNORE_IP=0
DATABASE_POOL_MIN=0
DATABASE_POOL_MAX=10
DATABASE_CONNECTION_TIMEOUT=60000

# 删除这些PostgreSQL相关变量 (如果存在)
# DIRECT_DATABASE_URL=
# POSTGRES_*=
`;

  const envPath = path.join(__dirname, '..', 'umami-mysql.env.example');
  fs.writeFileSync(envPath, envExample);
  console.log(`✅ 环境变量示例已保存到: ${envPath}`);
}

async function downloadSchema() {
  console.log('📥 检查是否需要下载Umami MySQL schema...');
  
  const schemaPath = path.join(__dirname, '..', 'umami-mysql-schema.sql');
  
  if (!fs.existsSync(schemaPath)) {
    console.log('📥 正在下载Umami MySQL schema...');
    
    try {
      const https = require('https');
      const url = 'https://raw.githubusercontent.com/umami-software/umami/master/sql/schema.mysql.sql';
      
      const file = fs.createWriteStream(schemaPath);
      
      await new Promise((resolve, reject) => {
        https.get(url, (response) => {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      });
      
      console.log(`✅ Schema已下载到: ${schemaPath}`);
      console.log('💡 使用方法: mysql -h host -u user -p database < umami-mysql-schema.sql');
    } catch (error) {
      console.log('⚠️  无法自动下载schema，请手动从以下地址获取:');
      console.log('   https://github.com/umami-software/umami/blob/master/sql/schema.mysql.sql');
    }
  } else {
    console.log('✅ Schema文件已存在');
  }
}

// 主函数
async function main() {
  try {
    // 检查必需的配置
    if (!MYSQL_CONFIG.host || !MYSQL_CONFIG.user || !MYSQL_CONFIG.database) {
      console.log('❌ 缺少必需的配置信息');
      console.log('💡 请设置以下环境变量:');
      console.log('   MYSQL_HOST=your-mysql-host');
      console.log('   MYSQL_USER=your-mysql-user');
      console.log('   MYSQL_PASSWORD=your-mysql-password');
      console.log('   MYSQL_DATABASE=umami');
      console.log('');
      console.log('或者修改此脚本中的配置信息');
      process.exit(1);
    }
    
    // 执行测试
    const success = await testConnection();
    
    // 生成配置文件
    await generateEnvExample();
    
    // 下载schema文件
    await downloadSchema();
    
    console.log('');
    console.log('🎯 测试完成！');
    
    if (success) {
      console.log('✅ MySQL连接测试通过，可以进行Umami迁移');
      console.log('📋 下一步:');
      console.log('   1. 使用生成的环境变量配置Vercel');
      console.log('   2. 如果缺少表结构，先执行schema.sql');
      console.log('   3. 重新部署Umami应用');
    } else {
      console.log('❌ MySQL连接测试失败，请检查配置后重试');
    }
    
  } catch (error) {
    console.error('💥 脚本执行失败:', error);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { testConnection, MYSQL_CONFIG, DATABASE_URL }; 