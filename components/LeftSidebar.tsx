
import React from 'react';
import { Tab, SupervisoryUnions, Assignments } from '../types';
import { districtColors } from '../constants';

interface LeftSidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  sortedSUs: string[];
  supervisoryUnions: SupervisoryUnions;
  assignments: Assignments;
  onSUClick: (suName: string) => void;
  onSUHover: (suName: string | null) => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeTab, onTabChange, sortedSUs, supervisoryUnions, assignments, onSUClick, onSUHover
}) => {

  const TabButton: React.FC<{tab: Tab, label: string}> = ({ tab, label }) => (
    <button
      onClick={() => onTabChange(tab)}
      className={`tab-button flex-1 ${activeTab === tab ? 'active' : ''}`}
    >
      {label}
    </button>
  );

  return (
    <aside className="w-full lg:w-1/4 h-1/4 lg:h-full flex flex-col shadow-lg bg-gray-50 order-2 lg:order-1">
      <div style={{ backgroundColor: '#003300' }} className="px-4 py-2 flex items-center justify-start text-white flex-shrink-0">
        <img src="https://files.vcgi.vermont.gov/logo/vermont-logo-white.png" alt="State of Vermont" style={{ height: '18px', width: 'auto' }} />
      </div>
      <div className="p-4 border-b flex-shrink-0">
        <h1 className="text-xl font-bold">School District Builder</h1>
        <p className="text-xs text-gray-500 -mt-1">DEMO v0.1</p>
      </div>

      <div className="flex border-b flex-shrink-0">
        <TabButton tab={Tab.About} label="About" />
        <TabButton tab={Tab.SupervisoryUnions} label="Supervisory Unions" />
      </div>

      <div className="flex-grow overflow-y-auto relative">
        {activeTab === Tab.About && (
          <div className="p-4 animate-fade-in">
            <h2 className="text-lg font-semibold mb-2">Welcome!</h2>
            <p className="text-sm text-gray-600 mb-4">
              This tool allows you to create and visualize custom school district maps for Vermont.
            </p>
            <h3 className="font-semibold mb-2">How to Use:</h3>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
              <li><strong>Select a District:</strong> Choose an active district from the list on the right.</li>
              <li><strong>Assign Towns:</strong> Click on towns on the map or entire Supervisory Unions from the list to assign them to your selected district. Click again to unassign.</li>
              <li><strong>Manage Districts:</strong> Use the controls on the right to add new districts, name your map, or start from a preset configuration.</li>
              <li><strong>Share & Export:</strong> When your map is ready, use the 'Export & Share' button to get a unique link or download your work.</li>
            </ol>
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-sm text-yellow-800 mb-2">Beta Notice & Disclaimer</h3>
              <ul className="list-disc list-inside text-xs text-yellow-700 space-y-1">
                <li><strong>For Informational Use Only:</strong> This application is a work in progress.</li>
                <li><strong>Data Accuracy:</strong> Information may contain errors or omissions and should not be considered official.</li>
                <li><strong>Simplified Maps:</strong> To improve performance, features like town boundaries have been simplified.</li>
              </ul>
            </div>
          </div>
        )}
        {activeTab === Tab.SupervisoryUnions && (
          <div className="scrollable-list">
            {sortedSUs.map(suName => {
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
        )}
      </div>
    </aside>
  );
};

export default LeftSidebar;
