#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试异步预测API的完整流程
"""

import requests
import time
import json
import os
from pathlib import Path

# 配置
ALIYUN_HOST = "39.96.196.67:8080"
BASE_URL = f"http://{ALIYUN_HOST}"

def test_health_check():
    """测试健康检查"""
    print("🔍 测试健康检查...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 健康检查通过: {data.get('status', 'unknown')}")
            print(f"   服务: {data.get('service', 'unknown')}")
            return True
        else:
            print(f"❌ 健康检查失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 健康检查异常: {e}")
        return False

def test_majors_api():
    """测试专业列表API"""
    print("\n📋 测试专业列表API...")
    try:
        response = requests.get(f"{BASE_URL}/api/majors", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                majors = data['data']['majors']
                print(f"✅ 专业列表获取成功: {majors}")
                return True
            else:
                print(f"❌ API返回失败: {data.get('error', 'unknown')}")
                return False
        else:
            print(f"❌ 专业列表API失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 专业列表API异常: {e}")
        return False

def create_test_excel():
    """创建测试Excel文件"""
    try:
        import pandas as pd
        
        # 创建测试数据
        test_data = []
        for i in range(10):
            test_data.append({
                'Student_ID': f'202201{i:04d}',
                'Name': f'测试学生{i+1}',
                'Current_Major': '智能科学与技术',
                '高等数学A(1)': 85 + i,
                '线性代数': 78 + i,
                '概率论与数理统计': 82 + i,
                'C语言程序设计': 88 + i,
                '数据结构': 86 + i
            })
        
        df = pd.DataFrame(test_data)
        test_file = 'test_students_2024.xlsx'
        df.to_excel(test_file, index=False)
        
        print(f"📁 创建测试Excel文件: {test_file}")
        return test_file
        
    except ImportError:
        print("❌ 需要安装pandas和openpyxl: pip install pandas openpyxl")
        return None
    except Exception as e:
        print(f"❌ 创建测试文件失败: {e}")
        return None

def test_async_prediction(excel_file, year="2024"):
    """测试完整的异步预测流程"""
    if not excel_file or not os.path.exists(excel_file):
        print(f"❌ 测试文件不存在: {excel_file}")
        return False
        
    print(f"\n🚀 测试异步预测流程...")
    print(f"   文件: {excel_file}")
    print(f"   年级: {year}")
    
    # 1. 启动任务
    print("\n📤 1. 启动预测任务...")
    try:
        with open(excel_file, 'rb') as f:
            files = {'file': (excel_file, f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            data = {'year': year}
            
            response = requests.post(
                f"{BASE_URL}/api/task/start",
                files=files,
                data=data,
                timeout=30
            )
        
        if response.status_code != 200:
            print(f"❌ 启动任务失败: {response.status_code}")
            print(f"   响应: {response.text}")
            return False
            
        result = response.json()
        if not result.get('success'):
            print(f"❌ 启动任务失败: {result.get('error', 'unknown')}")
            return False
            
        task_id = result['data']['task_id']
        print(f"✅ 任务启动成功，任务ID: {task_id}")
        
    except Exception as e:
        print(f"❌ 启动任务异常: {e}")
        return False
    
    # 2. 轮询任务状态
    print(f"\n⏳ 2. 监控任务执行状态...")
    max_wait_time = 600  # 最多等待10分钟
    poll_interval = 5    # 每5秒查询一次
    start_time = time.time()
    
    while True:
        try:
            elapsed_time = time.time() - start_time
            if elapsed_time > max_wait_time:
                print(f"❌ 任务超时 ({max_wait_time}秒)")
                return False
            
            # 查询任务状态
            response = requests.get(f"{BASE_URL}/api/task/status/{task_id}", timeout=10)
            
            if response.status_code != 200:
                print(f"❌ 查询状态失败: {response.status_code}")
                return False
                
            result = response.json()
            if not result.get('success'):
                print(f"❌ 查询状态失败: {result.get('error', 'unknown')}")
                return False
                
            task = result['data']
            status = task['status']
            progress = task.get('progress', 0)
            message = task.get('message', '')
            
            print(f"   状态: {status} ({progress}%) - {message}")
            
            if status == 'completed':
                result_files = task.get('result_files', [])
                print(f"✅ 任务完成! 生成 {len(result_files)} 个结果文件:")
                for file in result_files:
                    print(f"   - {file}")
                return True, task_id, result_files
                
            elif status == 'failed':
                error = task.get('error', 'unknown error')
                print(f"❌ 任务失败: {error}")
                return False
                
            # 等待下次查询
            time.sleep(poll_interval)
            
        except Exception as e:
            print(f"❌ 查询状态异常: {e}")
            return False

def test_download_results(task_id, result_files):
    """测试下载结果文件"""
    print(f"\n📥 3. 测试下载结果文件...")
    
    download_count = 0
    for filename in result_files[:2]:  # 只下载前2个文件做测试
        try:
            print(f"   下载: {filename}")
            response = requests.get(
                f"{BASE_URL}/api/task/result/{task_id}/{filename}",
                timeout=30
            )
            
            if response.status_code == 200:
                # 保存文件
                local_filename = f"downloaded_{filename}"
                with open(local_filename, 'wb') as f:
                    f.write(response.content)
                
                file_size = len(response.content)
                print(f"   ✅ 下载成功: {local_filename} ({file_size} bytes)")
                download_count += 1
                
                # 清理下载的文件
                os.remove(local_filename)
                
            else:
                print(f"   ❌ 下载失败: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ 下载异常: {e}")
    
    print(f"📊 下载测试完成: {download_count}/{min(len(result_files), 2)} 个文件成功")
    return download_count > 0

def main():
    """主测试流程"""
    print("🧪 异步预测API测试开始...")
    print("="*50)
    
    # 基础API测试
    if not test_health_check():
        print("❌ 健康检查失败，停止测试")
        return
        
    if not test_majors_api():
        print("❌ 专业列表API失败，停止测试")
        return
    
    # 创建测试文件
    test_file = create_test_excel()
    if not test_file:
        print("❌ 无法创建测试文件，停止测试")
        return
    
    try:
        # 异步预测测试
        prediction_result = test_async_prediction(test_file)
        
        if isinstance(prediction_result, tuple) and prediction_result[0]:
            success, task_id, result_files = prediction_result
            
            # 测试文件下载
            if result_files:
                test_download_results(task_id, result_files)
            else:
                print("⚠️ 没有结果文件可供下载测试")
            
            print("\n" + "="*50)
            print("🎉 所有测试完成!")
            print(f"✅ 异步预测系统工作正常")
            print(f"   任务ID: {task_id}")
            print(f"   结果文件数: {len(result_files)}")
            
        else:
            print("\n" + "="*50)
            print("❌ 异步预测测试失败")
            
    finally:
        # 清理测试文件
        if test_file and os.path.exists(test_file):
            os.remove(test_file)
            print(f"🗑️ 清理测试文件: {test_file}")

if __name__ == "__main__":
    main()
