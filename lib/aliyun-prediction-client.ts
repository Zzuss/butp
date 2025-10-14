/**
 * 阿里云预测API客户端
 * 用于与部署在阿里云上的预测算法服务器通信
 */

// API配置接口
export interface APIConfig {
  baseURL: string;
  apiKey?: string;
  timeout: number;
}

// 预测配置接口
export interface PredictionConfig {
  min_grade?: number;
  max_grade?: number;
  with_uniform_inverse?: number;
}

// 预测结果接口
export interface PredictionResult {
  success: boolean;
  data: {
    task_id: string;
    major: string;
    results: Record<string, any[]>;
    statistics: {
      total_students: number;
      grad_school_achievable_60: number;
      abroad_achievable_60: number;
      [key: string]: any;
    };
    timestamp: string;
  };
}

// API响应接口
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// 健康检查响应接口
export interface HealthCheckResponse {
  status: string;
  message: string;
  timestamp: string;
  version?: string;
  [key: string]: any;
}

// 专业列表响应接口
export interface MajorsResponse {
  majors: string[];
  count: number;
  [key: string]: any;
}

// API错误处理类
export class PredictionAPIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PredictionAPIError';
  }
}

// API客户端类
export class AliyunPredictionClient {
  private config: APIConfig;

  constructor(config: Partial<APIConfig> = {}) {
    this.config = {
      baseURL: config.baseURL || process.env.NEXT_PUBLIC_PREDICTION_API_URL || '',
      apiKey: config.apiKey || process.env.NEXT_PUBLIC_API_KEY || '',
      timeout: config.timeout || 300000, // 5分钟默认超时
    };
  }

  // 更新配置
  updateConfig(config: Partial<APIConfig>) {
    this.config = { ...this.config, ...config };
  }

  // 获取请求头
  private getHeaders(includeAuth = false, contentType = 'application/json'): HeadersInit {
    const headers: HeadersInit = {};
    
    if (contentType) {
      headers['Accept'] = 'application/json';
    }
    
    if (includeAuth && this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    
    return headers;
  }

  // 通用请求方法
  private async request<T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.config.baseURL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      method: 'GET',
      headers: this.getHeaders(options.method !== 'GET'),
      signal: AbortSignal.timeout(this.config.timeout),
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
      console.log(`[AliyunAPI] 请求: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, requestOptions);
      
      console.log(`[AliyunAPI] 响应状态: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        let errorData: any = null;
        try {
          errorData = await response.json();
        } catch {
          // 如果无法解析JSON，使用文本内容
          const text = await response.text();
          errorData = { error: text };
        }
        
        throw new PredictionAPIError(
          errorData?.error || `HTTP ${response.status}: ${response.statusText}`,
          errorData?.code || `HTTP_${response.status}`,
          errorData
        );
      }

      const data = await response.json();
      console.log(`[AliyunAPI] 响应数据:`, data);
      
      return data;
    } catch (error) {
      console.error(`[AliyunAPI] 请求失败:`, error);
      
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        throw new PredictionAPIError(
          '请求超时，预测可能需要较长时间，请稍后再试', 
          'TIMEOUT'
        );
      }
      
      if (error instanceof PredictionAPIError) {
        throw error;
      }

