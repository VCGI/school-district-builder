import React from 'react';
import { AllDistrictStats } from '../types';
import { districtColors, MAX_DISTRICTS } from '../constants';

interface RightSidebarProps {
  mapName: string;
  onMapNameChange: (name: string) => void;
  onPresetChange: (preset: string) => void;
  currentNumDistricts: number;
  activeDistrict: number;
  allDistrictStats: AllDistrictStats;
  onAddDistrict: () => void;
  onDistrictSelect: (id: number) => void;
  onDistrictHover: (id: number | null) => void;
  onExportShare: () => void;
  onImport: () => void;
  onReset: () => void;
}

const EraserIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828l6.879-6.879zm.66 11.34L3.453 8.254 1.914 9.793a1 1 0 0 0 0 1.414l2.5 2.5a1 1 0 0 0 .707.293H7.88a1 1 0 0 0 .707-.293l.16-.16z"/>
  </svg>
);

const RightSidebar: React.FC<RightSidebarProps> = ({
  mapName, onMapNameChange, onPresetChange, currentNumDistricts, activeDistrict, allDistrictStats,
  onAddDistrict, onDistrictSelect, onDistrictHover, onExportShare, onImport, onReset
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
             {/* Eraser */}
             <label 
                className={`flex items-center p-2 border rounded-lg cursor-pointer transition-colors mb-2 ${activeDistrict === 0 ? 'bg-gray-300' : 'bg-white'}`}
                style={{borderColor: activeDistrict === 0 ? '#4a5568' : '#6b7280'}}
                onMouseEnter={() => onDistrictHover(0)}
                onMouseLeave={() => onDistrictHover(null)}
              >
                  <input type="radio" name="district" value="0" className="h-4 w-4 mr-3" checked={activeDistrict === 0} onChange={() => onDistrictSelect(0)} />
                  <div className="flex items-center text-gray-600">
                      <EraserIcon/>
                      <span className="font-semibold ml-2">Eraser</span>
                  </div>
              </label>

            {/* Districts */}
            {districtArray.map(i => {
              const stats = allDistrictStats[i] || { townCount: 0, studentTotal: 0, totalGL: 0, totalPublicSchools: 0, towns: [] };
              const glPerStudent = stats.studentTotal > 0 ? stats.totalGL / stats.studentTotal : 0;
              const formattedGlPerStudent = `$${Math.floor(glPerStudent).toLocaleString('en-US')}`;
              const isActive = activeDistrict === i;
              
              return (
                <label 
                  key={i}
                  className={`flex items-center p-2 border rounded-lg cursor-pointer transition-colors mb-2 ${isActive ? 'bg-blue-50' : 'bg-white'}`} 
                  style={{borderColor: isActive ? districtColors[i-1] : `${districtColors[i-1]}80`}}
                  onMouseEnter={() => onDistrictHover(i)}
                  onMouseLeave={() => onDistrictHover(null)}
                >
                    <input type="radio" name="district" value={i} className="h-4 w-4 mr-3" checked={isActive} onChange={() => onDistrictSelect(i)} />
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                            <span className="font-semibold truncate" style={{color: districtColors[i-1]}}>District {i}</span>
                            <span className="text-xs font-bold text-gray-600">{stats.studentTotal.toLocaleString()} students</span>
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