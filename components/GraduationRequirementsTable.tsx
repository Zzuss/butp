'use client';

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/language-context';

interface CourseDetail {
  Course_Name: string;
  Credit: number;
  Course_Attribute?: string;
  type?: string;
}

interface GraduationRequirement {
  category: string;
  required_total_credits: number;
  required_compulsory_credits: number;
  required_elective_credits: number;
  credits_already_obtained: number;
  courses_taken: CourseDetail[];
  compulsory_credits_obtained?: number;
  elective_credits_obtained?: number;
  is_completed?: boolean;
  meets_requirement?: boolean;
}

interface OtherCategory {
  category: string;
  credits_already_obtained: number;
  courses_taken: CourseDetail[];
  course_count: number;
}

interface GraduationRequirementsTableProps {
  graduationRequirements: GraduationRequirement[];
  otherCategory?: OtherCategory | null;
}

const GraduationRequirementsTable: React.FC<GraduationRequirementsTableProps> = ({ graduationRequirements, otherCategory }) => {
  const { t } = useLanguage();
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedCategoryDetails, setSelectedCategoryDetails] = useState<CourseDetail[]>([]);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');

  const handleViewDetails = (categoryName: string, courses: CourseDetail[]) => {
    setSelectedCategoryName(categoryName);
    setSelectedCategoryDetails(courses);
    setIsDetailsDialogOpen(true);
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4">{t('analysis.graduation.creditsTableTitle')}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('analysis.graduation.courseCategory')}</TableHead>
            <TableHead>{t('analysis.graduation.requiredTotalCredits')}</TableHead>
            <TableHead>{t('analysis.graduation.requiredCompulsoryCredits')}</TableHead>
            <TableHead>{t('analysis.graduation.requiredElectiveCredits')}</TableHead>
            <TableHead>{t('analysis.graduation.creditsAlreadyObtained')}</TableHead>
            <TableHead className="text-right">{t('analysis.graduation.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {graduationRequirements.map((req, index) => (
            <TableRow 
              key={index}
              className={req.is_completed ? "bg-green-50 border-green-200" : ""}
            >
              <TableCell className={`font-medium ${req.is_completed ? "text-green-800" : ""}`}>
                {req.is_completed && <span className="mr-2">✅</span>}
                {req.category}
              </TableCell>
              <TableCell>{req.required_total_credits}</TableCell>
              <TableCell>
                {req.category === '体育' && req.compulsory_credits_obtained !== undefined ? (
                  <span className="text-sm">
                    {req.required_compulsory_credits}
                    <span className="text-gray-500 ml-1">
                      (已获得: {req.compulsory_credits_obtained})
                    </span>
                  </span>
                ) : (
                  req.required_compulsory_credits
                )}
              </TableCell>
              <TableCell>
                {req.category === '体育' && req.elective_credits_obtained !== undefined ? (
                  <span className="text-sm">
                    {req.required_elective_credits}
                    <span className="text-gray-500 ml-1">
                      (已获得: {req.elective_credits_obtained})
                    </span>
                  </span>
                ) : (
                  req.required_elective_credits
                )}
              </TableCell>
              <TableCell>{req.credits_already_obtained}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewDetails(req.category, req.courses_taken)}
                >
                  {t('analysis.graduation.viewDetails')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* 查看其他类别按钮 */}
      {otherCategory && otherCategory.course_count > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">其他课程</h4>
              <p className="text-sm text-gray-600">
                {otherCategory.course_count} 门课程，共 {otherCategory.credits_already_obtained} 学分
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewDetails(otherCategory.category, otherCategory.courses_taken)}
            >
              查看其他
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('analysis.graduation.detailsForCategory', { category: selectedCategoryName })}</DialogTitle>
            <DialogDescription>
              {t('analysis.graduation.coursesTakenIn', { category: selectedCategoryName })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedCategoryDetails.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('analysis.graduation.courseName')}</TableHead>
                    <TableHead>课程属性</TableHead>
                    <TableHead className="text-right">{t('analysis.graduation.credit')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedCategoryDetails.map((course, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{course.Course_Name}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          course.Course_Attribute === '必修' ? 'bg-red-100 text-red-800' :
                          course.Course_Attribute === '选修' ? 'bg-blue-100 text-blue-800' :
                          course.Course_Attribute === '任选' ? 'bg-gray-100 text-gray-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {course.Course_Attribute || '未知'}
                          {course.type && ` (${course.type === 'compulsory' ? '必修' : '选修'})`}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{course.Credit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p>{t('analysis.graduation.noCoursesTaken')}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GraduationRequirementsTable;
