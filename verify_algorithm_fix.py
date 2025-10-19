#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
验证算法修复的测试脚本
在阿里云服务器上运行此脚本来确认修复是否生效
"""

import os
import sys
import subprocess
import pandas as pd
from datetime import datetime

def check_file_structure():
    """检查文件结构"""
    print("=== 检查文件结构 ===")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"当前目录: {base_dir}")
    
    # 检查关键文件
    files_to_check = [
        'run_prediction_direct.py',
        'Optimization_model_func3_1.py',
        'education-plan2024/2024级智能科学与技术培养方案.xlsx'
    ]
    
    for file_path in files_to_check:
        full_path = os.path.join(base_dir, file_path)
        exists = os.path.exists(full_path)
        print(f"{'✅' if exists else '❌'} {file_path}: {'存在' if exists else '不存在'}")
        
        if exists and file_path.endswith('.py'):
            # 检查Python文件的修改时间
            mtime = os.path.getmtime(full_path)
            mtime_str = datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M:%S')
            print(f"   修改时间: {mtime_str}")

def check_algorithm_code():
    """检查算法代码是否包含年级参数"""
    print("\n=== 检查算法代码 ===")
    
    script_path = 'run_prediction_direct.py'
    if not os.path.exists(script_path):
        print("❌ run_prediction_direct.py 文件不存在")
        return False
    
    with open(script_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查关键修改
    checks = [
        ('argparse', 'argparse导入'),
        ('--year', '年级参数'),
        ('get_course_file_path', '动态文件路径函数'),
        ('education-plan{year}', '动态年级目录')
    ]
    
    all_good = True
    for check_str, description in checks:
        if check_str in content:
            print(f"✅ {description}: 已包含")
        else:
            print(f"❌ {description}: 未找到")
            all_good = False
    
    return all_good

def test_algorithm_directly():
    """直接测试算法"""
    print("\n=== 直接测试算法 ===")
    
    # 创建一个小的测试成绩文件
    test_data = {
        'SNH': ['test001', 'test002'],
        'Semester_Offered': ['2023-2024-1', '2023-2024-1'],
        'Current_Major': ['智能科学与技术', '智能科学与技术'],
        'Course_ID': ['1001', '1002'],
        'Course_Name': ['高等数学A(上)', '线性代数'],
        'Grade': [85, 90],
        'Course_Type': ['公共课', '公共课'],
        'Course_Attribute ': ['必修', '必修'],
        'Hours': ['80(学时)', '48(学时)'],
        'Credit': [5, 3],
        'Offering_Unit': ['数学科学学院', '数学科学学院'],
        'Exam_Type': ['正常考试', '正常考试'],
        'Assessment_Method ': ['考试', '考试']
    }
    
    test_file = 'test_scores_2024.xlsx'
    df = pd.DataFrame(test_data)
    df.to_excel(test_file, index=False)
    print(f"✅ 创建测试文件: {test_file}")
    
    try:
        # 测试2024年级预测
        cmd = [
            sys.executable, 'run_prediction_direct.py',
            '--year', '2024',
            '--scores_file', test_file,
            '--major', '智能科学与技术'
        ]
        
        print(f"执行命令: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5分钟超时
        )
        
        if result.returncode == 0:
            print("✅ 算法执行成功")
            print("输出信息:")
            print(result.stdout[-1000:])  # 显示最后1000字符
            
            # 检查生成的文件
            output_file = 'Cohort2024_Predictions_ai.xlsx'
            if os.path.exists(output_file):
                print(f"✅ 生成预测文件: {output_file}")
                
                # 检查文件内容
                try:
                    pred_df = pd.read_excel(output_file, sheet_name='Predictions')
                    courses = [col for col in pred_df.columns 
                             if col not in ['SNH', 'Major', 'predicted_class', 'predicted_proba']]
                    
                    print(f"📊 预测文件包含 {len(courses)} 个课程字段")
                    
                    # 检查问题课程
                    problematic_course = 'Design & Build实训（智能）'
                    if problematic_course in courses:
                        print(f"❌ 依然包含问题课程: {problematic_course}")
                        print("🔧 算法还在使用2023年培养方案数据！")
                        return False
                    else:
                        print(f"✅ 未发现问题课程 {problematic_course}")
                        print("🎉 算法修复成功！")
                        return True
                        
                except Exception as e:
                    print(f"❌ 读取预测文件失败: {e}")
                    return False
            else:
                print(f"❌ 预测文件未生成: {output_file}")
                return False
        else:
            print("❌ 算法执行失败")
            print("错误信息:")
            print(result.stderr)
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ 算法执行超时")
        return False
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False
    finally:
        # 清理测试文件
        for file in [test_file, 'Cohort2024_Predictions_ai.xlsx', 'Cohort2024_Predictions_All.xlsx']:
            if os.path.exists(file):
                try:
                    os.remove(file)
                except:
                    pass

def main():
    print("=== 阿里云算法修复验证 ===")
    
    # 1. 检查文件结构
    check_file_structure()
    
    # 2. 检查代码修改
    code_ok = check_algorithm_code()
    
    if not code_ok:
        print("\n❌ 代码检查未通过，请确认文件是否正确上传")
        return
    
    # 3. 直接测试算法
    algorithm_ok = test_algorithm_directly()
    
    print(f"\n=== 验证结果 ===")
    if algorithm_ok:
        print("🎉 算法修复验证成功！")
        print("✅ 2024年级预测不再包含 'Design & Build实训（智能）' 课程")
        print("🚀 可以重启API服务了")
    else:
        print("❌ 算法修复验证失败")
        print("🔧 需要进一步排查问题")

if __name__ == "__main__":
    main()
