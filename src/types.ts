// src/types.ts
import type { Feature, Geometry, FeatureCollection } from 'geojson';

export enum Tab {
  About = 'About',
  SupervisoryUnions = 'SupervisoryUnions'
}

export interface TownProperties {
  TOWNNAME: string;
  County: string;
  Supervisory_Union: string;
  Public_School_Students: number;
  Total_E_Ed_GL_Act73: number;
  Public_Schools: number;
  SqMi: number;
  OBJECTID: number;
  [key: string]: any;
}

export type TownFeature = Feature<Geometry, TownProperties>;
export type TownGeoJSON = FeatureCollection<Geometry, TownProperties>;

export interface TownData {
  [townName: string]: TownProperties;
}

export interface Assignments {
  [townName: string]: number | null;
}

export interface DistrictNames {
    [key: number]: string;
}

export interface SupervisoryUnion {
  towns: string[];
  totalStudents: number;
}

export interface SupervisoryUnions {
  [suName: string]: SupervisoryUnion;
}

export interface DistrictStats {
  townCount: number;
  studentTotal: number;
  totalGL: number;
  totalPublicSchools: number;
  towns: string[];
}

export interface AllDistrictStats {
  [districtId: number]: DistrictStats;
}

export interface SchoolDetail {
  NAME: string;
  Grades: string;
  ENROLLMENT: number;
  TOWN: string;
  Type: string;
  accessType?: 'Public' | 'Independent'; // Added for clarity
  longitude?: number; // Added for map points
  latitude?: number; // Added for map points
  yearBuilt?: number;
  fciCategory?: string;
  enrollYear?: string;
  Notes?: string;
  PCB_Cat?: string;
  '2014Enroll'?: number;
  '2015Enroll'?: number;
  '2016Enroll'?: number;
  '2017Enroll'?: number;
  '2018Enroll'?: number;
  '2019Enroll'?: number;
  '2020Enroll'?: number;
  '2021Enroll'?: number;
  '2022Enroll'?: number;
}

export interface SchoolDetailsByTown {
    [townName: string]: SchoolDetail[];
}

export interface SchoolPointProperties {
  School: string;
  Grades: string;
  Enrollment: number | null;
  town: string;
  Type: string;
  accessType: 'Public' | 'Independent';
  longitude: number;
  latitude: number;
  [key: string]: any;
}

export type SchoolPointFeature = Feature<Geometry | null, SchoolPointProperties>;

export interface SchoolTypeFilters {
  [key: string]: boolean;
}

export interface ReportData {
  id: string;
  name: string;
  color: string;
  adm: number;
  grandList: number;
  homeEEdGL: number;
  nonHomeEEdGL: number;
  totalEEdGL: number;
  townCount: number;
  enrollmentHistory: { year: string; enrollment: number; }[];
  enrollCategory: { small: number; medium: number; large: number; };
  independentEnrollCategory: { small: number; medium: number; large: number; };
  independentSchoolCount: number;
  pcbAboveSALCount: number;
  fciCounts: { good: number; fair: number; poor: number; veryPoor: number; };
  townsWithAdm: { name: string; adm: number; county: string; totalEEdGL: number; Home_E_Ed_GL_Act73: number; NonHome_E_Ed_GL_Act73: number; SqMi: number; }[];
  publicSchools: (SchoolDetail & { id: string; fciCategory?: string })[];
  independentSchools: (SchoolDetail & { id: string; })[];
  suStatus: { intact: string[], divided: string[] };
  rpcStatus: { intact: string[], divided: string[] };
}
