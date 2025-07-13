#!/usr/bin/env python3
"""
简历解析器运行脚本

在项目根目录运行此脚本来使用简历解析系统。
"""

import sys
import os
import argparse

# 确保可以导入resume_parser包
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from resume_parser import ResumeParser, parse_resume, parse_resume_text

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='简历解析工具')
    
    # 添加参数
    parser.add_argument('--file', '-f', type=str, help='简历文件路径')
    parser.add_argument('--text', '-t', type=str, help='直接输入简历文本')
    parser.add_argument('--provider', '-p', type=str, default='openai', 
                       choices=['openai', 'deepseek'], help='LLM提供商')
    parser.add_argument('--output', '-o', type=str, help='输出JSON文件路径')
    parser.add_argument('--verbose', '-v', action='store_true', help='详细输出')
    parser.add_argument('--test', action='store_true', help='运行测试')
    parser.add_argument('--example', action='store_true', help='运行示例')
    
    args = parser.parse_args()
    
    # 运行测试
    if args.test:
        print("运行简历解析器测试...")
        try:
            from resume_parser.test_resume_parser import main as test_main
            test_main()
        except Exception as e:
            print(f"测试运行失败: {e}")
        return
    
    # 运行示例
    if args.example:
        print("运行简历解析器示例...")
        try:
            from resume_parser.example_usage import main as example_main
            example_main()
        except Exception as e:
            print(f"示例运行失败: {e}")
        return
    
    # 检查输入
    if not args.file and not args.text:
        print("错误：请提供简历文件路径（--file）或简历文本（--text）")
        print("或者使用 --test 运行测试，--example 运行示例")
        sys.exit(1)
    
    print(f"🚀 开始解析简历...")
    print(f"LLM提供商: {args.provider}")
    
    try:
        # 解析简历
        if args.file:
            print(f"输入文件: {args.file}")
            result = parse_resume(args.file, llm_provider=args.provider, output_path=args.output)
        else:
            print("输入: 文本内容")
            result = parse_resume_text(args.text, llm_provider=args.provider)
        
        if result:
            print("✅ 解析成功！")
            print(f"姓名: {result.contact_info.name}")
            print(f"邮箱: {result.contact_info.email}")
            print(f"教育经历: {len(result.education)} 条")
            print(f"工作经历: {len(result.work_experience)} 条")
        else:
            print("❌ 解析失败")
    
    except Exception as e:
        print(f"错误：{str(e)}")
        if args.verbose:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main() 