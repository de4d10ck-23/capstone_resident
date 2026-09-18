import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  Search,
  Layers,
  Navigation,
  List,
  Map as MapIcon,
  X,
  Flame,
  Droplets,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_KEY || "pk.eyJ1IjoicmFsZDEyMDEwMiIsImEiOiJjbWttZGNyaWgwY3h3M2xzZmIwZ3VhYnM3In0.xkubwGBDjYnc41XB_7FT1g";

// ============================================================================
// ZOOM SETTINGS
// Adjust these numbers to customize zoom behavior:
// - NAME_LABEL_MIN_ZOOM: When water station names appear
// - DOUBLE_CLICK_ZOOM: Target zoom level when double-clicking a water source
// ============================================================================
export const NAME_LABEL_MIN_ZOOM = 18.0;
export const DOUBLE_CLICK_ZOOM = 18.0;

const PublicMap = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const { API_URL } = useAuth();

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/streets-v12");
  const [mobileTab, setMobileTab] = useState("map"); // 'map' or 'list'

  // Model-driven Heatmap States
  const [showHazardHeatmap, setShowHazardHeatmap] = useState(false);
  const [showWaterHeatmap, setShowWaterHeatmap] = useState(false);
  const [hazardHeatmapData, setHazardHeatmapData] = useState(null);
  const [waterHeatmapData, setWaterHeatmapData] = useState(null);
  const [heatmapMeta, setHeatmapMeta] = useState(null);

  const showHazardHeatmapRef = useRef(showHazardHeatmap);
  showHazardHeatmapRef.current = showHazardHeatmap;
  const showWaterHeatmapRef = useRef(showWaterHeatmap);
  showWaterHeatmapRef.current = showWaterHeatmap;
  const hazardHeatmapDataRef = useRef(hazardHeatmapData);
  hazardHeatmapDataRef.current = hazardHeatmapData;
  const waterHeatmapDataRef = useRef(waterHeatmapData);
  waterHeatmapDataRef.current = waterHeatmapData;

  // Fetch water sources and model heatmaps from backend API
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        setLoading(true);
        const [locRes, heatRes] = await Promise.all([
          fetch(`${API_URL}/water-locations`),
          fetch(`${API_URL}/forecast/heatmaps`),
        ]);
        const locData = await locRes.json();
        const heatData = await heatRes.json();

        if (locData.success && Array.isArray(locData.data)) {
          setLocations(locData.data);
        }
        if (heatData.success && heatData.data) {
          setHazardHeatmapData(heatData.data.hazard_heatmap);
          hazardHeatmapDataRef.current = heatData.data.hazard_heatmap;
          setWaterHeatmapData(heatData.data.water_contamination_heatmap);
          waterHeatmapDataRef.current = heatData.data.water_contamination_heatmap;
          setHeatmapMeta(heatData.data);
        }
      } catch (err) {
        console.error("Error fetching data for public map:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();
  }, [API_URL]);

  // Dual Heatmap Layer Management
  const renderHeatmaps = () => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const hData = hazardHeatmapDataRef.current || hazardHeatmapData;
    const wData = waterHeatmapDataRef.current || waterHeatmapData;
    const isHazardHeatActive = showHazardHeatmapRef.current ?? showHazardHeatmap;
    const isWaterHeatActive = showWaterHeatmapRef.current ?? showWaterHeatmap;

    // 1. Hazard Heatmap Layer
    const hazardSourceId = "public-hazard-heatmap-source";
    const hazardLayerId = "public-hazard-risk-heat";

    if (hData && hData.features && hData.features.length > 0) {
      if (map.current.getSource(hazardSourceId)) {
        map.current.getSource(hazardSourceId).setData(hData);
      } else {
        map.current.addSource(hazardSourceId, { type: "geojson", data: hData });
        map.current.addLayer({
          id: hazardLayerId,
          type: "heatmap",
          source: hazardSourceId,
          layout: { visibility: isHazardHeatActive ? "visible" : "none" },
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0.1, 0.5, 0.6, 1.0, 1.0],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.8, 14, 1.8],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0, "rgba(255, 255, 255, 0)",
              0.15, "rgba(251, 191, 36, 0.4)",
              0.4, "rgba(245, 158, 11, 0.7)",
              0.7, "rgba(239, 68, 68, 0.85)",
              1.0, "rgba(185, 28, 28, 0.95)",
            ],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 8, 14, 32],
            "heatmap-opacity": 0.82,
          },
        });
      }

      if (map.current.getLayer(hazardLayerId)) {
        map.current.setLayoutProperty(hazardLayerId, "visibility", isHazardHeatActive ? "visible" : "none");
      }
    }

    // 2. Water Contamination Heatmap Layer
    const waterSourceId = "public-water-heatmap-source";
    const waterLayerId = "public-water-contamination-heat";

    if (wData && wData.features && wData.features.length > 0) {
      if (map.current.getSource(waterSourceId)) {
        map.current.getSource(waterSourceId).setData(wData);
      } else {
        map.current.addSource(waterSourceId, { type: "geojson", data: wData });
        map.current.addLayer({
          id: waterLayerId,
          type: "heatmap",
          source: waterSourceId,
          layout: { visibility: isWaterHeatActive ? "visible" : "none" },
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 0.3, 0.35, 0.65, 0.75, 1.0, 1.0],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.9, 14, 2.0],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0, "rgba(0, 0, 255, 0)",
              0.15, "rgba(59, 130, 246, 0.35)",
              0.35, "rgba(234, 179, 8, 0.65)",
              0.65, "rgba(249, 115, 22, 0.85)",
              1.0, "rgba(220, 38, 38, 0.95)",
            ],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 10, 14, 36],
            "heatmap-opacity": 0.82,
          },
        });
      }

      if (map.current.getLayer(waterLayerId)) {
        map.current.setLayoutProperty(waterLayerId, "visibility", isWaterHeatActive ? "visible" : "none");
      }
    }
  };

  const renderMarkers = () => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // When Contaminated Water Sources Heatmap is active, hide all discrete water station pins
    if (showWaterHeatmapRef.current ?? showWaterHeatmap) return;

    // Filter locations
    const filtered = locations.filter((loc) => {
      const matchQuery =
        loc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.barangay?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchBarangay = selectedBarangay === "all" || loc.barangay === selectedBarangay;
      const matchStatus = selectedStatus === "all" || loc.status?.toLowerCase() === selectedStatus.toLowerCase();
      return matchQuery && matchBarangay && matchStatus;
    });

    // Add markers for filtered locations
    filtered.forEach((loc) => {
      if (!loc.latitude || !loc.longitude) return;

      const isSafe = loc.status?.toLowerCase() === "safe";
      const isWarning = loc.status?.toLowerCase() === "warning";
      const color = isSafe ? "#10b981" : isWarning ? "#f59e0b" : "#ef4444";

      // Custom marker DOM element
      const el = document.createElement("div");
      el.className = "custom-water-marker cursor-pointer group flex flex-col items-center pointer-events-auto";
      el.innerHTML = `
        <div class="transition-transform duration-200 ease-out group-hover:scale-125 origin-center flex-shrink-0" style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.35);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
          </svg>
        </div>
        <div class="station-zoom-label hidden pointer-events-none mt-1 px-2 py-0.5 rounded-md bg-white/95 text-slate-900 text-[10px] font-bold shadow-md whitespace-nowrap border border-slate-300 text-center max-w-[160px] truncate">
          ${loc.name}
        </div>
      `;

      // Single-click: Show details
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedLocation(loc);
      });

      // Double-click: Show details and zoom in using configured value
      el.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        e.preventDefault();
        setSelectedLocation(loc);
        if (map.current) {
          map.current.flyTo({
            center: [loc.longitude, loc.latitude],
            zoom: DOUBLE_CLICK_ZOOM,
            duration: 1000,
          });
        }
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([loc.longitude, loc.latitude])
        .addTo(map.current);

      markersRef.current.push(marker);
    });
  };

  const renderMarkersRef = useRef(renderMarkers);
  renderMarkersRef.current = renderMarkers;

  // Initialize Mapbox Map
  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [124.8200, 10.1570], // Centered on Batuan water sources
      zoom: 14.2,
      pitch: 20,
    });

    mapInstance.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    mapInstance.addControl(new mapboxgl.FullscreenControl(), "top-right");
    mapInstance.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true
    }), "top-right");

    const checkZoomLabels = () => {
      if (!mapContainer.current) return;
      if (mapInstance.getZoom() >= NAME_LABEL_MIN_ZOOM) {
        mapContainer.current.classList.add("show-zoom-labels");
      } else {
        mapContainer.current.classList.remove("show-zoom-labels");
      }
    };

    mapInstance.on("zoom", checkZoomLabels);
    mapInstance.on("load", checkZoomLabels);

    mapInstance.on("style.load", () => {
      checkZoomLabels();
      renderMarkersRef.current?.();
    });

    map.current = mapInstance;

    return () => {
      mapInstance.remove();
      map.current = null;
    };
  }, []);

  const currentStyleRef = useRef(mapStyle);

  // Update map style without tearing down the map instance
  useEffect(() => {
    if (!map.current) return;
    if (currentStyleRef.current !== mapStyle) {
      currentStyleRef.current = mapStyle;
      map.current.setStyle(mapStyle, { diff: false });

      const reAddLayers = () => {
        if (!map.current) return;
        renderHeatmaps();
        renderMarkers();
      };

      map.current.once("style.load", reAddLayers);
      map.current.once("idle", reAddLayers);
    }
  }, [mapStyle, showHazardHeatmap, showWaterHeatmap]);

  // Sync dual model-driven heatmaps
  useEffect(() => {
    if (map.current && map.current.isStyleLoaded()) {
      renderHeatmaps();
      renderMarkers();
    }
  }, [showHazardHeatmap, showWaterHeatmap, hazardHeatmapData, waterHeatmapData]);

  // Add / Update Mapbox Markers when locations or filters change
  useEffect(() => {
    renderMarkers();
  }, [locations, searchQuery, selectedBarangay, selectedStatus, showWaterHeatmap]);

  // Unique barangays for filter dropdown
  const barangayOptions = Array.from(
    new Set(locations.map((loc) => loc.barangay).filter(Boolean))
  ).sort();

  const filteredLocations = locations.filter((loc) => {
    const matchQuery =
      loc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.barangay?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchBarangay = selectedBarangay === "all" || loc.barangay === selectedBarangay;
    const matchStatus = selectedStatus === "all" || loc.status?.toLowerCase() === selectedStatus.toLowerCase();
    return matchQuery && matchBarangay && matchStatus;
  });

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col md:flex-row relative overflow-hidden font-sans">
      {/* Mobile View Toggle Bar (Only visible on small screens) */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-center gap-2 z-20 shadow-sm flex-shrink-0">
        <button
          onClick={() => setMobileTab("map")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === "map"
              ? "bg-[#0f3b82] text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <MapIcon size={14} />
          <span>Interactive Map</span>
        </button>
        <button
          onClick={() => setMobileTab("list")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === "list"
              ? "bg-[#0f3b82] text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <List size={14} />
          <span>Stations List ({filteredLocations.length})</span>
        </button>
      </div>

      {/* Map Filter Sidebar */}
      <div className={`w-full md:w-96 bg-white/95 backdrop-blur-xl border-r border-slate-200 z-10 flex flex-col shadow-xl flex-shrink-0 ${
        mobileTab === "map" ? "hidden md:flex" : "flex flex-1"
      }`}>
        <div className="p-4 sm:p-6 border-b border-slate-100 space-y-3 sm:space-y-4">
          <div>
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Public Water Map</span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Maasin City Sources</h1>
            <p className="text-xs text-slate-500 mt-0.5">Explore real-time tested drinking water stations & sanitary safety</p>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search station or barangay..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Barangay</label>
              <select
                value={selectedBarangay}
                onChange={(e) => setSelectedBarangay(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="all">All Barangays</option>
                {barangayOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="all">All Statuses</option>
                <option value="safe">Safe Only</option>
                <option value="warning">Warning Level</option>
                <option value="undrinkable">Contaminated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Locations List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between px-2 text-xs font-semibold text-slate-500">
            <span>Water Stations ({filteredLocations.length})</span>
            {loading && <span className="text-blue-600 animate-pulse">Loading data...</span>}
          </div>

          {filteredLocations.map((loc) => {
            const isSafe = loc.status?.toLowerCase() === "safe";
            const isWarning = loc.status?.toLowerCase() === "warning";
            const isSelected = selectedLocation?.id === loc.id;

            return (
              <div
                key={loc.id}
                onClick={() => {
                  setSelectedLocation(loc);
                  if (mobileTab === "list") setMobileTab("map");
                  if (map.current && loc.longitude && loc.latitude) {
                    map.current.flyTo({
                      center: [loc.longitude, loc.latitude],
                      zoom: 18,
                      duration: 1000,
                    });
                  }
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20"
                    : "border-slate-100 bg-white hover:border-slate-300 hover:shadow-xs"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-800 leading-tight">{loc.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Barangay {loc.barangay}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                      isSafe
                        ? "bg-emerald-100 text-emerald-700"
                        : isWarning
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {loc.status || "Unknown"}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-50 pt-2">
                  <span>Coliform: {loc.coliform_count ?? 0}</span>
                  <span>E. Coli: {loc.e_coli_count ?? 0}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map Canvas Area */}
      <div className={`flex-1 relative ${mobileTab === "list" ? "hidden md:block" : "block"}`}>
        <style>{`
          .show-zoom-labels .station-zoom-label {
            display: block !important;
          }
        `}</style>
        <div ref={mapContainer} className="w-full h-full" />

        {/* Map Overlays: Styles Selector */}
        <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md px-2.5 py-2 rounded-2xl shadow-xl border border-slate-200/80 flex flex-wrap items-center gap-1.5 text-xs">
          <div className="px-1 text-slate-400">
            <Layers size={16} />
          </div>
          <button
            onClick={() => setMapStyle("mapbox://styles/mapbox/streets-v12")}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
              mapStyle === "mapbox://styles/mapbox/streets-v12"
                ? "bg-[#0f3b82] text-white shadow-sm"
                : "text-slate-700 hover:text-slate-900 font-medium hover:bg-slate-50"
            }`}
          >
            Streets
          </button>
          <button
            onClick={() => setMapStyle("mapbox://styles/mapbox/satellite-streets-v12")}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
              mapStyle === "mapbox://styles/mapbox/satellite-streets-v12"
                ? "bg-[#0f3b82] text-white shadow-sm"
                : "text-slate-700 hover:text-slate-900 font-medium hover:bg-slate-50"
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setMapStyle("mapbox://styles/mapbox/light-v11")}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
              mapStyle === "mapbox://styles/mapbox/light-v11"
                ? "bg-[#0f3b82] text-white shadow-sm"
                : "text-slate-700 hover:text-slate-900 font-medium hover:bg-slate-50"
            }`}
          >
            Light
          </button>

          {/* Divider */}
          <div className="h-4 w-[1px] bg-slate-200 mx-0.5 hidden sm:block" />

          {/* Hazard Heatmap Toggle */}
          <button
            onClick={() => {
              const next = !showHazardHeatmap;
              setShowHazardHeatmap(next);
              showHazardHeatmapRef.current = next;
              renderHeatmaps();
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              showHazardHeatmap
                ? "bg-amber-500 text-white shadow-sm"
                : "text-slate-700 hover:text-slate-900 font-medium hover:bg-slate-50"
            }`}
            title="Toggle Continuous Hazard Heatmap"
          >
            <Flame size={13} className={showHazardHeatmap ? "text-white" : "text-amber-500"} />
            <span>Hazard Heatmap</span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                showHazardHeatmap ? "bg-amber-700 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              {showHazardHeatmap ? "ON" : "OFF"}
            </span>
          </button>

          {/* Water Contamination Heatmap Toggle */}
          <button
            onClick={() => {
              const next = !showWaterHeatmap;
              setShowWaterHeatmap(next);
              showWaterHeatmapRef.current = next;
              renderHeatmaps();
              renderMarkers();
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              showWaterHeatmap
                ? "bg-rose-600 text-white shadow-sm"
                : "text-slate-700 hover:text-slate-900 font-medium hover:bg-slate-50"
            }`}
            title="Toggle Contamination Heatmap (Hides discrete water pins)"
          >
            <Droplets size={13} className={showWaterHeatmap ? "text-white" : "text-rose-500"} />
            <span>Contamination Heatmap</span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                showWaterHeatmap ? "bg-rose-800 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              {showWaterHeatmap ? "ON" : "OFF"}
            </span>
          </button>
        </div>

        {/* Active Heatmap Legend & Model Status Badge */}
        {(showHazardHeatmap || showWaterHeatmap) && (
          <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-200/90 max-w-[280px] sm:max-w-xs text-xs animate-fade-in space-y-2.5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
              <span className="font-bold text-[11px] text-slate-800 flex items-center gap-1.5">
                <Flame size={13} className="text-amber-500" />
                Continuous Heatmap View
              </span>
              <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Hourly Model
              </span>
            </div>

            {showHazardHeatmap && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-700">
                  <span>Hazard Proximity Dispersion</span>
                  <span className="text-amber-600 text-[9px] font-bold">Shapes Hidden</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gradient-to-r from-amber-300 via-orange-500 to-red-700" />
                <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                  <span>Low Buffer</span>
                  <span>Moderate</span>
                  <span>Critical Risk</span>
                </div>
              </div>
            )}

            {showWaterHeatmap && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-700">
                  <span>Water Contamination Density</span>
                  <span className="text-rose-600 text-[9px] font-bold">Pins Hidden</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gradient-to-r from-blue-400 via-yellow-400 via-orange-500 to-red-600" />
                <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                  <span>Potable</span>
                  <span>Warning</span>
                  <span>Contaminated</span>
                </div>
              </div>
            )}

            {heatmapMeta?.last_updated && (
              <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-100 flex justify-between items-center">
                <span>Model evaluated:</span>
                <span className="font-semibold text-slate-600">
                  {new Date(heatmapMeta.last_updated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Selected Station Details Floating Card */}
        {selectedLocation && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-80 z-20 bg-white/95 backdrop-blur-2xl rounded-3xl p-5 shadow-2xl border border-slate-100 animate-fade-in">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Selected Station</span>
                <h3 className="font-bold text-base text-slate-900">{selectedLocation.name}</h3>
                <p className="text-xs text-slate-500">Barangay {selectedLocation.barangay}</p>
              </div>
              <button
                onClick={() => setSelectedLocation(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Safety Status:</span>
                <span className="font-bold uppercase text-slate-800">{selectedLocation.status || "Unknown"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Coliform Count:</span>
                <span className="font-bold text-slate-800">{selectedLocation.coliform_count ?? 0} MPN/100ml</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">E. Coli Count:</span>
                <span className="font-bold text-slate-800">{selectedLocation.e_coli_count ?? 0} CFU/100ml</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Coordinates:</span>
                <span className="font-mono text-slate-600">
                  {selectedLocation.latitude?.toFixed(4)}, {selectedLocation.longitude?.toFixed(4)}
                </span>
              </div>
              {selectedLocation.sample_date && (
                <div className="flex justify-between pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Test Date & Time:</span>
                  <span className="font-mono text-slate-800 font-medium">
                    {selectedLocation.sample_date} {selectedLocation.sample_time ? `• ${selectedLocation.sample_time}` : ""}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedLocation.latitude},${selectedLocation.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md"
              >
                <Navigation size={14} />
                <span>Get Driving Directions</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicMap;
