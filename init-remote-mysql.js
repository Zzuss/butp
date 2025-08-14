// 远程MySQL初始化脚本
// 此脚本可以在Vercel或其他有网络访问权限的服务器上运行

const mysql = require('mysql2/promise');

const DATABASE_URL = 'mysql://butp_user_1:KLHb!*4_Dned45A23@rm-bp16jzf20rr04825zdo.mysql.rds.aliyuncs.com:3306/umami';

// 解析DATABASE_URL
function parseConnectionUrl(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 3306,
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.slice(1) // 移除开头的 /
  };
}

// Umami表结构SQL
const createTablesSql = `
-- 创建数据库
CREATE DATABASE IF NOT EXISTS umami CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE umami;

-- 用户表
CREATE TABLE IF NOT EXISTS account (
    user_id VARCHAR(36) NOT NULL DEFAULT (UUID()),
    username VARCHAR(255) NOT NULL,
    password VARCHAR(60) NOT NULL,
    email VARCHAR(320),
    is_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    PRIMARY KEY (user_id),
    UNIQUE KEY account_username_key (username),
    UNIQUE KEY account_email_key (email)
);

-- 网站表
CREATE TABLE IF NOT EXISTS website (
    website_id VARCHAR(36) NOT NULL DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    domain VARCHAR(500),
    share_id VARCHAR(50),
    rev_id INTEGER NOT NULL DEFAULT 0,
    user_id VARCHAR(36),
    team_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    PRIMARY KEY (website_id),
    KEY website_user_id_idx (user_id),
    KEY website_team_id_idx (team_id),
    KEY website_share_id_idx (share_id),
    KEY website_created_at_idx (created_at),
    CONSTRAINT website_user_id_fkey FOREIGN KEY (user_id) REFERENCES account (user_id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- 其他表省略以节省空间，完整版本在umami-mysql-schema.sql中

-- 插入默认管理员用户
INSERT INTO account (user_id, username, password, is_admin) VALUES 
(UUID(), 'admin', '$2b$10$BUli0c.muyCW1ErNJc3jL.vFRFtFJWrT8/GcYAl.8YVHW', true)
ON DUPLICATE KEY UPDATE username = username;
`;

async function initializeDatabase() {
  console.log('🚀 开始初始化阿里云RDS MySQL数据库...');
  
  const config = parseConnectionUrl(DATABASE_URL);
  console.log('连接配置:', {
    host: config.host,
    user: config.user,
    database: config.database
  });

  try {
    // 先连接到MySQL服务器（不指定数据库）
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password
    });
    
    console.log('✅ 连接到MySQL服务器成功');
    
    // 创建数据库
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${config.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ 数据库 ${config.database} 准备就绪`);
    
    // 使用umami数据库
    await connection.execute(`USE ${config.database}`);
    
    // 执行建表语句（这里只创建主要的表）
    const statements = [
      // Account表
      `CREATE TABLE IF NOT EXISTS account (
        user_id VARCHAR(36) NOT NULL DEFAULT (UUID()),
        username VARCHAR(255) NOT NULL,
        password VARCHAR(60) NOT NULL,
        email VARCHAR(320),
        is_admin BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        PRIMARY KEY (user_id),
        UNIQUE KEY account_username_key (username),
        UNIQUE KEY account_email_key (email)
      )`,
      
      // 插入默认管理员
      `INSERT INTO account (user_id, username, password, is_admin) VALUES 
       (UUID(), 'admin', '$2b$10$BUli0c.muyCW1ErNJc3jL.vFRFtFJWrT8/GcYAl.8YVHW', true)
       ON DUPLICATE KEY UPDATE username = username`
    ];
    
    for (const statement of statements) {
      await connection.execute(statement);
      console.log('✅ 执行SQL语句成功');
    }
    
    await connection.end();
    console.log('');
    console.log('🎉 数据库初始化完成！');
    console.log('🔑 默认登录信息:');
    console.log('   用户名: admin');
    console.log('   密码: umami');
    console.log('');
    console.log('📋 Vercel环境变量:');
    console.log(`   DATABASE_URL = ${DATABASE_URL}`);
    
  } catch (error) {
    console.error('❌ 初始化失败:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('');
      console.log('💡 这可能是IP白名单问题，建议：');
      console.log('   1. 在阿里云控制台将Vercel的IP范围添加到白名单');
      console.log('   2. 或者暂时添加 0.0.0.0/0 进行测试');
      console.log('   3. 检查子账户是否有足够权限');
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase, DATABASE_URL }; 