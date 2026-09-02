// src/reportView.ts
// Pure derivations consumed by ReportComponent.tsx: per-district view-model enrichment
// (enrollment change %, school-type tallies), the two chart sort orders, the table's max-value
// scales, and the CSV export row-builder. Extracted so this math is unit-testable independently
// of rendering.
import type { ReportData } from './types';

export interface ProcessedDistrict extends ReportData {
  grandListPerStudent: number;
  numSchools: number;
  enrollmentChangePercentage: number;
  publicSchoolTypes: Record<string, number>;
  independentSchoolTypes: Record<string, number>;
}

export const processReportData = (reportData: ReportData[]): ProcessedDistrict[] => {
  if (!reportData) return [];
  return reportData.map(d => {
    const firstValue = d.enrollmentHistory[0]?.enrollment || 0;
    const lastValue = d.enrollmentHistory[d.enrollmentHistory.length - 1]?.enrollment || 0;
    const enrollmentChangePercentage = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : (lastValue > 0 ? 100 : 0);

    const publicSchoolTypes = (d.publicSchools || []).reduce((acc: Record<string, number>, school) => {
      let type = school.Type || 'Other';
      if (type === 'Middle') type = 'Middle School';
      if (type !== 'CTE') {
        acc[type] = (acc[type] || 0) + 1;
      }
      return acc;
    }, {});

    const independentSchoolTypes = (d.independentSchools || []).reduce((acc: Record<string, number>, school) => {
      const type = school.Type || 'Other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return {
      ...d,
      grandListPerStudent: d.adm > 0 ? d.grandList / d.adm : 0,
      numSchools: d.publicSchools ? d.publicSchools.length : 0,
      enrollmentChangePercentage,
      publicSchoolTypes,
      independentSchoolTypes,
    };
  });
};

export const sortByAdmDescending = (data: ProcessedDistrict[]): ProcessedDistrict[] =>
  [...data].sort((a, b) => b.adm - a.adm);

export const sortByGrandListPerStudentDescending = (data: ProcessedDistrict[]): ProcessedDistrict[] =>
  [...data].sort((a, b) => b.grandListPerStudent - a.grandListPerStudent);

export interface ReportMaxValues {
  townCount: number;
  adm: number;
  grandListPerStudent: number;
  totalEEdGL: number;
  schoolType: number;
}

export const computeMaxValues = (processedData: ProcessedDistrict[]): ReportMaxValues => {
  if (!processedData || processedData.length === 0) {
    return { townCount: 0, adm: 0, grandListPerStudent: 0, totalEEdGL: 0, schoolType: 0 };
  }
  const maxSchoolType = Math.max(1, ...processedData.flatMap(d => [
    ...Object.values(d.publicSchoolTypes),
    ...Object.values(d.independentSchoolTypes)
  ]));
  return {
    townCount: Math.max(...processedData.map(d => d.townCount)),
    adm: Math.max(...processedData.map(d => d.adm)),
    grandListPerStudent: Math.max(...processedData.map(d => d.grandListPerStudent)),
    totalEEdGL: Math.max(...processedData.map(d => d.totalEEdGL)),
    schoolType: maxSchoolType
  };
};

export const buildReportCsv = (sortedTableData: ProcessedDistrict[]): string => {
  let csvContent = "District Name,ADM,10-Year Change (%),Total Eq Ed GL,Elementary Schools,Middle Schools,Secondary Schools,K-12 Schools,Independent Elementary Schools,Independent Secondary Schools,FCI <10%,FCI 10-30%,FCI 30-65%,FCI >65%,SU Intact,SU Divided,Intact SUs,Divided SUs\r\n";
  sortedTableData.forEach(item => {
    const row = [
      `"${item.name}"`,
      item.adm,
      item.enrollmentChangePercentage.toFixed(2),
      item.totalEEdGL,
      item.publicSchoolTypes['Elementary'] || 0,
      item.publicSchoolTypes['Middle School'] || 0,
      item.publicSchoolTypes['Secondary'] || 0,
      item.publicSchoolTypes['K-12'] || 0,
      item.independentSchoolTypes['Elementary'] || 0,
      item.independentSchoolTypes['Secondary'] || 0,
      item.fciCounts.good,
      item.fciCounts.fair,
      item.fciCounts.poor,
      item.fciCounts.veryPoor,
      item.suStatus.intact.length,
      item.suStatus.divided.length,
      `"${item.suStatus.intact.join(', ')}"`,
      `"${item.suStatus.divided.join(', ')}"`
    ].join(',');
    csvContent += row + "\r\n";
  });
  return csvContent;
};
