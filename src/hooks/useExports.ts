// src/hooks/useExports.ts
// DOM/Blob/Leaflet-imperative export side effects (CSV, GeoJSON, JPG map image). These are not
// good unit-test candidates -- verify via manual smoke test, not Vitest -- but are grouped here to
// get them out of App.tsx's line count and give them a single, obvious home.
import { useCallback } from 'react';
import L from 'leaflet';
import html2canvas from 'html2canvas';
import { escapeHtml, sanitizeCsvCell } from '../utils';
import { PROPERTY_KEYS, districtColors } from '../constants';
import type { AllDistrictStats, Assignments, DistrictNames, TownData, TownGeoJSON } from '../types';

export interface UseExportsParams {
  assignments: Assignments;
  townData: TownData;
  townGeoJSON: TownGeoJSON | null;
  mapName: string;
  districtNames: DistrictNames;
  districtOrder: number[];
  allDistrictStats: AllDistrictStats;
  showNotification: (message: string, isError?: boolean) => void;
  setExportShareModalOpen: (open: boolean) => void;
}

export const useExports = ({
  assignments, townData, townGeoJSON, mapName, districtNames, districtOrder, allDistrictStats, showNotification, setExportShareModalOpen,
}: UseExportsParams) => {
  const exportAssignmentsToCsv = useCallback(() => {
    let csvContent = "TOWNNAME,COUNTY,DISTRICT_ID,DISTRICT_NAME,PUBLIC_SCHOOL_STUDENTS,Public_Schools,Total_E_Ed_GL_Act73\r\n";
    const allTowns = Object.keys(townData).sort();
    allTowns.forEach(townId => {
        const districtId = assignments[townId];
        const townProps = townData[townId];
        const districtName = districtId ? districtNames[districtId] : 'Unassigned';
        const row = [
            sanitizeCsvCell(townProps.TOWNNAME),
            sanitizeCsvCell(townProps.County),
            districtId !== null ? districtId : '',
            sanitizeCsvCell(districtName),
            townProps[PROPERTY_KEYS.STUDENT_COUNT] || 0,
            townProps[PROPERTY_KEYS.SCHOOLS] || 0,
            townProps[PROPERTY_KEYS.GL] || 0
        ].join(',');
        csvContent += row + "\r\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);

    const safeMapName = mapName.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const date = new Date().toISOString().slice(0, 10);
    const fileName = safeMapName ? `${safeMapName}_${date}.csv` : `district_assignments_${date}.csv`;

    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification('CSV download started.');
    setExportShareModalOpen(false);
  }, [assignments, townData, mapName, districtNames, showNotification, setExportShareModalOpen]);

  const exportToGeoJSON = useCallback(() => {
    if (!townGeoJSON) {
      showNotification('GeoJSON data is not loaded yet.', true);
      return;
    }

    const features = townGeoJSON.features.map(feature => {
      const townId = feature.properties.TOWNNAME;
      const districtId = assignments[townId];
      const districtName = districtId ? districtNames[districtId] : 'Unassigned';

      return {
        ...feature,
        properties: {
          ...feature.properties,
          DISTRICT_ID: districtId,
          DISTRICT_NAME: districtName,
        },
      };
    });

    const geoJsonData = {
      type: 'FeatureCollection',
      features,
    };

    const blob = new Blob([JSON.stringify(geoJsonData, null, 2)], { type: 'application/geo+json' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);

    const safeMapName = mapName.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const date = new Date().toISOString().slice(0, 10);
    const fileName = safeMapName ? `${safeMapName}_${date}.geojson` : `district_assignments_${date}.geojson`;

    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification('GeoJSON download started.');
    setExportShareModalOpen(false);
  }, [assignments, townGeoJSON, mapName, districtNames, showNotification, setExportShareModalOpen]);

  const handleExportJpg = useCallback(async () => {
      setExportShareModalOpen(false);
      showNotification('Preparing map for export...', false);
      const printContainer = document.getElementById('print-container') as HTMLElement;
      if (!printContainer || !townGeoJSON) return;

      const legendHtml = (() => {
          let legend = `<h2 style="font-size: 1.5rem; font-weight: bold; color: #003300; margin-bottom: 1rem;">${escapeHtml(mapName) || 'District Map'}</h2>`;
          legend += '<div style="display: grid; grid-template-columns: 1fr; gap: 1rem;">';
          districtOrder.forEach(id => {
              const stats = allDistrictStats[id];
              if (!stats || stats.townCount === 0) return;
              const glPerStudent = stats.studentTotal > 0 ? stats.totalGL / stats.studentTotal : 0;
              const formattedGlPerStudent = `$${Math.floor(glPerStudent).toLocaleString('en-US')}`;
              const districtName = escapeHtml(districtNames[id] || `District ${id}`);
              legend += `
                  <div style="border: 1px solid #ddd; border-left: 5px solid ${districtColors[id-1]}; padding: 0.5rem; border-radius: 4px; background-color: #f9f9f9; font-size: 0.8rem;">
                      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.25rem;">
                          <span style="font-weight: bold; font-size: 1rem; color: ${districtColors[id-1]};">${districtName}</span>
                          <span style="font-size: 0.8rem; font-weight: 600;">${stats.studentTotal.toLocaleString()} students</span>
                      </div>
                      <div style="font-size: 0.75rem; color: #555;">
                          <div><strong>Towns:</strong> ${stats.townCount}</div>
                          <div><strong>Public Schools:</strong> ${stats.totalPublicSchools}</div>
                          <div><strong>Grand List/Student:</strong> ${formattedGlPerStudent}</div>
                      </div>
                  </div>`;
          });
          legend += '</div>';
          return legend;
      })();

      const printLayoutHtml = `
          <div id="print-layout" style="display: flex; width: 1500px; background: white; padding: 20px; gap: 20px; border: 1px solid #ccc;">
              <div id="print-map-instance" style="width: 1050px; height: 1400px; background: #ffffff;"></div>
              <div id="print-legend" style="width: 450px;">${legendHtml}</div>
          </div>`;

      printContainer.innerHTML = printLayoutHtml;
      printContainer.classList.remove('hidden');

      const printMap = L.map('print-map-instance', {
          attributionControl: false, zoomControl: false, preferCanvas: true
      });

      L.geoJSON(townGeoJSON, {
        style: (feature) => {
            const townId = (feature?.properties as any).TOWNNAME;
            const districtId = assignments[townId];
            const style: L.PathOptions = {
                fillColor: '#B0B0B0', weight: 1, opacity: 1, color: 'white', fillOpacity: 0.5
            };
            if (districtId !== null && districtId !== undefined) {
                style.fillColor = districtColors[districtId - 1];
                style.fillOpacity = 0.8;
            }
            return style;
        }
    }).addTo(printMap);
      printMap.fitBounds((L.geoJSON(townGeoJSON) as L.GeoJSON).getBounds().pad(0.05));

      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        const canvas = await html2canvas(document.getElementById('print-layout') as HTMLElement, { scale: 2, logging: false, useCORS: true, backgroundColor: '#ffffff' });
        const link = document.createElement('a');
        const safeMapName = mapName.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const date = new Date().toISOString().slice(0, 10);
        link.download = `${safeMapName || 'map_export'}_${date}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
        showNotification('Map export started.', false);
      } catch (error) {
        console.error("Export error:", error);
        showNotification('Could not generate export.', true);
      } finally {
        printMap.remove();
        printContainer.innerHTML = '';
        printContainer.classList.add('hidden');
      }
  }, [assignments, townGeoJSON, mapName, districtOrder, allDistrictStats, districtNames, showNotification, setExportShareModalOpen]);

  return { exportAssignmentsToCsv, exportToGeoJSON, handleExportJpg };
};
