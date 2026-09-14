import { describe, it, expect } from 'vitest';
import { buildReportData } from './reportData';
import { districtColors } from './constants';
import type {
  AllDistrictStats, Assignments, DistrictNames, SchoolDetailsByTown, SupervisoryUnions, TownData,
} from './types';

const townData: TownData = {
  TOWNA: {
    TOWNNAME: 'TOWNA', County: 'CountyX', Supervisory_Union: 'SU1', Public_School_Students: 100,
    Total_E_Ed_GL_Act73: 1_000_000, Public_Schools: 1, SqMi: 10, OBJECTID: 1, RPC: 'RPC1',
    Home_E_Ed_GL_Act73: 600_000, NonHome_E_Ed_GL_Act73: 400_000,
  },
  TOWNB: {
    TOWNNAME: 'TOWNB', County: 'CountyX', Supervisory_Union: 'SU1', Public_School_Students: 100,
    Total_E_Ed_GL_Act73: 1_000_000, Public_Schools: 1, SqMi: 10, OBJECTID: 2, RPC: 'RPC1',
    Home_E_Ed_GL_Act73: 600_000, NonHome_E_Ed_GL_Act73: 400_000,
  },
  TOWNC: {
    TOWNNAME: 'TOWNC', County: 'CountyY', Supervisory_Union: 'SU3', Public_School_Students: 50,
    Total_E_Ed_GL_Act73: 500_000, Public_Schools: 1, SqMi: 5, OBJECTID: 3, RPC: 'RPC2',
    Home_E_Ed_GL_Act73: 300_000, NonHome_E_Ed_GL_Act73: 200_000,
  },
  TOWND: {
    TOWNNAME: 'TOWND', County: 'CountyY', Supervisory_Union: 'SU3', Public_School_Students: 20,
    Total_E_Ed_GL_Act73: 200_000, Public_Schools: 0, SqMi: 3, OBJECTID: 4, RPC: 'RPC2',
    Home_E_Ed_GL_Act73: 100_000, NonHome_E_Ed_GL_Act73: 100_000,
  },
};

const assignments: Assignments = { TOWNA: 1, TOWNB: 1, TOWNC: 2, TOWND: null };
const districtOrder = [1, 2, 3]; // district 3 has no towns and should be filtered out
const districtNames: DistrictNames = { 1: 'North', 2: 'South', 3: 'Empty' };

const supervisoryUnions: SupervisoryUnions = {
  SU1: { towns: ['TOWNA', 'TOWNB'], totalStudents: 200 },
  SU3: { towns: ['TOWNC', 'TOWND'], totalStudents: 70 },
};

const allDistrictStats: AllDistrictStats = {
  1: { townCount: 2, studentTotal: 200, totalGL: 2_000_000, totalPublicSchools: 2, towns: ['TOWNA', 'TOWNB'] },
  2: { townCount: 1, studentTotal: 50, totalGL: 500_000, totalPublicSchools: 1, towns: ['TOWNC'] },
  3: { townCount: 0, studentTotal: 0, totalGL: 0, totalPublicSchools: 0, towns: [] },
};

const schoolDetails: SchoolDetailsByTown = {
  TOWNA: [{ NAME: 'A Elementary', Grades: 'K-6', ENROLLMENT: 100, TOWN: 'TOWNA', Type: 'Elementary', fciCategory: '<10%', PCB_Cat: 'Above SAL' }],
  TOWNC: [{ NAME: 'C School', Grades: '7-12', ENROLLMENT: 600, TOWN: 'TOWNC', Type: 'Secondary', fciCategory: '>65%' }],
};

const independentSchoolDetails: SchoolDetailsByTown = {
  TOWNB: [{ NAME: 'B Independent', Grades: 'K-8', ENROLLMENT: 50, TOWN: 'TOWNB', Type: 'Elementary' }],
};

describe('buildReportData', () => {
  const report = buildReportData({
    districtOrder, allDistrictStats, districtNames, townData, schoolDetails, independentSchoolDetails, assignments, supervisoryUnions,
  });

  it('filters out districts with no assigned towns', () => {
    expect(report).toHaveLength(2);
    expect(report.map(d => d.name)).toEqual(['North', 'South']);
  });

  it('sums ADM and Grand List totals per district, and assigns the matching color', () => {
    const north = report.find(d => d.name === 'North')!;
    expect(north.adm).toBe(200);
    expect(north.grandList).toBe(2_000_000);
    expect(north.homeEEdGL).toBe(1_200_000);
    expect(north.nonHomeEEdGL).toBe(800_000);
    expect(north.totalEEdGL).toBe(2_000_000);
    expect(north.townCount).toBe(2);
    expect(north.color).toBe(districtColors[0]);

    const south = report.find(d => d.name === 'South')!;
    expect(south.color).toBe(districtColors[1]);
  });

  it('buckets school enrollment size and FCI category correctly', () => {
    const north = report.find(d => d.name === 'North')!;
    // A Elementary: ENROLLMENT 100 -> small; fciCategory '<10%' -> good
    expect(north.enrollCategory).toEqual({ small: 1, medium: 0, large: 0 });
    expect(north.fciCounts).toEqual({ good: 1, fair: 0, poor: 0, veryPoor: 0 });
    expect(north.pcbAboveSALCount).toBe(1);
    // B Independent (in TOWNB, part of North) counts as an independent school
    expect(north.independentSchoolCount).toBe(1);
    expect(north.independentEnrollCategory).toEqual({ small: 1, medium: 0, large: 0 });

    const south = report.find(d => d.name === 'South')!;
    // C School: ENROLLMENT 600 -> large; fciCategory '>65%' -> veryPoor
    expect(south.enrollCategory).toEqual({ small: 0, medium: 0, large: 1 });
    expect(south.fciCounts).toEqual({ good: 0, fair: 0, poor: 0, veryPoor: 1 });
  });

  it('marks a supervisory union/RPC intact only when every one of its towns is in the same district', () => {
    const north = report.find(d => d.name === 'North')!;
    // SU1 = [TOWNA, TOWNB], both assigned to district 1 -> intact
    expect(north.suStatus).toEqual({ intact: ['SU1'], divided: [] });
    // RPC1 = [TOWNA, TOWNB], both assigned to district 1 -> intact
    expect(north.rpcStatus).toEqual({ intact: ['RPC1'], divided: [] });

    const south = report.find(d => d.name === 'South')!;
    // SU3 = [TOWNC, TOWND]; TOWND is unassigned, so SU3 is divided relative to district 2
    expect(south.suStatus).toEqual({ intact: [], divided: ['SU3'] });
    // RPC2 = [TOWNC, TOWND]; same story
    expect(south.rpcStatus).toEqual({ intact: [], divided: ['RPC2'] });
  });

  it('builds a 10-year enrollment history entry per district, defaulting missing years to 0', () => {
    const north = report.find(d => d.name === 'North')!;
    expect(north.enrollmentHistory).toHaveLength(10);
    expect(north.enrollmentHistory.map(e => e.year)).toEqual(
      ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024']
    );
    // No Y15..Y23 fields were set on the fixture towns, so only the 2024 (Public_School_Students) total is non-zero.
    expect(north.enrollmentHistory.find(e => e.year === '2024')?.enrollment).toBe(200);
    expect(north.enrollmentHistory.find(e => e.year === '2015')?.enrollment).toBe(0);
  });
});
