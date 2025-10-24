#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
阿里云API服务器
提供与Next.js兼容的预测接口
"""

import os, sys, json, tempfile, subprocess
from flask import Flask, request, jsonify
import pandas as pd

app = Flask(__name__)

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        # 获取参数
        year = request.form.get('year', '2024')
        major = request.form.get('major', '')
        config = request.form.get('config', '{}')
        
        # 获取上传的文件
        if 'scores_file' not in request.files:
            return jsonify({
                'success': False,
                'error': '缺少成绩文件'
            }), 400
        
        scores_file = request.files['scores_file']
        
        # 保存临时文件
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_file:
            scores_file.save(tmp_file.name)
            temp_scores_path = tmp_file.name
        
        try:
            # 构建命令
            script_path = os.path.join(os.path.dirname(__file__), 'run_prediction_direct.py')
            cmd = [
                sys.executable, script_path,
                '--year', str(year),
                '--scores_file', temp_scores_path
            ]
            
            if major:
                cmd.extend(['--major', major])
            
            if config and config != '{}':
                cmd.extend(['--config', config])
            
            print(f"执行命令: {' '.join(cmd)}")
            
            # 执行预测
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=1800  # 30分钟超时
            )
            
            if result.returncode != 0:
                return jsonify({
                    'success': False,
                    'error': f'预测算法执行失败: {result.stderr}',
                    'stdout': result.stdout
                }), 500
            
            # 构建返回结果
            base_dir = os.path.dirname(__file__)
            results = []
            
            # 查找生成的文件
            if major:
                # 单个专业
                major_codes = {
                    "电信工程及管理": "tewm",
                    "物联网工程": "iot", 
                    "智能科学与技术": "ai",
                    "电子信息工程": "ee"
                }
                code = major_codes.get(major, 'unknown')
                pred_file = os.path.join(base_dir, f"Cohort{year}_Predictions_{code}.xlsx")
                
                if os.path.exists(pred_file):
                    try:
                        df = pd.read_excel(pred_file, sheet_name='Predictions')
                        results.append({
                            'major': major,
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
                        results.append({
                            'major': major,
                            'success': False,
                            'error': str(e)
                        })
            else:
                # 所有专业
                majors = ["智能科学与技术", "物联网工程", "电信工程及管理", "电子信息工程"]
                major_codes = {
                    "智能科学与技术": "ai",
                    "物联网工程": "iot",
                    "电信工程及管理": "tewm", 
                    "电子信息工程": "ee"
                }
                
                for major_name in majors:
                    code = major_codes[major_name]
                    pred_file = os.path.join(base_dir, f"Cohort{year}_Predictions_{code}.xlsx")
                    
                    if os.path.exists(pred_file):
                        try:
                            df = pd.read_excel(pred_file, sheet_name='Predictions')
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
                            results.append({
                                'major': major_name,
                                'success': False,
                                'error': str(e)
                            })
            
            return jsonify({
                'success': True,
                'data': {
                    'results': results,
                    'year': year,
                    'processed_majors': len([r for r in results if r['success']]),
                    'log': result.stdout
                }
            })
            
        finally:
            # 清理临时文件
            try:
                os.unlink(temp_scores_path)
            except:
                pass
                
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'服务器错误: {str(e)}'
        }), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    print("阿里云预测API服务器启动...")
    print("支持的接口:")
    print("- POST /api/predict : 预测接口")
    print("- GET /health : 健康检查")
    
    app.run(host='0.0.0.0', port=8080, debug=True)
