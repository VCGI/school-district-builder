// src/schoolGrouping.ts
// Pure helper for RightSidebar's per-district school lists: groups a flat school list by its
// `Type` field, and produces the display order the district-card sections use.
import type { SchoolDetail } from './types';

export const groupSchoolsByType = (schools: SchoolDetail[]): Record<string, SchoolDetail[]> => {
  return schools.reduce((acc, school) => {
    const schoolType = school.Type || 'Uncategorized';
    if (!acc[schoolType]) acc[schoolType] = [];
    acc[schoolType].push(school);
    return acc;
  }, {} as Record<string, SchoolDetail[]>);
};

const TYPE_SORT_ORDER = ['K-12', 'Elementary', 'Middle School', 'Secondary'];

export const sortSchoolTypes = (schoolTypes: Record<string, SchoolDetail[]>): string[] =>
  Object.keys(schoolTypes).sort((a, b) => {
    if (a === 'CTE') return 1; if (b === 'CTE') return -1;
    const aIndex = TYPE_SORT_ORDER.indexOf(a); const bIndex = TYPE_SORT_ORDER.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1; if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });
