// src/components/HelpModal.tsx
import React, { useState } from 'react';

interface HelpModalProps {
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'howTo' | 'dataSources' | 'disclaimer'>('howTo');

  const TabButton: React.FC<{ tab: 'howTo' | 'dataSources' | 'disclaimer'; label: string }> = ({ tab, label }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
        ${activeTab === tab 
          ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
          : 'text-gray-500 hover:text-gray-700'
        }`}
    >
      {label}
    </button>
  );

  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center" 
      style={{ zIndex: 10003 }} // Increased z-index to ensure it's on top
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold" style={{ color: '#003300' }}>App Guide & Info</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="border-b border-gray-200 px-4">
          <nav className="-mb-px flex space-x-4">
            <TabButton tab="howTo" label="How to Use" />
            <TabButton tab="dataSources" label="Data Sources" />
            <TabButton tab="disclaimer" label="Disclaimer" />
          </nav>
        </div>

        <div className="p-6 overflow-y-auto text-gray-700">
          {activeTab === 'howTo' && (
            <div className="prose max-w-none text-sm">
              <h3 className="font-semibold text-lg mb-4">How to Use This Tool</h3>
              
              <p className="mb-4">This app uses Vermont's towns as the building blocks to create custom school districts. Enrollment numbers and grand list values are aggregated in real-time as you assign towns to districts, allowing you to model different scenarios.</p>

              <h4 className="font-semibold text-base mt-4 mb-2">Core Concepts</h4>
              <ul className="list-disc list-inside space-y-1 pl-4">
                  <li><strong>The Map:</strong> The central map displays all towns in Vermont. Click a town to assign it to your currently selected district.</li>
                  <li><strong>The District List (Right Sidebar):</strong> This is where you manage your custom districts. You can add, rename, reorder, and delete districts here.</li>
                  <li><strong>The Active District:</strong> One district in the list is always "active," indicated by a colored border. This is the district that towns will be assigned to when you click them on the map. Click on any district card to make it active.</li>
              </ul>

              <h4 className="font-semibold text-base mt-4 mb-2">Step-by-Step Guide</h4>
              <ol className="list-decimal list-inside space-y-2 pl-4">
                <li>
                  <strong>Start Fresh or Use a Preset:</strong>
                  <ul className="list-disc list-inside space-y-1 pl-6 mt-1">
                    <li>Begin with a blank slate of unassigned towns.</li>
                    <li>Or, use the "Optional" dropdown in the "About" tab to pre-populate districts based on existing County or RPC boundaries to save time.</li>
                  </ul>
                </li>
                <li>
                  <strong>Create and Name Your Districts:</strong>
                  <ul className="list-disc list-inside space-y-1 pl-6 mt-1">
                    <li>Click on the default title (e.g., "District 1") on a district card to give it a meaningful name.</li>
                    <li>The map starts with 10 districts. If you need to add more, use the "Add District" button.</li>
                  </ul>
                </li>
                <li>
                  <strong>Assign Towns:</strong>
                  <ul className="list-disc list-inside space-y-1 pl-6 mt-1">
                    <li>Select the district you want to assign towns to by clicking its card in the right sidebar.</li>
                    <li>On the map, click on individual towns to assign them. Their color will change to match the active district. Click again to unassign.</li>
                    <li>To assign many towns at once, go to the "Supervisory Unions" tab on the left and click an SU name to assign all of its towns.</li>
                  </ul>
                </li>
                <li>
                  <strong>Analyze and Explore:</strong>
                  <ul className="list-disc list-inside space-y-1 pl-6 mt-1">
                    <li>As you assign towns, the statistics on each district card (student count, town count, GL/student) will update instantly.</li>
                    <li>Click the `+` icon on a district card to expand it. This reveals a detailed list of all public and independent schools located within the towns you've assigned to that district, including their type and facility condition information.</li>
                  </ul>
                </li>
                <li>
                  <strong>Save and Share Your Work:</strong>
                  <ul className="list-disc list-inside space-y-1 pl-6 mt-1">
                    <li>Click the "More..." button to open the export options.</li>
                    <li><strong>Generate Report:</strong> Create a multi-page report comparing average daily membership, grand list values, member towns and other information.</li>
                    <li><strong>JPG Image:</strong> Download a high-resolution image of your map and a summary legend.</li>
                    <li><strong>Export District Assignments:</strong> Save a spreadsheet of your town-to-district assignments. This is the best way to save your work, as this file can be re-imported later using the "Import Assignments" option.</li>
                    <li><strong>Copy Shareable Link:</strong> Generate a unique URL that saves your entire map configuration. Anyone with the link can view and edit a copy of your map.</li>
                  </ul>
                </li>
              </ol>
            </div>
          )}

          {activeTab === 'dataSources' && (
            <div className="prose max-w-none text-sm text-gray-700">
                <h3 className="font-semibold text-lg mb-2">Data Source Information</h3>
                <p>All spatial data can be accessed at <a href="https://geodata.vermont.gov/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://geodata.vermont.gov/</a></p>
                <ul className="list-disc list-inside space-y-2 mt-4">
                    <li>
                        School Supervisory Unions (updated for FY2026)
                        (<a href="https://geodata.vermont.gov/datasets/309a32f3ef804c4ba986a3eb87df4e01_0/explore" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">link</a>)
                    </li>
                    <li>
                        Town Boundaries
                        (<a href="https://geodata.vermont.gov/datasets/3f464b0e1980450e9026430a635bff0a_0/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">link</a>)
                    </li>
                    <li>
                        Equalized Grand List data are projected for 2025 by the Tax Department. The values reflect the projected homestead exemption amounts by household from Act 73, Sec. 52 [<a href="https://legislature.vermont.gov/Documents/2026/Docs/ACTS/ACT073/ACT073 As Enacted.pdf#page=114" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">link</a>], based on FY25 homestead declaration data.
                    </li>
                    <li>
                        School data was compiled from the Agency of Education, the Joint Fiscal Office, and the National Center for Education Statistics. Town level student data is derived from Average Daily Membership by Resident District for FY25 as published by the Vermont Agency of Education (<a href="https://education.vermont.gov/sites/aoe/files/documents/edu-average-daily-membership-by-resident-district-fy25.xlsx" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">link</a>)
                    </li>
                    <li>
                        Independent Schools included in the application are those that meet the Act 73 criteria to be Eligible to Receive Public Tuition (<a href="https://education.vermont.gov/src/doc/content/independent-schools" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">link</a>)
                    </li>
                </ul>
            </div>
          )}

          {activeTab === 'disclaimer' && (
             <div className="prose max-w-none text-sm text-gray-700">
                <h3 className="font-semibold text-lg mb-2">Notice & Disclaimer</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    <strong>Informational Use Only:</strong> This application is intended for general planning and reference purposes, and to meet the requirements of <a href="https://legislature.vermont.gov/bill/status/2026/H.454" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">H.454 (Act 73) of 2025</a>.
                  </li>
                  <li>
                    <strong>Data Accuracy:</strong> The information provided may contain errors or omissions and should not be considered definitive or official.
                  </li>
                  <li>
                    <strong>Simplified Maps:</strong> To improve performance, features like town boundaries have been simplified and are not precise.
                  </li>
                </ul>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpModal;