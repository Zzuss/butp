#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
健壮的阿里云API服务器
修复所有已知问题，支持多端口部署
"""

import os
import sys
import json
import tempfile
import subprocess
import traceback
from datetime import datetime
import argparse

# 导入依赖，如果缺少则提示
try:
    from flask import Flask, request, jsonify
    import pandas as pd
except ImportError as e:
    print(f"缺少依赖包: {e}")
    print("请运行: pip install flask pandas openpyxl")
    sys.exit(1)

app = Flask(__name__)

# 配置
class Config:
    def __init__(self):
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.log_dir = os.path.join(self.base_dir, 'logs')
        self.temp_dir = os.path.join(self.base_dir, 'temp')
        self.ensure_directories()
    
    def ensure_directories(self):
        """确保必要目录存在"""
        for dir_path in [self.log_dir, self.temp_dir]:
            if not os.path.exists(dir_path):
                os.makedirs(dir_path, exist_ok=True)

config = Config()

def log_message(message):
    """记录日志"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_msg = f"[{timestamp}] {message}"
    print(log_msg)
    
    # 写入日志文件
    log_file = os.path.join(config.log_dir, f"api_server_{datetime.now().strftime('%Y%m%d')}.log")
    try:
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(log_msg + '\n')
    except:
        pass

def validate_environment():
    """验证环境和必需文件"""
    required_files = [
        'run_prediction_direct.py',
        'Optimization_model_func3_1.py',
        'feature_columns.json',
        'catboost_model.cbm',
        'scaler.pkl'
    ]
    
    missing_files = []
    for file_path in required_files:
        full_path = os.path.join(config.base_dir, file_path)
        if not os.path.exists(full_path):
            missing_files.append(file_path)
    
    if missing_files:
        log_message(f"❌ 缺少必需文件: {missing_files}")
        return False
    
    # 检查培养方案目录
    for year in ['2023', '2024']:
        plan_dir = os.path.join(config.base_dir, f'education-plan{year}')
        if not os.path.exists(plan_dir):
            log_message(f"❌ 缺少培养方案目录: education-plan{year}")
            return False
    
    log_message("✅ 环境验证通过")
    return True

