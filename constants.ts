
export const GEOJSON_URL = 'https://s3.us-east-2.amazonaws.com/vtopendata-prd/_Other/Education/VT_School_Geo.json';

export const PROPERTY_KEYS = {
  TOWN_ID: 'TOWNNAME',
  STUDENT_COUNT: 'Public_School_Students',
  SU: 'Supervisory_Union',
  GL: 'Total_E_Ed_GL',
  SCHOOLS: 'Public_Schools',
};

export const MAX_DISTRICTS = 20;
export const INITIAL_DISTRICTS = 10;

export const districtColors = [
    '#98D8C8', '#83B0E1', '#9A3E48', '#E0AC9D', '#C94C4C', 
    '#5B9AA0', '#F0C987', '#7E8A97', '#3D5A80', '#A2A2A2',
    '#2F4550', '#B4A29E', '#5E4B56', '#A37774', '#6A0DAD',
    '#FFD700', '#FF69B4', '#00FFFF', '#7CFC00', '#FF4500'
];

export const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
