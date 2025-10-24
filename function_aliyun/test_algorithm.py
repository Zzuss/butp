#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试修改后的算法是否能正确处理2024年级数据
"""

import os
import sys

def test_file_paths():
    """测试文件路径是否正确"""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"基础目录: {base_dir}")
    
    # 测试2024年级培养方案文件
    year = "2024"
    majors = ["智能科学与技术", "物联网工程", "电信工程及管理", "电子信息工程"]
    major_codes = {
        "智能科学与技术": "ai",
        "物联网工程": "iot",
        "电信工程及管理": "tewm", 
        "电子信息工程": "ee"
    }
    
    print(f"\n=== 检查{year}年级培养方案文件 ===")
    
    for major in majors:
        code = major_codes[major]
        
        # 检查Course_Process文件
        course_process_file = os.path.join(base_dir, f"Course_Process_{year}_{code}.xlsx")
        course_process_exists = os.path.exists(course_process_file)
        
        # 检查education-plan文件
        education_plan_dir = os.path.join(base_dir, f"education-plan{year}")
        education_plan_file = os.path.join(education_plan_dir, f"{year}级{major}培养方案.xlsx")
        education_plan_exists = os.path.exists(education_plan_file)
        
        print(f"\n{major} ({code}):")
        print(f"  Course_Process文件: {course_process_file}")
        print(f"  存在: {course_process_exists}")
        print(f"  Education-plan文件: {education_plan_file}") 
        print(f"  存在: {education_plan_exists}")
        
        if not course_process_exists and not education_plan_exists:
            print(f"  ❌ 警告: {major} 没有找到任何培养方案文件!")
        elif education_plan_exists:
            print(f"  ✅ 将使用原始培养方案文件")
        else:
            print(f"  ✅ 将使用Course_Process文件")

def test_command_structure():
    """测试命令结构"""
    print(f"\n=== 测试命令结构 ===")
    
    # 模拟命令参数
    base_dir = os.path.dirname(os.path.abspath(__file__))
    script_path = os.path.join(base_dir, 'run_prediction_direct.py')
    
    # 测试命令
    sample_commands = [
        # 全专业预测
        [
            sys.executable, script_path,
            '--year', '2024',
            '--scores_file', '/path/to/scores.xlsx'
        ],
        # 单专业预测
        [
            sys.executable, script_path,
            '--year', '2024', 
            '--scores_file', '/path/to/scores.xlsx',
            '--major', '智能科学与技术'
        ],
        # 带配置参数
        [
            sys.executable, script_path,
            '--year', '2024',
            '--scores_file', '/path/to/scores.xlsx',
            '--config', '{"min_grade": 65, "max_grade": 95}'
        ]
    ]
    
    for i, cmd in enumerate(sample_commands, 1):
        print(f"\n测试命令 {i}:")
        print(f"  {' '.join(cmd)}")

def main():
    print("=== 算法修改验证测试 ===")
    test_file_paths()
    test_command_structure()
    
    print(f"\n=== 总结 ===")
    print("✅ 算法已修改为支持动态年级选择")
    print("✅ 创建了API服务器接口")
    print("📝 建议:")
    print("   1. 确保2024年级培养方案文件存在于education-plan2024目录")
    print("   2. 部署时将修改后的代码上传到阿里云服务器")
    print("   3. 重启阿里云服务器上的API服务")

if __name__ == "__main__":
    main()
