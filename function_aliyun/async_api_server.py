#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
异步任务API服务器
支持文件上传 -> 后台预测 -> 结果下载的异步流程
"""

import os
import sys
import json
import tempfile
import subprocess
import traceback
import threading
import time
import uuid
from datetime import datetime
import argparse
import shutil
from pathlib import Path

# 导入依赖，如果缺少则提示
try:
    from flask import Flask, request, jsonify, send_file
    import pandas as pd
except ImportError as e:
    print(f"缺少依赖包: {e}")
    print("请运行: pip install flask pandas openpyxl")
    sys.exit(1)

app = Flask(__name__)

# 全局任务管理
class TaskManager:
    def __init__(self):
        self.tasks = {}  # taskId -> TaskInfo
        self.lock = threading.Lock()
    
    def create_task(self, file_path, year):
        task_id = str(uuid.uuid4())
        task_info = {
            'id': task_id,
            'status': 'pending',  # pending, running, completed, failed
            'created_at': datetime.now().isoformat(),
            'file_path': file_path,
            'year': year,
            'progress': 0,
            'message': '任务已创建',
            'result_files': [],
            'error': None
        }
        
        with self.lock:
            self.tasks[task_id] = task_info
            
        return task_id
    
    def update_task(self, task_id, status=None, progress=None, message=None, result_files=None, error=None):
        with self.lock:
            if task_id in self.tasks:
                task = self.tasks[task_id]
                if status: task['status'] = status
                if progress is not None: task['progress'] = progress
                if message: task['message'] = message
                if result_files: task['result_files'] = result_files
                if error: task['error'] = error
                task['updated_at'] = datetime.now().isoformat()
    
    def get_task(self, task_id):
        with self.lock:
            return self.tasks.get(task_id, None)
    
    def list_tasks(self):
        with self.lock:
            return list(self.tasks.values())

# 全局任务管理器
task_manager = TaskManager()

# 配置
class Config:
    def __init__(self):
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.upload_dir = os.path.join(self.base_dir, 'uploads')
        self.result_dir = os.path.join(self.base_dir, 'results')
        
        # 确保目录存在
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(self.result_dir, exist_ok=True)

config = Config()

def run_prediction_task(task_id, file_path, year):
    """后台运行预测任务"""
    try:
        print(f"🚀 开始执行任务 {task_id}: {file_path}, {year}年级")
        
        # 更新状态为运行中
        task_manager.update_task(task_id, status='running', progress=10, message='开始预测...')
        
        # 构建命令
        cmd = [
            'python3', 
            os.path.join(config.base_dir, 'run_prediction_direct.py'),
            '--scores_file', file_path,
            '--year', year
        ]
        
        print(f"📋 执行命令: {' '.join(cmd)}")
        
        # 执行预测算法
        task_manager.update_task(task_id, progress=30, message='执行预测算法...')
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=config.base_dir,
            timeout=1800  # 30分钟超时
        )
        
        if result.returncode != 0:
            error_msg = f"预测算法执行失败: {result.stderr}"
            print(f"❌ {error_msg}")
            task_manager.update_task(task_id, status='failed', error=error_msg)
            return
            
        task_manager.update_task(task_id, progress=70, message='算法执行完成，处理结果...')
        
        # 查找生成的结果文件
        result_files = []
        for file in os.listdir(config.base_dir):
            if file.startswith(f'Cohort{year}_Predictions_') and file.endswith('.xlsx'):
                # 将文件移动到结果目录
                src_path = os.path.join(config.base_dir, file)
                dst_path = os.path.join(config.result_dir, f"{task_id}_{file}")
                shutil.move(src_path, dst_path)
                result_files.append(f"{task_id}_{file}")
                
        task_manager.update_task(task_id, progress=90, message='整理结果文件...')
        
        if not result_files:
            error_msg = "未找到预测结果文件"
            print(f"❌ {error_msg}")
            task_manager.update_task(task_id, status='failed', error=error_msg)
            return
            
        # 任务完成
        task_manager.update_task(
            task_id, 
            status='completed', 
            progress=100, 
            message=f'预测完成，生成 {len(result_files)} 个结果文件',
            result_files=result_files
        )
        
        print(f"✅ 任务 {task_id} 完成，结果文件: {result_files}")
        
    except Exception as e:
        error_msg = f"任务执行异常: {str(e)}"
        print(f"❌ {error_msg}")
        print(traceback.format_exc())
        task_manager.update_task(task_id, status='failed', error=error_msg)

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        'status': 'healthy',
        'service': '异步预测API',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/majors', methods=['GET'])
def get_majors():
    """获取支持的专业列表"""
    majors = ['智能科学与技术', '物联网工程', '电信工程及管理', '电子信息工程']
    return jsonify({
        'success': True,
        'data': {
            'majors': majors,
            'total': len(majors)
        }
    })

@app.route('/api/task/start', methods=['POST'])
def start_prediction_task():
    """启动异步预测任务"""
    try:
        # 检查文件
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': '请上传文件'}), 400
            
        file = request.files['file']
        year = request.form.get('year')
        
        if not file or file.filename == '':
            return jsonify({'success': False, 'error': '请选择文件'}), 400
            
        if not year:
            return jsonify({'success': False, 'error': '请指定年级'}), 400
            
        # 验证文件类型
        if not file.filename.lower().endswith(('.xlsx', '.xls')):
            return jsonify({'success': False, 'error': '只支持Excel文件'}), 400
            
        # 保存上传的文件
        timestamp = int(time.time())
        filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join(config.upload_dir, filename)
        file.save(file_path)
        
        print(f"📁 文件已保存: {file_path}")
        
        # 创建任务
        task_id = task_manager.create_task(file_path, year)
        
        # 启动后台线程执行预测
        thread = threading.Thread(
            target=run_prediction_task, 
            args=(task_id, file_path, year),
            daemon=True
        )
        thread.start()
        
        return jsonify({
            'success': True,
            'data': {
                'task_id': task_id,
                'message': '预测任务已启动'
            }
        })
        
    except Exception as e:
        print(f"❌ 启动任务失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/task/status/<task_id>', methods=['GET'])
def get_task_status(task_id):
    """查询任务状态"""
    task = task_manager.get_task(task_id)
    
    if not task:
        return jsonify({'success': False, 'error': '任务不存在'}), 404
        
    return jsonify({
        'success': True,
        'data': task
    })

@app.route('/api/task/result/<task_id>/<filename>', methods=['GET'])
def download_result_file(task_id, filename):
    """下载结果文件"""
    task = task_manager.get_task(task_id)
    
    if not task:
        return jsonify({'success': False, 'error': '任务不存在'}), 404
        
    if task['status'] != 'completed':
        return jsonify({'success': False, 'error': '任务尚未完成'}), 400
        
    if filename not in task['result_files']:
        return jsonify({'success': False, 'error': '文件不存在'}), 404
        
    file_path = os.path.join(config.result_dir, filename)
    
    if not os.path.exists(file_path):
        return jsonify({'success': False, 'error': '文件已被删除'}), 404
        
    return send_file(file_path, as_attachment=True)

@app.route('/api/tasks', methods=['GET'])
def list_all_tasks():
    """列出所有任务（调试用）"""
    tasks = task_manager.list_tasks()
    return jsonify({
        'success': True,
        'data': {
            'tasks': tasks,
            'total': len(tasks)
        }
    })

@app.errorhandler(Exception)
def handle_error(e):
    print(f"❌ API错误: {e}")
    print(traceback.format_exc())
    return jsonify({
        'success': False,
        'error': str(e)
    }), 500

def validate_environment():
    """验证运行环境"""
    print("🔍 验证运行环境...")
    
    # 检查必要文件
    required_files = [
        'run_prediction_direct.py',
        'feature_columns.json',
        'catboost_model.cbm',
        'scaler.pkl'
    ]
    
    missing_files = []
    for file in required_files:
        file_path = os.path.join(config.base_dir, file)
        if not os.path.exists(file_path):
            missing_files.append(file)
    
    if missing_files:
        print(f"❌ 缺少必要文件: {missing_files}")
        return False
        
    print("✅ 环境验证通过")
    return True

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='异步预测API服务器')
    parser.add_argument('--port', type=int, default=8080, help='服务端口')
    parser.add_argument('--host', default='0.0.0.0', help='服务地址')
    parser.add_argument('--debug', action='store_true', help='调试模式')
    
    args = parser.parse_args()
    
    print(f"🚀 启动异步预测API服务器...")
    print(f"📁 工作目录: {config.base_dir}")
    print(f"📁 上传目录: {config.upload_dir}")
    print(f"📁 结果目录: {config.result_dir}")
    
    if not validate_environment():
        print("❌ 环境验证失败，程序退出")
        sys.exit(1)
    
    print(f"🌐 服务地址: http://{args.host}:{args.port}")
    print("📋 API端点:")
    print("   POST /api/task/start        - 启动预测任务")
    print("   GET  /api/task/status/<id>  - 查询任务状态")
    print("   GET  /api/task/result/<id>/<file> - 下载结果")
    print("   GET  /api/majors           - 获取专业列表")
    print("   GET  /health               - 健康检查")
    
    app.run(
        host=args.host,
        port=args.port,
        debug=args.debug,
        threaded=True
    )
