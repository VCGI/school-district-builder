// src/App.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import pako from 'pako';
import html2canvas from 'html2canvas';
import 'leaflet/dist/leaflet.css';
import {
  Tab, TownData, Assignments, SupervisoryUnions, TownGeoJSON, AllDistrictStats, DistrictNames
} from './types';
import {
  GEOJSON_URL, PROPERTY_KEYS, MAX_DISTRICTS, INITIAL_DISTRICTS, districtColors, BASE62_CHARS
} from './constants';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import MapComponent from './components/MapComponent';

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

const initializeDistrictNames = () => {
    const initialNames: DistrictNames = {};
    for (let i = 1; i <= MAX_DISTRICTS; i++) {
        initialNames[i] = `District ${i}`;
    }
    return initialNames;
};

const App: React.FC = () => {
  // Core State
  const [townData, setTownData] = useState<TownData>({});
  const [townGeoJSON, setTownGeoJSON] = useState<TownGeoJSON | null>(null);
  const [assignments, setAssignments] = useState<Assignments>({});
  const [districtNames, setDistrictNames] = useState<DistrictNames>(initializeDistrictNames);
  const [supervisoryUnions, setSupervisoryUnions] = useState<SupervisoryUnions>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // UI State
  const [activeDistrict, setActiveDistrict] = useState<number>(1);
  const [currentNumDistricts, setCurrentNumDistricts] = useState<number>(INITIAL_DISTRICTS);
  const [mapName, setMapName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<Tab>(Tab.About);
  const [hoveredDistrict, setHoveredDistrict] = useState<number | null>(null);
  const [hoveredSU, setHoveredSU] = useState<string | null>(null);
  const [isExportShareModalOpen, setExportShareModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; isError: boolean } | null>(null);
  const [districtToDelete, setDistrictToDelete] = useState<number | null>(null);

  const modalRoot = document.getElementById('modal-root');

  // Initial Data Load & URL State Deserialization
  useEffect(() => {
    const loadGeoJSON = async () => {
      try {
        const response = await fetch(GEOJSON_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const geojsonData: TownGeoJSON = await response.json();
        
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
        
        // Load state from URL after data is ready
        loadStateFromURL(newTownData, newAssignments);

      } catch (error) {
        console.error('Error loading or processing GeoJSON:', error);
        showNotification('Failed to load map data. Please try again later.', true);
      } finally {
        setIsLoading(false);
      }
    };
    loadGeoJSON();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Memoized calculations
  const allDistrictStats = useMemo<AllDistrictStats>(() => {
      const stats: AllDistrictStats = {};
      for (let i = 1; i <= MAX_DISTRICTS; i++) {
          stats[i] = { townCount: 0, studentTotal: 0, totalGL: 0, totalPublicSchools: 0, towns: [] };
      }
      for (const townId in assignments) {
          const districtId = assignments[townId];
          if (districtId && townData[townId]) {
              const townProps = townData[townId];
              stats[districtId].townCount++;
              stats[districtId].studentTotal += (townProps[PROPERTY_KEYS.STUDENT_COUNT] || 0);
              stats[districtId].totalGL += (townProps[PROPERTY_KEYS.GL] || 0);
              stats[districtId].totalPublicSchools += (townProps[PROPERTY_KEYS.SCHOOLS] || 0);
              stats[districtId].towns.push(townId);
          }
      }
      return stats;
  }, [assignments, townData]);

  const sortedSUs = useMemo(() => Object.keys(supervisoryUnions).sort(), [supervisoryUnions]);

  // Handlers
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
    if (currentNumDistricts < MAX_DISTRICTS) {
      setCurrentNumDistricts(prev => prev + 1);
    }
  }, [currentNumDistricts]);

  const handleDistrictNameChange = (id: number, name: string) => {
    setDistrictNames(prev => ({ ...prev, [id]: name }));
  };

  const resetApplication = useCallback(() => {
    setAssignments(prev => {
      const reset = { ...prev };
      Object.keys(reset).forEach(key => { reset[key] = null; });
      return reset;
    });
    setCurrentNumDistricts(INITIAL_DISTRICTS);
    setActiveDistrict(1);
    setMapName('');
    setDistrictNames(initializeDistrictNames());
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
    const uniqueValues = [...new Set(Object.values(townData).map(town => town[field]))].sort();
    const valueToDistrictMap: { [key: string]: number } = {};
    uniqueValues.forEach((value, index) => { valueToDistrictMap[value] = index + 1; });
    
    setCurrentNumDistricts(Math.min(uniqueValues.length, MAX_DISTRICTS));
    setAssignments(() => {
      const newAssignments: Assignments = {};
      for (const townId in townData) {
        newAssignments[townId] = valueToDistrictMap[townData[townId][field]] || null;
      }
      return newAssignments;
    });
  }, [townData, resetApplication]);

  const confirmDeleteDistrict = useCallback(() => {
    if (districtToDelete === null) return;
    
    const idToDelete = districtToDelete;

    // Shift assignments and names
    setAssignments(prev => {
        const newAssignments = { ...prev };
        Object.keys(newAssignments).forEach(townId => {
            if (newAssignments[townId] === idToDelete) {
                newAssignments[townId] = null;
            } else if (newAssignments[townId] && newAssignments[townId]! > idToDelete) {
                newAssignments[townId]! -= 1;
            }
        });
        return newAssignments;
    });

    setDistrictNames(prev => {
        const newNames = { ...prev };
        for (let i = idToDelete; i < currentNumDistricts; i++) {
            newNames[i] = prev[i + 1];
        }
        newNames[currentNumDistricts] = `District ${currentNumDistricts}`; // Reset last
        return newNames;
    });
    
    // Adjust active district and total number of districts
    if (activeDistrict === idToDelete || activeDistrict > currentNumDistricts - 1) {
        setActiveDistrict(1);
    } else if (activeDistrict > idToDelete) {
        setActiveDistrict(prev => prev -1);
    }
    
    setCurrentNumDistricts(prev => prev - 1);
    setDistrictToDelete(null);
    showNotification(`District ${idToDelete} was removed.`, false);

  }, [districtToDelete, activeDistrict, currentNumDistricts]);


  // Notification handler
  const showNotification = (message: string, isError: boolean = false) => {
    setNotification({ message, isError });
    setTimeout(() => setNotification(null), 3000);
  };

  // URL State Serialization
  const generateShareableString = useCallback(() => {
    const version = 'V7';
    const separator = '|';
    const districtsToTowns: { [key: number]: number[] } = {};
    
    for (let i = 1; i <= currentNumDistricts; i++) districtsToTowns[i] = [];

    for (const townId in assignments) {
        const districtId = assignments[townId];
        if (districtId !== null && townData[townId]) {
          districtsToTowns[districtId].push(townData[townId].OBJECTID);
        }
    }

    const districtStrings = [];
    for (let districtId = 1; districtId <= currentNumDistricts; districtId++) {
        const townObjIds = districtsToTowns[districtId];
        if (townObjIds.length === 0) continue;
        townObjIds.sort((a, b) => a - b);
        
        const rleRuns = [];
        if (townObjIds.length > 0) {
            let startId = townObjIds[0], endId = townObjIds[0];
            for (let i = 1; i < townObjIds.length; i++) {
                if (townObjIds[i] === endId + 1) {
                    endId = townObjIds[i];
                } else {
                    rleRuns.push(startId === endId ? toBase62(startId) : `${toBase62(startId)}~${toBase62(endId - startId)}`);
                    startId = endId = townObjIds[i];
                }
            }
            rleRuns.push(startId === endId ? toBase62(startId) : `${toBase62(startId)}~${toBase62(endId - startId)}`);
        }
        districtStrings.push(`${toBase62(districtId)}:${rleRuns.join(',')}`);
    }
    
    const districtNamesToSave = [];
    for (let i = 1; i <= currentNumDistricts; i++) {
        districtNamesToSave.push(encodeURIComponent(districtNames[i] || `District ${i}`));
    }

    const payloadParts = [version, toBase62(currentNumDistricts), districtStrings.join(';'), encodeURIComponent(mapName), districtNamesToSave.join(';')];
    const payloadString = payloadParts.join(separator);

    const compressed = pako.deflate(payloadString, { level: 9 });
    let binaryString = '';
    for (let i = 0; i < compressed.length; i++) {
        binaryString += String.fromCharCode(compressed[i]);
    }
    return btoa(binaryString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }, [assignments, currentNumDistricts, mapName, townData, districtNames]);

  const loadStateFromURL = (currentTownData: TownData, currentAssignments: Assignments) => {
    const params = new URLSearchParams(window.location.search);
    const data = params.get('data');
    if (!data) return;

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

        if (version === 'V7') {
            const numDistricts = fromBase62(parts[1]);
            const assignmentsString = parts[2] || '';
            const loadedMapName = decodeURIComponent(parts[3] || '');
            const districtNamesStr = parts[4] || '';
            
            const loadedNames = initializeDistrictNames();

            setCurrentNumDistricts(numDistricts || INITIAL_DISTRICTS);
            setMapName(loadedMapName);

            if (districtNamesStr) {
                const decodedNames = districtNamesStr.split(';');
                decodedNames.forEach((name, index) => {
                    loadedNames[index + 1] = decodeURIComponent(name);
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
        } else {
            showNotification('URL uses an old format. Some data may not load correctly.', true);
        }
    } catch (e) {
        console.error("Failed to load state from URL:", e);
        showNotification('Could not load map from URL.', true);
        const url = new URL(window.location.toString());
        url.searchParams.delete('data');
        window.history.replaceState({}, '', url);
    }
  };


  // Export & Import Handlers
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
    let csvContent = "TOWNNAME,COUNTY,DISTRICT_ID,DISTRICT_NAME,PUBLIC_SCHOOL_STUDENTS,Public_Schools,Total_E_Ed_GL\r\n";
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


  const handleExportJpg = useCallback(async () => {
      setExportShareModalOpen(false);
      showNotification('Preparing map for export...', false);
      const printContainer = document.getElementById('print-container') as HTMLElement;
      if (!printContainer || !townGeoJSON) return;

      const legendHtml = (() => {
          let legend = `<h2 style="font-size: 1.5rem; font-weight: bold; color: #003300; margin-bottom: 1rem;">${mapName || 'District Map'}</h2>`;
          legend += '<div style="display: grid; grid-template-columns: 1fr; gap: 1rem;">';
          for (let i = 1; i <= currentNumDistricts; i++) {
              const stats = allDistrictStats[i];
              if (!stats || stats.townCount === 0) continue;
              const glPerStudent = stats.studentTotal > 0 ? stats.totalGL / stats.studentTotal : 0;
              const formattedGlPerStudent = `$${Math.floor(glPerStudent).toLocaleString('en-US')}`;
              const districtName = districtNames[i] || `District ${i}`;
              legend += `
                  <div style="border: 1px solid #ddd; border-left: 5px solid ${districtColors[i-1]}; padding: 0.5rem; border-radius: 4px; background-color: #f9f9f9; font-size: 0.8rem;">
                      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.25rem;">
                          <span style="font-weight: bold; font-size: 1rem; color: ${districtColors[i-1]};">${districtName}</span>
                          <span style="font-size: 0.8rem; font-weight: 600;">${stats.studentTotal.toLocaleString()} students</span>
                      </div>
                      <div style="font-size: 0.75rem; color: #555;">
                          <div><strong>Towns:</strong> ${stats.townCount}</div>
                          <div><strong>Public Schools:</strong> ${stats.totalPublicSchools}</div>
                          <div><strong>Grand List/Student:</strong> ${formattedGlPerStudent}</div>
                      </div>
                  </div>`;
          }
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

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for map to render

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
  }, [assignments, townGeoJSON, mapName, currentNumDistricts, allDistrictStats, districtNames]);
  
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
    let maxDistrictId = 0;
    const newAssignments = { ...assignments };
    Object.keys(newAssignments).forEach(key => { newAssignments[key] = null; });
    const newDistrictNames = initializeDistrictNames();

    lines.slice(1).forEach(line => {
      const data = line.split(',');
      const townName = data[townIndex]?.replace(/"/g, '').trim();
      const districtIdStr = data[districtIdIndex]?.replace(/"/g, '').trim();
      const districtId = parseInt(districtIdStr, 10);
      
      if (townData[townName] && !isNaN(districtId) && districtId > 0 && districtId <= MAX_DISTRICTS) {
        newAssignments[townName] = districtId;
        maxDistrictId = Math.max(maxDistrictId, districtId);
        importedCount++;
        if (districtNameIndex !== -1) {
            const districtName = data[districtNameIndex]?.replace(/"/g, '').trim();
            if (districtName) {
                newDistrictNames[districtId] = districtName;
            }
        }
      }
    });

    if (maxDistrictId > 0) {
      setCurrentNumDistricts(maxDistrictId);
    }
    setAssignments(newAssignments);
    setDistrictNames(newDistrictNames);
    showNotification(`Successfully imported assignments for ${importedCount} towns.`, false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold" style={{color: '#003300'}}>Loading Map Data...</h1>
          <p className="text-gray-600">Please wait a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile/Small Screen Notice */}
      <div className="lg:hidden flex flex-col items-center justify-center h-screen w-screen bg-gray-100 p-4 text-center">
          <h1 className="text-3xl font-bold mb-2" style={{color: '#003300'}}>School District Builder</h1>
          <h2 className="text-2xl font-bold mb-4" style={{color: '#003300'}}>Screen Size Notice</h2>
          <p className="text-gray-700">
              This application is designed for larger screens. For the best experience, please use a tablet or desktop computer.
          </p>
      </div>

      {/* Main Application */}
      <div className="hidden lg:flex flex-col lg:flex-row h-screen w-screen bg-gray-200">
        <LeftSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          sortedSUs={sortedSUs}
          supervisoryUnions={supervisoryUnions}
          assignments={assignments}
          onSUClick={handleSUClick}
          onSUHover={setHoveredSU}
        />
        
        <main className="w-full lg:w-1/2 h-1/2 lg:h-full order-1 lg:order-2">
          <MapComponent 
              townGeoJSON={townGeoJSON}
              assignments={assignments}
              onTownClick={handleTownClick}
              hoveredDistrict={hoveredDistrict}
              hoveredSU={hoveredSU}
          />
        </main>

        <RightSidebar
          mapName={mapName}
          onMapNameChange={setMapName}
          onPresetChange={handlePresetChange}
          currentNumDistricts={currentNumDistricts}
          activeDistrict={activeDistrict}
          allDistrictStats={allDistrictStats}
          districtNames={districtNames}
          onAddDistrict={addDistrict}
          onDistrictSelect={setActiveDistrict}
          onDistrictNameChange={handleDistrictNameChange}
          onDistrictHover={setHoveredDistrict}
          onExportShare={() => setExportShareModalOpen(true)}
          onImport={() => setImportModalOpen(true)}
          onReset={resetApplication}
          onDeleteDistrict={setDistrictToDelete}
        />
      </div>

      {/* --- Modals and Notifications Portal --- */}
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
        </>,
        modalRoot
      )}
    </>
  );
};

export default App;