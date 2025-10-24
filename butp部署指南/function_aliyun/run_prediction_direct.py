#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, sys, argparse
import pandas as pd
import Optimization_model_func3_1 as opt
from datetime import datetime

class Logger:
    def __init__(self, log_file):
        self.log_file = log_file
        self.terminal = sys.stdout
        self.log = open(log_file, 'w', encoding='utf-8')
    def write(self, message):
        self.terminal.write(message)
        self.log.write(message)
        self.log.flush()
    def flush(self):
        self.terminal.flush()
        self.log.flush()
    def close(self):
        self.log.close()

def main():
    # 添加命令行参数解析
    parser = argparse.ArgumentParser(description='学生去向预测系统 v2.0')
    parser.add_argument('--year', required=True, help='年级，如2023、2024')
    parser.add_argument('--scores_file', required=True, help='成绩Excel文件路径')
    parser.add_argument('--major', help='单个专业预测，如果不提供则预测所有专业')
    parser.add_argument('--config', help='配置参数JSON字符串')
    args = parser.parse_args()
    
    # 验证年级参数
    valid_years = ['2021', '2022', '2023', '2024']
    if args.year not in valid_years:
        print(f"❌ 错误: 不支持的年级 {args.year}，支持的年级: {valid_years}")
        return 1

    base_dir = os.path.dirname(os.path.abspath(__file__))
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = os.path.join(base_dir, f"prediction_log_{timestamp}.txt")
    logger = Logger(log_file)
    sys.stdout = logger

    try:
        year = args.year
        scores_file = args.scores_file
        print(f"=== 开始{year}级专业预测 (v2.0) ===")
        print(f"日志文件: {log_file}")
        print(f"✓ 年级参数: {year}")
        print(f"✓ 成绩文件: {scores_file}")
        print(f"✓ 基础目录: {base_dir}")
        print(f"✓ 专业参数: {args.major or '全部专业'}")

        # 检查成绩文件是否存在
        if not os.path.exists(scores_file):
            print(f"错误: 成绩文件不存在: {scores_file}")
            return

        model_dir = base_dir

        # 根据年级动态构建培养方案文件路径
        def get_course_file_path(major_name, year):
            """根据专业名称和年级获取培养方案文件路径"""
            major_codes = {
                "电信工程及管理": "tewm",
                "物联网工程": "iot", 
                "智能科学与技术": "ai",
                "电子信息工程": "ee"
            }
            
            if major_name not in major_codes:
                raise ValueError(f"不支持的专业: {major_name}")
            
            code = major_codes[major_name]
            
            # 优先使用Course_Process文件
            course_process_file = os.path.join(base_dir, f"Course_Process_{year}_{code}.xlsx")
            if os.path.exists(course_process_file):
                return course_process_file
            
            # 如果Course_Process文件不存在，使用education-plan目录下的文件
            education_plan_dir = os.path.join(base_dir, f"education-plan{year}")
            education_plan_file = os.path.join(education_plan_dir, f"{year}级{major_name}培养方案.xlsx")
            
            if os.path.exists(education_plan_file):
                print(f"✓ 使用{year}级原始培养方案: {education_plan_file}")
                print(f"📋 这确保使用正确的{year}级课程数据")
                print(f"💡 建议: 创建Course_Process_{year}_{code}.xlsx以提升性能")
                return education_plan_file
            
            raise FileNotFoundError(f"❌ 找不到{year}级{major_name}的培养方案文件\n   期望路径: {education_plan_file}")

        # 确定要处理的专业列表
        if args.major:
            # 单个专业模式
            majors_to_process = [args.major]
        else:
            # 所有专业模式
            majors_to_process = ["电信工程及管理", "物联网工程", "智能科学与技术", "电子信息工程"]

        # 构建专业和培养方案文件的映射
        majors = {}
        for major_name in majors_to_process:
            try:
                course_file = get_course_file_path(major_name, year)
                majors[major_name] = course_file
                print(f"✅ {major_name}: {course_file}")
            except (ValueError, FileNotFoundError) as e:
                print(f"❌ {major_name}: {e}")
                continue

        if not majors:
            print("错误: 没有找到任何可用的专业培养方案文件")
            return

        # 解析配置参数
        config_params = {
            'with_uniform_inverse': 1,
            'min_grade': 60,
            'max_grade': 90
        }
        if args.config:
            try:
                import json
                config_params.update(json.loads(args.config))
            except json.JSONDecodeError as e:
                print(f"警告: 配置参数JSON解析失败: {e}")

        per_major_files = {}
        for maj, cfile in majors.items():
            if not os.path.exists(cfile):
                print(f"警告: 课程文件不存在: {cfile}")
                continue

            # 动态构建输出文件名
            out = os.path.join(base_dir, f"Cohort{year}_Predictions_{opt.get_major_code(maj)}.xlsx")
            print(f"\n开始处理专业：{maj}")
            print(f"培养方案文件: {cfile}")
            print(f"输出文件: {out}")

            try:
                pred_df, uni_df = opt.predict_students(
                    scores_file=scores_file,
                    course_file=cfile,
                    major_name=maj,
                    out_path=out,
                    model_dir=model_dir,
                    with_uniform_inverse=config_params['with_uniform_inverse'],
                    min_grade=config_params['min_grade'],
                    max_grade=config_params['max_grade']
                )
                per_major_files[maj] = out
                print(f"完成专业 {maj}: {len(pred_df)} 名学生")

                if not uni_df.empty:
                    print("算法统计:")
                    policy_1 = uni_df['s_min_for_1_policy'].fillna('-')
                    policy_2 = uni_df['s_min_for_2_policy'].fillna('-')
                    print(f"  保研阈值=60占比: {(uni_df['s_min_for_1'] == 60).sum() / len(uni_df):.1%}")
                    print(f"  出国阈值=60占比: {(uni_df['s_min_for_2'] == 60).sum() / len(uni_df):.1%}")
                    print(f"  被去向1支配占比: {uni_df['DominatedBy1'].sum() / len(uni_df):.1%}")
                    print(f"  多区间占比(保研): {uni_df['MultipleIntervalsFlag_1'].sum() / len(uni_df):.1%}")
                    print(f"  多区间占比(出国): {uni_df['MultipleIntervalsFlag_2'].sum() / len(uni_df):.1%}")

            except Exception as e:
                print(f"专业 {maj} 处理失败: {e}")
                import traceback; traceback.print_exc()
                continue

        if per_major_files:
            print("\n=== 生成汇总总表 ===")
            frames=[]
            for maj, f in per_major_files.items():
                try:
                    df = pd.read_excel(f, sheet_name="Predictions")
                    df['Major'] = maj
                    frames.append(df)
                    print(f"读取 {maj}: {len(df)} 条记录")
                except Exception as e:
                    print(f"读取 {maj} 失败: {e}")
                    continue
            if frames:
                total = pd.concat(frames, ignore_index=True)
                # 动态构建汇总文件名
                total_out = os.path.join(base_dir, f"Cohort{year}_Predictions_All.xlsx")
                total.to_excel(total_out, index=False)
                print(f"汇总总表已保存: {total_out}")
                print(f"总计 {len(total)} 条预测记录")
            else:
                print("无可汇总的数据")
        else:
            print("没有成功处理的专业")

    finally:
        sys.stdout = logger.terminal
        logger.close()
        print(f"日志已保存到: {log_file}")

if __name__ == "__main__":
    main()
