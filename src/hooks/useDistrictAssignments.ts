// src/hooks/useDistrictAssignments.ts
// Owns the core district-building domain: which town belongs to which district, district
// naming/ordering, the active district for map clicks, and district delete/drag/CSV-import
// flows. This is the largest state cluster in the app, extracted last among the App.tsx state
// hooks since resetApplication/handlePresetChange interact with state that the data-loading and
// URL-sync hooks already own.
import { useCallback, useState } from 'react';
import { MAX_DISTRICTS, INITIAL_DISTRICTS } from '../constants';
import { initializeDistrictNames } from '../urlState';
import type { Assignments, DistrictNames, SupervisoryUnions, TownData } from '../types';

export interface UseDistrictAssignmentsParams {
  townData: TownData;
  supervisoryUnions: SupervisoryUnions;
  setMapName: (name: string) => void;
  showNotification: (message: string, isError?: boolean) => void;
}

export const useDistrictAssignments = ({
  townData, supervisoryUnions, setMapName, showNotification,
}: UseDistrictAssignmentsParams) => {
  const [assignments, setAssignments] = useState<Assignments>({});
  const [districtNames, setDistrictNames] = useState<DistrictNames>({});
  const [districtOrder, setDistrictOrder] = useState<number[]>(() => Array.from({ length: INITIAL_DISTRICTS }, (_, i) => i + 1));
  const [activeDistrict, setActiveDistrict] = useState<number>(1);
  const [districtToDelete, setDistrictToDelete] = useState<number | null>(null);
  const [draggedDistrict, setDraggedDistrict] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

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
    if (districtOrder.length >= MAX_DISTRICTS) return;

    let newDistrictId = 1;
    const sortedOrder = [...districtOrder].sort((a,b)=>a-b);
    for (const id of sortedOrder) {
        if (id === newDistrictId) {
            newDistrictId++;
        } else {
            break;
        }
    }

    if (newDistrictId <= MAX_DISTRICTS) {
        setDistrictOrder(prev => [...prev, newDistrictId]);
        setDistrictNames(prev => ({...prev, [newDistrictId]: `District ${newDistrictId}`}));
    }
  }, [districtOrder]);

  const handleDistrictNameChange = (id: number, name: string) => {
    setDistrictNames(prev => ({ ...prev, [id]: name }));
  };

  const resetApplication = useCallback(() => {
    setAssignments(prev => {
      const reset = { ...prev };
      Object.keys(reset).forEach(key => { reset[key] = null; });
      return reset;
    });
    const initialOrder = Array.from({ length: INITIAL_DISTRICTS }, (_, i) => i + 1);
    setDistrictOrder(initialOrder);
    setDistrictNames(initializeDistrictNames(initialOrder));
    setActiveDistrict(1);
    setMapName('');
    const url = new URL(window.location.toString());
    url.searchParams.delete('data');
    window.history.pushState({}, '', url);
  }, [setMapName]);

  const handlePresetChange = useCallback((field: string) => {
    const presetSelector = document.getElementById('preset-selector') as HTMLSelectElement;
    if (presetSelector) {
        presetSelector.value = field;
    }

    if (field === 'blank') {
      resetApplication();
      return;
    }

    const rpcMapping: { [key: string]: string } = {
      "AC": "Addison County RPC", "BC": "Bennington County RC", "CV": "Central Vermont RPC",
      "CC": "Chittenden County RPC", "NW": "Northwest RPC", "LC": "Lamoille County PC",
      "NV": "Northeastern Vermont Dev. Assoc.", "RR": "Rutland RPC", "MA": "Mount Ascutney RC",
      "TR": "Two Rivers-Ottauquechee RC", "WR": "Windham RC"
    };

    let uniqueValues = [...new Set(Object.values(townData).map(town => town[field]))].sort();

    if (field === 'RPC') {
        uniqueValues = uniqueValues.map(val => rpcMapping[val] || val);
    }

    const valueToDistrictIdMap: { [key: string]: number } = {};
    const newOrder = uniqueValues.slice(0, MAX_DISTRICTS).map((_, index) => index + 1);

    uniqueValues.forEach((value, index) => {
      if (index < MAX_DISTRICTS) {
        valueToDistrictIdMap[value] = index + 1;
      }
    });

    setDistrictOrder(newOrder);
    setAssignments(() => {
      const newAssignments: Assignments = {};
      for (const townId in townData) {
        let value = townData[townId][field];
        if (field === 'RPC') {
          value = rpcMapping[value] || value;
        }
        newAssignments[townId] = valueToDistrictIdMap[value] || null;
      }
      return newAssignments;
    });
    setDistrictNames(initializeDistrictNames(newOrder, uniqueValues as (string | null)[]));
  }, [townData, resetApplication]);

  const confirmDeleteDistrict = useCallback(() => {
    if (districtToDelete === null) return;

    const idToDelete = districtToDelete;

    setAssignments(prev => {
        const newAssignments = { ...prev };
        Object.keys(newAssignments).forEach(townId => {
            if (newAssignments[townId] === idToDelete) {
                newAssignments[townId] = null;
            }
        });
        return newAssignments;
    });

    const newOrder = districtOrder.filter(id => id !== idToDelete);
    setDistrictOrder(newOrder);
    setDistrictNames(prev => {
      const newNames = {...prev};
      delete newNames[idToDelete];
      return newNames;
    });

    if (activeDistrict === idToDelete) {
        setActiveDistrict(newOrder[0] || 1);
    }

    setDistrictToDelete(null);
    showNotification(`District ${districtNames[idToDelete] || `District ${idToDelete}`} was removed.`, false);

  }, [districtToDelete, activeDistrict, districtOrder, districtNames, showNotification]);

  const handleDistrictDragStart = (id: number) => {
    setDraggedDistrict(id);
  };

  const handleDropInZone = (targetIndex: number) => {
    if (draggedDistrict === null) return;

    const currentOrder = [...districtOrder];
    const fromIndex = currentOrder.indexOf(draggedDistrict);
    if (fromIndex === -1) return;

    const [draggedItem] = currentOrder.splice(fromIndex, 1);

    const finalIndex = targetIndex > fromIndex ? targetIndex - 1 : targetIndex;

    currentOrder.splice(finalIndex, 0, draggedItem);

    setDistrictOrder(currentOrder);
    setDraggedDistrict(null);
    setDropIndex(null);
  };

  const handleDistrictDragEnd = () => {
    setDraggedDistrict(null);
    setDropIndex(null);
  };

  const parseCSV = useCallback((csvText: string) => {
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
    const newAssignments = { ...assignments };
    Object.keys(newAssignments).forEach(key => { newAssignments[key] = null; });
    const newDistrictNames: DistrictNames = {};
    const newDistrictOrder: number[] = [];
    const districtNameMap: { [id: number]: string } = {};

    lines.slice(1).forEach(line => {
        // Basic CSV parsing
        const data = line.split(',');
        const townName = data[townIndex]?.replace(/"/g, '').trim();
        const districtIdStr = data[districtIdIndex]?.replace(/"/g, '').trim();
        const districtId = districtIdStr ? parseInt(districtIdStr, 10) : null;

        if (townData[townName] && districtId && districtId > 0 && districtId <= MAX_DISTRICTS) {
            newAssignments[townName] = districtId;
            if (!newDistrictOrder.includes(districtId)) {
                newDistrictOrder.push(districtId);
            }
            importedCount++;
            if (districtNameIndex !== -1) {
                const districtName = data[districtNameIndex]?.replace(/"/g, '').trim();
                if (districtName) {
                    // Basic sanitization on import
                    districtNameMap[districtId] = districtName.startsWith('=') || districtName.startsWith('+') || districtName.startsWith('-') || districtName.startsWith('@')
                        ? `'${districtName}`
                        : districtName;
                }
            }
        }
    });

    newDistrictOrder.sort((a,b) => a-b);
    newDistrictOrder.forEach(id => {
        newDistrictNames[id] = districtNameMap[id] || `District ${id}`;
    });

    setDistrictOrder(newDistrictOrder);
    setDistrictNames(newDistrictNames);
    setAssignments(newAssignments);
    showNotification(`Successfully imported assignments for ${importedCount} towns.`, false);
  }, [assignments, townData, showNotification]);

  return {
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
  };
};
