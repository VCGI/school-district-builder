// src/App.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import pako from 'pako';
import html2canvas from 'html2canvas';
import 'leaflet/dist/leaflet.css';
import {
  Tab, TownData, Assignments, SupervisoryUnions, TownGeoJSON, AllDistrictStats, DistrictNames, SchoolDetailsByTown, ReportData, SchoolDetail, SchoolPointFeature, SchoolTypeFilters
} from './types';
import {
  GEOJSON_URL, SCHOOLS_URL, PROPERTY_KEYS, MAX_DISTRICTS, INITIAL_DISTRICTS, districtColors, BASE62_CHARS, SCHOOL_TYPE_COLORS
} from './constants';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import MapComponent from './components/MapComponent';
import ReportComponent from './components/ReportComponent';
import HelpModal from './components/HelpModal';
import SplashScreen from './components/SplashScreen';
import type { Map } from 'leaflet';

const DISCLAIMER_VERSION = '1.0'; // Version for the disclaimer acknowledgment

// Utility Functions for URL State
const toBase62 = (num: number) => {
    if (num === 0) return '0';
    let s = '';
    while (num > 0) { s = BASE62_CHARS[num % 62] + s; num = Math.floor(num / 62); }
    return s;
};
const fromBase62 = (str: string) => {
    let num = 0;
    for (let i = 0; i < str.length; i++) { num = num * 62 + BASE62_CHARS.indexOf(str[i]); }
    return num;
};

