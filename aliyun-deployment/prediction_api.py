#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
阿里云预测算法API服务
提供HTTP接口调用预测算法
"""

import os
import sys
import json
import tempfile
import uuid
import traceback
import logging
from datetime import datetime
from typing import Dict, Any

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import pandas as pd

# 添加function目录到Python路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'function'))

try:
    import Optimization_model_func3_1 as opt
except ImportError as e:
    print(f"错误：无法导入预测模块: {e}")
    sys.exit(1)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('prediction_api.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 创建Flask应用
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size

# 启用CORS以支持跨域请求
CORS(app, origins=["*"])

# 配置上传文件扩展名
ALLOWED_EXTENSIONS = {'.xlsx', '.xls'}

# 预测算法配置
DEFAULT_CONFIG = {
    'model_dir': os.path.join(os.path.dirname(__file__), 'function', 'Model_Params', 'Task3_CatBoost_Model'),
    'min_grade': 60,
    'max_grade': 90,
    'with_uniform_inverse': 1
}

# 专业映射
MAJORS_MAPPING = {
    '物联网工程': {
        'code': 'iot',
        'course_file': 'education-plan2023/2023级物联网工程培养方案.xlsx'
    },
    '电信工程及管理': {
        'code': 'tewm',
        'course_file': 'education-plan2023/2023级电信工程及管理培养方案.xlsx'
    },
    '智能科学与技术': {
        'code': 'ai',
        'course_file': 'education-plan2023/2023级智能科学与技术培养方案.xlsx'
    },
    '电子信息工程': {
        'code': 'ee',
        'course_file': 'education-plan2023/2023级电子信息工程培养方案.xlsx'
    }
}

def allowed_file(filename):
    """检查文件扩展名是否允许"""
    return any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS)

def validate_request_data(data):
    """验证请求数据"""
    required_fields = ['major']
    for field in required_fields:
        if field not in data:
            raise ValueError(f"缺少必需字段: {field}")
    
    if data['major'] not in MAJORS_MAPPING:
        raise ValueError(f"不支持的专业: {data['major']}")
    
    return True

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'prediction-api',
        'version': '1.0.0'
    })

@app.route('/api/majors', methods=['GET'])
def get_supported_majors():
    """获取支持的专业列表"""
    majors = list(MAJORS_MAPPING.keys())
    return jsonify({
        'success': True,
        'data': {
            'majors': majors,
            'count': len(majors)
        }
    })

@app.route('/api/predict', methods=['POST'])
def predict_students():
    """
    预测学生毕业去向
    
    请求格式：
    - multipart/form-data
    - scores_file: Excel成绩文件
    - major: 专业名称
    - config: 可选配置参数(JSON字符串)
    """
    try:
        # 检查文件上传
        if 'scores_file' not in request.files:
            return jsonify({
                'success': False,
                'error': '未找到成绩文件',
                'code': 'FILE_MISSING'
            }), 400
        
        scores_file = request.files['scores_file']
        if scores_file.filename == '':
            return jsonify({
                'success': False,
                'error': '未选择文件',
                'code': 'FILE_EMPTY'
            }), 400
        
        if not allowed_file(scores_file.filename):
            return jsonify({
                'success': False,
                'error': '不支持的文件格式，请上传Excel文件(.xlsx/.xls)',
                'code': 'INVALID_FORMAT'
            }), 400
        
        # 获取专业参数
        major = request.form.get('major')
        if not major:
            return jsonify({
                'success': False,
                'error': '缺少专业参数',
                'code': 'MAJOR_MISSING'
            }), 400
        
        # 验证专业
        if major not in MAJORS_MAPPING:
            return jsonify({
                'success': False,
                'error': f'不支持的专业: {major}',
                'code': 'MAJOR_NOT_SUPPORTED',
                'supported_majors': list(MAJORS_MAPPING.keys())
            }), 400
        
        # 获取可选配置
        config = DEFAULT_CONFIG.copy()
        if 'config' in request.form:
            try:
                user_config = json.loads(request.form['config'])
                config.update(user_config)
            except json.JSONDecodeError:
                return jsonify({
                    'success': False,
                    'error': '配置参数格式错误，应为JSON字符串',
                    'code': 'CONFIG_INVALID'
                }), 400
        
        # 生成唯一任务ID
        task_id = str(uuid.uuid4())
        logger.info(f"开始预测任务 {task_id}，专业: {major}")
        
        # 创建临时目录
        with tempfile.TemporaryDirectory() as temp_dir:
            # 保存上传的成绩文件
            scores_filename = secure_filename(scores_file.filename)
            scores_path = os.path.join(temp_dir, f"scores_{task_id}_{scores_filename}")
            scores_file.save(scores_path)
            
            # 构建课程文件路径
            major_info = MAJORS_MAPPING[major]
            course_path = os.path.join(
                os.path.dirname(__file__), 
                'function',
                major_info['course_file']
            )
            
            if not os.path.exists(course_path):
                return jsonify({
                    'success': False,
                    'error': f'课程文件不存在: {major_info["course_file"]}',
                    'code': 'COURSE_FILE_MISSING'
                }), 500
            
            # 设置输出文件路径
            output_path = os.path.join(temp_dir, f"prediction_result_{task_id}.xlsx")
            
            # 验证模型目录
            if not os.path.exists(config['model_dir']):
                return jsonify({
                    'success': False,
                    'error': f'模型目录不存在: {config["model_dir"]}',
                    'code': 'MODEL_DIR_MISSING'
                }), 500
            
            # 调用预测算法
            try:
                logger.info(f"任务 {task_id} 开始执行预测算法")
                
                pred_df, uni_df = opt.predict_students(
                    scores_file=scores_path,
                    course_file=course_path,
                    major_name=major,
                    out_path=output_path,
                    model_dir=config['model_dir'],
                    with_uniform_inverse=config['with_uniform_inverse'],
                    min_grade=config['min_grade'],
                    max_grade=config['max_grade']
                )
                
                logger.info(f"任务 {task_id} 预测完成，处理了 {len(pred_df)} 名学生")
                
                # 读取结果文件
                if os.path.exists(output_path):
                    # 读取Excel文件的所有工作表
                    excel_data = {}
                    with pd.ExcelFile(output_path) as xls:
                        for sheet_name in xls.sheet_names:
                            df = pd.read_excel(xls, sheet_name=sheet_name)
                            # 转换为JSON兼容格式
                            excel_data[sheet_name] = df.to_dict('records')
                    
                    # 计算统计信息
                    stats = {}
                    if not uni_df.empty:
                        stats = {
                            'total_students': len(pred_df),
                            'grad_school_achievable_60': int((uni_df['s_min_for_1'] == 60).sum()),
                            'abroad_achievable_60': int((uni_df['s_min_for_2'] == 60).sum()),
                            'dominated_by_target1': int(uni_df['DominatedBy1'].sum()),
                            'multiple_intervals_target1': int(uni_df['MultipleIntervalsFlag_1'].sum()),
                            'multiple_intervals_target2': int(uni_df['MultipleIntervalsFlag_2'].sum())
                        }
                    
                    return jsonify({
                        'success': True,
                        'data': {
                            'task_id': task_id,
                            'major': major,
                            'results': excel_data,
                            'statistics': stats,
                            'config_used': config,
                            'timestamp': datetime.now().isoformat()
                        }
                    })
                else:
                    return jsonify({
                        'success': False,
                        'error': '预测算法执行完成但未生成结果文件',
                        'code': 'NO_OUTPUT_FILE'
                    }), 500
                    
            except Exception as e:
                error_msg = f"预测算法执行失败: {str(e)}"
                logger.error(f"任务 {task_id} 失败: {error_msg}")
                logger.error(traceback.format_exc())
                
                return jsonify({
                    'success': False,
                    'error': error_msg,
                    'code': 'PREDICTION_FAILED',
                    'task_id': task_id
                }), 500
                
    except Exception as e:
        error_msg = f"请求处理失败: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        
        return jsonify({
            'success': False,
            'error': error_msg,
            'code': 'REQUEST_FAILED'
        }), 500

@app.route('/api/predict/batch', methods=['POST'])
def predict_batch():
    """
    批量预测多个专业
    
    请求格式：
    - multipart/form-data
    - scores_file: Excel成绩文件
    - majors: 专业名称列表 (JSON数组字符串)
    - config: 可选配置参数(JSON字符串)
    """
    try:
        # 检查文件上传
        if 'scores_file' not in request.files:
            return jsonify({
                'success': False,
                'error': '未找到成绩文件',
                'code': 'FILE_MISSING'
            }), 400
        
        scores_file = request.files['scores_file']
        if scores_file.filename == '' or not allowed_file(scores_file.filename):
            return jsonify({
                'success': False,
                'error': '文件格式无效',
                'code': 'INVALID_FILE'
            }), 400
        
        # 获取专业列表
        majors_str = request.form.get('majors', '[]')
        try:
            majors = json.loads(majors_str)
        except json.JSONDecodeError:
            return jsonify({
                'success': False,
                'error': '专业列表格式错误，应为JSON数组',
                'code': 'MAJORS_INVALID'
            }), 400
        
        if not majors:
            majors = list(MAJORS_MAPPING.keys())  # 默认处理所有专业
        
        # 验证专业
        invalid_majors = [m for m in majors if m not in MAJORS_MAPPING]
        if invalid_majors:
            return jsonify({
                'success': False,
                'error': f'不支持的专业: {invalid_majors}',
                'code': 'MAJORS_NOT_SUPPORTED',
                'supported_majors': list(MAJORS_MAPPING.keys())
            }), 400
        
        # 获取配置
        config = DEFAULT_CONFIG.copy()
        if 'config' in request.form:
            try:
                user_config = json.loads(request.form['config'])
                config.update(user_config)
            except json.JSONDecodeError:
                return jsonify({
                    'success': False,
                    'error': '配置参数格式错误',
                    'code': 'CONFIG_INVALID'
                }), 400
        
        batch_id = str(uuid.uuid4())
        logger.info(f"开始批量预测任务 {batch_id}，专业: {majors}")
        
        results = {}
        errors = {}
        
        # 创建临时目录
        with tempfile.TemporaryDirectory() as temp_dir:
            # 保存上传的成绩文件
            scores_filename = secure_filename(scores_file.filename)
            scores_path = os.path.join(temp_dir, f"scores_{batch_id}_{scores_filename}")
            scores_file.save(scores_path)
            
            # 逐个处理专业
            for major in majors:
                try:
                    major_info = MAJORS_MAPPING[major]
                    course_path = os.path.join(
                        os.path.dirname(__file__), 
                        'function',
                        major_info['course_file']
                    )
                    
                    if not os.path.exists(course_path):
                        errors[major] = f'课程文件不存在: {major_info["course_file"]}'
                        continue
                    
                    output_path = os.path.join(temp_dir, f"prediction_{major}_{batch_id}.xlsx")
                    
                    pred_df, uni_df = opt.predict_students(
                        scores_file=scores_path,
                        course_file=course_path,
                        major_name=major,
                        out_path=output_path,
                        model_dir=config['model_dir'],
                        with_uniform_inverse=config['with_uniform_inverse'],
                        min_grade=config['min_grade'],
                        max_grade=config['max_grade']
                    )
                    
                    # 读取结果
                    if os.path.exists(output_path):
                        excel_data = {}
                        with pd.ExcelFile(output_path) as xls:
                            for sheet_name in xls.sheet_names:
                                df = pd.read_excel(xls, sheet_name=sheet_name)
                                excel_data[sheet_name] = df.to_dict('records')
                        
                        # 统计信息
                        stats = {}
                        if not uni_df.empty:
                            stats = {
                                'total_students': len(pred_df),
                                'grad_school_achievable_60': int((uni_df['s_min_for_1'] == 60).sum()),
                                'abroad_achievable_60': int((uni_df['s_min_for_2'] == 60).sum())
                            }
                        
                        results[major] = {
                            'results': excel_data,
                            'statistics': stats
                        }
                        
                        logger.info(f"专业 {major} 预测完成，处理了 {len(pred_df)} 名学生")
                    else:
                        errors[major] = '未生成结果文件'
                        
                except Exception as e:
                    error_msg = f"专业 {major} 预测失败: {str(e)}"
                    errors[major] = error_msg
                    logger.error(error_msg)
        
        return jsonify({
            'success': True,
            'data': {
                'batch_id': batch_id,
                'results': results,
                'errors': errors,
                'processed_majors': list(results.keys()),
                'failed_majors': list(errors.keys()),
                'config_used': config,
                'timestamp': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        error_msg = f"批量预测失败: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        
        return jsonify({
            'success': False,
            'error': error_msg,
            'code': 'BATCH_FAILED'
        }), 500

@app.errorhandler(413)
def file_too_large(error):
    """文件过大错误处理"""
    return jsonify({
        'success': False,
        'error': '上传文件过大，最大支持50MB',
        'code': 'FILE_TOO_LARGE'
    }), 413

@app.errorhandler(500)
def internal_error(error):
    """内部服务器错误处理"""
    logger.error(f"内部服务器错误: {error}")
    return jsonify({
        'success': False,
        'error': '内部服务器错误',
        'code': 'INTERNAL_ERROR'
    }), 500

if __name__ == '__main__':
    # 检查模型文件是否存在
    if not os.path.exists(DEFAULT_CONFIG['model_dir']):
        print(f"错误：模型目录不存在: {DEFAULT_CONFIG['model_dir']}")
        sys.exit(1)
    
    print("启动预测API服务...")
    print(f"模型目录: {DEFAULT_CONFIG['model_dir']}")
    print(f"支持的专业: {list(MAJORS_MAPPING.keys())}")
    
    # 开发环境运行
    app.run(
        host='0.0.0.0',
        port=8000,
        debug=False,  # 生产环境设为False
        threaded=True
    )
