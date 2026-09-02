// src/hooks/useUrlStateSync.ts
// Wraps the pure urlState.ts encode/decode functions with the App-level state setters and
// notification plumbing needed to load a shared map on mount and to generate/copy new share links.
// Owns no state of its own -- districtOrder/assignments/townData/districtNames/mapName remain
// owned by App.tsx (the district-assignment/data-loading clusters).
import { useCallback } from 'react';
import {
  generateShareableString as buildShareableString, loadStateFromURL as decodeUrlState, initializeDistrictNames,
} from '../urlState';
import type { Assignments, DistrictNames, TownData } from '../types';

const clearDataUrlParam = () => {
  const url = new URL(window.location.toString());
  url.searchParams.delete('data');
  window.history.replaceState({}, '', url);
};

export interface UseUrlStateSyncParams {
  districtOrder: number[];
  assignments: Assignments;
  townData: TownData;
  districtNames: DistrictNames;
  mapName: string;
  setDistrictOrder: (order: number[]) => void;
  setDistrictNames: (names: DistrictNames) => void;
  setAssignments: (assignments: Assignments) => void;
  setMapName: (name: string) => void;
  showNotification: (message: string, isError?: boolean) => void;
}

export const useUrlStateSync = ({
  districtOrder, assignments, townData, districtNames, mapName,
  setDistrictOrder, setDistrictNames, setAssignments, setMapName, showNotification,
}: UseUrlStateSyncParams) => {
  const generateShareableString = useCallback(() => {
    return buildShareableString({ districtOrder, assignments, townData, districtNames, mapName });
  }, [assignments, districtOrder, mapName, townData, districtNames]);

  const loadStateFromURL = useCallback((currentTownData: TownData, currentAssignments: Assignments) => {
    const params = new URLSearchParams(window.location.search);
    const data = params.get('data');
    const result = decodeUrlState(data, currentTownData, currentAssignments);

    switch (result.status) {
      case 'no-data':
        setDistrictNames(initializeDistrictNames(districtOrder));
        break;
      case 'too-large':
        showNotification('Failed to load map: URL data is too large.', true);
        clearDataUrlParam();
        break;
      case 'error':
        console.error('Failed to load state from URL:', result.error);
        showNotification('Could not load map from URL.', true);
        clearDataUrlParam();
        break;
      case 'success':
        setDistrictOrder(result.districtOrder);
        setDistrictNames(result.districtNames);
        setAssignments(result.assignments);
        setMapName(result.mapName);
        break;
    }
  }, [districtOrder, setDistrictOrder, setDistrictNames, setAssignments, setMapName, showNotification]);

  const copyShareURLToClipboard = useCallback(() => {
    const shareableString = generateShareableString();
    const url = new URL(window.location.toString());
    url.searchParams.set('data', shareableString);
    navigator.clipboard.writeText(url.href).then(() => {
        showNotification('Shareable link copied to clipboard!');
    }, () => {
        showNotification('Failed to copy link.', true);
    });
  }, [generateShareableString, showNotification]);

  return { generateShareableString, loadStateFromURL, copyShareURLToClipboard };
};
