// src/App.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import 'leaflet/dist/leaflet.css';
import {
  AllDistrictStats, ReportData
} from './types';
import {
  PROPERTY_KEYS
} from './constants';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import MapComponent from './components/MapComponent';
import ReportComponent from './components/ReportComponent';
import HelpModal from './components/HelpModal';
import SplashScreen from './components/SplashScreen';
import { buildReportData } from './reportData';
import { useDistrictBuilderData } from './hooks/useDistrictBuilderData';
import { useUrlStateSync } from './hooks/useUrlStateSync';
import { useMapViewState } from './hooks/useMapViewState';
import { useDistrictAssignments } from './hooks/useDistrictAssignments';
import { useExports } from './hooks/useExports';

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

  const { exportAssignmentsToCsv, exportToGeoJSON, handleExportJpg } = useExports({
    assignments, townData, townGeoJSON, mapName, districtNames, districtOrder, allDistrictStats,
    showNotification, setExportShareModalOpen,
  });

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

