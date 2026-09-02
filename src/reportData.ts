// src/reportData.ts
// Pure aggregation of per-district stats into the ReportData shape consumed by ReportComponent.
// Extracted from App.tsx's handleGenerateReport so the math (ADM/Grand List totals, FCI/enrollment
// bucketing, SU/RPC intact-vs-divided status) can be unit tested independently of React state.
import {
  AllDistrictStats, Assignments, DistrictNames, ReportData, SchoolDetailsByTown, SupervisoryUnions, TownData, TownProperties,
} from './types';
import { districtColors } from './constants';

export interface BuildReportDataParams {
  districtOrder: number[];
  allDistrictStats: AllDistrictStats;
  districtNames: DistrictNames;
  townData: TownData;
  schoolDetails: SchoolDetailsByTown;
  independentSchoolDetails: SchoolDetailsByTown;
  assignments: Assignments;
  supervisoryUnions: SupervisoryUnions;
}

export const buildReportData = ({
  districtOrder, allDistrictStats, districtNames, townData, schoolDetails, independentSchoolDetails, assignments, supervisoryUnions,
}: BuildReportDataParams): ReportData[] => {
  return districtOrder
    .map(id => {
      const stats = allDistrictStats[id];
      if (!stats || stats.townCount === 0) return null;

      const districtName = districtNames[id] || `District ${id}`;

      const townsWithAdm = stats.towns.map(townName => {
        const townProps = townData[townName];
        return {
          name: townName,
          adm: townProps?.['Public_School_Students'] || 0,
          county: townProps?.County || 'N/A',
          totalEEdGL: townProps?.Total_E_Ed_GL_Act73 || 0,
          Home_E_Ed_GL_Act73: townProps?.Home_E_Ed_GL_Act73 || 0,
          NonHome_E_Ed_GL_Act73: townProps?.NonHome_E_Ed_GL_Act73 || 0,
          SqMi: townProps?.SqMi || 0,
        };
      });

      const publicSchoolsInDistrict = stats.towns.flatMap(townName => schoolDetails[townName.toUpperCase()] || []);
      const independentSchoolsInDistrict = stats.towns.flatMap(townName => independentSchoolDetails[townName.toUpperCase()] || []);

      const enrollmentHistory: { year: string; enrollment: number }[] = [];
      const years = ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'];
      const yearKeys: (keyof TownProperties)[] = ['Y15', 'Y16', 'Y17', 'Y18', 'Y19', 'Y20', 'Y21', 'Y22', 'Y23', 'Public_School_Students'];
      const yearlyTotals: { [year: string]: number } = {};

      stats.towns.forEach(townName => {
        const townProps = townData[townName];
        if (townProps) {
          yearKeys.forEach((key, index) => {
            const year = years[index];
            if (!yearlyTotals[year]) {
              yearlyTotals[year] = 0;
            }
            const enrollmentValue = townProps[key];
            if (typeof enrollmentValue === 'number') {
              yearlyTotals[year] += enrollmentValue;
            }
          });
        }
      });

      for (const year of years) {
        enrollmentHistory.push({ year: year, enrollment: yearlyTotals[year] || 0 });
      }

      const enrollCategory = { small: 0, medium: 0, large: 0 };
      publicSchoolsInDistrict.forEach(school => {
        if (school.ENROLLMENT < 150) enrollCategory.small++;
        else if (school.ENROLLMENT < 500) enrollCategory.medium++;
        else enrollCategory.large++;
      });

      const independentEnrollCategory = { small: 0, medium: 0, large: 0 };
      independentSchoolsInDistrict.forEach(school => {
        if (school.ENROLLMENT < 150) independentEnrollCategory.small++;
        else if (school.ENROLLMENT < 500) independentEnrollCategory.medium++;
        else independentEnrollCategory.large++;
      });

      const pcbAboveSALCount = publicSchoolsInDistrict.filter(s => s.PCB_Cat === 'Above SAL').length;

      const fciCounts = { good: 0, fair: 0, poor: 0, veryPoor: 0 };
      publicSchoolsInDistrict.forEach(school => {
        switch (school.fciCategory) {
          case '<10%': fciCounts.good++; break;
          case '10.01-30%': fciCounts.fair++; break;
          case '30.01-65%': fciCounts.poor++; break;
          case '>65%': fciCounts.veryPoor++; break;
          default: break;
        }
      });

      const { homeEEdGL, nonHomeEEdGL, totalEEdGL } = stats.towns.reduce((acc, townName) => {
        const townProps = townData[townName];
        acc.homeEEdGL += townProps?.Home_E_Ed_GL_Act73 || 0;
        acc.nonHomeEEdGL += townProps?.NonHome_E_Ed_GL_Act73 || 0;
        acc.totalEEdGL += townProps?.Total_E_Ed_GL_Act73 || 0;
        return acc;
      }, { homeEEdGL: 0, nonHomeEEdGL: 0, totalEEdGL: 0 });

      const suStatus = { intact: [] as string[], divided: [] as string[] };
      const rpcStatus = { intact: [] as string[], divided: [] as string[] };

      const districtSUs = [...new Set(stats.towns.map(t => townData[t].Supervisory_Union))];
      districtSUs.forEach(su => {
        const allTownsInSU = supervisoryUnions[su]?.towns || [];
        const isIntact = allTownsInSU.every(t => assignments[t] === id);
        if (isIntact) suStatus.intact.push(su); else suStatus.divided.push(su);
      });

      const districtRPCs = [...new Set(stats.towns.map(t => townData[t].RPC))];
      const allTownsByRPC: { [key: string]: string[] } = {};
      Object.values(townData).forEach(t => {
        if (!allTownsByRPC[t.RPC]) allTownsByRPC[t.RPC] = [];
        allTownsByRPC[t.RPC].push(t.TOWNNAME);
      });

      districtRPCs.forEach(rpc => {
        const allTownsInRPC = allTownsByRPC[rpc] || [];
        const isIntact = allTownsInRPC.every(t => assignments[t] === id);
        if (isIntact) rpcStatus.intact.push(rpc); else rpcStatus.divided.push(rpc);
      });

      return {
        id: `dist_${id}`, name: districtName, color: districtColors[id - 1], adm: stats.studentTotal,
        grandList: stats.totalGL, homeEEdGL, nonHomeEEdGL, totalEEdGL, townCount: stats.townCount,
        enrollmentHistory,
        enrollCategory, independentEnrollCategory, independentSchoolCount: independentSchoolsInDistrict.length,
        pcbAboveSALCount, fciCounts, townsWithAdm,
        publicSchools: publicSchoolsInDistrict.map(school => ({ ...school, id: `sch_pub_${school.NAME.replace(/\s+/g, '_')}_${Math.random()}` })),
        independentSchools: independentSchoolsInDistrict.map(school => ({ ...school, id: `sch_ind_${school.NAME.replace(/\s+/g, '_')}_${Math.random()}` })),
        suStatus, rpcStatus,
      };
    })
    .filter((d): d is ReportData => d !== null);
};
