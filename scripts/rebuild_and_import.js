const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function sanitizeColumnName(name) {
    // 特殊缩写处理
    if (name.includes('毛泽东思想和中国特色社会主义理论体系概论')) {
        return 'maogai';
    }
    if (name.includes('习近平新时代中国特色社会主义') && name.includes('概论')) {
        return 'xigai';
    }
    
    // 其他字段名处理
    return name
        .replace(/（/g, '_').replace(/）/g, '')
        .replace(/\(/g, '_').replace(/\)/g, '')
        .replace(/设计/g, 'design')
        .replace(/专业/g, 'major')
        .replace(/实验/g, 'experiment')
        .replace(/实习/g, 'internship')
        .replace(/课程设计/g, 'coursedesign')
        .replace(/3D图形程序设计/g, 'graphics_3d_program_design')
        .replace(/Design\s*&\s*Build实训/g, 'design_build_shixun')
        .replace(/无线射频识别\(RFID\)/g, 'wireless_rfid')
        .replace(/微波、毫米波与光传输/g, 'microwave_mmwave_optical')
        .replace(/\s+/g, '_')
        .replace(/[*]/g, '')
        .replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .toLowerCase();
}

function inferDataType(samples) {
    // 移除空值和null
    const validSamples = samples.filter(val => val !== null && val !== undefined && val !== '');
    
    if (validSamples.length === 0) return 'TEXT';
    
    // 检查是否所有值都是数字
    const allNumbers = validSamples.every(val => {
        const num = Number(val);
        return !isNaN(num) && isFinite(num);
    });
    
    if (allNumbers) {
        // 检查是否都是整数
        const allIntegers = validSamples.every(val => Number.isInteger(Number(val)));
        return allIntegers ? 'INTEGER' : 'REAL';
    }
    
    return 'TEXT';
}

function analyzeExcelFile(filePath) {
    console.log(`\n分析文件: ${filePath}`);
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
        throw new Error(`文件 ${filePath} 没有数据`);
    }
    
    const headers = Object.keys(data[0]);
    console.log(`发现 ${headers.length} 个表头`);
    
    // 分析数据类型
    const fieldAnalysis = headers.map(header => {
        const samples = data.slice(0, 5).map(row => row[header]);
        const normalizedName = sanitizeColumnName(header);
        const dataType = inferDataType(samples);
        
        return {
            original: header,
            normalized: normalizedName,
            type: dataType,
            samples: samples.slice(0, 3)
        };
    });
    
    return {
        headers,
        fieldAnalysis,
        data,
        rowCount: data.length
    };
}

function generateCreateTableSQL(tableName, fieldAnalysis) {
    const fields = fieldAnalysis.map(field => {
        return `  "${field.normalized}" ${field.type}`;
    }).join(',\n');
    
    return `CREATE TABLE ${tableName} (
  id SERIAL PRIMARY KEY,
${fields}
);`;
}

function generateInsertSQL(tableName, fieldAnalysis, data) {
    if (data.length === 0) return [];
    
    const fieldNames = fieldAnalysis.map(f => `"${f.normalized}"`).join(', ');
    const insertStatements = [];
    
    // 批量插入，每批100条
    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const values = batch.map(row => {
            const rowValues = fieldAnalysis.map(field => {
                const value = row[field.original];
                if (value === null || value === undefined || value === '') {
                    return 'NULL';
                }
                if (field.type === 'TEXT') {
                    return `'${String(value).replace(/'/g, "''")}'`;
                }
                return String(value);
            }).join(', ');
            return `(${rowValues})`;
        }).join(',\n  ');
        
        insertStatements.push(`INSERT INTO ${tableName} (${fieldNames}) VALUES\n  ${values};`);
    }
    
    return insertStatements;
}

async function processAllFiles() {
    const hahaDir = 'D:\\newProject\\butp\\haha';
    const files = fs.readdirSync(hahaDir).filter(file => file.endsWith('.xlsx'));
    
    const results = [];
    
    for (const file of files) {
        const filePath = path.join(hahaDir, file);
        const fileName = path.basename(file, '.xlsx');
        const tableName = fileName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        
        try {
            const analysis = analyzeExcelFile(filePath);
            const createSQL = generateCreateTableSQL(tableName, analysis.fieldAnalysis);
            const insertSQLs = generateInsertSQL(tableName, analysis.fieldAnalysis, analysis.data);
            
            results.push({
                fileName,
                tableName,
                analysis,
                createSQL,
                insertSQLs
            });
            
            console.log(`✅ ${fileName}: ${analysis.headers.length} 字段, ${analysis.rowCount} 条数据`);
            
        } catch (error) {
            console.error(`❌ 处理文件 ${file} 时出错:`, error.message);
            results.push({
                fileName,
                tableName,
                error: error.message
            });
        }
    }
    
    return results;
}

// 如果直接运行此脚本
if (require.main === module) {
    processAllFiles().then(results => {
        // 保存分析结果
        fs.writeFileSync(
            'D:\\newProject\\butp\\scripts\\rebuild_analysis.json',
            JSON.stringify(results, null, 2),
            'utf8'
        );
        console.log('\n分析完成，结果已保存到 rebuild_analysis.json');
    }).catch(console.error);
}

module.exports = { processAllFiles, analyzeExcelFile, generateCreateTableSQL, generateInsertSQL };

