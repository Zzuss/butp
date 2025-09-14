# Python环境配置指南

## 问题说明

如果遇到以下错误：
- `ModuleNotFoundError: No module named 'Optimization_model_func3_1'`
- `ImportError: No module named 'pandas'` 或其他包导入错误
- `SyntaxWarning: invalid escape sequence`

请按照以下步骤解决：

## 解决步骤

### 1. 安装必需的Python包

```bash
# 方法1：使用pip安装
pip install pandas numpy scikit-learn openpyxl

# 方法2：如果你使用conda
conda install pandas numpy scikit-learn openpyxl

# 安装CatBoost (机器学习模型库)
pip install catboost

# 注意：不需要安装xlsxwriter，系统已配置使用openpyxl作为Excel引擎
```

### 2. 验证安装

在项目根目录运行以下命令验证包安装：

```bash
python -c "import pandas; import numpy; import sklearn; print('基础包安装成功')"
python -c "import catboost; print('CatBoost安装成功')"
python -c "import openpyxl; print('Excel支持包安装成功')"
```

### 3. 检查模块文件

确保以下文件存在：
- `function/Optimization_model_func3_1.py`
- `function/run_prediction_direct.py`
- `function/Model_Params/Task3_CatBoost_Model/` 目录及其中的模型文件

### 4. 重新测试

安装完成后，重新尝试上传成绩文件并运行预测。

## 常见问题

### Q: 提示缺少CatBoost
**A**: CatBoost是机器学习库，安装命令：
```bash
pip install catboost
```

### Q: 提示"No module named 'xlsxwriter'"
**A**: 这个问题已经修复。系统现在使用openpyxl作为Excel引擎，不再需要xlsxwriter。只需确保安装了openpyxl：
```bash
pip install openpyxl
```

### Q: 提示无法读取Excel文件
**A**: 需要openpyxl库来处理Excel文件：
```bash
pip install openpyxl
```

### Q: Python版本问题
**A**: 系统需要Python 3.7+版本，推荐使用Python 3.8或更高版本。

### Q: Windows路径问题
**A**: 这已经在最新版本中修复，所有路径都使用了正确的转义处理。

## 安装验证脚本

如果需要，可以创建一个验证脚本：

```python
# verify_setup.py
import sys
import os

print(f"Python版本: {sys.version}")
print(f"当前目录: {os.getcwd()}")

required_packages = ['pandas', 'numpy', 'sklearn', 'catboost', 'openpyxl']

for package in required_packages:
    try:
        __import__(package)
        print(f"✓ {package}")
    except ImportError:
        print(f"✗ {package} - 需要安装")

# 检查模块文件
function_dir = os.path.join(os.getcwd(), 'function')
opt_file = os.path.join(function_dir, 'Optimization_model_func3_1.py')
print(f"预测模块存在: {os.path.exists(opt_file)}")
```

保存为 `verify_setup.py` 并运行：
```bash
python verify_setup.py
```

## 技术支持

如果仍有问题，请检查：
1. Python版本是否为3.7+
2. 是否有网络连接问题影响包安装
3. 是否有权限问题
4. 是否在虚拟环境中，需要在正确的环境中安装包

安装完成后，预测功能应该可以正常使用。
