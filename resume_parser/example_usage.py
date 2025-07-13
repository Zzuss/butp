#!/usr/bin/env python3
"""
简历解析系统使用示例

使用方法：
1. 安装依赖：pip install -r requirements.txt
2. 配置API密钥：在.env文件中设置API密钥
3. 运行示例：python example_usage.py
"""

import os
import json
from .resume_parser import ResumeParser, parse_resume, parse_resume_text

def example_1_parse_pdf():
    """示例1：解析PDF简历"""
    print("=== 示例1：解析PDF简历 ===")
    
    # 假设有一个PDF文件
    pdf_path = "sample_resume.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"文件不存在: {pdf_path}")
        print("请将您的简历文件重命名为 'sample_resume.pdf' 并放在当前目录")
        return
    
    # 使用OpenAI GPT解析
    print("使用OpenAI GPT解析...")
    result = parse_resume(pdf_path, llm_provider="openai", output_path="resume_openai.json")
    
    if result:
        print("✅ 解析成功！")
        print(f"姓名: {result.contact_info.name}")
        print(f"邮箱: {result.contact_info.email}")
        print(f"教育经历数量: {len(result.education)}")
        print(f"工作经历数量: {len(result.work_experience)}")
        print("结果已保存到 resume_openai.json")
    else:
        print("❌ 解析失败")

def example_2_parse_with_deepseek():
    """示例2：使用DeepSeek解析"""
    print("\n=== 示例2：使用DeepSeek解析 ===")
    
    # 假设有一个Word文件
    docx_path = "sample_resume.docx"
    
    if not os.path.exists(docx_path):
        print(f"文件不存在: {docx_path}")
        print("请将您的Word简历文件重命名为 'sample_resume.docx' 并放在当前目录")
        return
    
    # 使用DeepSeek解析
    print("使用DeepSeek解析...")
    result = parse_resume(docx_path, llm_provider="deepseek", output_path="resume_deepseek.json")
    
    if result:
        print("✅ 解析成功！")
        print(f"姓名: {result.contact_info.name}")
        print(f"技能类别数量: {len(result.skills)}")
        print("结果已保存到 resume_deepseek.json")
    else:
        print("❌ 解析失败")

def example_3_parse_text():
    """示例3：解析文本简历"""
    print("\n=== 示例3：解析文本简历 ===")
    
    # 示例简历文本
    resume_text = """
    张三
    电话：13800138000
    邮箱：zhangsan@example.com
    地址：北京市朝阳区
    
    教育背景：
    北京大学 计算机科学与技术专业 本科 2018-2022
    
    工作经历：
    2022-现在 腾讯科技 软件工程师
    - 负责微信小程序开发
    - 参与后端服务架构设计
    
    技能：
    - Python, Java, JavaScript
    - MySQL, Redis
    - Docker, Kubernetes
    """
    
    print("解析文本简历...")
    result = parse_resume_text(resume_text, llm_provider="openai")
    
    if result:
        print("✅ 解析成功！")
        print(f"姓名: {result.contact_info.name}")
        print(f"电话: {result.contact_info.phone}")
        print(f"邮箱: {result.contact_info.email}")
        print("\n完整JSON结果:")
        print(result.to_json())
    else:
        print("❌ 解析失败")

def example_4_advanced_usage():
    """示例4：高级用法 - 使用ResumeParser类"""
    print("\n=== 示例4：高级用法 ===")
    
    # 创建解析器实例
    parser = ResumeParser(llm_provider="openai")
    
    # 显示支持的格式
    print(f"支持的文件格式: {parser.get_supported_formats()}")
    
    # 显示LLM信息
    llm_info = parser.get_llm_info()
    print(f"LLM信息: {llm_info}")
    
    # 批量处理示例
    resume_files = ["resume1.pdf", "resume2.docx", "resume3.txt"]
    
    for file_path in resume_files:
        if os.path.exists(file_path):
            print(f"\n处理文件: {file_path}")
            result = parser.parse_resume_from_file(file_path)
            
            if result:
                # 保存到指定目录
                output_dir = "parsed_resumes"
                os.makedirs(output_dir, exist_ok=True)
                
                base_name = os.path.splitext(os.path.basename(file_path))[0]
                output_path = os.path.join(output_dir, f"{base_name}.json")
                
                parser.save_resume_to_json(result, output_path)
                print(f"✅ 处理成功，结果保存到: {output_path}")
            else:
                print(f"❌ 处理失败: {file_path}")

def example_5_error_handling():
    """示例5：错误处理"""
    print("\n=== 示例5：错误处理 ===")
    
    # 测试不存在的文件
    print("测试不存在的文件...")
    result = parse_resume("non_existent_file.pdf")
    print(f"结果: {result}")
    
    # 测试空文本
    print("\n测试空文本...")
    result = parse_resume_text("")
    print(f"结果: {result}")
    
    # 测试不支持的格式
    print("\n测试不支持的格式...")
    # 创建一个临时的不支持格式的文件
    with open("test.xyz", "w") as f:
        f.write("这是一个不支持的格式")
    
    result = parse_resume("test.xyz")
    print(f"结果: {result}")
    
    # 清理临时文件
    if os.path.exists("test.xyz"):
        os.remove("test.xyz")

def main():
    """主函数"""
    print("🚀 简历解析系统使用示例")
    print("=" * 50)
    
    # 检查配置
    print("检查配置...")
    try:
        from .config import config
        print(f"默认LLM提供商: {config.DEFAULT_LLM_PROVIDER}")
        print(f"OpenAI API密钥: {'已设置' if config.OPENAI_API_KEY != 'your_openai_api_key_here' else '未设置'}")
        print(f"DeepSeek API密钥: {'已设置' if config.DEEPSEEK_API_KEY != 'your_deepseek_api_key_here' else '未设置'}")
    except Exception as e:
        print(f"配置检查失败: {e}")
    
    print("\n" + "=" * 50)
    
    # 运行示例
    try:
        example_1_parse_pdf()
        example_2_parse_with_deepseek()
        example_3_parse_text()
        example_4_advanced_usage()
        example_5_error_handling()
    except Exception as e:
        print(f"运行示例时出错: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 50)
    print("✨ 示例运行完成！")
    print("\n📝 使用说明:")
    print("1. 将您的简历文件放在当前目录")
    print("2. 在.env文件中设置API密钥")
    print("3. 运行 python example_usage.py")
    print("4. 查看生成的JSON文件")

if __name__ == "__main__":
    main() 