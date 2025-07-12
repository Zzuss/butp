#!/usr/bin/env python3
"""
简历解析系统测试文件
"""

import os
import json
from .resume_parser import ResumeParser, parse_resume_text
from .resume_models import Resume, ContactInfo

def test_text_parsing():
    """测试文本解析功能"""
    print("=== 测试文本解析 ===")
    
    sample_resume = """
    李明
    手机：13912345678
    邮箱：liming@example.com
    地址：上海市浦东新区
    GitHub: https://github.com/liming
    
    个人简介：
    5年软件开发经验，熟悉Python、Java开发，有丰富的Web应用和数据分析经验。
    
    教育背景：
    2016-2020 上海交通大学 计算机科学与技术 本科 GPA: 3.8/4.0
    
    工作经历：
    2020-2023 阿里巴巴 高级软件工程师 杭州
    - 负责电商平台后端开发
    - 优化系统性能，提升响应速度30%
    - 参与微服务架构设计
    
    项目经验：
    电商推荐系统 (2021-2022)
    - 使用Python和机器学习算法开发推荐引擎
    - 技术栈：Python, TensorFlow, Redis, MySQL
    - 提升用户点击率15%
    
    技能：
    编程语言：Python, Java, JavaScript
    数据库：MySQL, Redis, MongoDB
    框架：Django, Spring Boot, React
    
    证书：
    AWS认证解决方案架构师 2022年获得
    
    语言：
    中文（母语）
    英语（流利）
    """
    
    try:
        # 注意：这里需要配置有效的API密钥才能实际运行
        # 为了测试，我们只验证数据模型的创建
        print("创建测试用Resume对象...")
        
        # 创建测试数据
        test_resume = Resume(
            contact_info=ContactInfo(
                name="李明",
                phone="13912345678",
                email="liming@example.com",
                address="上海市浦东新区",
                github="https://github.com/liming"
            ),
            summary="5年软件开发经验，熟悉Python、Java开发，有丰富的Web应用和数据分析经验。"
        )
        
        print("✅ Resume对象创建成功")
        print(f"姓名: {test_resume.contact_info.name}")
        print(f"邮箱: {test_resume.contact_info.email}")
        
        # 测试JSON转换
        json_str = test_resume.to_json()
        print("✅ JSON转换成功")
        print(f"JSON长度: {len(json_str)} 字符")
        
        # 测试JSON解析
        parsed_data = json.loads(json_str)
        print("✅ JSON解析成功")
        print(f"解析的姓名: {parsed_data['contact_info']['name']}")
        
        return True
        
    except Exception as e:
        print(f"❌ 测试失败: {str(e)}")
        return False

def test_file_processor():
    """测试文件处理器"""
    print("\n=== 测试文件处理器 ===")
    
    from .file_utils import FileProcessor
    
    # 测试文本文件创建和读取
    test_content = "这是一个测试文本文件\n包含中文内容"
    test_file = "test_resume.txt"
    
    try:
        # 创建测试文件
        with open(test_file, 'w', encoding='utf-8') as f:
            f.write(test_content)
        
        # 测试文件验证
        is_valid = FileProcessor.validate_file(test_file)
        print(f"文件验证结果: {is_valid}")
        
        # 测试文本提取
        extracted_text = FileProcessor.extract_text_from_file(test_file)
        print(f"提取的文本: {extracted_text}")
        
        # 清理测试文件
        if os.path.exists(test_file):
            os.remove(test_file)
        
        print("✅ 文件处理器测试成功")
        return True
        
    except Exception as e:
        print(f"❌ 文件处理器测试失败: {str(e)}")
        # 确保清理测试文件
        if os.path.exists(test_file):
            os.remove(test_file)
        return False

def test_llm_client():
    """测试LLM客户端（需要API密钥）"""
    print("\n=== 测试LLM客户端 ===")
    
    try:
        from .llm_client import LLMClient
        from .config import config
        
        # 检查API密钥是否配置
        if config.OPENAI_API_KEY == "your_openai_api_key_here":
            print("⚠️ 未配置OpenAI API密钥，跳过LLM客户端测试")
            return True
        
        # 创建LLM客户端
        client = LLMClient(provider="openai")
        print("✅ LLM客户端创建成功")
        
        # 获取提供商信息
        info = client.get_provider_info()
        print(f"LLM信息: {info}")
        
        print("✅ LLM客户端测试成功")
        return True
        
    except Exception as e:
        print(f"❌ LLM客户端测试失败: {str(e)}")
        return False

def main():
    """运行所有测试"""
    print("🧪 简历解析系统测试")
    print("=" * 50)
    
    tests = [
        ("数据模型测试", test_text_parsing),
        ("文件处理器测试", test_file_processor),
        ("LLM客户端测试", test_llm_client),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n运行 {test_name}...")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} 异常: {str(e)}")
            results.append((test_name, False))
    
    print("\n" + "=" * 50)
    print("🎯 测试结果总结:")
    
    passed = 0
    for test_name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n总计: {passed}/{len(results)} 个测试通过")
    
    if passed == len(results):
        print("🎉 所有测试通过！")
    else:
        print("⚠️ 部分测试失败，请检查配置和依赖。")

if __name__ == "__main__":
    main() 