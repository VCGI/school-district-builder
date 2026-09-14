// src/hooks/useMapViewState.ts
// Owns map/UI view state that's independent of the district-assignment domain: which view is
// showing (map vs report), the active left-sidebar tab, hover highlighting, the schools-overlay
// toggle/filters, sidebar collapse, and the Leaflet map instance ref (plus the resize-on-collapse
// effect that depends on it).
import { useEffect, useRef, useState } from 'react';
import { Tab } from '../types';
import type { SchoolTypeFilters } from '../types';
import { SCHOOL_TYPE_COLORS } from '../constants';
import type { Map } from 'leaflet';

export const useMapViewState = () => {
  const [currentView, setCurrentView] = useState<'map' | 'report'>('map');
  const [activeTab, setActiveTab] = useState<Tab>(Tab.About);
  const [hoveredDistrict, setHoveredDistrict] = useState<number | null>(null);
  const [hoveredSU, setHoveredSU] = useState<string | null>(null);
  const [showSchools, setShowSchools] = useState<boolean>(false);
  const [schoolTypeFilters, setSchoolTypeFilters] = useState<SchoolTypeFilters>(
    Object.keys(SCHOOL_TYPE_COLORS).reduce((acc, key) => ({ ...acc, [key]: true }), {})
  );
  const [isLeftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const mapRef = useRef<Map | null>(null);

  const handleSchoolFilterChange = (schoolType: string) => {
    setSchoolTypeFilters(prev => ({
      ...prev,
      [schoolType]: !prev[schoolType]
    }));
  };

  const toggleSchools = () => setShowSchools(prev => !prev);
  const toggleLeftSidebar = () => setLeftSidebarCollapsed(prev => !prev);

  useEffect(() => {
    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 300);
    return () => clearTimeout(timer);
  }, [isLeftSidebarCollapsed]);

  return {
    currentView, setCurrentView,
    activeTab, setActiveTab,
    hoveredDistrict, setHoveredDistrict,
    hoveredSU, setHoveredSU,
    showSchools, toggleSchools,
    schoolTypeFilters, handleSchoolFilterChange,
    isLeftSidebarCollapsed, toggleLeftSidebar,
    mapRef,
  };
};
