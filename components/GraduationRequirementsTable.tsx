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
  remarks?: string;
  special_requirement?: {
    type: string;
    total_options: number;
    required_count: number;
    completed_count: number;
    is_satisfied: boolean;
  };
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
  graduationSummary?: {
    total_earned_credits: number;
    graduation_total_credits?: number;
  } | null;
}

const GraduationRequirementsTable: React.FC<GraduationRequirementsTableProps> = ({ graduationRequirements, otherCategory, graduationSummary }) => {
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
                {req.category.includes('体育') && req.compulsory_credits_obtained !== undefined ? (
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
                {req.category.includes('体育') && req.elective_credits_obtained !== undefined ? (
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

      {/* 总学分统计 */}
      {graduationSummary && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-blue-900">毕业学分统计</h4>
              <p className="text-sm text-blue-700 mt-1">
                已修学分 / 毕业要求总学分
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-900">
                {graduationSummary.total_earned_credits}
                {graduationSummary.graduation_total_credits && (
                  <span className="text-blue-600"> / {graduationSummary.graduation_total_credits}</span>
                )}
              </div>
              {graduationSummary.graduation_total_credits && (
                <div className="text-sm text-blue-600 mt-1">
                  完成度: {Math.round((graduationSummary.total_earned_credits / graduationSummary.graduation_total_credits) * 100)}%
                </div>
              )}
            </div>
          </div>
          {graduationSummary.graduation_total_credits && (
            <div className="mt-3">
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min((graduationSummary.total_earned_credits / graduationSummary.graduation_total_credits) * 100, 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('analysis.graduation.detailsForCategory', { category: selectedCategoryName })}</DialogTitle>
            <DialogDescription>
              {t('analysis.graduation.coursesTakenIn', { category: selectedCategoryName })}
              {selectedCategoryDetails.some(course => course.special_requirement) && (
                <div className="mt-2 p-2 bg-blue-50 rounded-md text-sm">
                  <div className="font-medium text-blue-900">九选二要求说明：</div>
                  <div className="text-blue-700">
                    • <span className="text-green-600">绿色</span>表示已满足九选二要求（已选≥2门）
                  </div>
                  <div className="text-blue-700">
                    • <span className="text-red-600">红色</span>表示未满足九选二要求，需要补选课程
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 overflow-y-auto flex-1">
            {selectedCategoryDetails.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('analysis.graduation.courseName')}</TableHead>
                    <TableHead>课程属性</TableHead>
                    <TableHead>特殊要求</TableHead>
                    <TableHead className="text-right">{t('analysis.graduation.credit')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedCategoryDetails.map((course, idx) => (
                    <TableRow key={idx} className={
                      course.special_requirement && !course.special_requirement.is_satisfied 
                        ? 'bg-red-50 border-red-200' 
                        : course.special_requirement && course.special_requirement.is_satisfied 
                        ? 'bg-green-50 border-green-200' 
                        : ''
                    }>
                      <TableCell className={
                        course.special_requirement && !course.special_requirement.is_satisfied 
                          ? 'text-red-800' 
                          : course.special_requirement && course.special_requirement.is_satisfied 
                          ? 'text-green-800' 
                          : ''
                      }>
                        {course.Course_Name}
                      </TableCell>
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
                      <TableCell>
                        {course.special_requirement ? (
                          <div className="space-y-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              course.special_requirement.is_satisfied 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {course.special_requirement.type}
                            </span>
                            <div className="text-xs text-gray-600">
                              已选: {course.special_requirement.completed_count}/{course.special_requirement.required_count}
                              {course.special_requirement.is_satisfied ? ' ✅' : ' ❌'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">无特殊要求</span>
                        )}
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
