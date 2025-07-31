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

// 注册中文字体 - 使用系统字体
Font.register({
  family: 'Helvetica',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/notosanssc/v26/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.119.woff2',
      fontWeight: 'normal',
    },
    {
      src: 'https://fonts.gstatic.com/s/notosanssc/v26/k3kIo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.119.woff2',
      fontWeight: 'bold',
    },
  ],
});

// 简化的PDF样式
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 20,
    color: '#1f2937',
    fontWeight: 'bold',
  },
  section: {
    margin: 10,
    padding: 10,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 60,
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
    borderColor: '#d1d5db',
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 5,
  },
  tableColHeader: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 5,
    backgroundColor: '#f3f4f6',
  },
  tableCell: {
    fontSize: 10,
    textAlign: 'center',
  },
  tableCellHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
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

interface StudentData {
  userId: string;
  name: string;
  userHash: string;
  major?: string;
  year?: string;
}

interface CourseScore {
  courseName: string;
  score: number | null;
  semester?: number;
  credit?: number;
}

// 简化的PDF文档组件
const ChinesePDFDocument = ({ 
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
        <Text>Student Report</Text>
      </View>

      {/* 学生信息 */}
      <View style={styles.section}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{student.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>ID:</Text>
          <Text style={styles.value}>{student.userId}</Text>
        </View>
        {student.major && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Major:</Text>
            <Text style={styles.value}>{student.major}</Text>
          </View>
        )}
        {student.year && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Year:</Text>
            <Text style={styles.value}>{student.year}</Text>
          </View>
        )}
      </View>

      {/* 成绩表格 */}
      {courseScores.length > 0 && (
        <View style={styles.section}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>
            Course Scores
          </Text>
          <View style={styles.table}>
            {/* 表头 */}
            <View style={styles.tableRow}>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Course</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Score</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Semester</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Credit</Text>
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
                    {course.score !== null ? course.score : 'N/A'}
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
        Generated: {new Date().toLocaleDateString()} | BuTP Student Management System
      </Text>
    </Page>
  </Document>
);

// PDF预览组件
export function ChinesePDFPreview({ 
  student, 
  courseScores 
}: { 
  student: StudentData; 
  courseScores: CourseScore[];
}) {
  return (
    <PDFViewer style={{ width: '100%', height: '600px' }}>
      <ChinesePDFDocument student={student} courseScores={courseScores} />
    </PDFViewer>
  );
}

// PDF下载组件
export function ChinesePDFDownload({ 
  student, 
  courseScores 
}: { 
  student: StudentData; 
  courseScores: CourseScore[];
}) {
  return (
    <PDFDownloadLink
      document={<ChinesePDFDocument student={student} courseScores={courseScores} />}
      fileName={`${student.name}_report_${new Date().toISOString().split('T')[0]}.pdf`}
    >
      {({ blob, url, loading, error }: { 
        blob: Blob | null; 
        url: string | null; 
        loading: boolean; 
        error: Error | null; 
      }) =>
        loading ? 'Generating PDF...' : 'Download PDF Report'
      }
    </PDFDownloadLink>
  );
}

export default ChinesePDFDocument; 