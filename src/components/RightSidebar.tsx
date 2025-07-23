// src/components/RightSidebar.tsx
import React from 'react';
import { AllDistrictStats, DistrictNames } from '../types';
import { districtColors, MAX_DISTRICTS } from '../constants';

interface RightSidebarProps {
  mapName: string;
  onMapNameChange: (name: string) => void;
  onPresetChange: (preset: string) => void;
  currentNumDistricts: number;
  activeDistrict: number;
  allDistrictStats: AllDistrictStats;
  districtNames: DistrictNames;
  onAddDistrict: () => void;
  onDistrictSelect: (id: number) => void;
  onDistrictNameChange: (id: number, name: string) => void;
  onDistrictHover: (id: number | null) => void;
  onExportShare: () => void;
  onImport: () => void;
  onReset: () => void;
  onDeleteDistrict: (id: number) => void;
}

const TrashIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
        <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
    </svg>
);

const RightSidebar: React.FC<RightSidebarProps> = ({
  mapName, onMapNameChange, onPresetChange, currentNumDistricts, activeDistrict, allDistrictStats,
  districtNames, onAddDistrict, onDistrictSelect, onDistrictNameChange, onDistrictHover,
  onExportShare, onImport, onReset, onDeleteDistrict
}) => {

  const districtArray = Array.from({ length: currentNumDistricts }, (_, i) => i + 1);

  return (
    <aside className="w-full lg:w-1/4 h-1/4 lg:h-full flex flex-col shadow-lg bg-gray-50 p-4 md:p-6 order-3 lg:order-3">
      <div className="flex-shrink-0">
        <div className="mb-2">
            <label htmlFor="map-name" className="block text-sm font-medium text-gray-700">Map Name</label>
            <input
              type="text" id="map-name"
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter a name for your map..."
              value={mapName}
              onChange={(e) => onMapNameChange(e.target.value)}
            />
        </div>
         <div className="mb-4">
            <label htmlFor="preset-selector" className="block text-sm font-medium text-gray-700">Start with...</label>
            <select
              id="preset-selector"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              onChange={(e) => onPresetChange(e.target.value)}
            >
                <option value="blank">Blank</option>
                <option value="County">County</option>
                <option value="School_Board_Association">School Board Association Regions</option>
                <option value="Superintendent_Association_Regi">Superintendent Association Regions</option>
                <option value="CTE_Region">CTE Regions</option>
            </select>
        </div>
      </div>
      
      <div className="mb-4 flex-grow flex flex-col min-h-0">
          <h2 className="text-xl font-semibold mb-3">Districts</h2>
          <div id="district-selector-container" className="scrollable-list overflow-y-auto pr-2">
            {/* Districts */}
            {districtArray.map(i => {
              const stats = allDistrictStats[i] || { townCount: 0, studentTotal: 0, totalGL: 0, totalPublicSchools: 0, towns: [] };
              const glPerStudent = stats.studentTotal > 0 ? stats.totalGL / stats.studentTotal : 0;
              const formattedGlPerStudent = `$${Math.floor(glPerStudent).toLocaleString('en-US')}`;
              const isActive = activeDistrict === i;
              
              return (
                <label
                  key={i}
                  className={`relative flex items-center p-2 border rounded-lg cursor-pointer transition-colors mb-2 ${isActive ? 'bg-blue-50' : 'bg-white'}`}
                  style={{borderColor: isActive ? districtColors[i-1] : `${districtColors[i-1]}80`}}
                  onMouseEnter={() => onDistrictHover(i)}
                  onMouseLeave={() => onDistrictHover(null)}
                >
                    <input type="radio" name="district" value={i} className="h-4 w-4 mr-3" checked={isActive} onChange={() => onDistrictSelect(i)} />
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                            <input
                              type="text"
                              value={districtNames[i] || ''}
                              placeholder="Type District Name"
                              onChange={(e) => onDistrictNameChange(i, e.target.value)}
                              onClick={(e) => e.preventDefault()}
                              className="font-semibold truncate bg-transparent flex-1 min-w-0 p-0 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-300 rounded placeholder-gray-200"
                              style={{color: districtColors[i-1]}}
                            />
                            <span className="text-xs font-bold text-gray-600 ml-2 flex-shrink-0 whitespace-nowrap">
                                {stats.studentTotal.toLocaleString()} students
                            </span>
                        </div>
                        <div className="flex justify-between items-baseline text-xs text-gray-500 mt-1">
                            <span>Public Schools: {stats.totalPublicSchools}</span>
                            <span className="truncate ml-2">GL/Student: {formattedGlPerStudent}</span>
                        </div>
                        <div className="mt-1 flex items-baseline gap-2">
                           <span className="text-xs text-gray-500">Towns:</span>
                           <div className="flex flex-wrap gap-1 items-center">
                               {stats.towns.map(townId => (
                                   <span key={townId} className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: districtColors[i - 1] }}></span>
                               ))}
                           </div>
                        </div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onDeleteDistrict(i);
                        }}
                        className="absolute bottom-1 right-1 p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors"
                        title={`Remove ${districtNames[i] || `District ${i}`}`}
                    >
                        <TrashIcon />
                    </button>
                </label>
              )
            })}
          </div>
      </div>

      <div className="mt-auto flex-shrink-0 space-y-3">
          <button
            onClick={onAddDistrict}
            disabled={currentNumDistricts >= MAX_DISTRICTS}
            className="w-full text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            style={{backgroundColor: '#225d39'}}>
              Add District
          </button>
          <button onClick={onExportShare} className="w-full text-white font-bold py-3 px-4 rounded-lg transition-colors" style={{backgroundColor: '#408740'}}>
              Export & Share
          </button>
          <button onClick={onImport} className="w-full text-white font-bold py-2 px-4 rounded-lg transition-colors" style={{backgroundColor: '#457a7c'}}>
              Import Assignments
          </button>
          <button onClick={onReset} className="w-full bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors">
              Reset
          </button>
      </div>
    </aside>
  );
};

export default RightSidebar;