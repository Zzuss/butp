#!/usr/bin/env node

/**
 * 迁移本地培养方案文件到 Supabase Storage
 * 
 * 使用方法：
 * 1. 确保已安装依赖：npm install
 * 2. 确保 .env.local 包含正确的 Supabase 配置
 * 3. 运行：node scripts/migrate-education-plans.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 错误：请在 .env.local 中配置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const BUCKET_NAME = 'education-plans';

// 迁移函数
async function migrateEducationPlans() {
  console.log('🚀 开始迁移培养方案文件到 Supabase Storage...\n');

  // 检查本地文件目录
  const localDirectory = path.join(process.cwd(), 'public', 'Education_Plan_PDF');
  
  if (!fs.existsSync(localDirectory)) {
    console.log('📁 本地培养方案目录不存在，无需迁移');
    return;
  }

  // 获取本地文件列表
  const files = fs.readdirSync(localDirectory);
  const pdfFiles = files.filter(file => file.endsWith('.pdf'));

  if (pdfFiles.length === 0) {
    console.log('📄 本地目录中没有找到 PDF 文件');
    return;
  }

  console.log(`📋 找到 ${pdfFiles.length} 个 PDF 文件：`);
  pdfFiles.forEach(file => console.log(`   - ${file}`));
  console.log();

  // 检查并创建 Storage Bucket
  console.log('🗂️  检查 Supabase Storage Bucket...');
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('❌ 获取 Bucket 列表失败:', listError.message);
    return;
  }

  const bucketExists = buckets.find(bucket => bucket.name === BUCKET_NAME);
  
  if (!bucketExists) {
    console.log(`📦 Bucket "${BUCKET_NAME}" 不存在`);
    console.log('⚠️  请手动在 Supabase Dashboard 中创建 Bucket：');
    console.log('   1. 打开 Supabase Dashboard');
    console.log('   2. 进入 Storage → Buckets');
    console.log('   3. 创建新 Bucket：');
    console.log(`      - 名称：${BUCKET_NAME}`);
    console.log('      - Public：启用');
    console.log('      - 文件大小限制：50MB');
    console.log('      - 允许的文件类型：application/pdf');
    console.log('   4. 创建完成后重新运行此脚本');
    console.log('');
    
    // 尝试自动创建（可能会失败）
    console.log('🔄 尝试自动创建 Bucket...');
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['application/pdf'],
      fileSizeLimit: 50 * 1024 * 1024 // 50MB
    });
    
    if (createError) {
      console.error('❌ 自动创建失败:', createError.message);
      console.log('📝 请按照上述步骤手动创建 Bucket 后重新运行脚本');
      return;
    }
    console.log('✅ Bucket 自动创建成功');
  } else {
    console.log('✅ Bucket 已存在');
  }

  // 检查远程文件
  console.log('\n📡 检查远程文件...');
  const { data: remoteFiles, error: listFilesError } = await supabase.storage
    .from(BUCKET_NAME)
    .list('', { limit: 100 });

  if (listFilesError) {
    console.error('❌ 获取远程文件列表失败:', listFilesError.message);
    return;
  }

  const remoteFileNames = remoteFiles?.map(file => file.name) || [];
  console.log(`📊 远程已存在 ${remoteFileNames.length} 个文件`);

  // 迁移文件
  console.log('\n📤 开始上传文件...');
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const fileName of pdfFiles) {
    try {
      // 检查文件是否已存在
      if (remoteFileNames.includes(fileName)) {
        console.log(`⏭️  跳过已存在的文件: ${fileName}`);
        skipCount++;
        continue;
      }

      // 读取本地文件
      const filePath = path.join(localDirectory, fileName);
      const fileBuffer = fs.readFileSync(filePath);
      const stats = fs.statSync(filePath);

      console.log(`📤 上传: ${fileName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

      // 上传到 Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, fileBuffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf'
        });

      if (uploadError) {
        console.error(`❌ 上传失败 ${fileName}:`, uploadError.message);
        errorCount++;
      } else {
        console.log(`✅ 上传成功: ${fileName}`);
        successCount++;
      }

    } catch (error) {
      console.error(`❌ 处理文件失败 ${fileName}:`, error.message);
      errorCount++;
    }
  }

  // 显示迁移结果
  console.log('\n📊 迁移完成！');
  console.log(`✅ 成功上传: ${successCount} 个文件`);
  console.log(`⏭️  跳过已存在: ${skipCount} 个文件`);
  console.log(`❌ 上传失败: ${errorCount} 个文件`);

  if (successCount > 0) {
    console.log('\n🎉 文件迁移成功！现在您可以在生产环境中使用培养方案功能了。');
    console.log('\n📋 后续步骤：');
    console.log('1. 在生产环境中确保 Supabase 配置正确');
    console.log('2. 部署更新后的代码');
    console.log('3. 在 butp.tech 上测试培养方案功能');
  }

  // 生成公开链接供测试
  if (successCount > 0) {
    console.log('\n🔗 文件公开链接（用于测试）：');
    for (const fileName of pdfFiles) {
      if (!remoteFileNames.includes(fileName)) {
        const { data } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(fileName);
        console.log(`   ${fileName}: ${data.publicUrl}`);
      }
    }
  }
}

// 运行迁移
migrateEducationPlans().catch(error => {
  console.error('💥 迁移过程中发生错误:', error);
  process.exit(1);
});
