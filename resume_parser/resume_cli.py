#!/usr/bin/env python3
"""
简历解析命令行工具

使用方法：
python resume_cli.py --file resume.pdf --provider openai --output result.json
"""

import argparse
import os
import sys
from .resume_parser import ResumeParser, parse_resume, parse_resume_text

def main():
    parser = argparse.ArgumentParser(description='简历解析工具')
    
    # 添加参数
    parser.add_argument('--file', '-f', type=str, help='简历文件路径')
    parser.add_argument('--text', '-t', type=str, help='直接输入简历文本')
    parser.add_argument('--provider', '-p', type=str, default='openai', 
                       choices=['openai', 'deepseek'], help='LLM提供商')
    parser.add_argument('--output', '-o', type=str, help='输出JSON文件路径')
    parser.add_argument('--verbose', '-v', action='store_true', help='详细输出')
    
    args = parser.parse_args()
    
    # 检查输入
    if not args.file and not args.text:
        print("错误：请提供简历文件路径（--file）或简历文本（--text）")
        sys.exit(1)
    
    if args.file and args.text:
        print("错误：请只提供文件路径或文本中的一种")
        sys.exit(1)
    
    # 设置日志级别
    if args.verbose:
        import logging
        logging.basicConfig(level=logging.INFO)
    
    print(f"🚀 开始解析简历...")
    print(f"LLM提供商: {args.provider}")
    
    try:
        # 解析简历
        if args.file:
            print(f"输入文件: {args.file}")
            if not os.path.exists(args.file):
                print(f"错误：文件不存在 {args.file}")
                sys.exit(1)
            
            result = parse_resume(args.file, llm_provider=args.provider, output_path=args.output)
        else:
            print("输入: 文本内容")
            result = parse_resume_text(args.text, llm_provider=args.provider)
            
            # 如果有输出路径，保存结果
            if args.output and result:
                resume_parser = ResumeParser(llm_provider=args.provider)
                resume_parser.save_resume_to_json(result, args.output)
        
        if result:
            print("✅ 解析成功！")
            print(f"姓名: {result.contact_info.name}")
            print(f"邮箱: {result.contact_info.email}")
            print(f"教育经历: {len(result.education)} 条")
            print(f"工作经历: {len(result.work_experience)} 条")
            print(f"项目经历: {len(result.projects)} 条")
            print(f"技能类别: {len(result.skills)} 个")
            
            if args.output:
                print(f"结果已保存到: {args.output}")
            else:
                print("\n完整JSON结果:")
                print(result.to_json())
        else:
            print("❌ 解析失败")
            sys.exit(1)
    
    except Exception as e:
        print(f"错误：{str(e)}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main() 