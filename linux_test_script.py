#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Linux环境下的算法测试脚本
"""

import os
import sys
import subprocess

def quick_check():
    """快速检查关键修改"""
    print("=== Linux环境快速检查 ===")
    
    # 检查当前目录
    current_dir = os.getcwd()
    print(f"当前目录: {current_dir}")
    
    # 检查关键文件
    script_file = "run_prediction_direct.py"
    if os.path.exists(script_file):
        print("✅ run_prediction_direct.py 存在")
        
        # 检查文件内容
        with open(script_file, 'r') as f:
            content = f.read()
        
        if 'argparse' in content:
            print("✅ 包含argparse导入")
        else:
            print("❌ 缺少argparse导入")
            
        if '--year' in content:
            print("✅ 包含年级参数")
        else:
            print("❌ 缺少年级参数")
            
        if 'get_course_file_path' in content:
            print("✅ 包含动态路径函数")
        else:
            print("❌ 缺少动态路径函数")
    else:
        print("❌ run_prediction_direct.py 不存在")
        return False
    
    # 检查2024年培养方案
    plan_dir = "education-plan2024"
    ai_plan = f"{plan_dir}/2024级智能科学与技术培养方案.xlsx"
    
    if os.path.exists(plan_dir):
        print("✅ education-plan2024 目录存在")
        if os.path.exists(ai_plan):
            print("✅ 智能科学与技术培养方案文件存在")
        else:
            print("❌ 智能科学与技术培养方案文件不存在")
            print(f"   期望路径: {ai_plan}")
    else:
        print("❌ education-plan2024 目录不存在")
        return False
    
    return True

def test_algorithm():
    """测试算法调用"""
    print("\n=== 测试算法调用 ===")
    
    # 创建最小测试数据
    test_content = """SNH,Semester_Offered,Current_Major,Course_ID,Course_Name,Grade,Course_Type,Course_Attribute ,Hours,Credit,Offering_Unit,Exam_Type,Assessment_Method 
test001,2023-2024-1,智能科学与技术,1001,高等数学A(上),85,公共课,必修,80(学时),5,数学科学学院,正常考试,考试
test002,2023-2024-1,智能科学与技术,1002,线性代数,90,公共课,必修,48(学时),3,数学科学学院,正常考试,考试"""
    
    # 写入临时CSV文件（Excel可能需要额外依赖）
    test_file = "mini_test.csv"
    with open(test_file, 'w') as f:
        f.write(test_content)
    
    # 转换为Excel格式
    try:
        import pandas as pd
        df = pd.read_csv(test_file)
        test_excel = "mini_test.xlsx"
        df.to_excel(test_excel, index=False)
        print(f"✅ 创建测试文件: {test_excel}")
        
        # 测试算法
        cmd = [
            "python3", "run_prediction_direct.py",
            "--year", "2024",
            "--scores_file", test_excel,
            "--major", "智能科学与技术"
        ]
        
        print(f"执行命令: {' '.join(cmd)}")
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            
            if result.returncode == 0:
                print("✅ 算法执行成功")
                
                # 检查输出文件
                output_file = "Cohort2024_Predictions_ai.xlsx"
                if os.path.exists(output_file):
                    print(f"✅ 生成预测文件: {output_file}")
                    
                    # 检查文件内容
                    pred_df = pd.read_excel(output_file, sheet_name='Predictions')
                    courses = [col for col in pred_df.columns 
                             if col not in ['SNH', 'Major', 'predicted_class', 'predicted_proba']]
                    
                    print(f"📊 预测包含 {len(courses)} 个课程")
                    
                    # 关键检查：是否包含问题课程
                    problem_course = 'Design & Build实训（智能）'
                    if problem_course in courses:
                        print(f"❌ 依然包含问题课程: {problem_course}")
                        print("🚨 算法还在使用2023年培养方案！")
                        return False
                    else:
                        print(f"✅ 未包含问题课程: {problem_course}")
                        print("🎉 算法修复成功！")
                        return True
                else:
                    print("❌ 未生成预测文件")
                    return False
            else:
                print("❌ 算法执行失败")
                print("错误输出:", result.stderr)
                return False
                
        except subprocess.TimeoutExpired:
            print("❌ 算法执行超时")
            return False
            
    except ImportError:
        print("❌ 缺少pandas依赖，请运行: pip3 install pandas openpyxl")
        return False
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False
    finally:
        # 清理测试文件
        for f in ["mini_test.csv", "mini_test.xlsx", "Cohort2024_Predictions_ai.xlsx"]:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except:
                    pass

def main():
    print("=== 阿里云Linux环境算法验证 ===")
    
    # 1. 快速检查
    if not quick_check():
        print("\n❌ 基础检查失败，请确认文件是否正确上传")
        return
    
    # 2. 算法测试
    if test_algorithm():
        print(f"\n🎉 验证成功！算法已正确修复")
        print("✅ 2024年级预测不再包含问题课程")
        print("🚀 可以重启API服务并测试完整流程")
    else:
        print(f"\n❌ 验证失败，需要进一步排查")

if __name__ == "__main__":
    main()
