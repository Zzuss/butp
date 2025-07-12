#!/usr/bin/env python3
"""
简历解析器模块主入口

允许通过 python -m resume_parser 运行命令行工具
"""

from .resume_cli import main

if __name__ == "__main__":
    main() 