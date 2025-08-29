// src/components/MapComponent.tsx

import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { TownGeoJSON, Assignments, TownFeature, SchoolPointFeature, SchoolTypeFilters } from '../types';
import { districtColors, SCHOOL_TYPE_COLORS } from '../constants';
import type { Map } from 'leaflet';

interface MapComponentProps {
  townGeoJSON: TownGeoJSON | null;
  assignments: Assignments;
  onTownClick: (townId: string) => void;
  hoveredDistrict: number | null;
  hoveredSU: string | null;
  onMapReady?: (map: Map) => void;
  schoolsData: SchoolPointFeature[];
  showSchools: boolean;
  onToggleSchools: () => void;
  schoolTypeFilters: SchoolTypeFilters;
  onSchoolFilterChange: (schoolType: string) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
  townGeoJSON,
  assignments,
  onTownClick,
  hoveredDistrict,
  hoveredSU,
  onMapReady,
  schoolsData,
  showSchools,
  onToggleSchools,
  schoolTypeFilters,
  onSchoolFilterChange,
}) => {
  const mapRef = useRef<Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const schoolsLayerRef = useRef<L.LayerGroup | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const initialFitDone = useRef(false);
  const schoolToggleControlRef = useRef<L.Control | null>(null);
  const schoolLegendControlRef = useRef<L.Control | null>(null);


  const getTownStyle = useCallback((feature?: TownFeature): L.PathOptions => {
    if (!feature) return {};
    const townId = feature.properties.TOWNNAME;
    const suName = feature.properties.Supervisory_Union || 'Uncategorized';
    const districtId = assignments[townId];
    
    const style: L.PathOptions = {
      fillColor: '#B0B0B0', weight: 1, opacity: 1, color: 'white', fillOpacity: 0.5
    };

    if (districtId !== null && districtId !== undefined) {
      style.fillColor = districtColors[districtId - 1];
      style.weight = 2;
      style.dashArray = '';
      style.fillOpacity = 0.8;
    }

    if (hoveredSU === suName) {
      style.weight = 3; style.color = '#333333'; style.dashArray = '';
    }
    if (hoveredDistrict !== null && districtId === hoveredDistrict) {
      style.weight = 4; style.color = '#000000'; style.fillOpacity = 0.9;
    }
    return style;
  }, [assignments, hoveredDistrict, hoveredSU]);

  useEffect(() => {
    if (geoJsonLayerRef.current) {
      geoJsonLayerRef.current.setStyle(getTownStyle);
    }
  }, [getTownStyle, assignments]);

  useEffect(() => {
    if (!mapRef.current && mapContainerRef.current) {
        mapRef.current = L.map(mapContainerRef.current, {
            center: [44.0, -72.7],
            zoom: 8,
            attributionControl: false,
            preferCanvas: true,
        });
    
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapRef.current);
    
        L.control.attribution({position: 'bottomright', prefix: false}).addTo(mapRef.current);
    
        if (onMapReady) {
            onMapReady(mapRef.current);
        }
    }

    if (mapRef.current && townGeoJSON) {
        if (geoJsonLayerRef.current) {
            geoJsonLayerRef.current.remove();
        }
        geoJsonLayerRef.current = L.geoJSON(townGeoJSON, {
            style: getTownStyle,
            onEachFeature: (feature: TownFeature, layer) => {
                const props = feature.properties;
                const townId = props.TOWNNAME;
                const studentCount = props.Public_School_Students || 0;
                const county = props.County || 'N/A';
                const supervisoryUnion = props.Supervisory_Union || 'N/A';
                const sqMi = props.SqMi ? props.SqMi.toFixed(2) : 'N/A';
              
                layer.bindTooltip(`
                    <div class="font-bold text-base text-gray-800">${townId}</div><hr class="my-1 border-gray-300">
                    <div><strong>County:</strong> ${county}</div>
                    <div><strong>Supervisory Union:</strong> ${supervisoryUnion}</div>
                    <div><strong>Students:</strong> ${studentCount.toLocaleString()}</div>
                    <div><strong>Area:</strong> ${sqMi} sq. mi.</div>`, 
                    { sticky: true, offset: L.point(15, 0) }
                );

                layer.on('click', () => onTownClick(townId));
            }
        }).addTo(mapRef.current);

        if (!initialFitDone.current) {
            const bounds = geoJsonLayerRef.current.getBounds();
            if (bounds.isValid()) {
                requestAnimationFrame(() => {
                    if (mapRef.current) {
                        mapRef.current.invalidateSize();
                        mapRef.current.fitBounds(bounds);
                    }
                });
            }
            initialFitDone.current = true;
        }
    }
  }, [townGeoJSON, onTownClick, onMapReady, getTownStyle]);

  useEffect(() => {
    if (mapRef.current && !schoolToggleControlRef.current) {
        const SchoolToggleControl = L.Control.extend({
            onAdd: function() {
                const container = L.DomUtil.create('div', 'school-toggle-control leaflet-bar');
                container.innerHTML = `
                    <label for="school-toggle" class="flex items-center cursor-pointer">
                        <span class="mr-2 font-semibold text-gray-700 text-sm">Show Schools</span>
                        <div class="switch">
                            <input type="checkbox" id="school-toggle">
                            <span class="slider"></span>
                        </div>
                    </label>
                `;
                L.DomEvent.disableClickPropagation(container);
                const input = container.querySelector('#school-toggle') as HTMLInputElement;
                input.checked = showSchools;
                L.DomEvent.on(input, 'change', onToggleSchools);
                return container;
            }
        });
        schoolToggleControlRef.current = new SchoolToggleControl({ position: 'bottomright' });
        mapRef.current.addControl(schoolToggleControlRef.current);
    }

    const input = document.getElementById('school-toggle') as HTMLInputElement;
    if (input) {
        input.checked = showSchools;
    }

  }, [onToggleSchools, showSchools]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (schoolLegendControlRef.current) {
        mapRef.current.removeControl(schoolLegendControlRef.current);
    }

    const LegendControl = L.Control.extend({
        onAdd: function() {
            const div = L.DomUtil.create('div', 'school-legend');
            const types = SCHOOL_TYPE_COLORS;
            const enrollments = [50, 250, 750];
            const legendOrder = ['Elementary', 'Middle School', 'Secondary', 'K-12', 'CTE', 'Independent'];

            let content = '<h4>School Type</h4><div class="legend-section">';
            legendOrder.forEach(key => {
                if (types[key]) {
                    const activeClass = schoolTypeFilters[key] ? '' : 'inactive';
                    content += `<div class="legend-item ${activeClass}" data-school-type="${key}"><i style="background:${types[key]}"></i>${key}</div>`;
                }
            });
            content += '</div>';

            content += '<h4>Enrollment Size</h4><div class="legend-section">';
            enrollments.forEach(enrollment => {
                const radius = 3 + Math.sqrt(enrollment) / 3;
                content += `<div class="legend-size-item">
                                <span class="legend-size-circle" style="width:${radius*2}px; height:${radius*2}px;"></span>
                                <span class="legend-size-label">${enrollment} students</span>
                            </div>`;
            });
            content += '</div>';

            div.innerHTML = content;
            L.DomEvent.on(div, 'click', (e) => {
                const target = e.target as HTMLElement;
                const item = target.closest('.legend-item');
                if (item && item.getAttribute('data-school-type')) {
                    onSchoolFilterChange(item.getAttribute('data-school-type')!);
                }
            });
            L.DomEvent.disableClickPropagation(div);
            return div;
        }
    });
    schoolLegendControlRef.current = new LegendControl({ position: 'bottomleft' });

    if (showSchools) {
        mapRef.current.addControl(schoolLegendControlRef.current);
    }

    if (showSchools) {
        if (!schoolsLayerRef.current) {
            schoolsLayerRef.current = new L.LayerGroup();
        }
        schoolsLayerRef.current.clearLayers();
        
        const filteredSchools = schoolsData.filter(school => {
            const type = school.properties.accessType === 'Independent' ? 'Independent' : school.properties.Type;
            return schoolTypeFilters[type];
        });

        const sortedSchools = [...filteredSchools].sort((a, b) => (b.properties.Enrollment || 0) - (a.properties.Enrollment || 0));

        sortedSchools.forEach(school => {
            const { latitude, longitude, Type, accessType, Enrollment } = school.properties;
            if (latitude && longitude) {
                const color = accessType === 'Independent' ? SCHOOL_TYPE_COLORS['Independent'] : SCHOOL_TYPE_COLORS[Type] || '#808080';
                const enrollment = Enrollment || 0;
                const radius = 3 + Math.sqrt(enrollment) / 3;

                const marker = L.circleMarker([latitude, longitude], {
                    radius: radius,
                    fillColor: color,
                    color: '#000',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8,
                    interactive: false // This allows clicks to pass through to the town layer
                });

                schoolsLayerRef.current?.addLayer(marker);
            }
        });
        mapRef.current.addLayer(schoolsLayerRef.current);
    } else {
        if (schoolsLayerRef.current) {
            mapRef.current.removeLayer(schoolsLayerRef.current);
        }
    }
  }, [showSchools, schoolsData, schoolTypeFilters, onSchoolFilterChange]);


  return <div ref={mapContainerRef} id="map" className="h-full w-full bg-gray-200" />;
};

export default MapComponent;
