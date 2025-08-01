// src/components/MapComponent.tsx

import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { TownGeoJSON, Assignments, TownFeature } from '../types';
import { districtColors } from '../constants';
import type { Map } from 'leaflet';

interface MapComponentProps {
  townGeoJSON: TownGeoJSON | null;
  assignments: Assignments;
  onTownClick: (townId: string) => void;
  hoveredDistrict: number | null;
  hoveredSU: string | null;
  onMapReady?: (map: Map) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
  townGeoJSON,
  assignments,
  onTownClick,
  hoveredDistrict,
  hoveredSU,
  onMapReady
}) => {
  const mapRef = useRef<Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const initialFitDone = useRef(false);

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

  return <div ref={mapContainerRef} id="map" className="h-full w-full bg-gray-200" />;
};

export default MapComponent;