import { Feature, Geometry, FeatureCollection } from 'geojson';

export enum Tab {
  About = 'About',
  SupervisoryUnions = 'SupervisoryUnions'
}

export interface TownProperties {
  TOWNNAME: string;
  County: string;
  Supervisory_Union: string;
  Public_School_Students: number;
  Total_E_Ed_GL: number;
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