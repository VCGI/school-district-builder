// src/components/LeftSidebar.tsx
import React, { useState } from 'react';
import { Tab, SupervisoryUnions, Assignments } from '../types';
import { districtColors } from '../constants';
import { version } from '../../package.json'; // Import version from package.json

interface LeftSidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  sortedSUs: string[];
  supervisoryUnions: SupervisoryUnions;
  assignments: Assignments;
  onSUClick: (suName: string) => void;
  onSUHover: (suName: string | null) => void;
  onPresetChange: (preset: string) => void;
  onHelpClick: () => void; // Prop to open the new modal
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  isCollapsed, toggleCollapse, activeTab, onTabChange, sortedSUs, supervisoryUnions, assignments, onSUClick, onSUHover, onPresetChange, onHelpClick
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const TabButton: React.FC<{tab: Tab, label: string}> = ({ tab, label }) => (
    <button
      onClick={() => onTabChange(tab)}
      className={`tab-button flex-1 ${activeTab === tab ? 'active' : ''}`}
    >
      {label}
    </button>
  );

  const filteredSUs = sortedSUs.filter(suName =>
    suName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className={`relative h-full flex flex-col shadow-lg bg-gray-50 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-12' : 'w-1/4'}`}>
        <button 
            onClick={toggleCollapse} 
            className="absolute top-1/2 -right-6 transform -translate-y-1/2 w-6 h-12 flex items-center justify-center text-white rounded-r-lg focus:outline-none transition-opacity hover:opacity-90"
            aria-label="Toggle Sidebar"
            style={{ backgroundColor: '#003300', zIndex: 1001 }}
        >
            {isCollapsed ? (
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
            ) : (
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
            )}
      </button>

      <div className={`flex flex-col h-full overflow-hidden transition-opacity duration-300 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div style={{ backgroundColor: '#003300' }} className="px-4 py-2 flex items-center justify-start text-white flex-shrink-0">
          <img src="https://files.vcgi.vermont.gov/logo/vermont-logo-white.png" alt="State of Vermont" style={{ height: '18px', width: 'auto' }} />
        </div>
        <div className="p-4 border-b flex-shrink-0">
          <h1 className="text-xl font-bold">School District Builder</h1>
          <p className="text-xs text-gray-500 -mt-1">BETA v{version}</p>
        </div>

        <div className="flex border-b flex-shrink-0">
          <TabButton tab={Tab.About} label="About" />
          <TabButton tab={Tab.SupervisoryUnions} label="Supervisory Unions" />
        </div>

        <div className="flex-grow overflow-y-auto relative">
          {activeTab === Tab.About && (
            <div className="p-4 animate-fade-in space-y-6">
              <button 
                onClick={onHelpClick}
                className="w-full text-left bg-gray-100 hover:bg-gray-200 p-3 rounded-lg border border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <h3 className="font-semibold text-blue-700">App Guide & Info</h3>
                <p className="text-xs text-gray-600">How to use the app, data sources, and disclaimer.</p>
              </button>
              
              <div>
                <h3 className="font-semibold mb-2">Get Started</h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                    <li>Click a town on the map to assign it to the active district.</li>
                    <li>Use the "Supervisory Unions" tab to assign multiple towns at once.</li>
                    <li>Or, start with districts preconfigured to a specific geography:</li>
                </ul>
                <select
                  id="preset-selector"
                  className="mt-2 block w-full pl-3 pr-10 py-2 text-base rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm preset-selector-enhanced"
                  onChange={(e) => onPresetChange(e.target.value)}
                >
                    <option value="blank">Blank</option>
                    <option value="County">County</option>
                    <option value="School_Board_Association">School Board Association Regions</option>
                    <option value="Superintendent_Association_Regi">Superintendent Association Regions</option>
                    <option value="CTE_Region">CTE Regions</option>
                    <option value="RPC">Regional Planning Commissions</option>
                </select>
              </div>
            </div>
          )}
          {activeTab === Tab.SupervisoryUnions && (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b bg-gray-100 flex-shrink-0 space-y-3">
                <p className="text-sm text-gray-700">
                  Click any Supervisory Union to assign all of its towns to your active district. Click again to unassign.
                </p>
                <input
                    type="search"
                    placeholder="Filter Supervisory Unions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="scrollable-list flex-grow">
                {filteredSUs.map(suName => {
                  const suData = supervisoryUnions[suName];
                  const dotsHtml = suData.towns
                    .map(townId => assignments[townId])
                    .filter(districtId => districtId)
                    .map(districtId => (
                      <span key={`${suName}-${districtId}`} className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: districtColors[districtId! - 1] }}></span>
                    ));

                  return (
                    <div
                      key={suName}
                      className="su-item p-3 border-b cursor-pointer hover:bg-gray-100"
                      onClick={() => onSUClick(suName)}
                      onMouseEnter={() => onSUHover(suName)}
                      onMouseLeave={() => onSUHover(null)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate" title={suName}>{suName}</p>
                          <div className="dots-container mt-1 flex flex-wrap gap-1 h-auto">{dotsHtml}</div>
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{suData.totalStudents.toLocaleString()} students</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default LeftSidebar;