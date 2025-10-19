const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration (you'll need to set these)
const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const hahaDir = path.join(__dirname, '..', 'haha');

// Field name normalization function
function normalizeFieldName(originalName) {
  let normalized = originalName;
  
  // 特殊课程缩写处理
  const courseAbbreviations = {
    '毛泽东思想和中国特色社会主义理论体系概论': 'maogai',
    '习近平新时代中国特色社会主义理论体系概论': 'xigai',
    '习近平新时代中国特色社会主义思想概论': 'xigai',
    '习近平新时代中国特色社会主义社会主义思想概论': 'xigai',
    '中国近现代史纲要': 'zhongguo_jinxiandaishi_gangyao'
  };
  
  // 先检查是否是需要缩写的课程
  if (courseAbbreviations[normalized]) {
    return courseAbbreviations[normalized];
  }
  
  // 其他字段名处理
  normalized = normalized
    .replace(/毛泽东思想和中国特色社会主义理论体系概论（实践环节））/g, 'maogai_shijian')
    .replace(/毛泽东思想和中国特色社会主义理论体系概论（实践环节）/g, 'maogai_shijian')
    .replace(/思想道德与法治（实践环节）/g, 'sixiang_daode_fazhi_shijian')
    .replace(/中国近现代史纲要（实践环节）/g, 'zhongguo_jinxiandaishi_shijian')
    .replace(/马克思主义基本原理（实践环节）/g, 'makesi_shijian')
    .replace(/Design & Build实训（智能）/g, 'design_build_zhineng')
    .replace(/Design & Build实训（电子）/g, 'design_build_dianzi')
    .replace(/Design & Build实训/g, 'design_build_shixun')
    .replace(/3D图形程序设计\*/g, 'graphics_3d_program')
    .replace(/无线射频识别\(RFID\) \*/g, 'rfid')
    .replace(/微波、毫米波与光传输\*/g, 'microwave_optical')
    .replace(/电信工程及管理专业导论/g, 'telecom_major_daolun')
    .replace(/电信工程及管理专业实习/g, 'telecom_major_internship')
    .replace(/电子信息工程专业导论/g, 'ee_major_daolun')
    .replace(/电子信息工程专业实习/g, 'ee_major_internship')
    .replace(/智能科学与技术专业实习/g, 'ai_major_internship')
    .replace(/物联网工程专业实习/g, 'iot_major_internship')
    .replace(/物联网技术导论\*/g, 'iot_daolun')
    .replace(/智能基础架构与数据架构\*/g, 'ai_data_arch')
    .replace(/交互式媒体设计\*/g, 'interactive_media')
    .replace(/深度学习与计算视觉\*/g, 'dl_computer_vision')
    .replace(/通信与网络课程设计/g, 'comm_network_design')
    .replace(/计算导论与程序设计课程设计/g, 'intro_prog_design')
    .replace(/数据结构与算法课程设计/g, 'ds_algo_design')
    .replace(/微处理器系统设计\*/g, 'microprocessor_design')
    .replace(/高级网络程序设计\*/g, 'advanced_network_prog')
    .replace(/数字系统设计\*/g, 'digital_system_design')
    .replace(/（上）/g, '_shang')
    .replace(/（下）/g, '_xia')
    .replace(/\(上\)/g, '_shang')
    .replace(/\(下\)/g, '_xia')
    .replace(/设计/g, 'sheji')
    .replace(/程序设计/g, 'chengxu_sheji')
    .replace(/专业/g, 'major')
    .replace(/实习/g, 'internship')
    .replace(/实验/g, 'shiyan')
    .replace(/实训/g, 'shixun')
    .replace(/课程设计/g, 'kecheng_sheji')
    .replace(/毕业设计/g, 'biye_sheji')
    .replace(/物理实验C/g, 'wuli_shiyan_c')
    .replace(/电路实验/g, 'dianlu_shiyan')
    .replace(/通信原理实验/g, 'tongxin_yuanli_shiyan')
    .replace(/计算机实习/g, 'jisuanji_internship')
    .replace(/电子工艺实习/g, 'dianzi_gongyi_internship')
    .replace(/JAVA高级语言程序设计\*/g, 'java_advanced_prog')
    .replace(/Java高级语言程序设计\*/g, 'java_advanced_prog')
    .replace(/高等数学A\(上\) \*/g, 'gaodeng_shuxue_a_shang')
    .replace(/高等数学A\(下\) \*/g, 'gaodeng_shuxue_a_xia')
    .replace(/大学物理D（上）\*/g, 'daxue_wuli_d_shang')
    .replace(/大学物理D（下）\*/g, 'daxue_wuli_d_xia')
    .replace(/大学物理D（上）/g, 'daxue_wuli_d_shang')
    .replace(/大学物理D（下）/g, 'daxue_wuli_d_xia')
    .replace(/大学物理C/g, 'daxue_wuli_c')
    .replace(/综合英语（上）/g, 'zonghe_yingyu_shang')
    .replace(/综合英语（下）/g, 'zonghe_yingyu_xia')
    .replace(/进阶听说（上）/g, 'jinjie_tingshuo_shang')
    .replace(/进阶听说（下）/g, 'jinjie_tingshuo_xia')
    .replace(/线性代数\*/g, 'xianxing_daishu')
    .replace(/工程数学\*/g, 'gongcheng_shuxue')
    .replace(/概率论与随机过程\*/g, 'gailun_suijiguocheng')
    .replace(/概率论与随机过程/g, 'gailun_suijiguocheng2')
    .replace(/概率论与数理统计/g, 'gailun_shuli_tongji')
    .replace(/程序设计基础\*/g, 'chengxu_sheji_jichu')
    .replace(/程序设计基础/g, 'chengxu_sheji_jichu2')
    .replace(/数据设计\*/g, 'shuju_sheji')
    .replace(/数字电路设计\*/g, 'shuzi_dianlu_sheji')
    .replace(/数字电路设计/g, 'shuzi_dianlu_sheji2')
    .replace(/数字信号处理\*/g, 'shuzi_xinhaochuli')
    .replace(/信号与系统\*/g, 'xinhao_xitong')
    .replace(/信号与系统/g, 'xinhao_xitong2')
    .replace(/电子系统基础\*/g, 'dianzi_xitong_jichu')
    .replace(/电子系统基础/g, 'dianzi_xitong_jichu2')
    .replace(/电子电路基础\*/g, 'dianzi_dianlu_jichu')
    .replace(/电子电路基础/g, 'dianzi_dianlu_jichu2')
    .replace(/人工智能导论\*/g, 'ai_daolun')
    .replace(/产品开发与管理\*/g, 'chanpin_kaifa_guanli')
    .replace(/产品开发与营销\*/g, 'chanpin_kaifa_yingxiao')
    .replace(/企业管理\*/g, 'qiye_guanli')
    .replace(/企业技术战略\*/g, 'qiye_jishu_zhanlue')
    .replace(/机器学习\*/g, 'jiqixuexi')
    .replace(/软件工程\*/g, 'ruanjian_gongcheng')
    .replace(/操作系统\*/g, 'caozuo_xitong')
    .replace(/数据库系统\*/g, 'shujuku_xitong')
    .replace(/嵌入式系统\*/g, 'qianrushi_xitong')
    .replace(/通信与网络\*/g, 'tongxin_wangluo')
    .replace(/中间件技术\*/g, 'zhongjianjian_jishu')
    .replace(/密码学与网络安全\*/g, 'mima_wangluo_anquan')
    .replace(/无线射频识别\*/g, 'rfid2')
    .replace(/无线传感器网络\*/g, 'wireless_sensor_network')
    .replace(/云计算\*/g, 'yun_jisuan')
    .replace(/物联网工程实践\*/g, 'iot_gongcheng_shijian')
    .replace(/互联网协议与网络\*/g, 'internet_protocol_network')
    .replace(/电磁场与电磁波\*/g, 'dianci_chang_bo')
    .replace(/多媒体基础\*/g, 'duomeiti_jichu')
    .replace(/数字音频基础\*/g, 'shuzi_yinpin_jichu')
    .replace(/高级变换\*/g, 'gaoji_bianhuan')
    .replace(/图形与视频处理\*/g, 'tuxing_shipin_chuli')
    .replace(/现代无线技术\*/g, 'xiandai_wuxian_jishu')
    .replace(/宽带技术与光纤\*/g, 'kuandai_jishu_guangxian')
    .replace(/通信原理I/g, 'tongxin_yuanli_1')
    .replace(/通信原理i/g, 'tongxin_yuanli_1b')
    .replace(/信息论/g, 'xinxilun')
    .replace(/计算机网络/g, 'jisuanji_wangluo')
    .replace(/计算方法/g, 'jisuan_fangfa')
    .replace(/形式语言与自动机/g, 'xingshi_yuyan_zidongji')
    .replace(/数据结构\*/g, 'shuju_jiegou')
    .replace(/数据结构/g, 'shuju_jiegou2')
    .replace(/数据挖掘/g, 'shuju_wajue')
    .replace(/推理与智能体\*/g, 'tuili_zhinengti')
    .replace(/视觉计算\*/g, 'shijue_jisuan')
    .replace(/神经网络与深度学习/g, 'shenjing_wangluo_shendu_xuexi')
    .replace(/智能游戏\*/g, 'zhineng_youxi')
    .replace(/认知机器人系统\*/g, 'renzhi_jiqiren_xitong')
    .replace(/自然语言处理/g, 'ziran_yuyan_chuli')
    .replace(/计算创新学\*/g, 'jisuan_chuangxin')
    .replace(/人工智能法律\*/g, 'ai_falv')
    .replace(/离散数学/g, 'lisan_shuxue')
    .replace(/体育基础/g, 'tiyu_jichu')
    .replace(/军事理论/g, 'junshi_lilun')
    .replace(/军训/g, 'junxun')
    .replace(/大学生心理健康/g, 'xinli_jiankang')
    .replace(/安全教育/g, 'anquan_jiaoyu')
    .replace(/思想道德与法治/g, 'sixiang_daode_fazhi')
    .replace(/马克思主义基本原理/g, 'makesi_jiben_yuanli')
    .replace(/形势与政策1/g, 'xingshi_zhengce_1')
    .replace(/形势与政策2/g, 'xingshi_zhengce_2')
    .replace(/形势与政策3/g, 'xingshi_zhengce_3')
    .replace(/形势与政策4/g, 'xingshi_zhengce_4')
    .replace(/形势与政策5/g, 'xingshi_zhengce_5')
    .replace(/学术交流技能1/g, 'xueshu_jiaoliu_1')
    .replace(/学术交流技能2/g, 'xueshu_jiaoliu_2')
    .replace(/个人发展计划1/g, 'geren_fazhan_1')
    .replace(/个人发展计划2/g, 'geren_fazhan_2')
    .replace(/个人发展计划3/g, 'geren_fazhan_3')
    .replace(/\*/g, '')
    .replace(/\s+/g, '_')
    .replace(/[()（）]/g, '')
    .replace(/-/g, '_')
    .replace(/&/g, '_and_')
    .replace(/\./g, '_')
    .replace(/#/g, '_hash_')
    .replace(/\+/g, '_plus_')
    .replace(/@/g, '_at_')
    .replace(/%/g, '_percent_')
    .replace(/\$/g, '_dollar_')
    .replace(/!/g, '_exclamation_')
    .replace(/\?/g, '_question_')
    .replace(/:/g, '_colon_')
    .replace(/;/g, '_semicolon_')
    .replace(/,/g, '_comma_')
    .replace(/'/g, '_quote_')
    .replace(/"/g, '_doublequote_')
    .replace(/</g, '_lt_')
    .replace(/>/g, '_gt_')
    .replace(/\[/g, '_lbracket_')
    .replace(/\]/g, '_rbracket_')
    .replace(/\{/g, '_lbrace_')
    .replace(/\}/g, '_rbrace_')
    .replace(/\|/g, '_pipe_')
    .replace(/\\/g, '_backslash_')
    .replace(/\//g, '_slash_')
    .replace(/~/g, '_tilde_')
    .replace(/`/g, '_backtick_')
    .replace(/\^/g, '_caret_')
    .replace(/=/g, '_equals_')
    .replace(/数字/g, 'shuzi')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  // 确保不以数字开头
  if (/^\d/.test(normalized)) {
    normalized = 'col_' + normalized;
  }
  
  // 确保不是SQL关键字
  const sqlKeywords = ['order', 'group', 'select', 'from', 'where', 'insert', 'update', 'delete', 'create', 'drop', 'alter', 'table', 'index', 'key', 'primary', 'foreign', 'constraint', 'null', 'not', 'unique', 'check', 'default', 'user', 'role', 'grant', 'revoke'];
  if (sqlKeywords.includes(normalized)) {
    normalized = normalized + '_field';
  }
  
  return normalized;
}

// Infer data type from sample values
function inferDataType(samples) {
  if (!samples || samples.length === 0) return 'TEXT';
  
  const nonEmptySamples = samples.filter(s => s !== null && s !== undefined && s !== '');
  if (nonEmptySamples.length === 0) return 'TEXT';
  
  const isAllNumbers = nonEmptySamples.every(s => {
    const num = Number(s);
    return !isNaN(num) && isFinite(num);
  });
  
  if (isAllNumbers) {
    const isAllIntegers = nonEmptySamples.every(s => {
      const num = Number(s);
      return Number.isInteger(num);
    });
    return isAllIntegers ? 'INTEGER' : 'REAL';
  }
  
  return 'TEXT';
}

// Create table SQL
function generateCreateTableSQL(tableName, fields) {
  const fieldDefinitions = fields.map(field => {
    return `  ${field.normalized} ${field.type}`;
  }).join(',\n');
  
  return `CREATE TABLE ${tableName} (
  id SERIAL PRIMARY KEY,
${fieldDefinitions}
);`;
}

// Process a single Excel file
async function processExcelFile(fileName) {
  console.log(`\n=== 处理文件: ${fileName} ===`);
  
  try {
    const filePath = path.join(hahaDir, fileName);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    if (jsonData.length === 0) {
      throw new Error('Excel文件为空');
    }
    
    const headers = Object.keys(jsonData[0]);
    const tableName = fileName.replace('.xlsx', '').toLowerCase();
    
    console.log(`表名: ${tableName}`);
    console.log(`原始表头数量: ${headers.length}`);
    console.log(`数据行数: ${jsonData.length}`);
    
    // Analyze fields
    const fields = headers.map(header => {
      const samples = jsonData.slice(0, 5).map(row => row[header]);
      const normalized = normalizeFieldName(header);
      const type = inferDataType(samples);
      
      return {
        original: header,
        normalized,
        type,
        samples
      };
    });
    
    console.log(`处理后字段数量: ${fields.length}`);
    
    // Generate CREATE TABLE SQL
    const createSQL = generateCreateTableSQL(tableName, fields);
    console.log('\n创建表 SQL:');
    console.log(createSQL);
    
    // Create table
    console.log('\n正在创建表...');
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createSQL });
    if (createError) {
      throw new Error(`创建表失败: ${createError.message}`);
    }
    console.log('✅ 表创建成功');
    
    // Import data in batches
    console.log('\n开始导入数据...');
    const batchSize = 100;
    const totalBatches = Math.ceil(jsonData.length / batchSize);
    
    for (let i = 0; i < totalBatches; i++) {
      const startIdx = i * batchSize;
      const endIdx = Math.min((i + 1) * batchSize, jsonData.length);
      const batch = jsonData.slice(startIdx, endIdx);
      
      // Transform data
      const transformedBatch = batch.map(row => {
        const transformedRow = {};
        for (const field of fields) {
          let value = row[field.original];
          
          // Handle data type conversion
          if (field.type === 'INTEGER') {
            value = value === '' ? null : parseInt(value);
            if (isNaN(value)) value = null;
          } else if (field.type === 'REAL') {
            value = value === '' ? null : parseFloat(value);
            if (isNaN(value)) value = null;
          } else {
            value = value === '' ? null : String(value);
          }
          
          transformedRow[field.normalized] = value;
        }
        return transformedRow;
      });
      
      const { error: insertError } = await supabase
        .from(tableName)
        .insert(transformedBatch);
      
      if (insertError) {
        throw new Error(`导入数据失败 (批次 ${i + 1}): ${insertError.message}`);
      }
      
      console.log(`✅ 批次 ${i + 1}/${totalBatches} 导入成功 (${batch.length} 行)`);
    }
    
    console.log(`\n🎉 ${tableName} 表重建和导入完成!`);
    console.log(`- 字段数量: ${fields.length}`);
    console.log(`- 导入行数: ${jsonData.length}`);
    
    return { success: true, tableName, fieldCount: fields.length, rowCount: jsonData.length };
    
  } catch (error) {
    console.error(`❌ 处理 ${fileName} 时出错:`, error.message);
    return { success: false, tableName: fileName.replace('.xlsx', '').toLowerCase(), error: error.message };
  }
}

// Main function
async function main() {
  console.log('开始重建表并导入数据...\n');
  
  const excelFiles = [
    'Cohort2023_Predictions_ai.xlsx',
    'Cohort2023_Predictions_ee.xlsx', 
    'Cohort2023_Predictions_iot.xlsx',
    'Cohort2023_Predictions_tewm.xlsx'
  ];
  
  const results = [];
  
  for (const fileName of excelFiles) {
    const result = await processExcelFile(fileName);
    results.push(result);
    
    if (!result.success) {
      console.log(`\n⚠️  ${fileName} 处理失败，停止继续处理其他文件`);
      break;
    }
    
    // 每个表之间暂停一下
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n=== 总结 ===');
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.tableName}: ${result.fieldCount}字段, ${result.rowCount}行`);
    } else {
      console.log(`❌ ${result.tableName}: ${result.error}`);
    }
  });
}

if (require.main === module) {
  main().catch(console.error);
}

