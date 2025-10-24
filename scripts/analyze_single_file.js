const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const hahaDir = path.join(__dirname, '..', 'haha');

// Field name normalization function - 简化版本专门处理毛概、习概等
function normalizeFieldName(originalName) {
  let normalized = originalName;
  
  // 特殊课程缩写处理 - 重点处理毛概、习概
  const courseAbbreviations = {
    '毛泽东思想和中国特色社会主义理论体系概论': 'maogai',
    '习近平新时代中国特色社会主义理论体系概论': 'xigai', 
    '习近平新时代中国特色社会主义思想概论': 'xigai',
    '习近平新时代中国特色社会主义社会主义思想概论': 'xigai'
  };
  
  // 先检查是否是需要缩写的课程
  if (courseAbbreviations[normalized]) {
    return courseAbbreviations[normalized];
  }
  
  // 其他常见转换 - 保持相对简洁
  normalized = normalized
    .replace(/毛泽东思想和中国特色社会主义理论体系概论（实践环节））/g, 'maogai_shijian')
    .replace(/毛泽东思想和中国特色社会主义理论体系概论（实践环节）/g, 'maogai_shijian')
    .replace(/思想道德与法治（实践环节）/g, 'sixiang_daode_shijian')
    .replace(/中国近现代史纲要（实践环节）/g, 'zhongguo_jinxiandai_shijian')
    .replace(/马克思主义基本原理（实践环节）/g, 'makesi_shijian')
    .replace(/Design & Build实训（智能）/g, 'design_build_zhineng')
    .replace(/Design & Build实训（电子）/g, 'design_build_dianzi') 
    .replace(/Design & Build实训/g, 'design_build')
    .replace(/3D图形程序设计\*/g, 'graphics_3d_program')
    .replace(/无线射频识别\(RFID\) \*/g, 'rfid_tech')
    .replace(/微波、毫米波与光传输\*/g, 'microwave_optical')
    .replace(/智能科学与技术专业实习/g, 'ai_major_internship')
    .replace(/电子信息工程专业实习/g, 'ee_major_internship') 
    .replace(/物联网工程专业实习/g, 'iot_major_internship')
    .replace(/电信工程及管理专业实习/g, 'telecom_major_internship')
    .replace(/电子信息工程专业导论/g, 'ee_major_intro')
    .replace(/电信工程及管理专业导论/g, 'telecom_major_intro')
    .replace(/物联网技术导论\*/g, 'iot_tech_intro')
    .replace(/智能基础架构与数据架构\*/g, 'ai_data_arch')
    .replace(/交互式媒体设计\*/g, 'interactive_media')
    .replace(/深度学习与计算视觉\*/g, 'dl_computer_vision')
    .replace(/JAVA高级语言程序设计\*/g, 'java_advanced')
    .replace(/Java高级语言程序设计\*/g, 'java_advanced')
    .replace(/高等数学A\(上\) \*/g, 'advanced_math_a1')
    .replace(/高等数学A\(下\) \*/g, 'advanced_math_a2')
    .replace(/大学物理D（上）\*/g, 'physics_d1')
    .replace(/大学物理D（下）\*/g, 'physics_d2') 
    .replace(/大学物理D（上）/g, 'physics_d1')
    .replace(/大学物理D（下）/g, 'physics_d2')
    .replace(/大学物理C/g, 'physics_c')
    .replace(/综合英语（上）/g, 'english_1')
    .replace(/综合英语（下）/g, 'english_2')
    .replace(/进阶听说（上）/g, 'listening_1')
    .replace(/进阶听说（下）/g, 'listening_2')
    .replace(/线性代数\*/g, 'linear_algebra')
    .replace(/工程数学\*/g, 'engineering_math')
    .replace(/概率论与随机过程\*/g, 'probability_stochastic')
    .replace(/概率论与随机过程/g, 'probability_stochastic2')
    .replace(/概率论与数理统计/g, 'probability_statistics')
    .replace(/程序设计基础\*/g, 'programming_basic')
    .replace(/程序设计基础/g, 'programming_basic2')
    .replace(/数据设计\*/g, 'data_design')
    .replace(/数字电路设计\*/g, 'digital_circuit')
    .replace(/数字电路设计/g, 'digital_circuit2')
    .replace(/数字信号处理\*/g, 'digital_signal_proc')
    .replace(/信号与系统\*/g, 'signal_system')
    .replace(/信号与系统/g, 'signal_system2')
    .replace(/电子系统基础\*/g, 'electronic_system')
    .replace(/电子系统基础/g, 'electronic_system2')
    .replace(/电子电路基础\*/g, 'electronic_circuit')
    .replace(/电子电路基础/g, 'electronic_circuit2')
    .replace(/人工智能导论\*/g, 'ai_intro')
    .replace(/产品开发与管理\*/g, 'product_dev_mgmt')
    .replace(/产品开发与营销\*/g, 'product_dev_marketing')
    .replace(/企业管理\*/g, 'enterprise_mgmt')
    .replace(/机器学习\*/g, 'machine_learning')
    .replace(/软件工程\*/g, 'software_engineering')
    .replace(/操作系统\*/g, 'operating_system')
    .replace(/数据库系统\*/g, 'database_system')
    .replace(/嵌入式系统\*/g, 'embedded_system')
    .replace(/通信与网络\*/g, 'comm_network')
    .replace(/中间件技术\*/g, 'middleware_tech')
    .replace(/密码学与网络安全\*/g, 'crypto_security')
    .replace(/无线传感器网络\*/g, 'wireless_sensor')
    .replace(/云计算\*/g, 'cloud_computing')
    .replace(/物联网工程实践\*/g, 'iot_engineering')
    .replace(/互联网协议与网络\*/g, 'internet_protocol')
    .replace(/电磁场与电磁波\*/g, 'electromagnetic')
    .replace(/多媒体基础\*/g, 'multimedia_basic')
    .replace(/数字音频基础\*/g, 'digital_audio')
    .replace(/高级变换\*/g, 'advanced_transform')
    .replace(/图形与视频处理\*/g, 'graphics_video')
    .replace(/现代无线技术\*/g, 'modern_wireless')
    .replace(/宽带技术与光纤\*/g, 'broadband_fiber')
    .replace(/通信原理I/g, 'comm_principle_1')
    .replace(/通信原理i/g, 'comm_principle_1')
    .replace(/信息论/g, 'information_theory')
    .replace(/计算机网络/g, 'computer_network')
    .replace(/计算方法/g, 'computation_method')
    .replace(/形式语言与自动机/g, 'formal_lang_automata')
    .replace(/数据结构\*/g, 'data_structure')
    .replace(/数据结构/g, 'data_structure2')
    .replace(/数据挖掘/g, 'data_mining')
    .replace(/推理与智能体\*/g, 'reasoning_agent')
    .replace(/视觉计算\*/g, 'visual_computing')
    .replace(/神经网络与深度学习/g, 'neural_network_dl')
    .replace(/智能游戏\*/g, 'intelligent_game')
    .replace(/认知机器人系统\*/g, 'cognitive_robot')
    .replace(/自然语言处理/g, 'nlp')
    .replace(/计算创新学\*/g, 'computational_innovation')
    .replace(/人工智能法律\*/g, 'ai_law')
    .replace(/离散数学/g, 'discrete_math')
    .replace(/计算导论与程序设计/g, 'intro_computing_prog')
    .replace(/毕业设计/g, 'graduation_project')
    .replace(/物理实验C/g, 'physics_exp_c')
    .replace(/电路实验/g, 'circuit_exp')
    .replace(/通信原理实验/g, 'comm_principle_exp')
    .replace(/计算机实习/g, 'computer_internship')
    .replace(/电子工艺实习/g, 'electronic_craft_intern')
    .replace(/通信与网络课程设计/g, 'comm_network_design')
    .replace(/计算导论与程序设计课程设计/g, 'intro_prog_design')
    .replace(/数据结构与算法课程设计/g, 'ds_algo_design')
    .replace(/微处理器系统设计\*/g, 'microprocessor_design')
    .replace(/高级网络程序设计\*/g, 'advanced_network_prog')
    .replace(/数字系统设计\*/g, 'digital_system_design')
    .replace(/企业技术战略\*/g, 'enterprise_tech_strategy')
    .replace(/体育基础/g, 'physical_education')
    .replace(/军事理论/g, 'military_theory')
    .replace(/军训/g, 'military_training')
    .replace(/大学生心理健康/g, 'mental_health')
    .replace(/安全教育/g, 'safety_education')
    .replace(/思想道德与法治/g, 'moral_law')
    .replace(/中国近现代史纲要/g, 'modern_chinese_history')
    .replace(/马克思主义基本原理/g, 'marxism_basic')
    .replace(/形势与政策/g, 'situation_policy')
    .replace(/学术交流技能/g, 'academic_communication')
    .replace(/个人发展计划/g, 'personal_dev_plan')
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
function processExcelFile(fileName) {
  console.log(`\n=== 分析文件: ${fileName} ===`);
  
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
    
    // Show some field mappings for verification
    console.log(`\n重要字段映射示例:`);
    fields.forEach(field => {
      if (field.original.includes('毛泽东思想') || field.original.includes('习近平新时代')) {
        console.log(`  ${field.original} -> ${field.normalized}`);
      }
    });
    
    return {
      success: true,
      tableName,
      fieldCount: fields.length,
      rowCount: jsonData.length,
      createSQL,
      fields,
      jsonData
    };
    
  } catch (error) {
    console.error(`❌ 处理 ${fileName} 时出错:`, error.message);
    return { success: false, tableName: fileName.replace('.xlsx', '').toLowerCase(), error: error.message };
  }
}

// 只处理第一个文件
if (require.main === module) {
  const fileName = process.argv[2] || 'Cohort2023_Predictions_ai.xlsx';
  const result = processExcelFile(fileName);
  
  if (result.success) {
    console.log('\n=== CREATE TABLE SQL ===');
    console.log(result.createSQL);
    
    console.log('\n=== 保存结果到文件 ===');
    const outputFile = path.join(__dirname, `${result.tableName}_analysis.json`);
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`结果已保存到: ${outputFile}`);
  }
}

module.exports = { processExcelFile, normalizeFieldName, inferDataType, generateCreateTableSQL };

