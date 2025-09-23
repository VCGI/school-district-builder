// src/components/ReportComponent.tsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { ReportData } from '../types';

interface ReportComponentProps {
  reportData: ReportData[];
  onBack: () => void; // Function to go back to the map view
  unassignedTownsCount: number;
}

// --- Inline SVG Icons ---
const ChevronDown = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 ml-1 inline-block shrink-0"><path d="m6 9 6 6 6-6"/></svg>
);
const ChevronUp = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 ml-1 inline-block shrink-0"><path d="m18 15-6-6-6 6"/></svg>
);
const CheckIcon = () => <span className="text-green-500">✓</span>;
const XIcon = () => <span className="text-red-500">✕</span>;


// --- Reusable Sub-Components ---

const ChangeIndicator: React.FC<{ data: { year: string; value: number }[] }> = ({ data }) => {
    if (!data || data.length < 2) return <div className="text-center text-xs text-gray-400">N/A</div>;

    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;

    const percentageChange = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : (lastValue > 0 ? 100 : 0);

    const isIncrease = percentageChange > 0.1;
    const isDecrease = percentageChange < -0.1;
    const changeColor = isIncrease ? 'text-green-600' : isDecrease ? 'text-red-600' : 'text-gray-500';
    const Arrow = isIncrease ? '▲' : isDecrease ? '▼' : '▬';

    return (
        <div className="flex items-center justify-center w-full h-full px-2">
            <div className={`flex items-center font-semibold ${changeColor}`}>
                <span className="text-lg">{Arrow}</span>
                <span className="text-sm ml-1">{Math.abs(percentageChange).toFixed(1)}%</span>
            </div>
        </div>
    );
};


const DataBar: React.FC<{ value: number; maxValue: number; color: string }> = ({ value, maxValue, color }) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 mt-1">
      <div className="h-1.5 rounded-full" style={{ width: `${percentage}%`, backgroundColor: color }}></div>
    </div>
  );
};

const SchoolTypeChart: React.FC<{ data: { [key: string]: number }; max: number; isIndependent?: boolean }> = ({ data, max, isIndependent = false }) => {
    const publicSchoolTypes = ['Elementary', 'Middle School', 'Secondary', 'K-12'];
    const independentSchoolTypes = ['Elementary', 'Secondary'];
    const schoolTypes = isIndependent ? independentSchoolTypes : publicSchoolTypes;
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    if (total === 0) return <div className="text-center text-xs text-gray-400">N/A</div>;

    const colors = isIndependent ? ['#8884d8', '#ffc658'] : ['#8884d8', '#82ca9d', '#ffc658', '#ff8042'];

    const getLabel = (type: string) => {
        if (type === 'K-12') return 'K12';
        if (type === 'Middle School') return 'M';
        if (isIndependent) {
            if (type === 'Elementary') return 'E';
            if (type === 'Secondary') return 'S';
        }
        return type.substring(0, 1);
    }
    
    const titleText = isIndependent 
        ? `Eligible to Receive Public Tuition\n${schoolTypes.map(type => `${type}: ${data[type] || 0}`).join('\n')}`
        : schoolTypes.map(type => `${type}: ${data[type] || 0}`).join('\n');

    return (
        <div className={`flex items-end justify-center gap-2 h-16 ${isIndependent ? 'w-auto' : 'w-24'} mx-auto`} title={titleText}>
            {schoolTypes.map((type, index) => (
                <div key={type} className="flex flex-col items-center justify-end h-full">
                    <div className="w-4 rounded-sm" style={{ height: `${((data[type] || 0) / max) * 100}%`, backgroundColor: colors[index] }}></div>
                    <span className="text-xs mt-1">{getLabel(type)}</span>
                </div>
            ))}
        </div>
    );
};


