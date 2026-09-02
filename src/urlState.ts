// src/urlState.ts
// Pure functions for encoding/decoding the shareable-URL "data" param.
// Extracted from App.tsx so the Base62/RLE/pako encoding scheme can be unit tested
// without mounting the app.
import pako from 'pako';
import { BASE62_CHARS } from './constants';
import type { Assignments, DistrictNames, TownData } from './types';

export const MAX_URL_STATE_LENGTH = 20480; // 20 KB limit

export const toBase62 = (num: number): string => {
  if (num === 0) return '0';
  let s = '';
  while (num > 0) { s = BASE62_CHARS[num % 62] + s; num = Math.floor(num / 62); }
  return s;
};

export const fromBase62 = (str: string): number => {
  let num = 0;
  for (let i = 0; i < str.length; i++) {
    const charIndex = BASE62_CHARS.indexOf(str[i]);
    if (charIndex === -1) {
      throw new Error(`Invalid character in Base62 string: ${str[i]}`);
    }
    num = num * 62 + charIndex;
  }
  return num;
};

export const initializeDistrictNames = (order: number[], values?: (string | null)[]): DistrictNames => {
  const initialNames: DistrictNames = {};
  order.forEach((id, index) => {
    initialNames[id] = values && values[index] ? values[index]! : `District ${id}`;
  });
  return initialNames;
};

export interface GenerateShareableStringParams {
  districtOrder: number[];
  assignments: Assignments;
  townData: TownData;
  districtNames: DistrictNames;
  mapName: string;
}

export const generateShareableString = ({
  districtOrder, assignments, townData, districtNames, mapName,
}: GenerateShareableStringParams): string => {
  const version = 'V8';
  const separator = '|';

  const orderedDistrictData = districtOrder.map(id => {
    const towns = Object.entries(assignments)
      .filter(([, districtId]) => districtId === id)
      .map(([townName]) => townData[townName]?.OBJECTID)
      .filter((objId): objId is number => objId !== undefined)
      .sort((a, b) => a - b);

    const districtName = districtNames[id] || `District ${id}`;
    return { id, name: districtName, towns };
  });

  const districtStrings = orderedDistrictData.map(dist => {
    const rleRuns: string[] = [];
    if (dist.towns.length > 0) {
      let startId = dist.towns[0], endId = dist.towns[0];
      for (let i = 1; i < dist.towns.length; i++) {
        if (dist.towns[i] === endId + 1) {
          endId = dist.towns[i];
        } else {
          rleRuns.push(startId === endId ? toBase62(startId) : `${toBase62(startId)}~${toBase62(endId - startId)}`);
          startId = endId = dist.towns[i];
        }
      }
      rleRuns.push(startId === endId ? toBase62(startId) : `${toBase62(startId)}~${toBase62(endId - startId)}`);
    }
    return `${toBase62(dist.id)},${encodeURIComponent(dist.name)},${rleRuns.join('.')}`;
  }).join(';');

  const payloadParts = [version, encodeURIComponent(mapName), districtStrings];
  const payloadString = payloadParts.join(separator);

  const compressed = pako.deflate(payloadString, { level: 9 });
  let binaryString = '';
  for (let i = 0; i < compressed.length; i++) {
    binaryString += String.fromCharCode(compressed[i]);
  }
  return btoa(binaryString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export type LoadUrlStateResult =
  | { status: 'no-data' }
  | { status: 'too-large' }
  | { status: 'error'; error: unknown }
  | {
      status: 'success';
      districtOrder: number[];
      districtNames: DistrictNames;
      assignments: Assignments;
      mapName: string;
    };

export const loadStateFromURL = (
  data: string | null,
  townData: TownData,
  currentAssignments: Assignments,
): LoadUrlStateResult => {
  if (data && data.length > MAX_URL_STATE_LENGTH) {
    return { status: 'too-large' };
  }

  if (!data) {
    return { status: 'no-data' };
  }

  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const binaryString = atob(base64);
    const compressed = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) compressed[i] = binaryString.charCodeAt(i);

    const decodedString = pako.inflate(compressed, { to: 'string' });

    const objectIdToTownIdMap: { [key: number]: string } = {};
    for (const townId in townData) objectIdToTownIdMap[townData[townId].OBJECTID] = townId;

    const parts = decodedString.split('|');
    const version = parts[0];

    if (version === 'V8') {
      const loadedMapName = decodeURIComponent(parts[1] || '');
      const districtDataStr = parts[2] || '';
      const newOrder: number[] = [];
      const newNames: DistrictNames = {};
      const newAssignments = { ...currentAssignments };
      Object.keys(newAssignments).forEach(key => newAssignments[key] = null);

      if (districtDataStr) {
        districtDataStr.split(';').forEach(entry => {
          const [idStr, nameStr, townsStr] = entry.split(',');
          const districtId = fromBase62(idStr);
          const districtName = decodeURIComponent(nameStr);

          newOrder.push(districtId);
          newNames[districtId] = districtName;

          if (townsStr) {
            townsStr.split('.').forEach(run => {
              if (run.includes('~')) {
                const [startIdStr, runLengthStr] = run.split('~');
                const startId = fromBase62(startIdStr);
                const runLength = fromBase62(runLengthStr);
                for (let i = 0; i <= runLength; i++) {
                  const townId = objectIdToTownIdMap[startId + i];
                  if (townId) newAssignments[townId] = districtId;
                }
              } else {
                const objId = fromBase62(run);
                const townId = objectIdToTownIdMap[objId];
                if (townId) newAssignments[townId] = districtId;
              }
            });
          }
        });
      }

      return {
        status: 'success',
        districtOrder: newOrder,
        districtNames: newNames,
        assignments: newAssignments,
        mapName: loadedMapName,
      };
    } else { // Fallback for old pre-V8 URLs (e.g. "V7")
      const numDistricts = fromBase62(parts[1]);
      const assignmentsString = parts[2] || '';
      const loadedMapName = decodeURIComponent(parts[3] || '');
      const districtNamesStr = parts[4] || '';

      const newOrder = Array.from({ length: numDistricts }, (_, i) => i + 1);
      const loadedNames = initializeDistrictNames(newOrder);

      if (districtNamesStr) {
        const decodedNames = districtNamesStr.split(';');
        decodedNames.forEach((name, index) => {
          if (index < newOrder.length) {
            loadedNames[newOrder[index]] = decodeURIComponent(name);
          }
        });
      }

      const newAssignments = { ...currentAssignments };
      if (assignmentsString) {
        for (const entry of assignmentsString.split(';')) {
          if (!entry) continue;
          const [districtIdStr, runsStr] = entry.split(':');
          const districtId = fromBase62(districtIdStr);
          if (!districtId || !runsStr) continue;

          for (const run of runsStr.split(',')) {
            if (run.includes('~')) {
              const [startIdStr, runLengthStr] = run.split('~');
              const startId = fromBase62(startIdStr);
              const runLength = fromBase62(runLengthStr);
              for (let i = 0; i <= runLength; i++) {
                const townId = objectIdToTownIdMap[startId + i];
                if (townId) newAssignments[townId] = districtId;
              }
            } else {
              const objId = fromBase62(run);
              const townId = objectIdToTownIdMap[objId];
              if (townId) newAssignments[townId] = districtId;
            }
          }
        }
      }

      return {
        status: 'success',
        districtOrder: newOrder,
        districtNames: loadedNames,
        assignments: newAssignments,
        mapName: loadedMapName,
      };
    }
  } catch (error) {
    return { status: 'error', error };
  }
};
