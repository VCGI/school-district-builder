// src/components/RightSidebar.tsx
import React, { useState } from 'react';
// Use 'import type' for type-only imports
import type { AllDistrictStats, DistrictNames, SchoolDetailsByTown, SchoolDetail } from '../types';
import { districtColors, MAX_DISTRICTS } from '../constants';

interface RightSidebarProps {
  districtOrder: number[];
  activeDistrict: number;
  allDistrictStats: AllDistrictStats;
  districtNames: DistrictNames;
  schoolDetails: SchoolDetailsByTown;
  independentSchoolDetails: SchoolDetailsByTown; // New prop for independent schools
  mapName: string;
  onMapNameChange: (name: string) => void;
  onAddDistrict: () => void;
  onDistrictSelect: (id: number) => void;
  onDistrictNameChange: (id: number, name: string) => void;
  onDistrictHover: (id: number | null) => void;
  onExportShare: () => void;
  onImport: () => void;
  onReset: () => void;
  onDeleteDistrict: (id: number) => void;
  draggedDistrict: number | null;
  dropIndex: number | null;
  onDistrictDragStart: (id: number) => void;
  onDistrictDragEnd: () => void;
  onDropInZone: (targetIndex: number) => void;
  onDragEnterDropZone: (targetIndex: number) => void;
  onGenerateReport: () => void;
}

const PlusIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
    </svg>
);

const MinusIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z"/>
    </svg>
);

const TrashIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
        <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
    </svg>
);

const fciData: { [key: string]: { color: string; description: string } } = {
  "<10%": { color: '#28a745', description: '<10%' },
  "10.01-30%": { color: '#ffc107', description: '10.01%-30% (Nearing end of useful life)' },
  "30.01-65%": { color: '#fd7e14', description: '30.01%-65% (Reached end of useful life – substantial renewal investment to be considered)' },
  ">65%": { color: '#dc3545', description: '>65% (Replacement of building to be considered)' },
};

const FciDot: React.FC<{ fciCategory?: string }> = ({ fciCategory }) => {
  if (!fciCategory || !fciData[fciCategory]) return null;

  const { color, description } = fciData[fciCategory];
  const title = `Facilities Condition Index\n${description}`;
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full ml-2"
      style={{ backgroundColor: color }}
      title={title}
    ></span>
  );
};

const EnrollmentBar: React.FC<{ enrollment: number; maxEnrollment: number; color: string }> = ({ enrollment, maxEnrollment, color }) => {
  const percentage = Math.min((enrollment / maxEnrollment) * 100, 100);
  
  const isLabelInside = percentage > 90;

  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '0.7rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    padding: '0 4px',
  };

  if (isLabelInside) {
    labelStyle.right = '2px';
    labelStyle.color = 'white';
  } else {
    labelStyle.left = `${percentage}%`;
    labelStyle.color = '#374151'; // text-gray-700
  }

  return (
    <div className="relative w-full h-5 my-1">
      <div className="rounded-full h-3 w-full absolute top-1/2 -translate-y-1/2">
        <div
          className="h-3 rounded-full"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        ></div>
         <span style={labelStyle}>
          {enrollment || 'N/A'}
        </span>
      </div>
    </div>
  );
};

