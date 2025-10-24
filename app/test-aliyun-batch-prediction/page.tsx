'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  Brain, 
  Clock, 
  FileText, 
  Database,
  Loader2,
  Users,
  BookOpen
} from 'lucide-react';

interface MajorResult {
  success: boolean;
  major: string;
  studentCount: number;
  result?: any;
  error?: string;
  fileName: string;
}

interface BatchPredictionResult {
  summary: {
    batchId: string;
    year: string;
    originalFile: string;
    totalMajors: number;
    successfulMajors: number;
    failedMajors: number;
    totalStudents: number;
    successfulStudents: number;
    processingTime: number;
  };
  results: MajorResult[];
  errors: MajorResult[];
  majorGroups: {
    major: string;
    studentCount: number;
    fileName: string;
  }[];
}

export default function TestAliyunBatchPrediction() {
  // 状态管理
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState<string>('');
  const [maxConcurrent, setMaxConcurrent] = useState<number>(2);
  const [useProxy] = useState(true); // 始终使用代理
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BatchPredictionResult | null>(null);
  const [processing, setProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableYears = ['2021', '2022', '2023', '2024'];
  
  const majorConfigs: { [key: string]: string[] } = {
    '2021': ['物联网工程', '电信工程及管理', '电子商务及法律'],
    '2022': ['智能科学与技术', '物联网工程', '电信工程及管理', '电子信息工程'],
    '2023': ['智能科学与技术', '物联网工程', '电信工程及管理', '电子信息工程'],
    '2024': ['智能科学与技术', '物联网工程', '电信工程及管理', '电子信息工程']
  };

  // 从文件名检测年级
  const detectYearFromFilename = (filename: string): string | null => {
    const yearMatch = filename.match(/cohort(\d{4})|(\d{4})级/i);
    if (yearMatch) {
      const detectedYear = yearMatch[1] || yearMatch[2];
      if (availableYears.includes(detectedYear)) {
        return detectedYear;
      }
    }
    return null;
  };

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // 验证文件类型
      if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
        setError('请上传有效的Excel文件(.xlsx或.xls格式)');
        return;
      }
      
      // 验证文件大小 (100MB)
      if (selectedFile.size > 100 * 1024 * 1024) {
        setError('文件大小不能超过100MB');
        return;
      }

      setFile(selectedFile);
      setError(null);
      setResult(null);
      
      // 自动检测年级
      const detectedYear = detectYearFromFilename(selectedFile.name);
      if (detectedYear) {
        setYear(detectedYear);
      }
    }
  };

  // 开始批量预测
  const handleBatchPrediction = async () => {
    if (!file || !year) {
      setError('请选择文件和年级');
      return;
    }

    setProcessing(true);
    setLoading(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      console.log('[批量预测] 开始处理...');
      
      const formData = new FormData();
      formData.append('scores_file', file);
      formData.append('year', year);
      formData.append('maxConcurrent', maxConcurrent.toString());
      formData.append('config', JSON.stringify({
        min_grade: 60,
        max_grade: 90,
        with_uniform_inverse: 1
      }));

      // 模拟进度更新
      setProgress(10);
      console.log('[批量预测] 上传文件...');

      const response = await fetch('/api/aliyun-proxy/batch-predict', {
        method: 'POST',
        body: formData,
      });

      setProgress(50);
      console.log('[批量预测] 服务器响应状态:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `服务器错误: ${response.status}`);
      }

      const data = await response.json();
      console.log('[批量预测] 预测结果:', data);

      if (data.success) {
        setResult(data.data);
        setProgress(100);
        
        // 清空文件选择
        setFile(null);
        setYear('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(data.error || '批量预测失败');
      }

    } catch (error) {
      console.error('[批量预测] 错误:', error);
      setError(error instanceof Error ? error.message : '批量预测失败');
    } finally {
      setProcessing(false);
      setLoading(false);
    }
  };

  // 下载预测结果
  const handleDownloadResult = async (majorResult: MajorResult) => {
    if (!majorResult.result) return;
    
    try {
      const response = await fetch('/api/aliyun-proxy/download-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          majorResult,
          summary: result?.summary
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // 从响应头获取文件名
        const contentDisposition = response.headers.get('Content-Disposition');
        let fileName = `${majorResult.major}_预测结果.xlsx`;
        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
          if (fileNameMatch) {
            fileName = decodeURIComponent(fileNameMatch[1]);
          }
        }
        
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        throw new Error('下载失败');
      }
    } catch (error) {
      console.error('下载错误:', error);
      setError(`下载 ${majorResult.major} 结果失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">阿里云批量预测测试</h1>
      <p className="text-muted-foreground mb-6">
        上传包含多个专业学生的成绩文件，自动按专业分组后分别调用阿里云预测算法
      </p>

      <Tabs defaultValue="batch" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="batch" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            批量预测
          </TabsTrigger>
          <TabsTrigger value="info" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            使用说明
          </TabsTrigger>
        </TabsList>

        <TabsContent value="batch" className="space-y-6">
          {/* 文件上传和配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                上传成绩文件并配置
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                上传包含多个专业学生的完整成绩文件，系统将自动按专业分组并分别进行预测
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">选择成绩文件 (Excel格式)</Label>
                <Input
                  ref={fileInputRef}
                  id="file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  disabled={processing}
                />
                {file && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <FileSpreadsheet className="w-4 h-4" />
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>

              {/* 年级选择 */}
              <div className="space-y-2">
                <Label htmlFor="year">选择年级</Label>
                <Select value={year} onValueChange={setYear} disabled={processing}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择年级" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(y => (
                      <SelectItem key={y} value={y}>
                        {y}级
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {year && majorConfigs[year] && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-2">
                      {year}级支持的专业（系统将自动识别和分组）:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {majorConfigs[year].map((major, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {major}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      💡 无需手动选择专业，系统会根据成绩文件中的专业字段自动分组处理
                    </p>
                  </div>
                )}
              </div>

              {/* 并发设置 */}
              <div className="space-y-2">
                <Label htmlFor="concurrent">并发预测数量</Label>
                <Select 
                  value={maxConcurrent.toString()} 
                  onValueChange={(value) => setMaxConcurrent(parseInt(value))}
                  disabled={processing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 个专业（顺序处理）</SelectItem>
                    <SelectItem value="2">2 个专业（推荐）</SelectItem>
                    <SelectItem value="3">3 个专业</SelectItem>
                    <SelectItem value="4">4 个专业（高负载）</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 预测按钮 */}
              <Button
                onClick={handleBatchPrediction}
                disabled={processing || !file || !year}
                className="w-full flex items-center gap-2"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4" />
                )}
                {processing ? '批量预测中...' : '开始批量预测'}
              </Button>
            </CardContent>
          </Card>

          {/* 错误提示 */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="text-red-600">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* 处理进度 */}
          {processing && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">批量预测进度</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-muted-foreground">
                    正在处理中，请稍候...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 预测结果 */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  批量预测结果
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 统计概览 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{result.summary.totalMajors}</div>
                    <div className="text-sm text-muted-foreground">总专业数</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{result.summary.successfulMajors}</div>
                    <div className="text-sm text-muted-foreground">成功预测</div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">{result.summary.failedMajors}</div>
                    <div className="text-sm text-muted-foreground">预测失败</div>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">{result.summary.totalStudents}</div>
                    <div className="text-sm text-muted-foreground">总学生数</div>
                  </div>
                </div>

                {/* 批次信息 */}
                <Alert>
                  <Database className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p><strong>批次ID:</strong> {result.summary.batchId}</p>
                      <p><strong>源文件:</strong> {result.summary.originalFile}</p>
                      <p><strong>年级:</strong> {result.summary.year}级</p>
                      <p><strong>处理时间:</strong> {new Date(result.summary.processingTime).toLocaleString()}</p>
                    </div>
                  </AlertDescription>
                </Alert>

                {/* 成功的预测结果 */}
                {result.results.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-green-600 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      预测成功的专业 ({result.results.length}个)
                    </h4>
                    <div className="space-y-3">
                      {result.results.map((majorResult, index) => (
                        <div key={index} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Users className="w-5 h-5 text-green-600" />
                              <div>
                                <p className="font-medium">{majorResult.major}</p>
                                <p className="text-sm text-muted-foreground">
                                  {majorResult.studentCount} 名学生 · {majorResult.fileName}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadResult(majorResult)}
                              className="flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                              下载结果
                            </Button>
                          </div>
                          
                          {/* 预测结果详情 */}
                          {majorResult.result && (
                            <div className="mt-3 p-3 bg-white rounded border">
                              <details>
                                <summary className="cursor-pointer text-sm font-medium">
                                  预测结果详情
                                </summary>
                                <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                  {JSON.stringify(majorResult.result, null, 2)}
                                </pre>
                              </details>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 失败的预测 */}
                {result.errors.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-red-600 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      预测失败的专业 ({result.errors.length}个)
                    </h4>
                    <div className="space-y-3">
                      {result.errors.map((errorResult, index) => (
                        <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <XCircle className="w-5 h-5 text-red-600" />
                            <div className="flex-1">
                              <p className="font-medium">{errorResult.major}</p>
                              <p className="text-sm text-muted-foreground">
                                {errorResult.studentCount} 名学生 · {errorResult.fileName}
                              </p>
                              <p className="text-sm text-red-600 mt-1">
                                错误: {errorResult.error}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="info" className="space-y-6">
          {/* 功能说明 */}
          <Card>
            <CardHeader>
              <CardTitle>批量预测功能说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">功能特点：</h4>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>上传包含多个专业学生的成绩文件（一个年级的完整数据）</li>
                  <li><strong>智能专业识别</strong>：系统自动读取文件中的专业字段进行分组</li>
                  <li><strong>无需手动选择专业</strong>：根据文件内容自动处理所有专业</li>
                  <li>并行调用阿里云预测API，支持1-4个专业同时处理</li>
                  <li>实时显示预测进度和结果</li>
                  <li>详细的成功/失败统计和错误信息</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">文件格式要求：</h4>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>支持Excel格式(.xlsx, .xls)</li>
                  <li>文件大小不超过100MB</li>
                  <li>必须包含学生专业信息（Current_Major或专业字段）</li>
                  <li>包含完整的课程成绩数据</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">处理流程：</h4>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li><strong>步骤1:</strong> 上传包含多专业的成绩文件并选择年级</li>
                  <li><strong>步骤2:</strong> 系统自动读取文件并识别所有专业</li>
                  <li><strong>步骤3:</strong> 按专业智能分组学生数据</li>
                  <li><strong>步骤4:</strong> 为每个专业生成单独的Excel文件</li>
                  <li><strong>步骤5:</strong> 并行调用阿里云预测API</li>
                  <li><strong>步骤6:</strong> 收集和展示所有专业的预测结果</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">支持的专业配置：</h4>
                {Object.entries(majorConfigs).map(([y, majors]) => (
                  <div key={y} className="ml-4">
                    <p className="font-medium">{y}级：</p>
                    <p className="text-muted-foreground ml-4">{majors.join('、')}</p>
                  </div>
                ))}
              </div>
              
              <div>
                <h4 className="font-medium mb-2">并发处理建议：</h4>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li><strong>1个专业:</strong> 适合服务器资源有限的情况</li>
                  <li><strong>2个专业:</strong> 推荐设置，平衡处理速度和稳定性</li>
                  <li><strong>3-4个专业:</strong> 适合高性能服务器环境</li>
                  <li>处理时间取决于学生数量和网络状况</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
