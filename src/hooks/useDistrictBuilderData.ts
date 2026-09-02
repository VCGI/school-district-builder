// src/hooks/useDistrictBuilderData.ts
// Owns the one-shot mount-time fetch of town/school reference data from the S3 GeoJSON sources
// (see GEOJSON_URL/SCHOOLS_URL in constants.ts) and derives the town/SU/school lookups the rest
// of the app reads from. Extracted from App.tsx so the fetch effect no longer forward-references
// consts declared later in the component (loadStateFromURL, showNotification) -- callers are
// notified via onLoaded/onError instead.
import { useEffect, useState } from 'react';
import { GEOJSON_URL, SCHOOLS_URL, PROPERTY_KEYS } from '../constants';
import type {
  Assignments, SchoolDetail, SchoolDetailsByTown, SchoolPointFeature, SupervisoryUnions, TownData, TownGeoJSON,
} from '../types';

export interface DistrictBuilderData {
  townData: TownData;
  townGeoJSON: TownGeoJSON | null;
  supervisoryUnions: SupervisoryUnions;
  schoolDetails: SchoolDetailsByTown;
  independentSchoolDetails: SchoolDetailsByTown;
  schoolsData: SchoolPointFeature[];
}

export interface UseDistrictBuilderDataParams {
  onLoaded: (townData: TownData, assignments: Assignments) => void;
  onError: (message: string) => void;
}

export const useDistrictBuilderData = ({ onLoaded, onError }: UseDistrictBuilderDataParams): DistrictBuilderData => {
  const [townData, setTownData] = useState<TownData>({});
  const [townGeoJSON, setTownGeoJSON] = useState<TownGeoJSON | null>(null);
  const [supervisoryUnions, setSupervisoryUnions] = useState<SupervisoryUnions>({});
  const [schoolDetails, setSchoolDetails] = useState<SchoolDetailsByTown>({});
  const [independentSchoolDetails, setIndependentSchoolDetails] = useState<SchoolDetailsByTown>({});
  const [schoolsData, setSchoolsData] = useState<SchoolPointFeature[]>([]);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [geojsonResponse, schoolsResponse] = await Promise.all([
            fetch(`${GEOJSON_URL}?_=${new Date().getTime()}`),
            fetch(SCHOOLS_URL)
        ]);

        if (!geojsonResponse.ok || !schoolsResponse.ok) {
            throw new Error('Network response was not ok for one or more data files.');
        }

        const geojsonData: TownGeoJSON = await geojsonResponse.json();
        const schoolsDataResponse = await schoolsResponse.json();

        const newTownData: TownData = {};
        const newAssignments: Assignments = {};
        const newSUs: SupervisoryUnions = {};

        geojsonData.features.forEach(feature => {
            const props = feature.properties;
            const townId = props[PROPERTY_KEYS.TOWN_ID];
            const suName = props[PROPERTY_KEYS.SU] || 'Uncategorized';
            const studentCount = props[PROPERTY_KEYS.STUDENT_COUNT] || 0;
            newTownData[townId] = props;
            newAssignments[townId] = null;

            if (!newSUs[suName]) {
                newSUs[suName] = { towns: [], totalStudents: 0 };
            }
            newSUs[suName].towns.push(townId);
            newSUs[suName].totalStudents += studentCount;
        });

        setTownData(newTownData);
        setSupervisoryUnions(newSUs);
        setTownGeoJSON(geojsonData);

        const newSchoolPoints: SchoolPointFeature[] = schoolsDataResponse.features
          .filter((f: any) => f.geometry && f.geometry.coordinates && f.geometry.coordinates.length === 2)
          .map((feature: any) => {
            const [longitude, latitude] = feature.geometry.coordinates;
            return {
              type: 'Feature',
              geometry: feature.geometry,
              properties: {
                ...feature.properties,
                longitude,
                latitude,
              },
            };
          });
        setSchoolsData(newSchoolPoints);

        const newSchoolDetails: SchoolDetailsByTown = {};
        const newIndependentSchoolDetails: SchoolDetailsByTown = {};

        schoolsDataResponse.features.forEach((schoolFeature: any) => {
            const attrs = schoolFeature.properties;
            const townName = attrs.town?.toUpperCase();

            if (townName) {
                const schoolDetail: SchoolDetail = {
                    NAME: attrs.School, Grades: attrs.Grades, ENROLLMENT: attrs.Enrollment || 0,
                    TOWN: attrs.town, Type: attrs.Type, yearBuilt: attrs.yearBuilt,
                    fciCategory: attrs.fciCategory, enrollYear: attrs.enrollYear, PCB_Cat: attrs.PCB_Cat,
                    '2014Enroll': attrs['2014Enroll'], '2015Enroll': attrs['2015Enroll'],
                    '2016Enroll': attrs['2016Enroll'], '2017Enroll': attrs['2017Enroll'],
                    '2018Enroll': attrs['2018Enroll'], '2019Enroll': attrs['2019Enroll'],
                    '2020Enroll': attrs['2020Enroll'], '2021Enroll': attrs['2021Enroll'],
                    '2022Enroll': attrs['2022Enroll'],
                    '2023Enroll': attrs['2023Enroll'],
                    GradesList: attrs.GradesList,
                    PK_Adult_2024Enroll: attrs.PK_Adult_2024Enroll,
                    accessType: attrs.accessType,
                    latitude: schoolFeature.geometry?.coordinates[1],
                    longitude: schoolFeature.geometry?.coordinates[0]
                };

                if (attrs.accessType === 'Public') {
                    if (!newSchoolDetails[townName]) newSchoolDetails[townName] = [];
                    newSchoolDetails[townName].push(schoolDetail);
                } else if (attrs.accessType === 'Independent' && attrs.Notes === 'Approved - Eligible for Public Funding') {
                    if (!newIndependentSchoolDetails[townName]) newIndependentSchoolDetails[townName] = [];
                    newIndependentSchoolDetails[townName].push(schoolDetail);
                }
            }
        });
        setSchoolDetails(newSchoolDetails);
        setIndependentSchoolDetails(newIndependentSchoolDetails);

        onLoaded(newTownData, newAssignments);

      } catch (error) {
        console.error('Error loading or processing application data:', error);
        onError('Failed to load map data. Please try again later.');
      }
    };

    loadAllData();
    // Intentionally runs once on mount; onLoaded/onError are read at call time via closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { townData, townGeoJSON, supervisoryUnions, schoolDetails, independentSchoolDetails, schoolsData };
};
