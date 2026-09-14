import { describe, it, expect } from 'vitest';
import pako from 'pako';
import {
  toBase62, fromBase62, initializeDistrictNames, generateShareableString, loadStateFromURL, MAX_URL_STATE_LENGTH,
} from './urlState';
import type { Assignments, DistrictNames, TownData } from './types';

const makeTown = (townName: string, objectId: number) => ({
  TOWNNAME: townName,
  County: 'Test County',
  Supervisory_Union: 'Test SU',
  Public_School_Students: 10,
  Total_E_Ed_GL_Act73: 1000,
  Public_Schools: 1,
  SqMi: 5,
  OBJECTID: objectId,
});

const townData: TownData = {
  ALPHA: makeTown('ALPHA', 1),
  BRAVO: makeTown('BRAVO', 2),
  CHARLIE: makeTown('CHARLIE', 3),
  DELTA: makeTown('DELTA', 10),
};

describe('toBase62 / fromBase62', () => {
  it('round-trips a range of numbers, including 0', () => {
    for (const n of [0, 1, 9, 61, 62, 63, 1000, 999999]) {
      expect(fromBase62(toBase62(n))).toBe(n);
    }
  });

  it('throws on an invalid character', () => {
    expect(() => fromBase62('!!!')).toThrow('Invalid character in Base62 string');
  });
});

describe('initializeDistrictNames', () => {
  it('defaults to "District {id}" when no names are given', () => {
    expect(initializeDistrictNames([1, 2, 3])).toEqual({ 1: 'District 1', 2: 'District 2', 3: 'District 3' });
  });

  it('uses provided values when present, falling back per-index otherwise', () => {
    expect(initializeDistrictNames([1, 2], ['Foo', null])).toEqual({ 1: 'Foo', 2: 'District 2' });
  });
});

describe('generateShareableString + loadStateFromURL round trip', () => {
  it('preserves assignments, district names, order, and map name', () => {
    const assignments: Assignments = { ALPHA: 1, BRAVO: 1, CHARLIE: 2, DELTA: null };
    const districtOrder = [1, 2];
    const districtNames: DistrictNames = { 1: 'North District', 2: 'South District' };
    const mapName = 'My Test Map';

    const shareable = generateShareableString({ districtOrder, assignments, townData, districtNames, mapName });
    const emptyAssignments: Assignments = { ALPHA: null, BRAVO: null, CHARLIE: null, DELTA: null };
    const result = loadStateFromURL(shareable, townData, emptyAssignments);

    expect(result.status).toBe('success');
    if (result.status !== 'success') return;

    expect(result.mapName).toBe(mapName);
    expect(result.districtOrder).toEqual(districtOrder);
    expect(result.districtNames).toEqual(districtNames);
    expect(result.assignments).toEqual(assignments);
  });

  it('handles non-contiguous OBJECTIDs (no run-length compression applied)', () => {
    const assignments: Assignments = { ALPHA: 1, DELTA: 1, BRAVO: null, CHARLIE: null };
    const districtOrder = [1];
    const districtNames: DistrictNames = { 1: 'Scattered' };

    const shareable = generateShareableString({ districtOrder, assignments, townData, districtNames, mapName: '' });
    const result = loadStateFromURL(shareable, townData, { ALPHA: null, BRAVO: null, CHARLIE: null, DELTA: null });

    expect(result.status).toBe('success');
    if (result.status !== 'success') return;
    expect(result.assignments).toEqual(assignments);
  });

  it('returns "no-data" when there is no data param', () => {
    expect(loadStateFromURL(null, townData, {})).toEqual({ status: 'no-data' });
  });

  it('returns "too-large" when the data param exceeds MAX_URL_STATE_LENGTH', () => {
    const oversized = 'a'.repeat(MAX_URL_STATE_LENGTH + 1);
    expect(loadStateFromURL(oversized, townData, {})).toEqual({ status: 'too-large' });
  });

  it('returns "error" for malformed/undecodable data', () => {
    const result = loadStateFromURL('not-valid-base64-or-gzip!!', townData, {});
    expect(result.status).toBe('error');
  });

  it('decodes a legacy pre-V8 ("V7") payload via the fallback path', () => {
    // Hand-construct a legacy payload: version|numDistrictsBase62|assignmentsString|mapName|districtNames
    // assignments format: "districtIdBase62:run,run;..." where a run is objIdBase62 or start~length
    const numDistricts = toBase62(2);
    const assignmentsString = [
      `${toBase62(1)}:${toBase62(1)}`, // district 1 gets town with OBJECTID 1 (ALPHA)
      `${toBase62(2)}:${toBase62(2)}~${toBase62(1)}`, // district 2 gets OBJECTIDs 2-3 (BRAVO, CHARLIE)
    ].join(';');
    const mapName = encodeURIComponent('Legacy Map');
    const districtNamesStr = [encodeURIComponent('Old North'), encodeURIComponent('Old South')].join(';');

    const payload = ['V7', numDistricts, assignmentsString, mapName, districtNamesStr].join('|');

    // Compress and encode exactly as generateShareableString does.
    const compressed = pako.deflate(payload, { level: 9 });
    let binaryString = '';
    for (let i = 0; i < compressed.length; i++) binaryString += String.fromCharCode(compressed[i]);
    const encoded = btoa(binaryString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const result = loadStateFromURL(encoded, townData, { ALPHA: null, BRAVO: null, CHARLIE: null, DELTA: null });

    expect(result.status).toBe('success');
    if (result.status !== 'success') return;
    expect(result.districtOrder).toEqual([1, 2]);
    expect(result.districtNames).toEqual({ 1: 'Old North', 2: 'Old South' });
    expect(result.mapName).toBe('Legacy Map');
    expect(result.assignments).toEqual({ ALPHA: 1, BRAVO: 2, CHARLIE: 2, DELTA: null });
  });
});
