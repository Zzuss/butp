// MySQL连接测试 - 使用您的阿里云RDS信息
const mysql = require('mysql2/promise');

// 您的阿里云RDS MySQL配置
const config = {
  host: 'rm-bp16jzf20rr04825zdo.mysql.rds.aliyuncs.com',
  port: 3306,
  user: 'butp_user_1',
  password: 'KLHb!*4_Dned45A23',
  database: 'umami'  // 如果数据库名不是umami，请修改这里
};

// 构建DATABASE_URL（密码需要URL编码）
const encodedPassword = encodeURIComponent(config.password);
const DATABASE_URL = `mysql://${config.user}:${encodedPassword}@${config.host}:${config.port}/${config.database}`;

async function testConnection() {
  console.log('🔌 测试阿里云RDS MySQL连接...');
  console.log('配置信息:', {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database
  });
  console.log('');

  try {
    // 创建连接
    const connection = await mysql.createConnection(config);
    console.log('✅ 连接成功！');
    
    // 测试基本查询
    const [version] = await connection.execute('SELECT VERSION() as version');
    console.log('✅ MySQL版本:', version[0].version);
    
    // 检查数据库是否存在
    const [databases] = await connection.execute('SHOW DATABASES LIKE ?', [config.database]);
    if (databases.length === 0) {
      console.log(`⚠️  数据库 '${config.database}' 不存在，正在创建...`);
      await connection.execute(`CREATE DATABASE ${config.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`✅ 数据库 '${config.database}' 创建成功`);
    } else {
      console.log(`✅ 数据库 '${config.database}' 已存在`);
    }
    
    // 切换到umami数据库
    await connection.execute(`USE ${config.database}`);
    
    // 检查Umami表
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('✅ 数据库表数量:', tables.length);
    
    if (tables.length > 0) {
      console.log('📋 表列表:', tables.map(t => Object.values(t)[0]).join(', '));
      
      // 检查admin用户
      try {
        const [users] = await connection.execute('SELECT username, is_admin FROM account');
        console.log('✅ 用户数量:', users.length);
        if (users.length > 0) {
          console.log('👤 用户列表:', users.map(u => `${u.username}(${u.is_admin ? 'admin' : 'user'})`).join(', '));
        }
      } catch (err) {
        console.log('⚠️  account表可能不存在，需要运行初始化脚本');
      }
    } else {
      console.log('⚠️  没有找到表，需要运行初始化脚本');
    }
    
    await connection.end();
    console.log('');
    console.log('🎉 测试完成！数据库连接正常');
    console.log('');
    console.log('📋 用于Vercel的配置信息:');
    console.log('DATABASE_URL =', DATABASE_URL);
    console.log('');
    console.log('🔑 默认登录信息:');
    console.log('用户名: admin');
    console.log('密码: umami');
    
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    
    // 提供解决建议
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 解决建议:');
      console.log('   1. 检查阿里云RDS是否开启外网访问');
      console.log('   2. 检查安全组规则是否允许3306端口');
      console.log('   3. 检查IP白名单设置');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 解决建议:');
      console.log('   1. 检查子账户权限是否足够');
      console.log('   2. 确认密码是否正确');
      console.log('   3. 检查账户是否被锁定');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('💡 解决建议:');
      console.log('   1. 数据库不存在，脚本会自动创建');
      console.log('   2. 检查子账户是否有创建数据库的权限');
    }
  }
}

// 运行测试
testConnection(); 