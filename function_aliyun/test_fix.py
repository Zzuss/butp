#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试修复效果的综合验证脚本
"""

import os
import sys
import json
import requests
import pandas as pd
from datetime import datetime

def create_test_data():
    """创建测试用的2024年级成绩数据"""
    print("📋 创建2024年级测试数据...")
    
    test_data = {
        'SNH': ['test2024001', 'test2024002', 'test2024003'],
        'Semester_Offered': ['2023-2024-1', '2023-2024-1', '2023-2024-1'],
        'Current_Major': ['智能科学与技术', '智能科学与技术', '智能科学与技术'],
        'Course_ID': ['1001', '1002', '1003'],
        'Course_Name': ['高等数学A(上)', '线性代数', 'Python程序设计'],
        'Grade': [85, 90, 88],
        'Course_Type': ['公共课', '公共课', '专业基础'],
        'Course_Attribute ': ['必修', '必修', '必修'],
        'Hours': ['80(学时)', '48(学时)', '64(学时)'],
        'Credit': [5, 3, 4],
        'Offering_Unit': ['数学科学学院', '数学科学学院', '计算机学院'],
        'Exam_Type': ['正常考试', '正常考试', '正常考试'],
        'Assessment_Method ': ['考试', '考试', '考试']
    }
    
    df = pd.DataFrame(test_data)
    test_file = 'test_2024_scores.xlsx'
    df.to_excel(test_file, index=False)
    print(f"✅ 测试文件创建完成: {test_file}")
    return test_file

def test_local_algorithm():
    """测试本地算法"""
    print("\n🔧 测试本地算法...")
    
    test_file = create_test_data()
    
    try:
        import subprocess
        cmd = [
            sys.executable, 'run_prediction_direct.py',
            '--year', '2024',
            '--scores_file', test_file,
            '--major', '智能科学与技术'
        ]
        
        print(f"执行命令: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        if result.returncode == 0:
            print("✅ 本地算法执行成功")
            
            # 检查输出文件
            output_file = 'Cohort2024_Predictions_ai.xlsx'
            if os.path.exists(output_file):
                df = pd.read_excel(output_file, sheet_name='Predictions')
                courses = [col for col in df.columns 
                          if col not in ['SNH', 'Major', 'predicted_class', 'predicted_proba']]
                
                print(f"📊 预测包含 {len(courses)} 个课程字段")
                
                # 关键检查：是否包含问题课程
                problem_course = 'Design & Build实训（智能）'
                if problem_course in courses:
                    print(f"❌ 依然包含问题课程: {problem_course}")
                    return False
                else:
                    print(f"✅ 未包含问题课程: {problem_course}")
                    print("🎉 本地算法修复成功！")
                    return True
            else:
                print("❌ 预测文件未生成")
                return False
        else:
            print("❌ 本地算法执行失败")
            print("错误信息:", result.stderr)
            return False
            
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False
    finally:
        # 清理测试文件
        for f in [test_file, 'Cohort2024_Predictions_ai.xlsx', 'Cohort2024_Predictions_All.xlsx']:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except:
                    pass

def test_api_endpoints():
    """测试API接口"""
    print("\n🌐 测试API接口...")
    
    servers = [
        'http://localhost:8080',
        'http://39.96.196.67:8080',
        'http://39.96.196.67:8001'
    ]
    
    for server_url in servers:
        print(f"\n测试服务器: {server_url}")
        
        # 健康检查
        try:
            response = requests.get(f"{server_url}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ 健康检查: {data.get('status', 'unknown')}")
                print(f"   版本: {data.get('version', 'unknown')}")
                print(f"   环境检查: {data.get('environment_check', 'unknown')}")
            else:
                print(f"⚠️ 健康检查异常: {response.status_code}")
        except requests.RequestException as e:
            print(f"❌ 无法连接: {str(e)}")
            continue
        
        # 状态检查
        try:
            response = requests.get(f"{server_url}/status", timeout=10)
            if response.status_code == 200:
                data = response.json()
                files = data.get('files', {})
                plans = data.get('education_plans', {})
                
                print(f"📁 关键文件状态:")
                for file_name, status in files.items():
                    if status.get('exists'):
                        print(f"   ✅ {file_name}")
                    else:
                        print(f"   ❌ {file_name}")
                
                print(f"📚 培养方案状态:")
                for plan_name, status in plans.items():
                    if status.get('exists'):
                        print(f"   ✅ {plan_name} ({status.get('files', 0)}个文件)")
                    else:
                        print(f"   ❌ {plan_name}")
                        
        except requests.RequestException as e:
            print(f"❌ 状态检查失败: {str(e)}")

def test_api_prediction():
    """测试API预测功能"""
    print("\n🎯 测试API预测功能...")
    
    test_file = create_test_data()
    
    servers = [
        'http://localhost:8080',
        'http://39.96.196.67:8080'
    ]
    
    for server_url in servers:
        print(f"\n测试服务器: {server_url}")
        
        try:
            # 准备请求
            with open(test_file, 'rb') as f:
                files = {'scores_file': f}
                data = {
                    'year': '2024',
                    'major': '智能科学与技术'
                }
                
                print("📤 发送预测请求...")
                response = requests.post(
                    f"{server_url}/api/predict",
                    files=files,
                    data=data,
                    timeout=120
                )
            
            if response.status_code == 200:
                result = response.json()
                if result['success']:
                    print("✅ 预测请求成功")
                    
                    # 检查结果
                    results = result['data']['results']
                    for major_result in results:
                        if major_result['success']:
                            predictions = major_result['result']['results']['Predictions']
                            if predictions:
                                sample = predictions[0]
                                courses = [k for k in sample.keys() 
                                         if k not in ['SNH', 'Major', 'predicted_class', 'predicted_proba']]
                                
                                print(f"📊 {major_result['major']}: {len(predictions)}条记录，{len(courses)}个课程")
                                
                                # 关键检查
                                problem_course = 'Design & Build实训（智能）'
                                if problem_course in courses:
                                    print(f"❌ API依然返回问题课程: {problem_course}")
                                else:
                                    print(f"✅ API未返回问题课程")
                                    
                                # 显示前几个课程
                                print(f"   前5个课程: {courses[:5]}")
                        else:
                            print(f"❌ {major_result['major']}: {major_result['error']}")
                else:
                    print(f"❌ 预测失败: {result['error']}")
            else:
                print(f"❌ 请求失败: {response.status_code}")
                print(f"   响应: {response.text[:200]}")
                
        except requests.RequestException as e:
            print(f"❌ 请求错误: {str(e)}")
        except Exception as e:
            print(f"❌ 测试错误: {str(e)}")
        finally:
            if os.path.exists(test_file):
                try:
                    os.remove(test_file)
                except:
                    pass

def main():
    """主测试函数"""
    print("="*60)
    print("🧪 阿里云预测服务修复验证测试")
    print("="*60)
    print(f"🕐 测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 测试1: 本地算法
    if os.path.exists('run_prediction_direct.py'):
        local_ok = test_local_algorithm()
    else:
        print("⚠️ 跳过本地算法测试 (文件不存在)")
        local_ok = None
    
    # 测试2: API接口
    test_api_endpoints()
    
    # 测试3: API预测
    test_api_prediction()
    
    print("\n"+"="*60)
    print("📋 测试总结")
    print("="*60)
    
    if local_ok is True:
        print("✅ 本地算法: 修复成功，2024年级不再包含问题课程")
    elif local_ok is False:
        print("❌ 本地算法: 依然存在问题")
    else:
        print("⚠️ 本地算法: 未测试")
    
    print("\n💡 如果API依然返回问题课程，请:")
    print("1. 确保使用最新的部署脚本重新部署")
    print("2. 检查服务器上是否有多个API服务实例")
    print("3. 确认调用的是正确的端口和服务")
    print("4. 查看服务器日志以获取详细信息")
    
    print("\n🚀 部署命令:")
    print("   Linux: chmod +x deploy.sh && sudo ./deploy.sh")
    print("   Windows: deploy.bat")

if __name__ == "__main__":
    main()
