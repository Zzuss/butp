#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速测试脚本 - 检查阿里云API是否正确处理2024年级数据
在你的本地机器上运行，测试阿里云服务器
"""

import requests
import json

def quick_test():
    """快速测试阿里云API"""
    api_url = "http://8.152.102.160:8080"
    
    print("=== 阿里云API快速测试 ===")
    
    # 1. 健康检查
    try:
        response = requests.get(f"{api_url}/health", timeout=10)
        if response.status_code == 200:
            print("✅ API服务正常运行")
        else:
            print(f"❌ API服务异常: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ 无法连接到API: {e}")
        return
    
    print("📋 如果API服务正常，请在阿里云服务器上执行以下验证:")
    print("1. 上传verify_algorithm_fix.py到服务器")
    print("2. 在服务器上运行: python verify_algorithm_fix.py")
    print("3. 检查输出是否显示'算法修复验证成功'")
    
    # 检查本地是否有小测试文件可以用于测试
    test_suggestions = [
        "\n=== 如果要进行完整测试 ===",
        "请准备一个小的2024年级成绩Excel文件，然后运行:",
        f"curl -X POST {api_url}/api/predict \\",
        '  -F "year=2024" \\',
        '  -F "major=智能科学与技术" \\', 
        '  -F "scores_file=@small_test.xlsx"',
        "",
        "检查返回结果中是否包含 'Design & Build实训（智能）' 字段。",
        "如果包含，说明算法还在使用2023年培养方案。"
    ]
    
    for suggestion in test_suggestions:
        print(suggestion)

if __name__ == "__main__":
    quick_test()
