import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Droplets, ShieldCheck, AlertTriangle, XCircle, Search, Filter, Layers, Navigation, Info, MapPin, List, Map as MapIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_KEY || "pk.eyJ1IjoicmFsZDEyMDEwMiIsImEiOiJjbWttZGNyaWgwY3h3M2xzZmIwZ3VhYnM3In0.xkubwGBDjYnc41XB_7FT1g";

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

  // Fetch water sources from backend API
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/water-locations`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setLocations(data.data);
        }
      } catch (err) {
        console.error("Error fetching water sources for public map:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, [API_URL]);

  // Initialize Mapbox Map
  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [124.8700, 10.1330], // Maasin City coordinates
      zoom: 12.5,
      pitch: 20,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");
    map.current.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true
    }), "top-right");

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapStyle]);

  // Add / Update Mapbox Markers when locations or filters change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

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
      el.className = "custom-water-marker cursor-pointer group";
      el.style.width = "34px";
      el.style.height = "34px";
      el.innerHTML = `
        <div class="transition-transform duration-200 ease-out group-hover:scale-125 origin-center" style="background-color: ${color}; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.35);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
          </svg>
        </div>
      `;

      el.addEventListener("click", () => {
        setSelectedLocation(loc);
        if (map.current) {
          map.current.flyTo({
            center: [loc.longitude, loc.latitude],
            zoom: 15.5,
            duration: 1000,
          });
        }
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([loc.longitude, loc.latitude])
        .addTo(map.current);

      markersRef.current.push(marker);
    });
  }, [locations, searchQuery, selectedBarangay, selectedStatus]);

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
            <p className="text-xs text-slate-500 mt-0.5">Explore real-time tested drinking water stations</p>
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
                  setMobileTab("map"); // Switch back to map on mobile when station tapped
                  if (map.current && loc.longitude && loc.latitude) {
                    map.current.flyTo({
                      center: [loc.longitude, loc.latitude],
                      zoom: 15.5,
                      duration: 1000
                    });
                  }
                }}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-500/20"
                    : "bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{loc.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} className="text-slate-400" />
                      <span>Brgy. {loc.barangay}</span>
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isSafe ? "bg-emerald-100 text-emerald-800" : isWarning ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                  }`}>
                    {loc.status || "Unknown"}
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div>Type: <span className="font-semibold text-slate-800 capitalize">{loc.source_type || "Well"}</span></div>
                  <div>E. Coli: <span className="font-semibold text-slate-800">{loc.e_coli_count ?? 0} CFU</span></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 text-xs text-slate-600 flex items-center justify-around flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Safe</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>Contaminated</span>
          </div>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div className={`flex-1 relative ${mobileTab === "list" ? "hidden md:block" : "block"}`}>
        <div ref={mapContainer} className="w-full h-full" />

        {/* Map Style Selector Overlay */}
        <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md px-2 py-1.5 rounded-2xl shadow-lg border border-slate-200/80 flex items-center gap-1 text-xs font-sans">
          <div className="px-1 text-slate-700">
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
        </div>

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
                ✕
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