@app.route('/api/predict', methods=['POST'])
def predict():
    """预测接口"""
    request_id = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:17]
    log_message(f"[{request_id}] 开始处理预测请求")
    
    try:
        # 获取参数
        year = request.form.get('year', '2024')
        major = request.form.get('major', '')
        config_param = request.form.get('config', '{}')
        
        log_message(f"[{request_id}] 参数 - 年级: {year}, 专业: {major or '全部'}")
        
        # 验证年级
        if year not in ['2021', '2022', '2023', '2024']:
            return jsonify({
                'success': False,
                'error': f'不支持的年级: {year}，支持的年级: 2021, 2022, 2023, 2024'
            }), 400
        
        # 验证专业
        valid_majors = ["电信工程及管理", "物联网工程", "智能科学与技术", "电子信息工程"]
        if major and major not in valid_majors:
            return jsonify({
                'success': False,
                'error': f'不支持的专业: {major}，支持的专业: {valid_majors}'
            }), 400
        
        # 获取上传的文件
        if 'scores_file' not in request.files:
            return jsonify({
                'success': False,
                'error': '缺少成绩文件参数 scores_file'
            }), 400
        
        scores_file = request.files['scores_file']
        if scores_file.filename == '':
            return jsonify({
                'success': False,
                'error': '未选择文件'
            }), 400
        
        # 保存临时文件
        temp_scores_path = os.path.join(config.temp_dir, f"scores_{request_id}.xlsx")
        scores_file.save(temp_scores_path)
        log_message(f"[{request_id}] 成绩文件已保存: {temp_scores_path}")
        
        try:
            # 构建预测命令
            script_path = os.path.join(config.base_dir, 'run_prediction_direct.py')
            cmd = [
                sys.executable, script_path,
                '--year', str(year),
                '--scores_file', temp_scores_path
            ]
            
            if major:
                cmd.extend(['--major', major])
            
            if config_param and config_param != '{}':
                cmd.extend(['--config', config_param])
            
            log_message(f"[{request_id}] 执行命令: {' '.join(cmd)}")
            
            # 执行预测
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=1800,  # 30分钟超时
                cwd=config.base_dir
            )
            
            log_message(f"[{request_id}] 算法执行完成，返回码: {result.returncode}")
            
            if result.returncode != 0:
                log_message(f"[{request_id}] ❌ 预测失败: {result.stderr}")
                return jsonify({
                    'success': False,
                    'error': f'预测算法执行失败',
                    'details': result.stderr,
                    'stdout': result.stdout
                }), 500
            
            # 解析预测结果
            results = []
            major_codes = {
                "电信工程及管理": "tewm",
                "物联网工程": "iot", 
                "智能科学与技术": "ai",
                "电子信息工程": "ee"
            }
            
            # 确定要处理的专业
            if major:
                majors_to_process = [major]
            else:
                majors_to_process = ["智能科学与技术", "物联网工程", "电信工程及管理", "电子信息工程"]
            
            for major_name in majors_to_process:
                code = major_codes[major_name]
                pred_file = os.path.join(config.base_dir, f"Cohort{year}_Predictions_{code}.xlsx")
                
                if os.path.exists(pred_file):
                    try:
                        df = pd.read_excel(pred_file, sheet_name='Predictions')
                        log_message(f"[{request_id}] ✅ {major_name}: 读取到 {len(df)} 条预测记录")
                        
                        results.append({
                            'major': major_name,
                            'success': True,
                            'result': {
                                'results': {
                                    'Predictions': df.to_dict('records')
                                },
                                'statistics': {
                                    'total_students': len(df),
                                    'processed_time': pd.Timestamp.now().isoformat()
                                }
                            }
                        })
                    except Exception as e:
                        log_message(f"[{request_id}] ❌ {major_name}: 读取失败 - {str(e)}")
                        results.append({
                            'major': major_name,
                            'success': False,
                            'error': str(e)
                        })
                else:
                    log_message(f"[{request_id}] ⚠️ {major_name}: 预测文件不存在 - {pred_file}")
            
            success_count = len([r for r in results if r['success']])
            log_message(f"[{request_id}] 🎉 预测完成: {success_count}/{len(majors_to_process)} 个专业成功")
            
            return jsonify({
                'success': True,
                'data': {
                    'results': results,
                    'year': year,
                    'processed_majors': success_count,
                    'request_id': request_id,
                    'log': result.stdout
                }
            })
            
        finally:
            # 清理临时文件
            try:
                if os.path.exists(temp_scores_path):
                    os.unlink(temp_scores_path)
                    log_message(f"[{request_id}] 清理临时文件: {temp_scores_path}")
            except Exception as e:
                log_message(f"[{request_id}] 清理临时文件失败: {str(e)}")
                
    except Exception as e:
        log_message(f"[{request_id}] ❌ 服务器错误: {str(e)}")
        log_message(f"[{request_id}] 错误详情: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'服务器错误: {str(e)}',
            'request_id': request_id
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    try:
        env_ok = validate_environment()
        return jsonify({
            'service': 'prediction-api',
            'status': 'healthy' if env_ok else 'degraded',
            'timestamp': datetime.now().isoformat(),
            'version': '2.0.0',
            'environment_check': env_ok
        })
    except Exception as e:
        return jsonify({
            'service': 'prediction-api', 
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/majors', methods=['GET'])
def get_majors():
    """获取支持的专业列表"""
    try:
        majors = [
            '智能科学与技术',
            '物联网工程', 
            '电信工程及管理',
            '电子信息工程'
        ]
        
        return jsonify({
            'success': True,
            'data': {
                'majors': majors,
                'total': len(majors)
            },
            'majors': majors  # 兼容性字段
        })
    except Exception as e:
        log_message(f"获取专业列表失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': '获取专业列表失败',
            'details': str(e)
        }), 500

@app.route('/status', methods=['GET'])
def status():
    """详细状态信息"""
    try:
        base_dir = config.base_dir
        
        # 检查文件状态
        files_status = {}
        required_files = [
            'run_prediction_direct.py',
            'Optimization_model_func3_1.py', 
            'feature_columns.json',
            'catboost_model.cbm',
            'scaler.pkl'
        ]
        
        for file_name in required_files:
            file_path = os.path.join(base_dir, file_name)
            if os.path.exists(file_path):
                stat = os.stat(file_path)
                files_status[file_name] = {
                    'exists': True,
                    'size': stat.st_size,
                    'modified': datetime.fromtimestamp(stat.st_mtime).isoformat()
                }
            else:
                files_status[file_name] = {'exists': False}
        
        # 检查培养方案目录
        plan_dirs = {}
        for year in ['2021', '2022', '2023', '2024']:
            plan_dir = os.path.join(base_dir, f'education-plan{year}')
            if os.path.exists(plan_dir):
                files = os.listdir(plan_dir)
                plan_dirs[f'education-plan{year}'] = {
                    'exists': True,
                    'files': len(files),
                    'file_list': files
                }
            else:
                plan_dirs[f'education-plan{year}'] = {'exists': False}
        
        return jsonify({
            'service': 'prediction-api',
            'version': '2.0.0',
            'base_directory': base_dir,
            'files': files_status,
            'education_plans': plan_dirs,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': '接口不存在',
        'available_endpoints': [
            'POST /api/predict',
            'GET /health', 
            'GET /status'
        ]
    }), 404

@app.errorhandler(500)
def internal_error(error):
    log_message(f"500错误: {str(error)}")
    return jsonify({
        'error': '内部服务器错误',
        'timestamp': datetime.now().isoformat()
    }), 500

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='阿里云预测API服务器')
    parser.add_argument('--port', type=int, default=8080, help='服务端口 (默认: 8080)')
    parser.add_argument('--host', default='0.0.0.0', help='服务主机 (默认: 0.0.0.0)')
    parser.add_argument('--debug', action='store_true', help='调试模式')
    args = parser.parse_args()
    
    print("=" * 60)
    print("🚀 阿里云预测API服务器 v2.0.0")
    print("=" * 60)
    print(f"📁 工作目录: {config.base_dir}")
    print(f"🌐 服务地址: http://{args.host}:{args.port}")
    print(f"🔧 调试模式: {'开启' if args.debug else '关闭'}")
    print("\n📋 可用接口:")
    print("  POST /api/predict  - 预测接口") 
    print("  GET  /health       - 健康检查")
    print("  GET  /status       - 详细状态")
    print("=" * 60)
    
    # 环境验证
    if not validate_environment():
        print("❌ 环境验证失败，服务可能无法正常工作")
        return 1
    
    try:
        app.run(host=args.host, port=args.port, debug=args.debug)
    except KeyboardInterrupt:
        print("\n👋 服务已停止")
        return 0
    except Exception as e:
        print(f"❌ 服务启动失败: {e}")
        return 1

if __name__ == '__main__':
    sys.exit(main())
