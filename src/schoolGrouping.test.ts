import { describe, it, expect } from 'vitest';
import { groupSchoolsByType, sortSchoolTypes } from './schoolGrouping';
import type { SchoolDetail } from './types';

const makeSchool = (name: string, type: string): SchoolDetail => ({
  NAME: name, Grades: 'K-6', ENROLLMENT: 100, TOWN: 'TESTVILLE', Type: type,
});

describe('groupSchoolsByType', () => {
  it('groups schools by their Type field', () => {
    const schools = [makeSchool('A', 'Elementary'), makeSchool('B', 'Elementary'), makeSchool('C', 'Secondary')];
    const grouped = groupSchoolsByType(schools);
    expect(grouped['Elementary'].map(s => s.NAME)).toEqual(['A', 'B']);
    expect(grouped['Secondary'].map(s => s.NAME)).toEqual(['C']);
  });

  it('falls back to "Uncategorized" when Type is missing', () => {
    const school = { ...makeSchool('D', ''), Type: undefined as unknown as string };
    const grouped = groupSchoolsByType([school]);
    expect(grouped['Uncategorized']).toHaveLength(1);
  });

  it('returns an empty object for an empty list', () => {
    expect(groupSchoolsByType([])).toEqual({});
  });
});

describe('sortSchoolTypes', () => {
  it('orders K-12, Elementary, Middle School, Secondary first, CTE last, and alphabetizes the rest', () => {
    const grouped = groupSchoolsByType([
      makeSchool('a', 'Secondary'),
      makeSchool('b', 'CTE'),
      makeSchool('c', 'K-12'),
      makeSchool('d', 'Zebra Academy'),
      makeSchool('e', 'Elementary'),
      makeSchool('f', 'Middle School'),
    ]);
    expect(sortSchoolTypes(grouped)).toEqual(['K-12', 'Elementary', 'Middle School', 'Secondary', 'Zebra Academy', 'CTE']);
  });
});