const RightSidebar: React.FC<RightSidebarProps> = ({
  districtOrder, activeDistrict, allDistrictStats,
  districtNames, schoolDetails, independentSchoolDetails, mapName, onMapNameChange, onAddDistrict, onDistrictSelect, onDistrictNameChange, onDistrictHover,
  onExportShare, onImport, onReset, onDeleteDistrict, draggedDistrict, dropIndex, onDistrictDragStart,
  onDistrictDragEnd, onDropInZone, onDragEnterDropZone, onGenerateReport
}) => {

  const [expandedDistrict, setExpandedDistrict] = useState<number | null>(null);
  const [expandedSchoolTypes, setExpandedSchoolTypes] = useState<Set<string>>(new Set());
  const [isMoreActionsOpen, setMoreActionsOpen] = useState(false);

  const handleToggleExpand = (districtId: number) => {
    setExpandedDistrict(prev => (prev === districtId ? null : districtId));
  };

  const handleToggleSchoolTypeExpand = (key: string) => {
    setExpandedSchoolTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  return (
    <aside className="w-full h-full flex flex-col shadow-lg bg-gray-50 p-4 md:p-6">
      <div className="mb-4 flex-grow flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-semibold">Districts</h2>
              <input
                type="text"
                placeholder="Enter Map Name"
                value={mapName}
                onChange={(e) => onMapNameChange(e.target.value)}
                className="text-right bg-transparent text-gray-500 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-2 py-1 text-sm w-1/2"
              />
          </div>
          <div id="district-selector-container" className="scrollable-list overflow-y-auto pr-4">
            <div
                onDragOver={(e) => { e.preventDefault(); onDragEnterDropZone(0); }}
                onDrop={() => onDropInZone(0)}
                className="py-4 -my-4"
              >
                <div className={`h-1.5 rounded-lg transition-all ${dropIndex === 0 ? 'bg-blue-400' : ''}`}></div>
              </div>
            {districtOrder.map((districtId, index) => {
              const stats = allDistrictStats[districtId] || { townCount: 0, studentTotal: 0, totalGL: 0, totalPublicSchools: 0, towns: [] };
              const glPerStudent = stats.studentTotal > 0 ? stats.totalGL / stats.studentTotal : 0;
              const formattedGlPerStudent = `$${Math.floor(glPerStudent).toLocaleString('en-US')}`;
              const isActive = activeDistrict === districtId;
              const isExpanded = expandedDistrict === districtId;

              // Public Schools
              const schoolsInDistrict = stats.towns.flatMap((townName: string) => schoolDetails[townName.toUpperCase()] || []);
              const schoolsByType = schoolsInDistrict.reduce((acc, school) => {
                  const schoolType = school.Type || 'Uncategorized';
                  if (!acc[schoolType]) acc[schoolType] = [];
                  acc[schoolType].push(school);
                  return acc;
              }, {} as Record<string, SchoolDetail[]>);

              // Independent Schools
              const independentSchoolsInDistrict = stats.towns.flatMap((townName: string) => independentSchoolDetails[townName.toUpperCase()] || []);
              const independentSchoolsByType = independentSchoolsInDistrict.reduce((acc, school) => {
                  const schoolType = school.Type || 'Uncategorized';
                  if (!acc[schoolType]) acc[schoolType] = [];
                  acc[schoolType].push(school);
                  return acc;
              }, {} as Record<string, SchoolDetail[]>);
              

              const typeSortOrder = ['K-12', 'Elementary', 'Middle School', 'Secondary'];
              const sortSchoolTypes = (schoolTypes: Record<string, SchoolDetail[]>) => Object.keys(schoolTypes).sort((a, b) => {
                  if (a === 'CTE') return 1; if (b === 'CTE') return -1;
                  const aIndex = typeSortOrder.indexOf(a); const bIndex = typeSortOrder.indexOf(b);
                  if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                  if (aIndex !== -1) return -1; if (bIndex !== -1) return 1;
                  return a.localeCompare(b);
              });

              const sortedSchoolTypes = sortSchoolTypes(schoolsByType);
              const sortedIndependentSchoolTypes = sortSchoolTypes(independentSchoolsByType);

              return (
                <React.Fragment key={districtId}>
                <div
                    className={`relative p-3 rounded-lg transition-all my-2 cursor-pointer ${
                    isActive ? 'bg-blue-50 border-2 shadow-lg' : 'bg-white border'
                    } ${draggedDistrict === districtId ? 'opacity-50' : ''}`}
                    style={{
                    borderColor: isActive
                        ? districtColors[districtId - 1]
                        : `${districtColors[districtId - 1]}80`,
                    }}
                    onMouseEnter={() => onDistrictHover(districtId)}
                    onMouseLeave={() => onDistrictHover(null)}
                    onClick={() => onDistrictSelect(districtId)}
                >
                    <div className='flex items-start gap-2'>
                        <div
                            draggable="true"
                            onDragStart={(e) => { e.stopPropagation(); onDistrictDragStart(districtId); }}
                            onDragEnd={(e) => { e.stopPropagation(); onDistrictDragEnd(); }}
                            className="w-2 self-stretch flex-shrink-0 rounded-full cursor-move"
                            style={{ backgroundColor: districtColors[districtId - 1] }}
                        ></div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline">
                                <input
                                  type="text"
                                  value={districtNames[districtId] || ''}
                                  placeholder="Type District Name"
                                  onChange={(e) => { e.stopPropagation(); onDistrictNameChange(districtId, e.target.value); }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-semibold truncate bg-transparent flex-1 min-w-0 p-0 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-300 rounded placeholder-gray-200"
                                  style={{color: districtColors[districtId-1]}}
                                />
                                <span className="text-xs font-bold text-gray-600 ml-2 flex-shrink-0 whitespace-nowrap">
                                    {stats.studentTotal.toLocaleString()} students
                                </span>
                            </div>
                            <div className="flex justify-between items-baseline text-xs text-gray-500 mt-1">
                                <span>Proj 2025 Grand List per Student: {formattedGlPerStudent}</span>
                            </div>
                            <div className="mt-1 flex items-baseline gap-2">
                               <span className="text-xs text-gray-500 flex-shrink-0">Towns:</span>
                               <div className="flex flex-wrap gap-1 items-center">
                                  {stats.towns.map(townId => (
                                      <span key={townId} className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: districtColors[districtId - 1] }}></span>
                                  ))}
                               </div>
                            </div>
                        </div>

                        <button
                            onClick={(e) => { e.stopPropagation(); handleToggleExpand(districtId); }}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-100 transition-colors flex-shrink-0"
                            title={isExpanded ? 'Collapse details' : 'Expand details'}
                        >
                            {isExpanded ? <MinusIcon /> : <PlusIcon />}
                        </button>
                    </div>

                    {isExpanded && (
                        <div className="mt-4 pt-3 border-t border-gray-200 animate-fade-in pb-6 pl-4">
                            {/* Public Schools Section */}
                            <h4 className="font-bold mb-2 text-sm">Public Schools in District ({schoolsInDistrict.length})</h4>
                            {schoolsInDistrict.length > 0 ? (
                                <div className="space-y-3 text-xs pr-2">
                                    {sortedSchoolTypes.map(schoolType => {
                                        const schoolTypeKey = `${districtId}-public-${schoolType}`;
                                        const isSchoolTypeExpanded = expandedSchoolTypes.has(schoolTypeKey);
                                        return (
                                            <div key={schoolTypeKey}>
                                                <div className="flex items-center">
                                                    <button onClick={() => handleToggleSchoolTypeExpand(schoolTypeKey)} className="p-1 text-gray-400 hover:text-blue-600">
                                                        {isSchoolTypeExpanded ? <MinusIcon /> : <PlusIcon />}
                                                    </button>
                                                    <p className="font-semibold text-gray-700">{schoolType} ({schoolsByType[schoolType].length})</p>
                                                </div>
                                                {isSchoolTypeExpanded && (
                                                    <ul className="list-none pl-4 mt-1 space-y-3">
                                                        {schoolsByType[schoolType]
                                                            .sort((a, b) => a.NAME.localeCompare(b.NAME))
                                                            .map(school => (
                                                                <li key={school.NAME}>
                                                                    <span>{school.NAME} <i className="text-gray-600">({school.TOWN})</i></span>
                                                                    <EnrollmentBar enrollment={school.ENROLLMENT || 0} maxEnrollment={1400} color={districtColors[districtId - 1]} />
                                                                    <div className="italic text-gray-600 text-xs flex items-center">
                                                                        {school.yearBuilt && <span>Built: {school.yearBuilt}</span>}
                                                                        {school.yearBuilt && school.fciCategory && <span className='mx-1'>|</span>}
                                                                        {school.fciCategory && <span>Facilities Condition Index:</span>}
                                                                        <FciDot fciCategory={school.fciCategory} />
                                                                    </div>
                                                                </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : <p className="text-gray-500 text-xs">No open public schools listed in this district's towns.</p>}

                            {/* Independent Schools Section */}
                            <h4 className="font-bold mb-2 text-sm mt-4">Independent (Eligible) Schools in District ({independentSchoolsInDistrict.length})</h4>
                            {independentSchoolsInDistrict.length > 0 ? (
                                <div className="space-y-3 text-xs pr-2">
                                    {sortedIndependentSchoolTypes.map(schoolType => {
                                        const schoolTypeKey = `${districtId}-independent-${schoolType}`;
                                        const isSchoolTypeExpanded = expandedSchoolTypes.has(schoolTypeKey);
                                        return (
                                            <div key={schoolTypeKey}>
                                                <div className="flex items-center">
                                                    <button onClick={() => handleToggleSchoolTypeExpand(schoolTypeKey)} className="p-1 text-gray-400 hover:text-blue-600">
                                                        {isSchoolTypeExpanded ? <MinusIcon /> : <PlusIcon />}
                                                    </button>
                                                    <p className="font-semibold text-gray-700">{schoolType} ({independentSchoolsByType[schoolType].length})</p>
                                                </div>
                                                {isSchoolTypeExpanded && (
                                                    <ul className="list-none pl-4 mt-1 space-y-3">
                                                        {independentSchoolsByType[schoolType]
                                                            .sort((a, b) => a.NAME.localeCompare(b.NAME))
                                                            .map(school => (
                                                                <li key={school.NAME}>
                                                                    <span>{school.NAME} <i className="text-gray-600">({school.TOWN})</i></span>
                                                                </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : <p className="text-gray-500 text-xs">No open independent schools listed in this district's towns.</p>}
                        </div>
                    )}

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onDeleteDistrict(districtId);
                        }}
                        className="absolute bottom-1 right-1 p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors"
                        title={`Remove ${districtNames[districtId] || `District ${districtId}`}`}
                    >
                        <TrashIcon />
                    </button>
                </div>
                 <div
                  onDragOver={(e) => { e.preventDefault(); onDragEnterDropZone(index + 1); }}
                  onDrop={() => onDropInZone(index + 1)}
                  className="py-4 -my-4"
                >
                  <div className={`h-1.5 rounded-lg transition-all ${dropIndex === index + 1 ? 'bg-blue-400' : ''}`}></div>
                </div>
                </React.Fragment>
              )
            })}
          </div>
      </div>

      <div className="mt-auto flex-shrink-0 flex flex-col gap-2">
          <button
            onClick={onGenerateReport}
            className="w-full text-white font-bold py-2 px-4 rounded-lg transition-colors"
            style={{backgroundColor: '#457a7c'}}>
            Generate Report
          </button>
          <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onAddDistrict}
                disabled={districtOrder.length >= MAX_DISTRICTS}
                className="text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                style={{backgroundColor: '#225d39'}}>
                Add District
              </button>
              <div className="relative">
                <button
                  onClick={() => setMoreActionsOpen(!isMoreActionsOpen)}
                  className="w-full bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  More...
                </button>
                {isMoreActionsOpen && (
                  <div
                    className="origin-bottom-right absolute right-0 bottom-full mb-2 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
                    onMouseLeave={() => setMoreActionsOpen(false)}
                  >
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      <a href="#" onClick={(e) => { e.preventDefault(); onExportShare(); setMoreActionsOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Export & Share</a>
                      <a href="#" onClick={(e) => { e.preventDefault(); onImport(); setMoreActionsOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Import Assignments</a>
                      <a href="#" onClick={(e) => { e.preventDefault(); onReset(); setMoreActionsOpen(false); }} className="block px-4 py-2 text-sm text-red-700 hover:bg-red-50" role="menuitem">Reset Map</a>
                    </div>
                  </div>
                )}
              </div>
          </div>
      </div>
    </aside>
  );
};

export default RightSidebar;