// src/App.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import html2canvas from 'html2canvas';
import 'leaflet/dist/leaflet.css';
import {
  AllDistrictStats, ReportData
} from './types';
import {
  PROPERTY_KEYS, districtColors
} from './constants';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import MapComponent from './components/MapComponent';
import ReportComponent from './components/ReportComponent';
import HelpModal from './components/HelpModal';
import SplashScreen from './components/SplashScreen';
import { escapeHtml, sanitizeCsvCell } from './utils'; // Import sanitization functions
import { buildReportData } from './reportData';
import { useDistrictBuilderData } from './hooks/useDistrictBuilderData';
import { useUrlStateSync } from './hooks/useUrlStateSync';
import { useMapViewState } from './hooks/useMapViewState';
import { useDistrictAssignments } from './hooks/useDistrictAssignments';

const DISCLAIMER_VERSION = '1.0'; // Version for the disclaimer acknowledgment

const App: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [unassignedTownsCount, setUnassignedTownsCount] = useState<number>(0);

  const [mapName, setMapName] = useState<string>('');
  const [isExportShareModalOpen, setExportShareModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; isError: boolean } | null>(null);
  const [isHelpModalOpen, setHelpModalOpen] = useState<boolean>(false);
  const [showSplashScreen, setShowSplashScreen] = useState<boolean>(
    localStorage.getItem('disclaimerAcknowledged') !== DISCLAIMER_VERSION
  );

  const {
    currentView, setCurrentView,
    activeTab, setActiveTab,
    hoveredDistrict, setHoveredDistrict,
    hoveredSU, setHoveredSU,
    showSchools, toggleSchools,
    schoolTypeFilters, handleSchoolFilterChange,
    isLeftSidebarCollapsed, toggleLeftSidebar,
    mapRef,
  } = useMapViewState();

  const modalRoot = document.getElementById('modal-root');

  const showNotification = (message: string, isError: boolean = false) => {
    setNotification({ message, isError });
    setTimeout(() => setNotification(null), 3000);
  };

  const { townData, townGeoJSON, supervisoryUnions, schoolDetails, independentSchoolDetails, schoolsData, initialAssignments } = useDistrictBuilderData({
    onError: (message) => showNotification(message, true),
  });

  const {
    assignments, setAssignments,
    districtNames, setDistrictNames,
    districtOrder, setDistrictOrder,
    activeDistrict, setActiveDistrict,
    districtToDelete, setDistrictToDelete,
    draggedDistrict, dropIndex, setDropIndex,
    handleTownClick, handleSUClick, addDistrict, handleDistrictNameChange,
    resetApplication, handlePresetChange, confirmDeleteDistrict,
    handleDistrictDragStart, handleDropInZone, handleDistrictDragEnd,
    parseCSV,
  } = useDistrictAssignments({ townData, supervisoryUnions, setMapName, showNotification });

  const { loadStateFromURL, copyShareURLToClipboard } = useUrlStateSync({
    districtOrder, assignments, townData, districtNames, mapName,
    setDistrictOrder, setDistrictNames, setAssignments, setMapName, showNotification,
  });

  useEffect(() => {
    if (!townGeoJSON) return; // wait for useDistrictBuilderData's fetch to complete
    loadStateFromURL(townData, initialAssignments);
    // Runs once, when the fetched data first becomes available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [townGeoJSON]);

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
  
  const handleCopyShareURL = useCallback(() => {
    copyShareURLToClipboard();
    setExportShareModalOpen(false);
  }, [copyShareURLToClipboard]);

  const exportAssignmentsToCsv = useCallback(() => {
    let csvContent = "TOWNNAME,COUNTY,DISTRICT_ID,DISTRICT_NAME,PUBLIC_SCHOOL_STUDENTS,Public_Schools,Total_E_Ed_GL_Act73\r\n";
    const allTowns = Object.keys(townData).sort();
    allTowns.forEach(townId => {
        const districtId = assignments[townId];
        const townProps = townData[townId];
        const districtName = districtId ? districtNames[districtId] : 'Unassigned';
        const row = [
            sanitizeCsvCell(townProps.TOWNNAME), 
            sanitizeCsvCell(townProps.County), 
            districtId !== null ? districtId : '', 
            sanitizeCsvCell(districtName),
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

  const exportToGeoJSON = useCallback(() => {
    if (!townGeoJSON) {
      showNotification('GeoJSON data is not loaded yet.', true);
      return;
    }

    const features = townGeoJSON.features.map(feature => {
      const townId = feature.properties.TOWNNAME;
      const districtId = assignments[townId];
      const districtName = districtId ? districtNames[districtId] : 'Unassigned';

      return {
        ...feature,
        properties: {
          ...feature.properties,
          DISTRICT_ID: districtId,
          DISTRICT_NAME: districtName,
        },
      };
    });

    const geoJsonData = {
      type: 'FeatureCollection',
      features,
    };

    const blob = new Blob([JSON.stringify(geoJsonData, null, 2)], { type: 'application/geo+json' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);

    const safeMapName = mapName.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const date = new Date().toISOString().slice(0, 10);
    const fileName = safeMapName ? `${safeMapName}_${date}.geojson` : `district_assignments_${date}.geojson`;

    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification('GeoJSON download started.');
    setExportShareModalOpen(false);
  }, [assignments, townGeoJSON, mapName, districtNames]);

  const handleGenerateReport = useCallback(() => {
    const dataForReport = buildReportData({
      districtOrder, allDistrictStats, districtNames, townData, schoolDetails, independentSchoolDetails, assignments, supervisoryUnions,
    });

    const unassignedTowns = Object.values(assignments).filter(d => d === null).length;
    setUnassignedTownsCount(unassignedTowns);
    setReportData(dataForReport);
    setCurrentView('report');
    setExportShareModalOpen(false);

  }, [districtOrder, allDistrictStats, districtNames, townData, schoolDetails, independentSchoolDetails, assignments, supervisoryUnions, setCurrentView]);

  const handleExportJpg = useCallback(async () => {
      setExportShareModalOpen(false);
      showNotification('Preparing map for export...', false);
      const printContainer = document.getElementById('print-container') as HTMLElement;
      if (!printContainer || !townGeoJSON) return;

      const legendHtml = (() => {
          let legend = `<h2 style="font-size: 1.5rem; font-weight: bold; color: #003300; margin-bottom: 1rem;">${escapeHtml(mapName) || 'District Map'}</h2>`;
          legend += '<div style="display: grid; grid-template-columns: 1fr; gap: 1rem;">';
          districtOrder.forEach(id => {
              const stats = allDistrictStats[id];
              if (!stats || stats.townCount === 0) return;
              const glPerStudent = stats.studentTotal > 0 ? stats.totalGL / stats.studentTotal : 0;
              const formattedGlPerStudent = `$${Math.floor(glPerStudent).toLocaleString('en-US')}`;
              const districtName = escapeHtml(districtNames[id] || `District ${id}`);
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
            toggleCollapse={toggleLeftSidebar}
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
                      onToggleSchools={toggleSchools}
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
                          <button onClick={exportToGeoJSON} className="w-full bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded">GeoJSON</button>
                          <button onClick={handleCopyShareURL} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Copy Shareable Link</button>
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