const initializeDistrictNames = (order: number[], values?: (string | null)[]) => {
    const initialNames: DistrictNames = {};
    order.forEach((id, index) => {
        initialNames[id] = values && values[index] ? values[index]! : `District ${id}`;
    });
    return initialNames;
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'map' | 'report'>('map');
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [unassignedTownsCount, setUnassignedTownsCount] = useState<number>(0);

  const [townData, setTownData] = useState<TownData>({});
  const [townGeoJSON, setTownGeoJSON] = useState<TownGeoJSON | null>(null);
  const [assignments, setAssignments] = useState<Assignments>({});
  const [districtNames, setDistrictNames] = useState<DistrictNames>({});
  const [supervisoryUnions, setSupervisoryUnions] = useState<SupervisoryUnions>({});
  const [schoolDetails, setSchoolDetails] = useState<SchoolDetailsByTown>({});
  const [independentSchoolDetails, setIndependentSchoolDetails] = useState<SchoolDetailsByTown>({});
  const [districtOrder, setDistrictOrder] = useState<number[]>(() => Array.from({ length: INITIAL_DISTRICTS }, (_, i) => i + 1));
  const [schoolsData, setSchoolsData] = useState<SchoolPointFeature[]>([]);
  const [showSchools, setShowSchools] = useState<boolean>(false);
  const [schoolTypeFilters, setSchoolTypeFilters] = useState<SchoolTypeFilters>(
    Object.keys(SCHOOL_TYPE_COLORS).reduce((acc, key) => ({ ...acc, [key]: true }), {})
  );

  const [activeDistrict, setActiveDistrict] = useState<number>(1);
  const [mapName, setMapName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<Tab>(Tab.About);
  const [hoveredDistrict, setHoveredDistrict] = useState<number | null>(null);
  const [hoveredSU, setHoveredSU] = useState<string | null>(null);
  const [isExportShareModalOpen, setExportShareModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; isError: boolean } | null>(null);
  const [districtToDelete, setDistrictToDelete] = useState<number | null>(null);
  const [draggedDistrict, setDraggedDistrict] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [isLeftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [isHelpModalOpen, setHelpModalOpen] = useState<boolean>(false);
  const [showSplashScreen, setShowSplashScreen] = useState<boolean>(
    localStorage.getItem('disclaimerAcknowledged') !== DISCLAIMER_VERSION
  );
  const mapRef = useRef<Map | null>(null);

  const modalRoot = document.getElementById('modal-root');

  const handleSchoolFilterChange = (schoolType: string) => {
    setSchoolTypeFilters(prev => ({
      ...prev,
      [schoolType]: !prev[schoolType]
    }));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 300);
    return () => clearTimeout(timer);
  }, [isLeftSidebarCollapsed]);

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
        
        loadStateFromURL(newTownData, newAssignments);

      } catch (error) {
        console.error('Error loading or processing application data:', error);
        showNotification('Failed to load map data. Please try again later.', true);
      }
    };
    
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const allDistrictStats = useMemo<AllDistrictStats>(() => {
      const stats: AllDistrictStats = {};
      districtOrder.forEach(id => {
        stats[id] = { townCount: 0, studentTotal: 0, totalGL: 0, totalPublicSchools: 0, towns: [] };
      });

      for (const townId in assignments) {
          const districtId = assignments[townId];
          if (districtId && stats[districtId]) {
              const townProps = townData[townId];
              stats[districtId].townCount++;
              stats[districtId].studentTotal += (townProps[PROPERTY_KEYS.STUDENT_COUNT] || 0);
              stats[districtId].totalGL += (townProps[PROPERTY_KEYS.GL] || 0);
              stats[districtId].totalPublicSchools += (townProps[PROPERTY_KEYS.SCHOOLS] || 0);
              stats[districtId].towns.push(townId);
          }
      }
      return stats;
  }, [assignments, townData, districtOrder]);

  const sortedSUs = useMemo(() => Object.keys(supervisoryUnions).sort(), [supervisoryUnions]);

  const handleAcknowledgeSplash = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      localStorage.setItem('disclaimerAcknowledged', DISCLAIMER_VERSION);
    }
    setShowSplashScreen(false);
  };
  
  const handleTownClick = useCallback((townId: string) => {
    setAssignments(prev => ({
      ...prev,
      [townId]: prev[townId] === activeDistrict ? null : activeDistrict
    }));
  }, [activeDistrict]);

  const handleSUClick = useCallback((suName: string) => {
    const su = supervisoryUnions[suName];
    if (!su) return;
    
    setAssignments(prev => {
      const newAssignments = { ...prev };
      const townsInSU = su.towns;
      const allAssigned = townsInSU.every(townId => newAssignments[townId] === activeDistrict);
      const targetDistrict = allAssigned ? null : activeDistrict;
      townsInSU.forEach(townId => { newAssignments[townId] = targetDistrict; });
      return newAssignments;
    });
  }, [activeDistrict, supervisoryUnions]);

  const addDistrict = useCallback(() => {
    if (districtOrder.length >= MAX_DISTRICTS) return;

    let newDistrictId = 1;
    const sortedOrder = [...districtOrder].sort((a,b)=>a-b);
    for (const id of sortedOrder) {
        if (id === newDistrictId) {
            newDistrictId++;
        } else {
            break;
        }
    }
    
    if (newDistrictId <= MAX_DISTRICTS) {
        setDistrictOrder(prev => [...prev, newDistrictId]);
        setDistrictNames(prev => ({...prev, [newDistrictId]: `District ${newDistrictId}`}));
    }
  }, [districtOrder]);


  const handleDistrictNameChange = (id: number, name: string) => {
    setDistrictNames(prev => ({ ...prev, [id]: name }));
  };

  const resetApplication = useCallback(() => {
    setAssignments(prev => {
      const reset = { ...prev };
      Object.keys(reset).forEach(key => { reset[key] = null; });
      return reset;
    });
    const initialOrder = Array.from({ length: INITIAL_DISTRICTS }, (_, i) => i + 1);
    setDistrictOrder(initialOrder);
    setDistrictNames(initializeDistrictNames(initialOrder));
    setActiveDistrict(1);
    setMapName('');
    const url = new URL(window.location.toString());
    url.searchParams.delete('data');
    window.history.pushState({}, '', url);
  }, []);

  const handlePresetChange = useCallback((field: string) => {
    const presetSelector = document.getElementById('preset-selector') as HTMLSelectElement;
    if (presetSelector) {
        presetSelector.value = field;
    }

    if (field === 'blank') {
      resetApplication();
      return;
    }

    const rpcMapping: { [key: string]: string } = {
      "AC": "Addison County RPC", "BC": "Bennington County RC", "CV": "Central Vermont RPC",
      "CC": "Chittenden County RPC", "NW": "Northwest RPC", "LC": "Lamoille County PC",
      "NV": "Northeastern Vermont Dev. Assoc.", "RR": "Rutland RPC", "MA": "Mount Ascutney RC",
      "TR": "Two Rivers-Ottauquechee RC", "WR": "Windham RC"
    };

    let uniqueValues = [...new Set(Object.values(townData).map(town => town[field]))].sort();
    
    if (field === 'RPC') {
        uniqueValues = uniqueValues.map(val => rpcMapping[val] || val);
    }
    
    const valueToDistrictIdMap: { [key: string]: number } = {};
    const newOrder = uniqueValues.slice(0, MAX_DISTRICTS).map((_, index) => index + 1);
    
    uniqueValues.forEach((value, index) => {
      if (index < MAX_DISTRICTS) {
        valueToDistrictIdMap[value] = index + 1;
      }
    });

    setDistrictOrder(newOrder);
    setAssignments(() => {
      const newAssignments: Assignments = {};
      for (const townId in townData) {
        let value = townData[townId][field];
        if (field === 'RPC') {
          value = rpcMapping[value] || value;
        }
        newAssignments[townId] = valueToDistrictIdMap[value] || null;
      }
      return newAssignments;
    });
    setDistrictNames(initializeDistrictNames(newOrder, uniqueValues as (string | null)[]));
  }, [townData, resetApplication]);

  const confirmDeleteDistrict = useCallback(() => {
    if (districtToDelete === null) return;
    
    const idToDelete = districtToDelete;

    setAssignments(prev => {
        const newAssignments = { ...prev };
        Object.keys(newAssignments).forEach(townId => {
            if (newAssignments[townId] === idToDelete) {
                newAssignments[townId] = null;
            }
        });
        return newAssignments;
    });

    const newOrder = districtOrder.filter(id => id !== idToDelete);
    setDistrictOrder(newOrder);
    setDistrictNames(prev => {
      const newNames = {...prev};
      delete newNames[idToDelete];
      return newNames;
    });
    
    if (activeDistrict === idToDelete) {
        setActiveDistrict(newOrder[0] || 1);
    }
    
    setDistrictToDelete(null);
    showNotification(`District ${districtNames[idToDelete] || `District ${idToDelete}`} was removed.`, false);

  }, [districtToDelete, activeDistrict, districtOrder, districtNames]);

  const handleDistrictDragStart = (id: number) => {
    setDraggedDistrict(id);
  };

  const handleDropInZone = (targetIndex: number) => {
    if (draggedDistrict === null) return;

    const currentOrder = [...districtOrder];
    const fromIndex = currentOrder.indexOf(draggedDistrict);
    if (fromIndex === -1) return;

    const [draggedItem] = currentOrder.splice(fromIndex, 1);
    
    const finalIndex = targetIndex > fromIndex ? targetIndex - 1 : targetIndex;

    currentOrder.splice(finalIndex, 0, draggedItem);

    setDistrictOrder(currentOrder);
    setDraggedDistrict(null);
    setDropIndex(null);
  };


  const handleDistrictDragEnd = () => {
    setDraggedDistrict(null);
    setDropIndex(null);
  }

  const showNotification = (message: string, isError: boolean = false) => {
    setNotification({ message, isError });
    setTimeout(() => setNotification(null), 3000);
  };

  const generateShareableString = useCallback(() => {
    const version = 'V8';
    const separator = '|';
    
    const orderedDistrictData = districtOrder.map(id => {
      const towns = Object.entries(assignments)
        .filter(([, districtId]) => districtId === id)
        .map(([townName]) => townData[townName]?.OBJECTID)
        .filter(objId => objId !== undefined)
        .sort((a,b) => a-b);
      
      const districtName = districtNames[id] || `District ${id}`;
      return { id, name: districtName, towns };
    });

    const districtStrings = orderedDistrictData.map(dist => {
      const rleRuns = [];
      if (dist.towns.length > 0) {
          let startId = dist.towns[0], endId = dist.towns[0];
          for (let i = 1; i < dist.towns.length; i++) {
              if (dist.towns[i] === endId + 1) {
                  endId = dist.towns[i];
              } else {
                  rleRuns.push(startId === endId ? toBase62(startId) : `${toBase62(startId)}~${toBase62(endId - startId)}`);
                  startId = endId = dist.towns[i];
              }
          }
          rleRuns.push(startId === endId ? toBase62(startId) : `${toBase62(startId)}~${toBase62(endId - startId)}`);
      }
      return `${toBase62(dist.id)},${encodeURIComponent(dist.name)},${rleRuns.join('.')}`;
    }).join(';');

    const payloadParts = [version, encodeURIComponent(mapName), districtStrings];
    const payloadString = payloadParts.join(separator);

    const compressed = pako.deflate(payloadString, { level: 9 });
    let binaryString = '';
    for (let i = 0; i < compressed.length; i++) {
        binaryString += String.fromCharCode(compressed[i]);
    }
    return btoa(binaryString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }, [assignments, districtOrder, mapName, townData, districtNames]);

  const loadStateFromURL = (currentTownData: TownData, currentAssignments: Assignments) => {
    const params = new URLSearchParams(window.location.search);
    const data = params.get('data');
    if (!data) {
      setDistrictNames(initializeDistrictNames(districtOrder));
      return;
    }

    try {
        const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
        const binaryString = atob(base64);
        const compressed = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) compressed[i] = binaryString.charCodeAt(i);
        
        const decodedString = pako.inflate(compressed, { to: 'string' });
        
        const objectIdToTownIdMap: { [key: number]: string } = {};
        for (const townId in currentTownData) objectIdToTownIdMap[currentTownData[townId].OBJECTID] = townId;
        
        const parts = decodedString.split('|');
        const version = parts[0];

        if (version === 'V8') {
            const loadedMapName = decodeURIComponent(parts[1] || '');
            const districtDataStr = parts[2] || '';
            const newOrder: number[] = [];
            const newNames: DistrictNames = {};
            const newAssignments = { ...currentAssignments };
            Object.keys(newAssignments).forEach(key => newAssignments[key] = null);

            if (districtDataStr) {
              districtDataStr.split(';').forEach(entry => {
                const [idStr, nameStr, townsStr] = entry.split(',');
                const districtId = fromBase62(idStr);
                const districtName = decodeURIComponent(nameStr);
                
                newOrder.push(districtId);
                newNames[districtId] = districtName;

                if (townsStr) {
                  townsStr.split('.').forEach(run => {
                    if (run.includes('~')) {
                      const [startIdStr, runLengthStr] = run.split('~');
                      const startId = fromBase62(startIdStr);
                      const runLength = fromBase62(runLengthStr);
                      for (let i = 0; i <= runLength; i++) {
                          const townId = objectIdToTownIdMap[startId + i];
                          if (townId) newAssignments[townId] = districtId;
                      }
                    } else {
                        const objId = fromBase62(run);
                        const townId = objectIdToTownIdMap[objId];
                        if (townId) newAssignments[townId] = districtId;
                    }
                  });
                }
              });
            }
            setDistrictOrder(newOrder);
            setDistrictNames(newNames);
            setAssignments(newAssignments);
            setMapName(loadedMapName);

        } else { // Fallback for old V7 URLs
            const numDistricts = fromBase62(parts[1]);
            const assignmentsString = parts[2] || '';
            const loadedMapName = decodeURIComponent(parts[3] || '');
            const districtNamesStr = parts[4] || '';
            
            const newOrder = Array.from({length: numDistricts}, (_,i) => i + 1);
            const loadedNames = initializeDistrictNames(newOrder);

            setDistrictOrder(newOrder);
            setMapName(loadedMapName);

            if (districtNamesStr) {
                const decodedNames = districtNamesStr.split(';');
                decodedNames.forEach((name, index) => {
                    if(index < newOrder.length) {
                        loadedNames[newOrder[index]] = decodeURIComponent(name);
                    }
                });
            }
            setDistrictNames(loadedNames);

            const newAssignments = { ...currentAssignments };
            if (assignmentsString) {
                for (const entry of assignmentsString.split(';')) {
                    if (!entry) continue;
                    const [districtIdStr, runsStr] = entry.split(':');
                    const districtId = fromBase62(districtIdStr);
                    if (!districtId || !runsStr) continue;
                    
                    for (const run of runsStr.split(',')) {
                        if (run.includes('~')) {
                            const [startIdStr, runLengthStr] = run.split('~');
                            const startId = fromBase62(startIdStr);
                            const runLength = fromBase62(runLengthStr);
                            for (let i = 0; i <= runLength; i++) {
                                const townId = objectIdToTownIdMap[startId + i];
                                if (townId) newAssignments[townId] = districtId;
                            }
                        } else {
                            const objId = fromBase62(run);
                            const townId = objectIdToTownIdMap[objId];
                            if (townId) newAssignments[townId] = districtId;
                        }
                    }
                }
            }
            setAssignments(newAssignments);
        }
    } catch (e) {
        console.error("Failed to load state from URL:", e);
        showNotification('Could not load map from URL.', true);
        const url = new URL(window.location.toString());
        url.searchParams.delete('data');
        window.history.replaceState({}, '', url);
    }
  };

  const copyShareURLToClipboard = useCallback(() => {
    const shareableString = generateShareableString();
    const url = new URL(window.location.toString());
    url.searchParams.set('data', shareableString);
    navigator.clipboard.writeText(url.href).then(() => {
        showNotification('Shareable link copied to clipboard!');
    }, () => {
        showNotification('Failed to copy link.', true);
    });
    setExportShareModalOpen(false);
  }, [generateShareableString]);

  const exportAssignmentsToCsv = useCallback(() => {
    let csvContent = "TOWNNAME,COUNTY,DISTRICT_ID,DISTRICT_NAME,PUBLIC_SCHOOL_STUDENTS,Public_Schools,Total_E_Ed_GL_Act73\r\n";
    const allTowns = Object.keys(townData).sort();
    allTowns.forEach(townId => {
        const districtId = assignments[townId];
        const townProps = townData[townId];
        const districtName = districtId ? districtNames[districtId] : 'Unassigned';
        const row = [
            `"${townProps.TOWNNAME}"`, 
            `"${townProps.County}"`, 
            districtId !== null ? districtId : '', 
            `"${districtName}"`,
            townProps[PROPERTY_KEYS.STUDENT_COUNT] || 0,
            townProps[PROPERTY_KEYS.SCHOOLS] || 0,
            townProps[PROPERTY_KEYS.GL] || 0
        ].join(',');
        csvContent += row + "\r\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    
    const safeMapName = mapName.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const date = new Date().toISOString().slice(0, 10);
    const fileName = safeMapName ? `${safeMapName}_${date}.csv` : `district_assignments_${date}.csv`;
    
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification('CSV download started.');
    setExportShareModalOpen(false);
  }, [assignments, townData, mapName, districtNames]);

  const handleGenerateReport = useCallback(() => {
    const dataForReport = districtOrder
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

          // Aggregate historical enrollment for the sparkline
          const enrollmentHistory: { year: string; enrollment: number }[] = [];
          const years = ['2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2024']; // Using 2024 for current FY25
          const yearKeys: (keyof SchoolDetail)[] = ['2014Enroll', '2015Enroll', '2016Enroll', '2017Enroll', '2018Enroll', '2019Enroll', '2020Enroll', '2021Enroll', '2022Enroll', 'ENROLLMENT'];
          const yearlyTotals: { [year: string]: number } = {};

          publicSchoolsInDistrict.forEach(school => {
              yearKeys.forEach((key, index) => {
                  const year = years[index];
                  if (!yearlyTotals[year]) {
                      yearlyTotals[year] = 0;
                  }
                  const enrollmentValue = school[key];
                  if (typeof enrollmentValue === 'number') {
                      yearlyTotals[year] += enrollmentValue;
                  }
              });
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
              enrollmentHistory, // Add the new property
              enrollCategory, independentEnrollCategory, independentSchoolCount: independentSchoolsInDistrict.length,
              pcbAboveSALCount, fciCounts, townsWithAdm,
              publicSchools: publicSchoolsInDistrict.map(school => ({ ...school, id: `sch_pub_${school.NAME.replace(/\s+/g, '_')}_${Math.random()}` })),
              independentSchools: independentSchoolsInDistrict.map(school => ({ ...school, id: `sch_ind_${school.NAME.replace(/\s+/g, '_')}_${Math.random()}` })),
              suStatus, rpcStatus,
          };
      })
      .filter((d): d is ReportData => d !== null);
    
    const unassignedTowns = Object.values(assignments).filter(d => d === null).length;
    setUnassignedTownsCount(unassignedTowns);
    setReportData(dataForReport);
    setCurrentView('report');
    setExportShareModalOpen(false);

  }, [districtOrder, allDistrictStats, districtNames, townData, schoolDetails, independentSchoolDetails, assignments, supervisoryUnions]);

  const handleExportJpg = useCallback(async () => {
      setExportShareModalOpen(false);
      showNotification('Preparing map for export...', false);
      const printContainer = document.getElementById('print-container') as HTMLElement;
      if (!printContainer || !townGeoJSON) return;

      const legendHtml = (() => {
          let legend = `<h2 style="font-size: 1.5rem; font-weight: bold; color: #003300; margin-bottom: 1rem;">${mapName || 'District Map'}</h2>`;
          legend += '<div style="display: grid; grid-template-columns: 1fr; gap: 1rem;">';
          districtOrder.forEach(id => {
              const stats = allDistrictStats[id];
              if (!stats || stats.townCount === 0) return;
              const glPerStudent = stats.studentTotal > 0 ? stats.totalGL / stats.studentTotal : 0;
              const formattedGlPerStudent = `$${Math.floor(glPerStudent).toLocaleString('en-US')}`;
              const districtName = districtNames[id] || `District ${id}`;
              legend += `
                  <div style="border: 1px solid #ddd; border-left: 5px solid ${districtColors[id-1]}; padding: 0.5rem; border-radius: 4px; background-color: #f9f9f9; font-size: 0.8rem;">
                      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.25rem;">
                          <span style="font-weight: bold; font-size: 1rem; color: ${districtColors[id-1]};">${districtName}</span>
                          <span style="font-size: 0.8rem; font-weight: 600;">${stats.studentTotal.toLocaleString()} students</span>
                      </div>
                      <div style="font-size: 0.75rem; color: #555;">
                          <div><strong>Towns:</strong> ${stats.townCount}</div>
                          <div><strong>Public Schools:</strong> ${stats.totalPublicSchools}</div>
                          <div><strong>Grand List/Student:</strong> ${formattedGlPerStudent}</div>
                      </div>
                  </div>`;
          });
          legend += '</div>';
          return legend;
      })();
      
      const printLayoutHtml = `
          <div id="print-layout" style="display: flex; width: 1500px; background: white; padding: 20px; gap: 20px; border: 1px solid #ccc;">
              <div id="print-map-instance" style="width: 1050px; height: 1400px; background: #ffffff;"></div>
              <div id="print-legend" style="width: 450px;">${legendHtml}</div>
          </div>`;

      printContainer.innerHTML = printLayoutHtml;
      printContainer.classList.remove('hidden');

      const printMap = L.map('print-map-instance', {
          attributionControl: false, zoomControl: false, preferCanvas: true
      });
      
      L.geoJSON(townGeoJSON, {
        style: (feature) => {
            const townId = (feature?.properties as any).TOWNNAME;
            const districtId = assignments[townId];
            const style: L.PathOptions = {
                fillColor: '#B0B0B0', weight: 1, opacity: 1, color: 'white', fillOpacity: 0.5
            };
            if (districtId !== null && districtId !== undefined) {
                style.fillColor = districtColors[districtId - 1];
                style.fillOpacity = 0.8;
            }
            return style;
        }
    }).addTo(printMap);
      printMap.fitBounds((L.geoJSON(townGeoJSON) as L.GeoJSON).getBounds().pad(0.05));

      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        const canvas = await html2canvas(document.getElementById('print-layout') as HTMLElement, { scale: 2, logging: false, useCORS: true, backgroundColor: '#ffffff' });
        const link = document.createElement('a');
        const safeMapName = mapName.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const date = new Date().toISOString().slice(0, 10);
        link.download = `${safeMapName || 'map_export'}_${date}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
        showNotification('Map export started.', false);
      } catch (error) {
        console.error("Export error:", error);
        showNotification('Could not generate export.', true);
      } finally {
        printMap.remove();
        printContainer.innerHTML = '';
        printContainer.classList.add('hidden');
      }
  }, [assignments, townGeoJSON, mapName, districtOrder, allDistrictStats, districtNames]);
  
  const handleFileImport = (file: File) => {
    if (!file || !file.type.match('text/csv')) {
      showNotification("Invalid file type. Please select a CSV file.", true);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target?.result as string;
      parseCSV(csvText);
    };
    reader.readAsText(file);
    setImportModalOpen(false);
  };
  
  const parseCSV = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      showNotification("CSV is empty or has only a header.", true); return;
    }
    const header = lines[0].split(',').map(h => h.trim().toUpperCase().replace(/"/g, ''));
    const townIndex = header.indexOf('TOWNNAME');
    const districtIdIndex = header.indexOf('DISTRICT_ID');
    const districtNameIndex = header.indexOf('DISTRICT_NAME');

    if (townIndex === -1 || districtIdIndex === -1) {
      showNotification("CSV must contain 'TOWNNAME' and 'DISTRICT_ID' columns.", true); return;
    }
    
    let importedCount = 0;
    const newAssignments = { ...assignments };
    Object.keys(newAssignments).forEach(key => { newAssignments[key] = null; });
    const newDistrictNames: DistrictNames = {};
    const newDistrictOrder: number[] = [];
    const districtNameMap: { [id: number]: string } = {};

    lines.slice(1).forEach(line => {
        const data = line.split(',');
        const townName = data[townIndex]?.replace(/"/g, '').trim();
        const districtIdStr = data[districtIdIndex]?.replace(/"/g, '').trim();
        const districtId = districtIdStr ? parseInt(districtIdStr, 10) : null;
        
        if (townData[townName] && districtId && districtId > 0 && districtId <= MAX_DISTRICTS) {
            newAssignments[townName] = districtId;
            if (!newDistrictOrder.includes(districtId)) {
                newDistrictOrder.push(districtId);
            }
            importedCount++;
            if (districtNameIndex !== -1) {
                const districtName = data[districtNameIndex]?.replace(/"/g, '').trim();
                if (districtName) {
                    districtNameMap[districtId] = districtName;
                }
            }
        }
    });

    newDistrictOrder.sort((a,b) => a-b);
    newDistrictOrder.forEach(id => {
        newDistrictNames[id] = districtNameMap[id] || `District ${id}`;
    });
    
    setDistrictOrder(newDistrictOrder);
    setDistrictNames(newDistrictNames);
    setAssignments(newAssignments);
    showNotification(`Successfully imported assignments for ${importedCount} towns.`, false);
  };

  const renderContent = () => {
    if (currentView === 'report') {
      return <ReportComponent reportData={reportData} onBack={() => setCurrentView('map')} unassignedTownsCount={unassignedTownsCount}/>;
    }

    return (
      <>
        {showSplashScreen && <SplashScreen onAcknowledge={handleAcknowledgeSplash} />}
        <div className="lg:hidden flex flex-col items-center justify-center h-screen w-screen bg-gray-100 p-4 text-center">
            <h1 className="text-3xl font-bold mb-2" style={{color: '#003300'}}>School District Builder</h1>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#003300'}}>Screen Size Notice</h2>
            <p className="text-gray-700">
                This application is designed for larger screens. For the best experience, please use a tablet or desktop computer.
            </p>
        </div>

        <div className="hidden lg:flex flex-row h-screen w-screen bg-gray-200">
          <LeftSidebar
            isCollapsed={isLeftSidebarCollapsed}
            toggleCollapse={() => setLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            sortedSUs={sortedSUs}
            supervisoryUnions={supervisoryUnions}
            assignments={assignments}
            onSUClick={handleSUClick}
            onSUHover={setHoveredSU}
            onPresetChange={handlePresetChange}
            onHelpClick={() => setHelpModalOpen(true)}
          />
          
          <div className="flex-1 flex flex-row h-full overflow-hidden">
              <main 
                  className={`transition-all duration-300 ease-in-out h-full ${isLeftSidebarCollapsed ? 'w-3/5' : 'w-1/2'}`}
              >
                  <MapComponent 
                      townGeoJSON={townGeoJSON}
                      assignments={assignments}
                      onTownClick={handleTownClick}
                      hoveredDistrict={hoveredDistrict}
                      hoveredSU={hoveredSU}
                      onMapReady={(map) => { mapRef.current = map; }}
                      schoolsData={schoolsData}
                      showSchools={showSchools}
                      onToggleSchools={() => setShowSchools(prev => !prev)}
                      schoolTypeFilters={schoolTypeFilters}
                      onSchoolFilterChange={handleSchoolFilterChange}
                  />
              </main>
              <div className={`transition-all duration-300 ease-in-out h-full ${isLeftSidebarCollapsed ? 'w-2/5' : 'w-1/2'}`}>
                  <RightSidebar
                    districtOrder={districtOrder}
                    activeDistrict={activeDistrict}
                    allDistrictStats={allDistrictStats}
                    districtNames={districtNames}
                    schoolDetails={schoolDetails}
                    independentSchoolDetails={independentSchoolDetails}
                    mapName={mapName}
                    onMapNameChange={setMapName}
                    onAddDistrict={addDistrict}
                    onDistrictSelect={setActiveDistrict}
                    onDistrictNameChange={handleDistrictNameChange}
                    onDistrictHover={setHoveredDistrict}
                    onExportShare={() => setExportShareModalOpen(true)}
                    onImport={() => setImportModalOpen(true)}
                    onReset={resetApplication}
                    onDeleteDistrict={setDistrictToDelete}
                    draggedDistrict={draggedDistrict}
                    dropIndex={dropIndex}
                    onDistrictDragStart={handleDistrictDragStart}
                    onDistrictDragEnd={handleDistrictDragEnd}
                    onDropInZone={handleDropInZone}
                    onDragEnterDropZone={setDropIndex}
                    onGenerateReport={handleGenerateReport}
                  />
              </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      {renderContent()}
      {modalRoot && createPortal(
        <>
          {notification && (
              <div 
                className={`fixed top-5 right-5 text-white py-2 px-4 rounded-lg shadow-md transition-opacity duration-300 ${notification.isError ? 'bg-red-500' : 'bg-green-600'}`}
                style={{ zIndex: 10001 }}
              >
                  <p>{notification.message}</p>
              </div>
          )}

          {districtToDelete !== null && (
            <div 
              className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center" 
              style={{ zIndex: 10002 }}
              onClick={() => setDistrictToDelete(null)}
            >
              <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
                <p className="text-gray-700 mb-6">
                  Are you sure you want to permanently remove <strong>{districtNames[districtToDelete] || `District ${districtToDelete}`}</strong>? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-4">
                  <button onClick={() => setDistrictToDelete(null)} className="py-2 px-4 rounded bg-gray-200 hover:bg-gray-300">
                    Cancel
                  </button>
                  <button onClick={confirmDeleteDistrict} className="py-2 px-4 rounded bg-red-600 hover:bg-red-700 text-white font-bold">
                    Delete District
                  </button>
                </div>
              </div>
            </div>
          )}

          {isExportShareModalOpen && (
              <div 
                className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center"
                style={{ zIndex: 10000 }}
                onClick={() => setExportShareModalOpen(false)}
              >
                  <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                      <h3 className="text-xl font-bold mb-6 text-center">Export & Share</h3>
                      
                      <div className="space-y-4">
                          <button onClick={handleExportJpg} className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">JPG Image</button>
                          <button onClick={exportAssignmentsToCsv} className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded">CSV Assignments</button>
                          <button onClick={copyShareURLToClipboard} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Copy Shareable Link</button>
                      </div>
                      <button onClick={() => setExportShareModalOpen(false)} className="mt-8 w-full text-sm text-gray-600 hover:text-gray-800 py-2">Close</button>
                  </div>
              </div>
          )}

          {isImportModalOpen && (
            <div 
              className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center"
              onClick={() => setImportModalOpen(false)}
              style={{ zIndex: 10000 }}
            >
              <div 
                id="drop-zone"
                className="w-3/4 h-3/4 max-w-4xl max-h-4xl rounded-lg flex flex-col items-center justify-center text-white text-2xl font-bold cursor-pointer border-4 border-dashed border-gray-400 bg-gray-700 hover:border-blue-500 hover:bg-gray-600 transition-colors p-8"
                onClick={(e) => e.stopPropagation()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-500'); }}
                onDragLeave={(e) => e.currentTarget.classList.remove('border-blue-500')}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-blue-500');
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileImport(e.dataTransfer.files[0]);
                  }
                }}
              >
                <label htmlFor="file-input" className="cursor-pointer text-center">
                  <p>Drop CSV file here</p>
                  <p className="text-lg mt-2">or click to select</p>
                </label>
                <input 
                  type="file" 
                  id="file-input" 
                  className="hidden" 
                  accept=".csv"
                  onChange={(e) => e.target.files && handleFileImport(e.target.files[0])}
                />
                <div className="text-sm font-normal mt-6 text-gray-300 max-w-md text-left">
                    <p className="mb-2">This tool is designed to import CSV files that were exported from the School District Builder. You can export district assignments by clicking the 'Export & Share' button, and selecting 'CSV Assignments'.</p>
                    <p>The CSV must contain the following columns:</p>
                    <ul className="list-disc list-inside mt-2">
                        <li><strong>TOWNNAME</strong> (Required)</li>
                        <li><strong>DISTRICT_ID</strong> (Required)</li>
                        <li><strong>DISTRICT_NAME</strong> (Optional, but recommended)</li>
                    </ul>
                </div>
              </div>
            </div>
          )}

          {isHelpModalOpen && (
            <HelpModal onClose={() => setHelpModalOpen(false)} />
          )}
        </>,
        modalRoot
      )}
    </>
  );
};

export default App;
