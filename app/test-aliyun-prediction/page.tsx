'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Upload, Server } from 'lucide-react';

// API配置
const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_PREDICTION_API_URL || 'http://39.96.196.67:8080',
  timeout: 300000, // 5分钟超时
};

// API错误处理类
class PredictionAPIError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = 'PredictionAPIError';
  }
}

// API客户端类
class PredictionAPIClient {
  constructor(private config = API_CONFIG) {}

  // 通用请求方法
  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.config.baseURL}${endpoint}`;
    const defaultOptions: RequestInit = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(this.config.timeout),
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
      console.log(`[API] 请求: ${url}`);
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new PredictionAPIError(
          errorData?.error || `HTTP ${response.status}: ${response.statusText}`,
          errorData?.code || `HTTP_${response.status}`,
          errorData
        );
      }

      const data = await response.json();
      console.log(`[API] 响应:`, data);
      return data;
    } catch (error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        throw new PredictionAPIError('请求超时，预测可能需要较长时间', 'TIMEOUT');
      }
      
      if (error instanceof PredictionAPIError) {
        throw error;
      }

      throw new PredictionAPIError(
        `网络错误: ${error.message}`,
        'NETWORK_ERROR',
        error
      );
    }
  }

  // 健康检查
  async healthCheck() {
    return await this.request('/health');
  }

  // 获取支持的专业列表
  async getSupportedMajors() {
    return await this.request('/api/majors');
  }

  // 单专业预测
  async predictStudents(scoresFile: File, major: string, config = {}) {
    const formData = new FormData();
    formData.append('scores_file', scoresFile);
    formData.append('major', major);
    
    if (Object.keys(config).length > 0) {
      formData.append('config', JSON.stringify(config));
    }

    return await this.request('/api/predict', {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });
  }

  // 批量预测
  async batchPredict(scoresFile: File, majors: string[] = [], config = {}) {
    const formData = new FormData();
    formData.append('scores_file', scoresFile);
    formData.append('majors', JSON.stringify(majors));
    
    if (Object.keys(config).length > 0) {
      formData.append('config', JSON.stringify(config));
    }

    return await this.request('/api/predict/batch', {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });
  }
}

// 创建全局API客户端实例
const predictionAPI = new PredictionAPIClient();

export default function TestAliyunPrediction() {
  // 状态管理
  const [apiUrl, setApiUrl] = useState(API_CONFIG.baseURL);
  const [useProxy, setUseProxy] = useState(true); // 默认使用代理解决CORS问题
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 健康检查相关
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  
  // 专业列表相关
  const [majors, setMajors] = useState<string[]>([]);
  const [majorsLoading, setMajorsLoading] = useState(false);
  
  // 预测相关
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMajor, setSelectedMajor] = useState('');
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  // 更新API配置
  const updateApiConfig = useCallback(() => {
    if (useProxy) {
      // 使用本地代理API
      predictionAPI.config.baseURL = '';
    } else {
      // 直接连接阿里云服务器
      predictionAPI.config.baseURL = apiUrl;
    }
  }, [apiUrl, useProxy]);

  useEffect(() => {
    updateApiConfig();
  }, [updateApiConfig]);

  // 健康检查
  const checkHealth = async () => {
    setHealthLoading(true);
    setError(null);
    try {
      let result;
      if (useProxy) {
        // 使用代理API
        const response = await fetch('/api/aliyun-proxy/health');
        result = await response.json();
      } else {
        // 直接连接
        result = await predictionAPI.healthCheck();
      }
      setHealthStatus(result);
    } catch (error) {
      const err = error as PredictionAPIError;
      setError(`健康检查失败: ${err.message}`);
      setHealthStatus(null);
    } finally {
      setHealthLoading(false);
    }
  };

  // 获取支持的专业 - 增强调试版本
  const loadMajors = async () => {
    setMajorsLoading(true);
    setError(null);
    try {
      console.log('[调试] 开始获取专业列表...');
      
      let result;
      if (useProxy) {
        console.log('[调试] 使用代理API: /api/aliyun-proxy/majors');
        const response = await fetch('/api/aliyun-proxy/majors');
        result = await response.json();
      } else {
        console.log('[调试] 直接连接:', `${apiUrl}/api/majors`);
        result = await predictionAPI.getSupportedMajors();
      }
      
      console.log('[调试] 专业列表响应:', result);
      
      const majorsData = result.data?.majors || result.majors || [];
      setMajors(majorsData);
      
      if (majorsData.length === 0) {
        setError('警告: 专业列表为空，但请求成功');
      }
    } catch (error) {
      const err = error as PredictionAPIError;
      console.error('[调试] 专业列表错误详情:', err);
      console.error('[调试] 错误代码:', err.code);
      console.error('[调试] 错误详情:', err.details);
      
      setError(`获取专业列表失败: ${err.message} (代码: ${err.code || '未知'})`);
      setMajors([]);
    } finally {
      setMajorsLoading(false);
    }
  };

  // 处理文件上传
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 文件类型验证
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        setError('请上传有效的Excel文件(.xlsx或.xls格式)');
        return;
      }
      
      // 文件大小验证 (50MB)
      if (file.size > 50 * 1024 * 1024) {
        setError('文件大小不能超过50MB');
        return;
      }
      
      setSelectedFile(file);
      setError(null);
    }
  };

  // 处理预测
  const handlePredict = async () => {
    if (!selectedFile || !selectedMajor) {
      setError('请选择文件和专业');
      return;
    }

    setPredictionLoading(true);
    setError(null);
    setPredictionResult(null);

    try {
      let result;
      if (useProxy) {
        // 使用代理API
        const formData = new FormData();
        formData.append('scores_file', selectedFile);
        formData.append('major', selectedMajor);
        formData.append('config', JSON.stringify({
          min_grade: 60,
          max_grade: 90,
          with_uniform_inverse: 1
        }));

        const response = await fetch('/api/aliyun-proxy/predict', {
          method: 'POST',
          body: formData,
        });
        result = await response.json();
      } else {
        // 直接连接
        result = await predictionAPI.predictStudents(selectedFile, selectedMajor, {
          min_grade: 60,
          max_grade: 90,
          with_uniform_inverse: 1
        });
      }
      
      setPredictionResult(result.data);
    } catch (error) {
      const err = error as PredictionAPIError;
      setError(`预测失败: ${err.message}`);
    } finally {
      setPredictionLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">阿里云预测API测试</h1>
      
      {/* API配置 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            API服务器配置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* CORS解决方案选择 */}
            <div>
              <Label>连接方式</Label>
              <div className="flex items-center space-x-4 mt-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={useProxy}
                    onChange={() => setUseProxy(true)}
                    className="text-blue-600"
                  />
                  <span>使用代理 (推荐，解决CORS问题)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={!useProxy}
                    onChange={() => setUseProxy(false)}
                    className="text-blue-600"
                  />
                  <span>直接连接</span>
                </label>
              </div>
              {useProxy ? (
                <p className="text-sm text-green-600 mt-1">
                  ✅ 使用Next.js代理API，自动解决CORS跨域问题
                </p>
              ) : (
                <p className="text-sm text-yellow-600 mt-1">
                  ⚠️ 直接连接可能遇到CORS问题，需要服务器端配置
                </p>
              )}
            </div>

            {/* 服务器地址配置 */}
            <div>
              <Label htmlFor="api-url">阿里云服务器地址</Label>
              <Input
                id="api-url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://39.96.196.67:8080"
                className="mt-1"
                disabled={useProxy}
              />
              <p className="text-sm text-gray-500 mt-1">
                {useProxy 
                  ? '使用代理模式时，系统会自动连接到配置的服务器地址'
                  : '请输入你的阿里云服务器地址，格式如: http://39.96.196.67:8080'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="text-red-600">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* 健康检查 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            服务器健康检查
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={checkHealth} 
              disabled={healthLoading}
              className="flex items-center gap-2"
            >
              {healthLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {healthLoading ? '检查中...' : '健康检查'}
            </Button>
            
            {healthStatus && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">服务器状态</h4>
                <pre className="text-sm text-green-700 overflow-x-auto">
                  {JSON.stringify(healthStatus, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 专业列表 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            支持的专业列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={loadMajors} 
                disabled={majorsLoading}
                className="flex items-center gap-2"
              >
                {majorsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {majorsLoading ? '加载中...' : '获取专业列表'}
              </Button>
              
              <Button 
                variant="outline"
                onClick={async () => {
                  // 手动测试不同的API路径
                  const testPaths = ['/api/majors', '/majors', '/api/v1/majors'];
                  console.log('[手动测试] 开始测试不同API路径...');
                  
                  for (const path of testPaths) {
                    try {
                      console.log(`[手动测试] 测试路径: ${apiUrl}${path}`);
                      const response = await fetch(`${apiUrl}${path}`, {
                        method: 'GET',
                        headers: { 'Accept': 'application/json' }
                      });
                      console.log(`[手动测试] ${path} - 状态: ${response.status}`);
                      const text = await response.text();
                      console.log(`[手动测试] ${path} - 响应:`, text);
                    } catch (err) {
                      console.log(`[手动测试] ${path} - 错误:`, err.message);
                    }
                  }
                }}
                disabled={majorsLoading}
              >
                🔍 调试API路径
              </Button>
            </div>
            
            {majors.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">支持的专业 ({majors.length}个)</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {majors.map((major) => (
                    <div key={major} className="p-2 bg-white border rounded text-sm">
                      {major}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {majors.length === 0 && !majorsLoading && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">
                  专业列表为空。请点击"调试API路径"按钮测试不同的API接口，然后查看浏览器控制台的调试信息。
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 预测功能测试 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            预测功能测试
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 文件上传 */}
            <div>
              <Label htmlFor="file-input">成绩文件 (Excel格式)</Label>
              <Input
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={predictionLoading}
                className="mt-1"
              />
              {selectedFile && (
                <p className="text-sm text-green-600 mt-1">
                  已选择: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* 专业选择 */}
            <div>
              <Label htmlFor="major-select">选择专业</Label>
              <Select value={selectedMajor} onValueChange={setSelectedMajor}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="请选择专业" />
                </SelectTrigger>
                <SelectContent>
                  {majors.map((major) => (
                    <SelectItem key={major} value={major}>
                      {major}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 预测按钮 */}
            <Button
              onClick={handlePredict}
              disabled={predictionLoading || !selectedFile || !selectedMajor}
              className="flex items-center gap-2"
            >
              {predictionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {predictionLoading ? '预测中...' : '开始预测'}
            </Button>

            {/* 预测结果 */}
            {predictionResult && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">预测结果</h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">任务ID:</span> {predictionResult.task_id}
                    </div>
                    <div>
                      <span className="font-medium">专业:</span> {predictionResult.major}
                    </div>
                  </div>
                  
                  {predictionResult.statistics && (
                    <div>
                      <h5 className="font-medium mb-1">统计信息:</h5>
                      <ul className="text-sm space-y-1">
                        <li>学生总数: {predictionResult.statistics.total_students || 'N/A'}</li>
                        <li>可达成保研(60分): {predictionResult.statistics.grad_school_achievable_60 || 'N/A'}</li>
                        <li>可达成出国(60分): {predictionResult.statistics.abroad_achievable_60 || 'N/A'}</li>
                      </ul>
                    </div>
                  )}
                  
                  <details className="mt-4">
                    <summary className="cursor-pointer font-medium">查看完整结果</summary>
                    <pre className="mt-2 text-xs bg-white p-3 border rounded overflow-x-auto">
                      {JSON.stringify(predictionResult, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
