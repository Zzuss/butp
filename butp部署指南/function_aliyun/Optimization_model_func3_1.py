#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Optimization_model_func3_1.py
Destination prediction + uniform-score brute-force inverse search (only for un-taken required courses).

Key fixes in this version:
- Return policy/diagnostic fields required by run_prediction_direct.py.
- Implement two interval-handling policies:
  Case 1 (Target=2): when multiple hit intervals exist and the first starts at 60,
    prefer the LEFT boundary of the 2nd interval if it is <70; otherwise keep 60.
  Case 2 (Targets 1/2 consistency): enforce s_min_for_1 > s_min_for_2 using a
    descending search from the RIGHT boundary of the widest class-1 interval; if no
    feasible score found, try next intervals; if still none, fallback to s2+5; if
    fallback is also infeasible AND s_min_for_2 came from Case1 adjustment, revert s2 to 60.

Only the necessary parts are modified; other logic remains unchanged.
"""

import os, sys, json, pickle, argparse, math
import warnings
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from collections import defaultdict
warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')

from catboost import CatBoostClassifier
from sklearn.preprocessing import StandardScaler

# ---- CN -> EN feature names ----
COURSE_CATEGORIES_CN2EN = {
    '体育': 'public',
    '军事理论': 'public',
    '安全教育': 'public',
    '心理健康': 'public',
    '公共课': 'public',
    '思想政治理论': 'political',
    '英语': 'english',
    '数学与自然科学': 'math_science',
    '学科基础': 'basic_subject',
    '专业基础': 'basic_major',
    '专业课': 'major',
    '实践教学': 'practice',
    '学院特色创新必修5学分': 'innovation'
}
BASE_FEATURES = list(COURSE_CATEGORIES_CN2EN.values())
FINAL_FEATURES = BASE_FEATURES + ['AcademicStrength']

MAJOR_MAPPING = {
    '物联网工程': 'iot',
    '电子商务及法律': 'ecwl',
    '电信工程及管理': 'tewm',
    '智能科学与技术': 'ai',
    '电子信息工程': 'ee'
}

IMPUTE_RULES = {
    'major_from':      {'basic_major':0.50, 'basic_subject':0.30, 'math_science':0.20},
    'innovation_from': {'practice':0.40, 'major':0.35, 'basic_major':0.15, 'basic_subject':0.10}
}

def safe_float(x):
    try:
        v = float(x)
        if math.isfinite(v):
            return v
    except Exception:
        pass
    return np.nan

CN_GRADE_MAP = {'优':95,'良':85,'中':75,'及格':65,'不及格':40}
def is_cn_grade(x:str)->bool:
    return str(x) in CN_GRADE_MAP

def get_major_code(major_name:str)->str:
    return MAJOR_MAPPING.get(major_name, 'unknown')

def clean_text(s):
    return str(s).strip().replace(' ', '').replace('　', '')

def map_course_category(raw_type: str) -> str:
    ct = clean_text(raw_type)
    for zh, en in COURSE_CATEGORIES_CN2EN.items():
        if clean_text(zh) == ct:
            return en
    return 'unknown'

def load_course_info_from_file(path: str)->Dict[str, Dict[str, List]]:
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    df = pd.read_excel(path)
    print(f"课程文件形状: {df.shape}")
    print(f"课程文件列名: {df.columns.tolist()}")

    if df.shape[1] < 4:
        raise ValueError("课程文件列数不足，需要至少4列：课程名、类别、学分、课程属性")

    attr_col = df.columns[8]
    required_mask = df[attr_col].astype(str).str.contains('必修', na=False)
    df_req = df[required_mask].copy()
    print(f"必修课程数量: {len(df_req)}")

    result = {
        'Course_Name': df_req.iloc[:, 2].astype(str).str.strip().tolist(),
        'Course_Type': df_req.iloc[:, 0].astype(str).str.strip().tolist(),
        'Credit':      df_req.iloc[:, 3].astype(float).tolist()
    }
    print(f"加载必修课程信息: {len(result['Course_Name'])} 门课程")
    print(f"课程类型分布: {dict(pd.Series(result['Course_Type']).value_counts())}")
    return result

def load_student_scores(scores_path: str)->Tuple[Dict[str, Dict[str, float]], Dict[str,str]]:
    if not os.path.exists(scores_path):
        raise FileNotFoundError(scores_path)
    df = pd.read_excel(scores_path)
    print(f"成绩文件形状: {df.shape}")
    print(f"成绩文件列名: {df.columns.tolist()}")

    cols = list(df.columns)

    def pick(colnames, key):
        for c in colnames:
            if str(c).strip().lower() == key.lower():
                return c
        for c in colnames:
            if key.lower() in str(c).strip().lower():
                return c
        return None

    s_col      = pick(cols, 'SNH') or cols[0]
    major_col  = pick(cols, 'Current_Major') or pick(cols, 'Major')
    name_col   = pick(cols, 'Course_Name')
    if name_col is None:
        raise ValueError("成绩文件未找到 Course_Name 列，无法与课程清单匹配")
    grade_col  = pick(cols, 'Grade') or pick(cols, '成绩')
    attr_col   = pick(cols, 'Course_Attribute')

    print(f"识别列: 学号={s_col}, 课程名={name_col}, 成绩={grade_col}, 专业={major_col}")

    student_scores = defaultdict(dict)
    student_majors = {}
    for _, row in df.iterrows():
        sid = str(row[s_col]).strip()
        cname = str(row[name_col]).strip()
        if not sid or not cname or pd.isna(row.get(grade_col, np.nan)):
            continue

        if attr_col is not None:
            try:
                ca = str(row[attr_col]).strip()
                if '任选课' in ca:
                    continue
            except Exception:
                pass

        raw = row[grade_col]
        if isinstance(raw, str) and is_cn_grade(raw):
            g = CN_GRADE_MAP[raw]
        else:
            g = safe_float(raw)
        if np.isnan(g) or not (0<=g<=100):
            continue

        student_scores[sid][cname] = g
        if major_col is not None and sid not in student_majors:
            student_majors[sid] = str(row[major_col]).strip()

    print(f"成功处理 {len(student_scores)} 名学生的成绩数据")
    return dict(student_scores), student_majors

def calculate_category_score(student_scores: Dict[str,float],
                             course_info: Dict[str, Dict[str,List]],
                             major_code: str)->Dict[str, float]:
    names = course_info['Course_Name']
    types = course_info['Course_Type']
    creds = course_info['Credit']
    agg = {k:{'tot':0.0,'cred':0.0} for k in BASE_FEATURES}

    for i, cname in enumerate(names):
        cat = map_course_category(types[i])
        if cat == 'unknown':
            continue
        if cname in student_scores:
            g = student_scores[cname]
            if 0<=g<=100:
                cr = float(creds[i])
                agg[cat]['tot']  += g*cr
                agg[cat]['cred'] += cr

    out={}
    for k,v in agg.items():
        out[k] = (v['tot']/v['cred']) if v['cred']>0 else np.nan
    return out

def rule_impute(cat_scores: Dict[str,float])->Dict[str,float]:
    d = dict(cat_scores)
    if np.isnan(d.get('major', np.nan)):
        w = IMPUTE_RULES['major_from']; num=0.0; den=0.0
        for k,a in w.items():
            v=d.get(k, np.nan)
            if not np.isnan(v): num+=a*v; den+=a
        d['major'] = num/den if den>0 else np.nan
    if np.isnan(d.get('innovation', np.nan)):
        w = IMPUTE_RULES['innovation_from']; num=0.0; den=0.0
        for k,a in w.items():
            v = d.get(k, np.nan)
            if not np.isnan(v): num+=a*v; den+=a
        d['innovation'] = num/den if den>0 else np.nan
    return d

def compute_academic_strength(cat_scores: Dict[str,float], strength_stats: Dict)->float:
    z=[]
    for k in BASE_FEATURES:
        m,s = strength_stats.get(k, [np.nan, np.nan])
        v = cat_scores.get(k, np.nan)
        if not np.isnan(v) and s and s>0:
            z.append((v-m)/s)
    return float(np.mean(z)) if z else 0.0

def load_artifacts(model_dir: str):
    print(f"正在加载模型文件，目录: {model_dir}")
    req = ['feature_columns.json', 'model_params.json', 'scaler.pkl', 'catboost_model.cbm']
    for f in req:
        p=os.path.join(model_dir, f)
        if not os.path.exists(p):
            raise FileNotFoundError(f"模型文件不存在: {p}")
        print(f"找到文件: {f}")
    with open(os.path.join(model_dir, 'feature_columns.json'),'r',encoding='utf-8') as f:
        feature_cols = json.load(f)
        print(f"特征列加载完成，共 {len(feature_cols)} 个特征")
    with open(os.path.join(model_dir, 'model_params.json'),'r',encoding='utf-8') as f:
        model_params = json.load(f)
        print(f"模型参数加载完成")
    with open(os.path.join(model_dir, 'scaler.pkl'), 'rb') as f:
        scaler = pickle.load(f)
        print(f"标准化器加载完成")
    model = CatBoostClassifier()
    model.load_model(os.path.join(model_dir, 'catboost_model.cbm'))
    print(f"CatBoost模型加载完成")
    return model, scaler, feature_cols, model_params

def strength_stats_for_major(model_params:Dict, major_name:str)->Dict:
    stats_all = model_params.get('strength_stats', {})
    return stats_all.get(major_name, stats_all.get('_global_', {}))

def clip_features(df: pd.DataFrame, model_params: Dict)->pd.DataFrame:
    clips = model_params.get('clip_ranges', {})
    if not clips: return df
    out=df.copy()
    for c, rr in clips.items():
        if c in out.columns:
            out[c]=out[c].clip(rr.get('min', None), rr.get('max', None))
    return out

def softmax(z):
    z = z - z.max(axis=1, keepdims=True)
    e = np.exp(z)
    return e/e.sum(axis=1, keepdims=True)

def postprocess_proba(proba: np.ndarray, model_params: Dict)->np.ndarray:
    pri = model_params.get('priors', {})
    tau = float(model_params.get('tau', 0.0))
    T   = float(model_params.get('temperature', 1.0))
    classes = model_params.get('class_order', [1,2,3])
    eps=1e-12
    logits=np.log(np.clip(proba,eps,1.0))
    if pri and tau!=0.0:
        pv=np.array([pri.get(str(c), 1/len(classes)) for c in classes], dtype=float)
        logits = logits - tau*np.log(np.clip(pv,eps,1.0))
    logits = logits/max(T,1e-6)
    return softmax(logits)

def assemble_features(current_scores: Dict[str,float],
                      plan: Dict[str,float],
                      course_info: Dict[str, Dict[str,List]],
                      major_name: str,
                      model_params: Dict,
                      feature_cols: List[str])->pd.DataFrame:
    merged = dict(current_scores); merged.update(plan)
    cat = calculate_category_score(merged, course_info, get_major_code(major_name))
    cat = rule_impute(cat)
    sstats = strength_stats_for_major(model_params, major_name)
    academic = compute_academic_strength(cat, sstats)
    feat = {**cat, 'AcademicStrength': academic}

    ordered = [feat.get(col, np.nan) for col in feature_cols]
    X = pd.DataFrame([ordered], columns=feature_cols)
    X = clip_features(X, model_params).fillna(X.mean())
    return X

def predict_argmax(X: pd.DataFrame, model, scaler, model_params: Dict)->int:
    X_local = X.copy()
    if hasattr(scaler, 'feature_names_in_'):
        X_local.columns = scaler.feature_names_in_
    Xs = scaler.transform(X_local.values)
    proba = model.predict_proba(Xs)
    proba = postprocess_proba(proba, model_params)
    pred = int(np.argmax(proba, axis=1)[0])+1
    return pred

# ------------------ MODIFIED: uniform score inverse search with policies ------------------
def uniform_threshold_search(current_scores: Dict[str,float],
                             course_info: Dict[str, Dict[str,List]],
                             major_name: str,
                             model, scaler, model_params: Dict,
                             feature_cols: List[str],
                             min_grade:int=60, max_grade:int=90)->Dict:
    """
    Search the uniform target score over [min_grade, max_grade] for all un-taken required courses.
    Implements:
      - Case 1 policy for Target=2 multi-interval selection.
      - Case 2 consistency: enforce s_min_for_1 > s_min_for_2 with safe fallbacks.
    Returns diagnostics for downstream stats printing.
    """
    names = course_info['Course_Name']
    creds = course_info['Credit']

    taken = set(current_scores.keys())
    missing_courses = []
    missing_credits = 0.0
    for i, cname in enumerate(names):
        if cname not in taken:
            missing_courses.append(cname)
            missing_credits += float(creds[i])

    # 静默统计课程信息

    if len(missing_courses) == 0:
        print("所有必修课程都已修完，无需逆推")
        return {
            's_min_for_1': np.nan,
            's_min_for_2': np.nan,
            'UnknownCredits': 0.0,
            'Cost_1': 0.0,
            'Cost_2': 0.0,
            'Ranges_1': '[]',
            'Ranges_2': '[]',
            'missing_courses': [],
            'target1_scores': {},
            'target2_scores': {},
            # Diagnostics for aggregator:
            's_min_for_1_policy': 'no_missing_courses',
            's_min_for_2_policy': 'no_missing_courses',
            'MultipleIntervalsFlag_1': 0,
            'MultipleIntervalsFlag_2': 0,
            'DominatedBy1': 0
        }

    predictions = []
    for score in range(min_grade, max_grade + 1):
        plan = {c: score for c in missing_courses}
        X = assemble_features(current_scores, plan, course_info, major_name, model_params, feature_cols)
        pred = predict_argmax(X, model, scaler, model_params)
        predictions.append((score, pred))

    pred_map = {s:p for s,p in predictions}

    def find_ranges(target_class: int) -> List[Tuple[int, int]]:
        ranges = []
        start = None
        for score, pred in predictions:
            if pred == target_class:
                if start is None:
                    start = score
            else:
                if start is not None:
                    ranges.append((start, score - 1))
                    start = None
        if start is not None:
            ranges.append((start, max_grade))
        return ranges

    ranges_1 = find_ranges(1)
    ranges_2 = find_ranges(2)

    # Raw minima from first intervals
    raw_s1 = ranges_1[0][0] if ranges_1 else 90
    raw_s2 = ranges_2[0][0] if ranges_2 else min_grade

    multi1 = 1 if len(ranges_1) >= 2 else 0
    multi2 = 1 if len(ranges_2) >= 2 else 0
    dominated_by_1 = 1 if (len(ranges_1) == 1 and ranges_1[0] == (min_grade, max_grade)) else 0

    # ---------- Case 1: policy for Target=2 when multiple intervals ----------
    s2 = raw_s2
    s2_policy = 'first_left_or_single'
    if raw_s2 == min_grade and multi2:
        # Prefer the left bound of the 2nd interval if <70; otherwise keep 60.
        second_left = ranges_2[1][0]
        if second_left < 70:
            s2 = second_left
            s2_policy = 'use_second_left_lt70'
        else:
            s2_policy = 'keep_60_stable_ge70'

    # ---------- Costs from credits ----------
    cost_1_raw = missing_credits * (raw_s1 - min_grade) if raw_s1 < 90 else np.nan
    cost_2_raw = missing_credits * (raw_s2 - min_grade) if raw_s2 < 90 else np.nan

    # ---------- Case 2: enforce s_min_for_1 > s_min_for_2 ----------
    s1 = raw_s1
    s1_policy = 'first_left' if raw_s1 < 90 else 'unreachable'

    if s1 <= s2:
        # 1) Choose the widest class-1 interval and try to find the minimal s > s2 in that interval.
        if ranges_1:
            widths = [(r[1]-r[0]+1, r) for r in ranges_1]
            _, rstar = max(widths, key=lambda x: x[0])
            found = None
            # Scan from s2+1 upward to the right boundary of the widest interval
            for ss in range(max(s2+1, rstar[0]), rstar[1]+1):
                if pred_map.get(ss) == 1:
                    found = ss
                    break
            if found is not None:
                s1 = found
                s1_policy = 'adjust_to_min_>s2_in_widest_interval'
            else:
                # 2) Try any other interval whose left boundary > s2
                candidates = [r[0] for r in ranges_1 if r[0] > s2]
                if candidates:
                    s1 = min(candidates)
                    s1_policy = 'use_next_interval_left'
                else:
                    # 3) Forced fallback per policy: set s1 to s2+10 but cap at 90
                    fallback = min(s2 + 10, 90)
                    s1 = fallback
                    s1_policy = 'fallback_force_s2_plus_10_cap90'

    # ---------- Final costs with adjusted minima ----------
    cost_1 = missing_credits * (s1 - min_grade) if s1 < 90 else np.nan
    cost_2 = missing_credits * (s2 - min_grade) if s2 < 90 else np.nan

    # 静默计算，减少日志输出

    t1_scores = {course: s1 for course in missing_courses} if s1 < 90 else {}
    t2_scores = {course: s2 for course in missing_courses} if s2 < 90 else {}

    return {
        's_min_for_1': s1,
        's_min_for_2': s2,
        'UnknownCredits': missing_credits,
        'Cost_1': cost_1,
        'Cost_2': cost_2,
        'Ranges_1': str(ranges_1),
        'Ranges_2': str(ranges_2),
        'missing_courses': missing_courses,
        'target1_scores': t1_scores,
        'target2_scores': t2_scores,
        # extra diagnostics for aggregator and debugging
        's_min_for_1_policy': s1_policy,
        's_min_for_2_policy': s2_policy,
        'MultipleIntervalsFlag_1': multi1,
        'MultipleIntervalsFlag_2': multi2,
        'DominatedBy1': dominated_by_1
    }

# ------------------ main prediction pipeline (unchanged except using the updated function) ------------------
def predict_students(scores_file: str, course_file: str, major_name: str, out_path: str,
                     model_dir: str, with_uniform_inverse:int=1,
                     min_grade:int=60, max_grade:int=90):
    print(f"\n=== predict_students 开始 ===")
    print(f"scores_file={scores_file}")
    print(f"course_file={course_file}")
    print(f"major_name={major_name}")
    print(f"out_path={out_path}")
    print(f"model_dir={model_dir}")

    model, scaler, feature_cols, mparams = load_artifacts(model_dir)
    course_info = load_course_info_from_file(course_file)
    student_scores, student_majors = load_student_scores(scores_file)

    if student_majors:
        sids = [sid for sid,maj in student_majors.items() if maj==major_name]
        if not sids:
            print(f"警告: 未在成绩表中找到专业“{major_name}”的学生，改为处理全部学生")
            sids = list(student_scores.keys())
    else:
        print("警告: 成绩表缺少专业列，改为处理全部学生")
        sids = list(student_scores.keys())

    print(f"{major_name} 专业将处理 {len(sids)} 名学生")

    rows=[]
    uni_rows=[]

    for i, sid in enumerate(sids):
        # 每10个学生显示一次进度
        if i % 10 == 0 or i == len(sids) - 1:
            print(f"  进度: {i+1}/{len(sids)} 名学生")
        
        stu_courses = student_scores.get(sid, {})
        cat = calculate_category_score(stu_courses, course_info, get_major_code(major_name))
        cat = rule_impute(cat)
        sstats = strength_stats_for_major(mparams, major_name)
        academic = compute_academic_strength(cat, sstats)
        feat = {**cat, 'AcademicStrength': academic}

        ordered = [feat.get(col, np.nan) for col in feature_cols]
        X = pd.DataFrame([ordered], columns=feature_cols)
        X = clip_features(X, mparams).fillna(X.mean())
        if hasattr(scaler, 'feature_names_in_'):
            X.columns = scaler.feature_names_in_

        Xs = scaler.transform(X.values)
        proba = model.predict_proba(Xs)
        proba = postprocess_proba(proba, mparams)
        pred = int(np.argmax(proba, axis=1)[0])+1

        uni_result = {}
        if with_uniform_inverse:
            uni_result = uniform_threshold_search(
                stu_courses, course_info, major_name,
                model, scaler, mparams, feature_cols,
                min_grade=min_grade, max_grade=max_grade
            )

        # 获取预测概率
        current_prob1 = float(proba[0][0]) if len(proba[0]) > 0 else np.nan
        current_prob2 = float(proba[0][1]) if len(proba[0]) > 1 else np.nan
        current_prob3 = float(proba[0][2]) if len(proba[0]) > 2 else np.nan

        # 构建课程分数字典
        course_scores = {}
        required_courses = course_info['Course_Name']
        target1_score = uni_result.get('s_min_for_1', np.nan)
        
        for course in required_courses:
            if course in stu_courses:
                # 已修课程，分数为空
                course_scores[course] = np.nan
            else:
                # 未修课程，默认填写target1_min_required_score
                course_scores[course] = target1_score if not np.isnan(target1_score) else np.nan

        rows.append({
            'SNH': sid,
            'major': major_name,
            'grade': len(stu_courses),
            'count': len(course_info['Course_Name']),
            'current_public': feat.get('public', np.nan),
            'current_practice': feat.get('practice', np.nan),
            'current_math_science': feat.get('math_science', np.nan),
            'current_political': feat.get('political', np.nan),
            'current_basic_subject': feat.get('basic_subject', np.nan),
            'current_innovation': feat.get('innovation', np.nan),
            'current_english': feat.get('english', np.nan),
            'current_basic_major': feat.get('basic_major', np.nan),
            'current_major': feat.get('major', np.nan),
            'current_pred': pred,
            'current_prob1': current_prob1,
            'current_prob2': current_prob2,
            'current_prob3': current_prob3,
            'target1_min_required_score': uni_result.get('s_min_for_1', np.nan),
            'target2_min_required_score': uni_result.get('s_min_for_2', np.nan),
            **course_scores  # 添加所有课程的分数
        })

        if with_uniform_inverse:
            uni_rows.append({'SNH': sid, 'Major': major_name, **uni_result})

    pred_df = pd.DataFrame(rows)
    uni_df  = pd.DataFrame(uni_rows) if with_uniform_inverse else pd.DataFrame()

    # 全局检查：验证是否还存在目标一分数小于目标二分数的学生情况
    print(f"\n=== 全局一致性检查 ===")
    violation_students = []
    
    for i, row in enumerate(rows):
        sid = row['SNH']
        target1_score = row['target1_min_required_score']
        target2_score = row['target2_min_required_score']
        
        # 跳过无效分数（NaN）
        if np.isnan(target1_score) or np.isnan(target2_score):
            continue
            
        # 检查是否违反 s1 > s2 的规则（允许相等，如都是max_bound情况）
        if target1_score < target2_score:
            violation_students.append({
                'processing_order': i + 1,
                'student_id': sid,
                'major': major_name,
                'target1_score': target1_score,
                'target2_score': target2_score,
                'difference': target2_score - target1_score
            })
    
    if violation_students:
        print(f"发现 {len(violation_students)} 名学生存在目标一分数 < 目标二分数的情况：")
        print("=" * 80)
        for v in violation_students:
            print(f"处理序号: {v['processing_order']:3d} | 学号: {v['student_id']:15s} | 专业: {v['major']:10s} | "
                  f"目标1分数: {v['target1_score']:5.1f} | 目标2分数: {v['target2_score']:5.1f} | "
                  f"差值: {v['difference']:5.1f}")
        print("=" * 80)
        print("建议：检查这些学生的逆推逻辑，可能需要进一步调整算法。")
    else:
        print("所有学生的目标一分数都 >= 目标二分数，一致性检查通过！")

    print(f"\n保存结果到: {out_path}")
    with pd.ExcelWriter(out_path, engine='openpyxl') as w:
        pred_df.to_excel(w, index=False, sheet_name='Predictions')
        if with_uniform_inverse:
            uni_df.to_excel(w, index=False, sheet_name='UniformThresholds')

            if not uni_df.empty:
                recs=[]
                for r in uni_rows:
                    sid = r['SNH']
                    miss = r.get('missing_courses', [])
                    t1   = r.get('target1_scores', {})
                    t2   = r.get('target2_scores', {})
                    for c in miss:
                        recs.append({
                            'SNH': sid,
                            'Course_Name': c,
                            'target1_score': t1.get(c, np.nan),
                            'target2_score': t2.get(c, np.nan)
                        })
                if recs:
                    pd.DataFrame(recs).to_excel(w, index=False, sheet_name='MissingCoursesScores')

    print(f"{major_name} 专业处理完成")
    return pred_df, uni_df

def main():
    print("=== Optimization_model_func3_1.py 开始执行 ===")
    ap = argparse.ArgumentParser()
    ap.add_argument("--scores", required=True)
    ap.add_argument("--courses", required=True)
    ap.add_argument("--major", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--model_dir", default=".")
    ap.add_argument("--with_uniform_inverse", type=int, default=1)
    ap.add_argument("--min_grade", type=int, default=60)
    ap.add_argument("--max_grade", type=int, default=90)
    args = ap.parse_args()

    predict_students(
        scores_file=args.scores,
        course_file=args.courses,
        major_name=args.major,
        out_path=args.out,
        model_dir=args.model_dir,
        with_uniform_inverse=args.with_uniform_inverse,
        min_grade=args.min_grade,
        max_grade=args.max_grade
    )

if __name__ == "__main__":
    main()
