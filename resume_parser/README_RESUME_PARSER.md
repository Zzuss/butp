# 简历解析系统

一个基于大语言模型（LLM）的简历解析系统，能够从PDF、Word文档或文本中提取简历信息，并将其结构化为JSON格式。

## 📁 项目结构

```
BuTP/
├── resume_parser/                          # 🎯 简历解析核心包
│   ├── __init__.py                        # 包初始化文件
│   ├── __main__.py                        # 模块主入口
│   ├── config.py                          # 配置管理
│   ├── resume_models.py                   # 数据模型定义
│   ├── file_utils.py                      # 文件处理工具
│   ├── llm_client.py                      # LLM客户端
│   ├── resume_parser.py                   # 主解析器
│   ├── resume_cli.py                      # 命令行工具
│   ├── example_usage.py                   # 使用示例
│   ├── test_resume_parser.py              # 测试文件
│   ├── requirements.txt                   # 依赖项
│   └── RESUME_PARSER_README.md            # 详细文档
├── run_resume_parser.py                   # 🚀 主运行脚本
├── setup.py                              # 📦 包安装脚本

```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd resume_parser
pip install -r requirements.txt
```

### 2. 配置API密钥

在项目根目录创建 `.env` 文件：

```env
# OpenAI GPT API配置
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# DeepSeek API配置
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# 其他配置
DEFAULT_LLM_PROVIDER=openai
MAX_TOKENS=2000
TEMPERATURE=0.1
```

### 3. 使用方法

#### 方法1：使用主运行脚本（推荐）

```bash
# 解析PDF文件
python run_resume_parser.py --file resume.pdf --provider openai --output result.json

# 解析文本内容
python run_resume_parser.py --text "张三 电话：13800138000..." --provider openai

# 运行测试
python run_resume_parser.py --test

# 运行示例
python run_resume_parser.py --example
```

#### 方法2：直接使用包

```python
from resume_parser import parse_resume, parse_resume_text

# 解析文件
result = parse_resume("resume.pdf", llm_provider="openai", output_path="result.json")

# 解析文本
resume_text = "张三 电话：13800138000..."
result = parse_resume_text(resume_text, llm_provider="openai")

if result:
    print(f"姓名: {result.contact_info.name}")
    print(f"邮箱: {result.contact_info.email}")
    print(result.to_json())
```

#### 方法3：使用内部命令行工具

```bash
cd resume_parser
python -m resume_cli --file resume.pdf --provider openai --output result.json
```

## 📊 功能特点

- 🔍 **多格式支持**: PDF、Word（.docx）、纯文本
- 🤖 **多LLM支持**: OpenAI GPT、DeepSeek等
- 📊 **结构化输出**: 标准JSON格式
- 🛠️ **易于使用**: 多种使用方式
- 📝 **完整数据模型**: 包含联系信息、教育背景、工作经历等
- 🔧 **错误处理**: 完善的错误处理机制
- 📚 **丰富文档**: 详细的使用说明和示例

## 🧪 测试系统

```bash
# 运行所有测试
python run_resume_parser.py --test

# 或者直接运行测试文件
cd resume_parser
python test_resume_parser.py
```

## 📚 示例和教程

```bash
# 运行示例
python run_resume_parser.py --example

# 或者直接运行示例文件
cd resume_parser
python example_usage.py
```

## 📁 输出格式

系统会将简历信息结构化为包含以下字段的JSON：

```json
{
  "contact_info": {
    "name": "姓名",
    "phone": "电话号码",
    "email": "邮箱地址",
    "address": "地址",
    "linkedin": "LinkedIn链接",
    "github": "GitHub链接",
    "website": "个人网站"
  },
  "education": [...],
  "work_experience": [...],
  "projects": [...],
  "skills": [...],
  "languages": [...],
  "certificates": [...],
  "awards": [...],
  "volunteer_experience": [...],
  "publications": [...],
  "references": [...]
}
```

## 🔧 高级用法

### 批量处理

```python
from resume_parser import ResumeParser

parser = ResumeParser(llm_provider="openai")
resume_files = ["resume1.pdf", "resume2.docx", "resume3.txt"]

for file_path in resume_files:
    result = parser.parse_resume_from_file(file_path)
    if result:
        output_path = f"{file_path}_parsed.json"
        parser.save_resume_to_json(result, output_path)
```

### 自定义配置

```python
from resume_parser import ResumeParser

# 创建自定义配置的解析器
parser = ResumeParser(llm_provider="deepseek")

# 获取系统信息
print(f"支持的格式: {parser.get_supported_formats()}")
print(f"LLM信息: {parser.get_llm_info()}")
```

## 📋 命令行选项

```bash
python run_resume_parser.py [选项]

选项:
  --file, -f        简历文件路径
  --text, -t        直接输入简历文本
  --provider, -p    LLM提供商 (openai, deepseek)
  --output, -o      输出JSON文件路径
  --verbose, -v     详细输出
  --test           运行测试
  --example        运行示例
```

## 🔍 支持的文件格式

- **PDF**: 使用PyPDF2提取文本
- **Word**: 支持.docx格式（推荐），部分支持.doc格式
- **文本**: 支持多种编码格式（UTF-8、GBK、GB2312等）

## 🤖 支持的LLM

- **OpenAI GPT**: gpt-4o-mini、gpt-4、gpt-3.5-turbo
- **DeepSeek**: deepseek-chat

## ❓ 常见问题

### 1. API密钥错误
确保在.env文件中正确设置API密钥。

### 2. 文件格式不支持
检查文件扩展名是否为.pdf、.docx、.doc或.txt。

### 3. 解析结果不准确
尝试调整温度参数或使用不同的LLM模型。

### 4. 导入错误
确保在项目根目录运行脚本，或使用提供的`run_resume_parser.py`脚本。

## 📞 获取帮助

- 查看 `resume_parser/RESUME_PARSER_README.md` 获取详细文档
- 运行 `python run_resume_parser.py --help` 查看命令行帮助
- 运行 `python run_resume_parser.py --example` 查看使用示例

## 🎯 许可证

本项目使用MIT许可证。

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目。 