const FciChart: React.FC<{ data: { good: number; fair: number; poor: number; veryPoor: number; } }> = ({ data }) => {
  const fciColors = {
    good: '#28a745',
    fair: '#ffc107',
    poor: '#fd7e14',
    veryPoor: '#dc3545',
  };
  const total = data.good + data.fair + data.poor + data.veryPoor;
  if (total === 0) return <div className="text-center text-xs text-gray-400">N/A</div>;

  const title = `Facility Condition Index:\n<10%: ${data.good}\n10.01%-30% (Nearing end of useful life): ${data.fair}\n30.01%-65% (Reached end of useful life): ${data.poor}\n>65% (Replacement of building to be considered): ${data.veryPoor}`;
  
  return (
    <div className="flex w-full h-4 rounded overflow-hidden bg-gray-200" title={title}>
      <div style={{ width: `${(data.good / total) * 100}%`, backgroundColor: fciColors.good }}></div>
      <div style={{ width: `${(data.fair / total) * 100}%`, backgroundColor: fciColors.fair }}></div>
      <div style={{ width: `${(data.poor / total) * 100}%`, backgroundColor: fciColors.poor }}></div>
      <div style={{ width: `${(data.veryPoor / total) * 100}%`, backgroundColor: fciColors.veryPoor }}></div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                <p className="font-bold text-gray-800 dark:text-gray-100">{label}</p>
                {payload.map((pld: any, index: number) => (
                    <p key={index} style={{ color: pld.color }} className="text-sm">
                        {`${pld.name}: ${formatter ? formatter(pld.value) : pld.value}`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const DistrictProfileCard = ({ district }: { district: ReportData & { grandListPerStudent: number; numSchools: number } }) => {
    const [schoolSortConfig, setSchoolSortConfig] = React.useState({ key: 'NAME', direction: 'ascending' });
    const [townSortConfig, setTownSortConfig] = React.useState({ key: 'name', direction: 'ascending' });
    const [indSchoolSortConfig, setIndSchoolSortConfig] = React.useState({ key: 'NAME', direction: 'ascending' });
    
    const numberFormatter = (value: number) => value ? value.toLocaleString() : '0';
    const currencyFormatter = (value: number) => `$${Math.round(value || 0).toLocaleString()}`;
    const sqMiFormatter = (value: number) => value ? value.toFixed(2) : '0.00';

    const townTotals = React.useMemo(() => {
        if (!district || !district.townsWithAdm) return { adm: 0, Home_E_Ed_GL_Act73: 0, NonHome_E_Ed_GL_Act73: 0, SqMi: 0 };
        return district.townsWithAdm.reduce((acc, town) => {
            acc.adm += town.adm;
            acc.Home_E_Ed_GL_Act73 += town.Home_E_Ed_GL_Act73;
            acc.NonHome_E_Ed_GL_Act73 += town.NonHome_E_Ed_GL_Act73;
            acc.SqMi += town.SqMi;
            return acc;
        }, { adm: 0, Home_E_Ed_GL_Act73: 0, NonHome_E_Ed_GL_Act73: 0, SqMi: 0 });
    }, [district]);

    const sortedTowns = React.useMemo(() => {
        if (!district || !district.townsWithAdm) return [];
        let sortableItems = [...district.townsWithAdm];
        if (townSortConfig !== null) {
            sortableItems.sort((a, b) => {
                const valA = (a as any)[townSortConfig.key] || 0;
                const valB = (b as any)[townSortConfig.key] || 0;
                if (valA < valB) return townSortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return townSortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [district, townSortConfig]);

    const sortedSchools = React.useMemo(() => {
        if (!district || !district.publicSchools) return [];
        let sortableItems = [...district.publicSchools];
        if (schoolSortConfig !== null) {
            sortableItems.sort((a, b) => {
                const valA = (a as any)[schoolSortConfig.key] || '';
                const valB = (b as any)[schoolSortConfig.key] || '';
                if (valA < valB) return schoolSortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return schoolSortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [district, schoolSortConfig]);

    const sortedIndSchools = React.useMemo(() => {
        if (!district || !district.independentSchools) return [];
        let sortableItems = [...district.independentSchools];
        if (indSchoolSortConfig !== null) {
            sortableItems.sort((a, b) => {
                const valA = (a as any)[indSchoolSortConfig.key] || '';
                const valB = (b as any)[indSchoolSortConfig.key] || '';
                if (valA < valB) return indSchoolSortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return indSchoolSortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [district, indSchoolSortConfig]);

    const requestSort = (key: string, table: 'schools' | 'towns' | 'indSchools') => {
        const configs = {
            schools: [schoolSortConfig, setSchoolSortConfig],
            towns: [townSortConfig, setTownSortConfig],
            indSchools: [indSchoolSortConfig, setIndSchoolSortConfig]
        };
        const [config, setConfig] = configs[table] as [any, React.Dispatch<any>];
        let direction = 'ascending';
        if (config.key === key && config.direction === 'ascending') direction = 'descending';
        setConfig({ key, direction });
    };
    
    const getSortIcon = (key: string, table: 'schools' | 'towns' | 'indSchools') => {
        const config = table === 'schools' ? schoolSortConfig : (table === 'towns' ? townSortConfig : indSchoolSortConfig);
        if (config.key !== key) return null;
        return config.direction === 'ascending' ? <ChevronUp /> : <ChevronDown />;
    };

    if (!district) return <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow">Please select a district to view its profile.</div>;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mt-6">
            <h3 className="text-2xl font-bold" style={{ color: district.color }}>{district.name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4 mb-6 text-center">
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg"><p className="text-sm text-gray-600 dark:text-gray-400">Total ADM</p><p className="text-2xl font-semibold text-gray-900 dark:text-white">{numberFormatter(district.adm)}</p></div>
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg"><p className="text-sm text-gray-600 dark:text-gray-400">Total Grand List</p><p className="text-2xl font-semibold text-gray-900 dark:text-white">{currencyFormatter(district.grandList)}</p></div>
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg"><p className="text-sm text-gray-600 dark:text-gray-400">Grand List / Student</p><p className="text-2xl font-semibold text-gray-900 dark:text-white">{currencyFormatter(district.grandListPerStudent)}</p></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              <div>
                <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Supervisory Union Status</h4>
                <p className="text-sm text-gray-600">Intact: {district.suStatus.intact.length}</p>
                <p className="text-sm text-gray-600">Divided: {district.suStatus.divided.length}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Regional Planning Commission Status</h4>
                <p className="text-sm text-gray-600">Intact: {district.rpcStatus.intact.length}</p>
                <p className="text-sm text-gray-600">Divided: {district.rpcStatus.divided.length}</p>
              </div>
            </div>
            <div className="mt-8 space-y-8">
                <div>
                    <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Towns Served ({district.townsWithAdm.length})</h4>
                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-4 py-2"><button onClick={() => requestSort('name', 'towns')} className="flex items-center font-semibold py-1">Town {getSortIcon('name', 'towns')}</button></th>
                                    <th className="px-4 py-2 text-right"><button onClick={() => requestSort('adm', 'towns')} className="flex items-center font-semibold w-full justify-end py-1">ADM {getSortIcon('adm', 'towns')}</button></th>
                                    <th className="px-4 py-2 text-right"><button onClick={() => requestSort('Home_E_Ed_GL_Act73', 'towns')} className="flex items-center font-semibold w-full justify-end py-1">Home Eq Ed GL {getSortIcon('Home_E_Ed_GL_Act73', 'towns')}</button></th>
                                    <th className="px-4 py-2 text-right"><button onClick={() => requestSort('NonHome_E_Ed_GL_Act73', 'towns')} className="flex items-center font-semibold w-full justify-end py-1">Non-Home Eq Ed GL {getSortIcon('NonHome_E_Ed_GL_Act73', 'towns')}</button></th>
                                    <th className="px-4 py-2 text-right"><button onClick={() => requestSort('SqMi', 'towns')} className="flex items-center font-semibold w-full justify-end py-1">Sq. Mi. {getSortIcon('SqMi', 'towns')}</button></th>
                                </tr>
                            </thead>
                            <tbody>{sortedTowns.map(town => (<tr key={town.name} className="border-t border-gray-200 dark:border-gray-700"><td className="px-4 py-2 font-medium text-gray-800 dark:text-gray-200">{town.name}</td><td className="px-4 py-2 text-right">{numberFormatter(town.adm)}</td><td className="px-4 py-2 text-right">{currencyFormatter(town.Home_E_Ed_GL_Act73)}</td><td className="px-4 py-2 text-right">{currencyFormatter(town.NonHome_E_Ed_GL_Act73)}</td><td className="px-4 py-2 text-right">{sqMiFormatter(town.SqMi)}</td></tr>))}</tbody>
                            <tfoot className="bg-gray-100 dark:bg-gray-700 font-semibold text-gray-800 dark:text-gray-200">
                                <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                                    <td className="px-4 py-2">Totals</td>
                                    <td className="px-4 py-2 text-right">{numberFormatter(townTotals.adm)}</td>
                                    <td className="px-4 py-2 text-right">{currencyFormatter(townTotals.Home_E_Ed_GL_Act73)}</td>
                                    <td className="px-4 py-2 text-right">{currencyFormatter(townTotals.NonHome_E_Ed_GL_Act73)}</td>
                                    <td className="px-4 py-2 text-right">{sqMiFormatter(townTotals.SqMi)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Public Schools ({district.publicSchools.length})</h4>
                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-4 py-2"><button onClick={() => requestSort('NAME', 'schools')} className="flex items-center font-semibold py-1">School Name {getSortIcon('NAME', 'schools')}</button></th>
                                    <th className="px-4 py-2"><button onClick={() => requestSort('TOWN', 'schools')} className="flex items-center font-semibold py-1">Town {getSortIcon('TOWN', 'schools')}</button></th>
                                    <th className="px-4 py-2"><button onClick={() => requestSort('Type', 'schools')} className="flex items-center font-semibold py-1">Type {getSortIcon('Type', 'schools')}</button></th>
                                    <th className="px-4 py-2"><button onClick={() => requestSort('Grades', 'schools')} className="flex items-center font-semibold py-1">Grades {getSortIcon('Grades', 'schools')}</button></th>
                                    <th className="px-4 py-2 text-right"><button onClick={() => requestSort('ENROLLMENT', 'schools')} className="flex items-center font-semibold w-full justify-end py-1">Enrollment {getSortIcon('ENROLLMENT', 'schools')}</button></th>
                                    <th className="px-4 py-2 text-right"><button onClick={() => requestSort('yearBuilt', 'schools')} className="flex items-center font-semibold w-full justify-end py-1">Year Built {getSortIcon('yearBuilt', 'schools')}</button></th>
                                    <th className="px-4 py-2 text-right"><button onClick={() => requestSort('fciCategory', 'schools')} className="flex items-center font-semibold w-full justify-end py-1">FCI Cat. {getSortIcon('fciCategory', 'schools')}</button></th>
                                </tr>
                            </thead>
                            <tbody>{sortedSchools.map(school => (<tr key={school.id} className="border-t border-gray-200 dark:border-gray-700"><td className="px-4 py-2 font-medium text-gray-800 dark:text-gray-200">{school.NAME}</td><td className="px-4 py-2">{school.TOWN}</td><td className="px-4 py-2">{school.Type}</td><td className="px-4 py-2">{school.Grades}</td><td className="px-4 py-2 text-right">{numberFormatter(school.ENROLLMENT)}</td><td className="px-4 py-2 text-right">{school.yearBuilt || 'N/A'}</td><td className="px-4 py-2 text-right font-mono">{school.fciCategory || 'N/A'}</td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
                 <div>
                    <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Independent Schools - Public Tuition Eligible ({district.independentSchools.length})</h4>
                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-4 py-2"><button onClick={() => requestSort('NAME', 'indSchools')} className="flex items-center font-semibold py-1">School Name {getSortIcon('NAME', 'indSchools')}</button></th>
                                    <th className="px-4 py-2"><button onClick={() => requestSort('TOWN', 'indSchools')} className="flex items-center font-semibold py-1">Town {getSortIcon('TOWN', 'indSchools')}</button></th>
                                    <th className="px-4 py-2"><button onClick={() => requestSort('Type', 'indSchools')} className="flex items-center font-semibold py-1">Type {getSortIcon('Type', 'indSchools')}</button></th>
                                    <th className="px-4 py-2"><button onClick={() => requestSort('Grades', 'indSchools')} className="flex items-center font-semibold py-1">Grades {getSortIcon('Grades', 'indSchools')}</button></th>
                                    <th className="px-4 py-2 text-right"><button onClick={() => requestSort('ENROLLMENT', 'indSchools')} className="flex items-center font-semibold w-full justify-end py-1">Enrollment {getSortIcon('ENROLLMENT', 'indSchools')}</button></th>
                                </tr>
                            </thead>
                            <tbody>{sortedIndSchools.map(school => (<tr key={school.id} className="border-t border-gray-200 dark:border-gray-700"><td className="px-4 py-2 font-medium text-gray-800 dark:text-gray-200">{school.NAME}</td><td className="px-4 py-2">{school.TOWN}</td><td className="px-4 py-2">{school.Type}</td><td className="px-4 py-2">{school.Grades}</td><td className="px-4 py-2 text-right">{numberFormatter(school.ENROLLMENT)}</td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};


const ReportComponent: React.FC<ReportComponentProps> = ({ reportData, onBack, unassignedTownsCount }) => {
    const [sortConfig, setSortConfig] = React.useState({ key: 'name', direction: 'ascending' });
    const [selectedDistrictId, setSelectedDistrictId] = React.useState(
        reportData && reportData.length > 0 ? reportData[0].id : null
    );

    const processedData = React.useMemo(() => {
        if (!reportData) return [];
        return reportData.map(d => {
            const firstValue = d.enrollmentHistory[0]?.enrollment || 0;
            const lastValue = d.enrollmentHistory[d.enrollmentHistory.length - 1]?.enrollment || 0;
            const enrollmentChangePercentage = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : (lastValue > 0 ? 100 : 0);
            
            const publicSchoolTypes = (d.publicSchools || []).reduce((acc: Record<string, number>, school) => {
                let type = school.Type || 'Other';
                if (type === 'Middle') type = 'Middle School';
                if (type !== 'CTE') {
                    acc[type] = (acc[type] || 0) + 1;
                }
                return acc;
            }, {});

            const independentSchoolTypes = (d.independentSchools || []).reduce((acc: Record<string, number>, school) => {
                const type = school.Type || 'Other';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});

            return {
                ...d,
                grandListPerStudent: d.adm > 0 ? d.grandList / d.adm : 0,
                numSchools: d.publicSchools ? d.publicSchools.length : 0,
                enrollmentChangePercentage: enrollmentChangePercentage,
                publicSchoolTypes,
                independentSchoolTypes,
            };
        });
    }, [reportData]);

    const sortedAdmData = React.useMemo(() => {
        return [...processedData].sort((a, b) => b.adm - a.adm);
    }, [processedData]);

    const sortedGrandListPerStudentData = React.useMemo(() => {
        return [...processedData].sort((a, b) => b.grandListPerStudent - a.grandListPerStudent);
    }, [processedData]);
    
    const maxValues = React.useMemo(() => {
        if (!processedData || processedData.length === 0) {
            return { townCount: 0, adm: 0, grandListPerStudent: 0, totalEEdGL: 0, schoolType: 0 };
        }
        const maxSchoolType = Math.max(1, ...processedData.flatMap(d => [
            ...Object.values(d.publicSchoolTypes),
            ...Object.values(d.independentSchoolTypes)
        ]));
        return {
            townCount: Math.max(...processedData.map(d => d.townCount)),
            adm: Math.max(...processedData.map(d => d.adm)),
            grandListPerStudent: Math.max(...processedData.map(d => d.grandListPerStudent)),
            totalEEdGL: Math.max(...processedData.map(d => d.totalEEdGL)),
            schoolType: maxSchoolType
        };
    }, [processedData]);

    const sortedTableData = React.useMemo(() => {
        let sortableItems = [...processedData];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const key = sortConfig.key as keyof typeof a;
                let valA: any, valB: any;

                if (key === 'enrollmentHistory') {
                    valA = a.enrollmentChangePercentage;
                    valB = b.enrollmentChangePercentage;
                } else if (key === 'publicSchoolTypes' || key === 'independentSchoolTypes') {
                    valA = Object.keys(a[key]).length;
                    valB = Object.keys(b[key]).length;
                }
                else {
                    valA = a[key] || 0;
                    valB = b[key] || 0;
                }

                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [processedData, sortConfig]);
    
    const requestSort = (key: string) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? <ChevronUp /> : <ChevronDown />;
    };
    
    const overviewTableHeaders = [
        { key: 'name', label: 'District Name' },
        { key: 'adm', label: 'ADM' },
        { key: 'enrollmentHistory', label: '10-Year Change' },
        { key: 'totalEEdGL', label: 'Total Eq Ed GL' },
        { key: 'publicSchoolTypes', label: 'Public Schools by Type'},
        { key: 'independentSchoolTypes', label: 'Ind. Schools' },
        { key: 'fciCounts', label: 'FCI Categories' },
        { key: 'suStatus', label: 'SU INTACT' },
    ];

    const currencyBillionFormatter = (value: number) => `$${(Math.round((value || 0) / 100000000) / 10).toFixed(1)}B`;
    const numberFormatter = (value: number) => value ? value.toLocaleString() : '0';
    const fullCurrencyFormatter = (value: number) => `$${Math.round(value || 0).toLocaleString()}`;

    const exportReportToCsv = () => {
      let csvContent = "District Name,ADM,10-Year Change (%),Total Eq Ed GL,Elementary Schools,Middle Schools,Secondary Schools,K-12 Schools,Independent Elementary Schools,Independent Secondary Schools,FCI <10%,FCI 10-30%,FCI 30-65%,FCI >65%,SU Intact,SU Divided,Intact SUs,Divided SUs\r\n";
      sortedTableData.forEach(item => {
        const row = [
          `"${item.name}"`,
          item.adm,
          item.enrollmentChangePercentage.toFixed(2),
          item.totalEEdGL,
          item.publicSchoolTypes['Elementary'] || 0,
          item.publicSchoolTypes['Middle School'] || 0,
          item.publicSchoolTypes['Secondary'] || 0,
          item.publicSchoolTypes['K-12'] || 0,
          item.independentSchoolTypes['Elementary'] || 0,
          item.independentSchoolTypes['Secondary'] || 0,
          item.fciCounts.good,
          item.fciCounts.fair,
          item.fciCounts.poor,
          item.fciCounts.veryPoor,
          item.suStatus.intact.length,
          item.suStatus.divided.length,
          `"${item.suStatus.intact.join(', ')}"`,
          `"${item.suStatus.divided.join(', ')}"`
        ].join(',');
        csvContent += row + "\r\n";
      });
  
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      const date = new Date().toISOString().slice(0, 10);
      const fileName = `district_report_${date}.csv`;
      
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    // Find the selected district object safely
    const selectedDistrict = processedData.find(d => d.id === selectedDistrictId);

    return (
        <div className="bg-gray-50 dark:bg-gray-900 h-screen overflow-y-auto font-sans">
            <div className="sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div>
                            <h1 className="text-3xl lg:text-4xl font-bold" style={{ color: '#003300' }}>School District Builder Report</h1>
                            <p className="mt-1 text-base text-gray-600 dark:text-gray-400">An overview of key metrics for all districts.</p>
                        </div>
                        <button onClick={onBack} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded shrink-0 ml-4">
                            Back to Map
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {unassignedTownsCount > 0 && (
                    <div className="my-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700" role="alert">
                        <p className="font-bold">Warning</p>
                        <p>{unassignedTownsCount} town(s) are not assigned to any district and are not included in this report.</p>
                    </div>
                )}
                <div className="pt-10">
                    <div className="mb-12">
                        <h2 className="text-3xl font-semibold pb-1 border-b-2 border-gray-300 mb-6" style={{ color: '#003300' }}>District Overview</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"><h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Average Daily Membership (FY25)</h3><ResponsiveContainer width="100%" height={350}><BarChart data={sortedAdmData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" /><XAxis dataKey="name" tick={{ fill: '#6b7280' }} fontSize={12} interval={0} angle={-45} textAnchor="end" height={100} /><YAxis tick={{ fill: '#6b7280' }} tickFormatter={numberFormatter} /><Tooltip content={<CustomTooltip formatter={numberFormatter} />} cursor={{fill: 'rgba(239, 246, 255, 0.5)'}} /><Bar dataKey="adm" name="ADM" radius={[4, 4, 0, 0]}>{processedData.map((entry) => (<Cell key={`cell-${entry.id}`} fill={entry.color || '#8884d8'} />))}</Bar></BarChart></ResponsiveContainer></div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"><h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Grand List per Student (2025-Projected)</h3><ResponsiveContainer width="100%" height={350}><BarChart data={sortedGrandListPerStudentData} margin={{ top: 5, right: 20, left: 50, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" /><XAxis dataKey="name" tick={{ fill: '#6b7280' }} fontSize={12} interval={0} angle={-45} textAnchor="end" height={100} /><YAxis tick={{ fill: '#6b7280' }} tickFormatter={fullCurrencyFormatter} /><Tooltip content={<CustomTooltip formatter={fullCurrencyFormatter} />} cursor={{fill: 'rgba(239, 246, 255, 0.5)'}} /><Bar dataKey="grandListPerStudent" name="GL / Student" radius={[4, 4, 0, 0]}>{processedData.map((entry) => (<Cell key={`cell-${entry.id}`} fill={entry.color || '#82ca9d'} />))}</Bar></BarChart></ResponsiveContainer></div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                            <div className="p-6">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">District Data Table</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Click headers to sort.</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr>
                                            {overviewTableHeaders.map((header) => (
                                                <th key={header.key} scope="col" className="px-6 py-3 whitespace-nowrap">
                                                    <button onClick={() => requestSort(header.key)} className="flex items-center uppercase font-semibold py-1">
                                                        {header.label}
                                                        {getSortIcon(header.key)}
                                                    </button>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedTableData.map((item) => (
                                            <tr key={item.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                                <td className="px-6 py-4 font-medium" style={{ color: item.color }}>{item.name}</td>
                                                <td className="px-6 py-4"><div>{numberFormatter(item.adm)}</div><DataBar value={item.adm} maxValue={maxValues.adm} color={item.color} /></td>
                                                <td className="px-6 py-4 w-48">
                                                    <ChangeIndicator
                                                        data={item.enrollmentHistory.map(d => ({ year: d.year, value: d.enrollment }))}
                                                    />
                                                </td>
                                                <td className="px-6 py-4"><div>{currencyBillionFormatter(item.totalEEdGL)}</div><DataBar value={item.totalEEdGL} maxValue={maxValues.totalEEdGL} color={item.color} /></td>
                                                <td className="px-6 py-4"><SchoolTypeChart data={item.publicSchoolTypes} max={maxValues.schoolType} /></td>
                                                <td className="px-6 py-4"><SchoolTypeChart data={item.independentSchoolTypes} max={maxValues.schoolType} isIndependent={true} /></td>
                                                <td className="px-6 py-4"><FciChart data={item.fciCounts} /></td>
                                                <td className="px-6 py-4 text-center"><div title={`Intact: ${item.suStatus.intact.join(', ')}\nDivided: ${item.suStatus.divided.join(', ')}`}><CheckIcon /> {item.suStatus.intact.length} <XIcon /> {item.suStatus.divided.length}</div></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                                <button
                                onClick={exportReportToCsv}
                                className="text-sm text-blue-600 hover:underline"
                                >
                                Export this table to CSV
                                </button>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-semibold pb-1 border-b-2 border-gray-300 mb-6 mt-12" style={{ color: '#003300' }}>District Profiles</h2>
                         <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select a District to View Profile:</label>
                            <div className="flex flex-wrap gap-2">
                                {processedData.map(d => (
                                    <button
                                        key={d.id}
                                        onClick={() => setSelectedDistrictId(d.id)}
                                        className={`px-3 py-1 text-sm font-semibold rounded-full transition-all duration-150 ${
                                            selectedDistrictId === d.id
                                                ? 'text-white shadow-md scale-105'
                                                : 'text-gray-800'
                                        }`}
                                        style={{ 
                                            backgroundColor: d.color,
                                            border: selectedDistrictId === d.id ? `2px solid rgba(0,0,0,0.3)` : `2px solid transparent`
                                        }}
                                    >
                                        {d.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {selectedDistrict && <DistrictProfileCard district={selectedDistrict} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportComponent;