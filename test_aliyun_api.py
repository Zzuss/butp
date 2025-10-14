#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试阿里云API是否正确更新的诊断脚本
"""

import requests
import json
import os

def test_aliyun_api():
    """测试阿里云API状态"""
    api_base = "http://8.152.102.160:8080"
    
    print("=== 阿里云API诊断测试 ===")
    
    # 1. 健康检查
    try:
        response = requests.get(f"{api_base}/health", timeout=10)
        if response.status_code == 200:
            print("✅ API服务运行正常")
            print(f"   响应: {response.json()}")
        else:
            print(f"❌ API健康检查失败: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ 无法连接到API服务: {e}")
        return
    
    # 2. 测试预测接口（小样本）
    print("\n2. 测试预测接口...")
    
    # 创建测试数据
    test_data = {
        'year': '2024',
        'major': '智能科学与技术',
        'config': json.dumps({
            'with_uniform_inverse': 1,
            'min_grade': 60,
            'max_grade': 90
        })
    }
    
    # 读取一个小的测试文件（如果有的话）
    test_file_path = "test_scores_small.xlsx"
    if not os.path.exists(test_file_path):
        print(f"❌ 测试文件 {test_file_path} 不存在")
        print("   请手动在阿里云服务器上测试:")
        print(f"   curl -X POST {api_base}/api/predict -F 'year=2024' -F 'major=智能科学与技术' -F 'scores_file=@/path/to/test.xlsx'")
        return
    
    try:
        with open(test_file_path, 'rb') as f:
            files = {'scores_file': f}
            response = requests.post(
                f"{api_base}/api/predict",
                data=test_data,
                files=files,
                timeout=120
            )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ 预测接口响应成功")
            
            # 检查返回的课程字段
            if 'data' in result and 'results' in result['data']:
                for major_result in result['data']['results']:
                    if major_result['success'] and 'result' in major_result:
                        predictions = major_result['result']['results']['Predictions']
                        if predictions:
                            sample_record = predictions[0]
                            courses = [k for k in sample_record.keys() if k not in ['SNH', 'Major', 'predicted_class', 'predicted_proba']]
                            print(f"   🔍 检测到的课程字段: {len(courses)} 个")
                            
                            # 检查是否包含问题字段
                            problematic_course = 'Design & Build实训（智能）'
                            if problematic_course in courses:
                                print(f"   ❌ 依然包含问题课程: {problematic_course}")
                                print("   🔧 算法还在使用2023年培养方案！")
                            else:
                                print(f"   ✅ 未发现问题课程 {problematic_course}")
                            
                            # 显示前5个课程
                            print(f"   📋 前5个课程: {courses[:5]}")
            else:
                print("   ⚠️ 响应格式异常，无法检查课程字段")
                
        else:
            print(f"❌ 预测接口测试失败: {response.status_code}")
            print(f"   响应: {response.text[:500]}")
            
    except Exception as e:
        print(f"❌ 预测接口测试错误: {e}")

def main():
    test_aliyun_api()
    
    print(f"\n=== 问题排查建议 ===")
    print("如果API依然返回 'Design & Build实训（智能）' 课程:")
    print("1. 检查阿里云服务器上的代码是否正确更新")
    print("2. 确认API服务是否完全重启")
    print("3. 验证2024年培养方案文件是否存在")
    print("4. 清除可能的缓存")

if __name__ == "__main__":
    main()
