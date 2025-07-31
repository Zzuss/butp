import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFViewer,
  PDFDownloadLink,
  Font,
} from '@react-pdf/renderer';

// 注册中文字体（需要提供字体文件）
// Font.register({
//   family: 'SimSun',
//   src: '/fonts/simsun.ttc',
// });

// PDF样式定义
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
  },
  header: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
    color: '#1f2937',
    fontWeight: 'bold',
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  studentInfo: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f3f4f6',
    borderRadius: 5,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 80,
    color: '#374151',
  },
  value: {
    fontSize: 12,
    color: '#1f2937',
    flex: 1,
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderColor: '#d1d5db',
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#d1d5db',
  },
  tableCellHeader: {
    margin: 'auto',
    marginTop: 5,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
  },
  tableCell: {
    margin: 'auto',
    marginTop: 5,
    fontSize: 10,
    color: '#1f2937',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
    color: '#6b7280',
  },
});

// 学生数据接口
interface StudentData {
  userId: string;
  name: string;
  userHash: string;
  major?: string;
  year?: string;
}

// 课程成绩接口
interface CourseScore {
  courseName: string;
  score: number | null;
  semester?: number;
  category?: string;
  credit?: number;
}

// PDF文档组件
const StudentReportDocument = ({ 
  student, 
  courseScores = [] 
}: { 
  student: StudentData; 
  courseScores: CourseScore[];
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* 标题 */}
      <View style={styles.header}>
        <Text>学生成绩报告单</Text>
      </View>

      {/* 学生信息 */}
      <View style={styles.section}>
        <View style={styles.studentInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>姓名：</Text>
            <Text style={styles.value}>{student.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>学号：</Text>
            <Text style={styles.value}>{student.userId}</Text>
          </View>
          {student.major && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>专业：</Text>
              <Text style={styles.value}>{student.major}</Text>
            </View>
          )}
          {student.year && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>年级：</Text>
              <Text style={styles.value}>{student.year}</Text>
            </View>
          )}
        </View>
      </View>

      {/* 成绩表格 */}
      {courseScores.length > 0 && (
        <View style={styles.section}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
            课程成绩
          </Text>
          <View style={styles.table}>
            {/* 表头 */}
            <View style={styles.tableRow}>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>课程名称</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>成绩</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>学期</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>学分</Text>
              </View>
            </View>
            
            {/* 数据行 */}
            {courseScores.map((course, index) => (
              <View style={styles.tableRow} key={index}>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{course.courseName}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    {course.score !== null ? course.score : '未录入'}
                  </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    {course.semester || '-'}
                  </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    {course.credit || '-'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 页脚 */}
      <Text style={styles.footer}>
        生成时间：{new Date().toLocaleString('zh-CN')} | BuTP学生管理系统
      </Text>
    </Page>
  </Document>
);

// PDF预览组件
export function StudentReportPreview({ 
  student, 
  courseScores 
}: { 
  student: StudentData; 
  courseScores: CourseScore[];
}) {
  return (
    <PDFViewer style={{ width: '100%', height: '600px' }}>
      <StudentReportDocument student={student} courseScores={courseScores} />
    </PDFViewer>
  );
}

// PDF下载组件
export function StudentReportDownload({ 
  student, 
  courseScores 
}: { 
  student: StudentData; 
  courseScores: CourseScore[];
}) {
  return (
    <PDFDownloadLink
      document={<StudentReportDocument student={student} courseScores={courseScores} />}
      fileName={`${student.name}_成绩报告_${new Date().toISOString().split('T')[0]}.pdf`}
    >
      {({ blob, url, loading, error }: { 
        blob: Blob | null; 
        url: string | null; 
        loading: boolean; 
        error: Error | null; 
      }) =>
        loading ? '生成PDF中...' : '下载PDF报告'
      }
    </PDFDownloadLink>
  );
}

export default StudentReportDocument; 