      // 网络连接错误
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        throw new PredictionAPIError(
          `无法连接到服务器，请检查网络连接和服务器地址: ${this.config.baseURL}`,
          'NETWORK_ERROR',
          error
        );
      }

      throw new PredictionAPIError(
        `未知错误: ${error.message}`,
        'UNKNOWN_ERROR',
        error
      );
    }
  }

  // 健康检查
  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await this.request<HealthCheckResponse>('/health');
    return response.data || response as any;
  }

  // 获取支持的专业列表
  async getSupportedMajors(): Promise<MajorsResponse> {
    // 尝试多个可能的API路径
    const possiblePaths = ['/api/majors', '/majors', '/api/v1/majors'];
    
    for (const path of possiblePaths) {
      try {
        console.log(`[AliyunAPI] 尝试专业列表路径: ${path}`);
        const response = await this.request<MajorsResponse>(path);
        
        // 处理不同的响应格式
        if (response.data?.majors) {
          return response.data;
        } else if (response.majors) {
          return response as any;
        } else if (Array.isArray(response.data)) {
          return { majors: response.data, count: response.data.length };
        } else if (Array.isArray(response)) {
          return { majors: response as any, count: response.length };
        } else {
          console.log(`[AliyunAPI] ${path} 响应格式未知:`, response);
        }
      } catch (error) {
        console.log(`[AliyunAPI] ${path} 失败:`, error.message);
        if (path === possiblePaths[possiblePaths.length - 1]) {
          // 最后一个路径也失败了，抛出错误
          throw error;
        }
        // 继续尝试下一个路径
      }
    }
    
    // 如果所有路径都失败了
    throw new PredictionAPIError(
      '无法从任何已知路径获取专业列表',
      'MAJORS_API_NOT_FOUND'
    );
  }

  // 验证文件
  private validateFile(file: File): void {
    // 文件类型验证
    if (!file || !file.name.match(/\.(xlsx|xls)$/i)) {
      throw new Error('请上传有效的Excel文件(.xlsx或.xls格式)');
    }

    // 文件大小验证 (50MB)
    if (file.size > 50 * 1024 * 1024) {
      throw new Error('文件大小不能超过50MB');
    }

    // 文件名验证
    if (file.name.length > 255) {
      throw new Error('文件名过长');
    }
  }

  // 单专业预测
  async predictStudents(
    scoresFile: File, 
    major: string, 
    config: PredictionConfig = {}
  ): Promise<PredictionResult> {
    // 验证输入
    this.validateFile(scoresFile);
    
    if (!major || major.trim().length === 0) {
      throw new Error('请选择有效的专业');
    }

    const formData = new FormData();
    formData.append('scores_file', scoresFile);
    formData.append('major', major.trim());
    
    // 添加默认配置
    const defaultConfig: PredictionConfig = {
      min_grade: 60,
      max_grade: 90,
      with_uniform_inverse: 1,
      ...config
    };
    
    formData.append('config', JSON.stringify(defaultConfig));

    const response = await this.request<PredictionResult>('/api/predict', {
      method: 'POST',
      body: formData,
      headers: this.getHeaders(true, ''), // 不设置Content-Type，让浏览器自动设置
    });

    return response.data || response as any;
  }

  // 批量预测
  async batchPredict(
    scoresFile: File, 
    majors: string[] = [], 
    config: PredictionConfig = {}
  ): Promise<PredictionResult> {
    // 验证输入
    this.validateFile(scoresFile);
    
    if (!majors || majors.length === 0) {
      throw new Error('请选择至少一个专业');
    }

    const validMajors = majors.filter(major => major && major.trim().length > 0);
    if (validMajors.length === 0) {
      throw new Error('请选择有效的专业');
    }

    const formData = new FormData();
    formData.append('scores_file', scoresFile);
    formData.append('majors', JSON.stringify(validMajors));
    
    // 添加默认配置
    const defaultConfig: PredictionConfig = {
      min_grade: 60,
      max_grade: 90,
      with_uniform_inverse: 1,
      ...config
    };
    
    formData.append('config', JSON.stringify(defaultConfig));

    const response = await this.request<PredictionResult>('/api/predict/batch', {
      method: 'POST',
      body: formData,
      headers: this.getHeaders(true, ''), // 不设置Content-Type，让浏览器自动设置
    });

    return response.data || response as any;
  }

  // 获取当前配置
  getConfig(): APIConfig {
    return { ...this.config };
  }

  // 测试连接
  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch {
      return false;
    }
  }
}

// 创建默认实例
export const aliyunPredictionClient = new AliyunPredictionClient();

// 导出类型
export type {
  APIConfig,
  PredictionConfig,
  PredictionResult,
  APIResponse,
  HealthCheckResponse,
  MajorsResponse,
};
