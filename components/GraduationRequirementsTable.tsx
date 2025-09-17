'use client';

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/language-context';

interface CourseDetail {
  Course_Name: string;
  Credit: number;
}

interface GraduationRequirement {
  category: string;
  required_total_credits: number;
  required_compulsory_credits: number;
  required_elective_credits: number;
  credits_already_obtained: number;
  courses_taken: CourseDetail[];
}

interface GraduationRequirementsTableProps {
  graduationRequirements: GraduationRequirement[];
}

const GraduationRequirementsTable: React.FC<GraduationRequirementsTableProps> = ({ graduationRequirements }) => {
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
            <TableRow key={index}>
              <TableCell className="font-medium">{req.category}</TableCell>
              <TableCell>{req.required_total_credits}</TableCell>
              <TableCell>{req.required_compulsory_credits}</TableCell>
              <TableCell>{req.required_elective_credits}</TableCell>
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
                    <TableHead className="text-right">{t('analysis.graduation.credit')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedCategoryDetails.map((course, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{course.Course_Name}</TableCell>
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
