import { describe, it, expect } from 'vitest';
import { processReportData, sortByAdmDescending, sortByGrandListPerStudentDescending, computeMaxValues, buildReportCsv } from './reportView';
import type { ReportData } from './types';

const makeDistrict = (overrides: Partial<ReportData>): ReportData => ({
  id: 'dist_1',
  name: 'District 1',
  color: '#000000',
  adm: 100,
  grandList: 1_000_000,
  homeEEdGL: 600_000,
  nonHomeEEdGL: 400_000,
  totalEEdGL: 1_000_000,
  townCount: 2,
  enrollmentHistory: [
    { year: '2015', enrollment: 100 },
    { year: '2024', enrollment: 100 },
  ],
  enrollCategory: { small: 0, medium: 0, large: 0 },
  independentEnrollCategory: { small: 0, medium: 0, large: 0 },
  independentSchoolCount: 0,
  pcbAboveSALCount: 0,
  fciCounts: { good: 0, fair: 0, poor: 0, veryPoor: 0 },
  townsWithAdm: [],
  publicSchools: [],
  independentSchools: [],
  suStatus: { intact: [], divided: [] },
  rpcStatus: { intact: [], divided: [] },
  ...overrides,
});

describe('processReportData', () => {
  it('computes grandListPerStudent, guarding division by zero', () => {
    const [withStudents] = processReportData([makeDistrict({ adm: 100, grandList: 500_000 })]);
    expect(withStudents.grandListPerStudent).toBe(5000);

    const [noStudents] = processReportData([makeDistrict({ adm: 0, grandList: 500_000 })]);
    expect(noStudents.grandListPerStudent).toBe(0);
  });

  it('computes enrollment change percentage, treating a zero starting value as a 100% increase if enrollment exists, 0% otherwise', () => {
    const [grew] = processReportData([makeDistrict({
      enrollmentHistory: [{ year: '2015', enrollment: 100 }, { year: '2024', enrollment: 150 }],
    })]);
    expect(grew.enrollmentChangePercentage).toBeCloseTo(50);

    const [fromZeroWithGrowth] = processReportData([makeDistrict({
      enrollmentHistory: [{ year: '2015', enrollment: 0 }, { year: '2024', enrollment: 40 }],
    })]);
    expect(fromZeroWithGrowth.enrollmentChangePercentage).toBe(100);

    const [fromZeroStillZero] = processReportData([makeDistrict({
      enrollmentHistory: [{ year: '2015', enrollment: 0 }, { year: '2024', enrollment: 0 }],
    })]);
    expect(fromZeroStillZero.enrollmentChangePercentage).toBe(0);
  });

  it('tallies public school types, folding "Middle" into "Middle School" and excluding CTE', () => {
    const [district] = processReportData([makeDistrict({
      publicSchools: [
        { NAME: 'A', Grades: 'K-6', ENROLLMENT: 100, TOWN: 'X', Type: 'Elementary', id: 'a' },
        { NAME: 'B', Grades: '7-8', ENROLLMENT: 50, TOWN: 'X', Type: 'Middle', id: 'b' },
        { NAME: 'C', Grades: '9-12', ENROLLMENT: 80, TOWN: 'X', Type: 'CTE', id: 'c' },
      ],
    })]);
    expect(district.publicSchoolTypes).toEqual({ Elementary: 1, 'Middle School': 1 });
  });

  it('returns an empty array for falsy input', () => {
    expect(processReportData(null as unknown as ReportData[])).toEqual([]);
  });
});

describe('sortByAdmDescending / sortByGrandListPerStudentDescending', () => {
  const [a, b, c] = processReportData([
    makeDistrict({ id: 'a', adm: 50, grandList: 100 }),
    makeDistrict({ id: 'b', adm: 200, grandList: 800 }),
    makeDistrict({ id: 'c', adm: 100, grandList: 500 }),
  ]);

  it('sorts by ADM descending without mutating the input array', () => {
    const input = [a, b, c];
    const sorted = sortByAdmDescending(input);
    expect(sorted.map(d => d.id)).toEqual(['b', 'c', 'a']);
    expect(input.map(d => d.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts by grand-list-per-student descending', () => {
    const sorted = sortByGrandListPerStudentDescending([a, b, c]);
    // grandListPerStudent: a=2, b=4, c=5
    expect(sorted.map(d => d.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('computeMaxValues', () => {
  it('returns all zeros for an empty list', () => {
    expect(computeMaxValues([])).toEqual({ townCount: 0, adm: 0, grandListPerStudent: 0, totalEEdGL: 0, schoolType: 0 });
  });

  it('computes the max across districts, with schoolType defaulting to at least 1', () => {
    const processed = processReportData([
      makeDistrict({ id: 'a', adm: 50, townCount: 1, totalEEdGL: 100, publicSchools: [] }),
      makeDistrict({
        id: 'b', adm: 200, townCount: 3, totalEEdGL: 900,
        publicSchools: [
          { NAME: 'S1', Grades: 'K-6', ENROLLMENT: 1, TOWN: 'X', Type: 'Elementary', id: 's1' },
          { NAME: 'S2', Grades: 'K-6', ENROLLMENT: 1, TOWN: 'X', Type: 'Elementary', id: 's2' },
          { NAME: 'S3', Grades: 'K-6', ENROLLMENT: 1, TOWN: 'X', Type: 'Elementary', id: 's3' },
        ],
      }),
    ]);
    const max = computeMaxValues(processed);
    expect(max.adm).toBe(200);
    expect(max.townCount).toBe(3);
    expect(max.totalEEdGL).toBe(900);
    expect(max.schoolType).toBe(3); // three "Elementary" entries in district b
  });
});

describe('buildReportCsv', () => {
  it('produces a header row plus one row per district with quoted names/SU lists', () => {
    const [district] = processReportData([makeDistrict({
      name: 'North, District',
      suStatus: { intact: ['SU One'], divided: ['SU Two', 'SU Three'] },
    })]);
    const csv = buildReportCsv([district]);
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('District Name,ADM,10-Year Change (%)');
    expect(lines[1]).toContain('"North, District"');
    expect(lines[1]).toContain('"SU One"');
    expect(lines[1]).toContain('"SU Two, SU Three"');
  });
});
