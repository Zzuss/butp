#!/usr/bin/env python3
"""
简历解析器包安装脚本
"""

from setuptools import setup, find_packages

# 读取requirements.txt
with open("resume_parser/requirements.txt", "r", encoding="utf-8") as f:
    requirements = [line.strip() for line in f if line.strip() and not line.startswith("#")]

# 读取README
with open("README_RESUME_PARSER.md", "r", encoding="utf-8") as f:
    long_description = f.read()

setup(
    name="resume-parser",
    version="1.0.0",
    author="Resume Parser Team",
    author_email="",
    description="基于LLM的简历解析系统",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/your-username/resume-parser",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
    entry_points={
        "console_scripts": [
            "resume-parser=resume_parser.resume_cli:main",
        ],
    },
    include_package_data=True,
    package_data={
        "resume_parser": ["requirements.txt", "*.md"],
    },
) 