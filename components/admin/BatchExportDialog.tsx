"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Download, X, AlertCircle, CheckCircle } from 'lucide-react'
import * as XLSX from 'xlsx'

interface BatchExportDialogProps {
  isOpen: boolean
  onClose: () => void
  grade?: string
}

interface StudentData {
  bupt_student_id: string
  full_name: string
  class: string
  overall_approval_status: string
  papers: Array<{
    title: string
    category: string
    author_type: string
    publish_date: string
    score: number
    approval_status: string
    defense_status?: string
  }>
  patents: Array<{
    name: string
    category: string
    patent_date: string
    score: number
    approval_status: string
  }>
  competitions: Array<{
    name: string
    level: string
    region: string
    score: number
    approval_status: string
  }>
  scores: {
    paper: number
    patent: number
    competition: number
    total: number
  }
}

export default function BatchExportDialog({ isOpen, onClose, grade = '2021' }: BatchExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'exporting' | 'completed' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [allStudentsData, setAllStudentsData] = useState<StudentData[]>([])

  const startExport = async () => {
    setIsExporting(true)
    setStatus('exporting')
    setProgress(0)
    setAllStudentsData([])
    setErrorMessage('')

    try {
      let page = 1
      const pageSize = 50
      let hasMore = true
      let total = 0
      const allData: StudentData[] = []

      while (hasMore) {
        console.log(`正在获取第${page}批数据...`)
        
        const response = await fetch(`/api/admin/export-students-batch?page=${page}&pageSize=${pageSize}&grade=${grade}`)
        
        if (!response.ok) {
          throw new Error(`获取数据失败: ${response.status}`)
        }

        const result = await response.json()
        
        if (result.error) {
          throw new Error(result.error)
        }

        // 第一次获取时设置总数
        if (page === 1) {
          total = result.total || 0
          console.log(`总共需要导出${total}个学生`)
        }

        // 添加到总数据中
        allData.push(...result.data)
        hasMore = result.hasMore

        // 更新进度
        const currentProgress = total > 0 ? Math.round((allData.length / total) * 100) : 0
        setProgress(currentProgress)
        
        console.log(`已获取${allData.length}/${total}个学生数据，进度：${currentProgress}%`)

        page++
      }

      setAllStudentsData(allData)
      console.log(`数据获取完成，共${allData.length}个学生`)

      // 生成Excel文件
      await generateExcel(allData)
      
      setStatus('completed')
      setProgress(100)

    } catch (error) {
      console.error('导出失败:', error)
      setErrorMessage(error instanceof Error ? error.message : '导出失败')
      setStatus('error')
    } finally {
      setIsExporting(false)
    }
  }

  const generateExcel = async (studentsData: StudentData[]) => {
    console.log('开始生成Excel文件...')

    // 创建工作簿
    const workbook = XLSX.utils.book_new()

    // 准备数据
    const excelData = studentsData.map(student => {
      // 基本信息
      const baseInfo = {
        '学号': student.bupt_student_id,
        '姓名': student.full_name,
        '班级': student.class,
        '审核状态': getApprovalStatusText(student.overall_approval_status),
      }

      // 论文信息
      const paperInfo = student.papers.length > 0 ? {
        '论文数量': student.papers.length,
        '论文总分': student.scores.paper,
        '论文详情': student.papers.map(p => 
          `${p.title}(${p.category},${p.author_type},${p.publish_date || '未填写'},${p.score}分,${getApprovalStatusText(p.approval_status)})`
        ).join('; ')
      } : {
        '论文数量': 0,
        '论文总分': 0,
        '论文详情': '无'
      }

      // 专利信息
      const patentInfo = student.patents.length > 0 ? {
        '专利数量': student.patents.length,
        '专利总分': student.scores.patent,
        '专利详情': student.patents.map(p => 
          `${p.name}(${p.category},${p.patent_date || '未填写'},${p.score}分,${getApprovalStatusText(p.approval_status)})`
        ).join('; ')
      } : {
        '专利数量': 0,
        '专利总分': 0,
        '专利详情': '无'
      }

      // 竞赛信息
      const competitionInfo = student.competitions.length > 0 ? {
        '竞赛数量': student.competitions.length,
        '竞赛总分': student.scores.competition,
        '竞赛详情': student.competitions.map(c => 
          `${c.name}(${c.level},${c.region},${c.score}分,${getApprovalStatusText(c.approval_status)})`
        ).join('; ')
      } : {
        '竞赛数量': 0,
        '竞赛总分': 0,
        '竞赛详情': '无'
      }

      // 总分信息
      const scoreInfo = {
        '德育总分': student.scores.total
      }

      return {
        ...baseInfo,
        ...paperInfo,
        ...patentInfo,
        ...competitionInfo,
        ...scoreInfo
      }
    })

    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    // 设置列宽
    const colWidths = [
      { wch: 12 }, // 学号
      { wch: 10 }, // 姓名
      { wch: 8 },  // 班级
      { wch: 10 }, // 审核状态
      { wch: 8 },  // 论文数量
      { wch: 10 }, // 论文总分
      { wch: 50 }, // 论文详情
      { wch: 8 },  // 专利数量
      { wch: 10 }, // 专利总分
      { wch: 50 }, // 专利详情
      { wch: 8 },  // 竞赛数量
      { wch: 10 }, // 竞赛总分
      { wch: 50 }, // 竞赛详情
      { wch: 10 }, // 德育总分
    ]
    worksheet['!cols'] = colWidths

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, `${grade}级德育总表`)

    // 生成文件并下载
    const fileName = `${grade}级德育总表_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, fileName)

    console.log('Excel文件生成完成')
  }

  const getApprovalStatusText = (status: string) => {
    switch (status) {
      case 'approved': return '已通过'
      case 'rejected': return '已拒绝'
      case 'pending': return '待审核'
      default: return '未知'
    }
  }

  const handleClose = () => {
    if (!isExporting) {
      onClose()
      setStatus('idle')
      setProgress(0)
      setErrorMessage('')
      setAllStudentsData([])
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">导出德育总表</h2>
          {!isExporting && (
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <p>年级：{grade}级</p>
            <p>导出内容：学生基本信息、论文、专利、竞赛记录及分数统计</p>
          </div>

          {status === 'idle' && (
            <div className="space-y-4">
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">注意事项：</p>
                    <ul className="mt-1 space-y-1 text-xs">
                      <li>• 导出过程可能需要几分钟时间</li>
                      <li>• 请勿关闭页面或刷新浏览器</li>
                      <li>• 数据量大时会分批获取以避免超时</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <Button onClick={startExport} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                开始导出
              </Button>
            </div>
          )}

          {status === 'exporting' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>导出进度</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
              
              <div className="text-sm text-gray-600">
                <p>正在获取学生数据...</p>
                <p>已获取 {allStudentsData.length} 个学生</p>
              </div>
            </div>
          )}

          {status === 'completed' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">导出完成！</span>
              </div>
              
              <div className="text-sm text-gray-600">
                <p>共导出 {allStudentsData.length} 个学生的数据</p>
                <p>文件已自动下载到您的设备</p>
              </div>
              
              <Button onClick={handleClose} className="w-full">
                关闭
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 text-red-600">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">导出失败</p>
                  <p>{errorMessage}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={startExport} variant="outline" className="flex-1">
                  重试
                </Button>
                <Button onClick={handleClose} className="flex-1">
                  关闭
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
