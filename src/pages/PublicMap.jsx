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
  Camera,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
  Clock,
  Calendar,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  HelpCircle
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getBarangayFeature, getBarangayBounds } from "../utils/barangayBoundary";
import { MAASIN_BARANGAYS } from "../constants/barangays";

export const parseLocationPhotos = (loc) => {
  if (!loc) return [];
  const raw = loc.image_url || loc.photo_url || loc.photos;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (e) {
        // ignore parse error
      }
    }
    if (trimmed.includes(",")) {
      return trimmed.split(",").map((s) => s.trim()).filter((s) => s.startsWith("http"));
    }
    return [trimmed];
  }
  return [];
};

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
  const listContainerRef = useRef(null);
  const { API_URL } = useAuth();

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/streets-v12");
  const [mobileTab, setMobileTab] = useState("map"); // 'map' or 'list'
  const [photoGallery, setPhotoGallery] = useState({
    open: false,
    photos: [],
    index: 0,
    title: "",
    barangay: ""
  });
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const sheetScrollRef = useRef(null);

  useEffect(() => {
    setSheetExpanded(false);
    setCopiedCoords(false);
    if (sheetScrollRef.current) {
      sheetScrollRef.current.scrollTop = 0;
    }
  }, [selectedLocation?.id]);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const deltaY = touchStartY.current - touchCurrentY.current;
    if (deltaY > 35 && !sheetExpanded) {
      // Swiped UP -> expand sheet
      setSheetExpanded(true);
    } else if (deltaY < -35 && sheetExpanded) {
      // Swiped DOWN -> collapse sheet if near top
      if (!sheetScrollRef.current || sheetScrollRef.current.scrollTop <= 15) {
        setSheetExpanded(false);
      }
    }
  };

  const handleContentScroll = (e) => {
    // If user scrolls up inside the sheet while collapsed, expand it automatically
    if (e.target.scrollTop > 15 && !sheetExpanded) {
      setSheetExpanded(true);
    }
  };

  const handleCopyCoords = (lat, lng) => {
    if (!lat || !lng) return;
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!photoGallery.open) return;
      if (e.key === "Escape") {
        setPhotoGallery((prev) => ({ ...prev, open: false }));
      } else if (e.key === "ArrowLeft" && photoGallery.photos.length > 1) {
        setPhotoGallery((prev) => ({
          ...prev,
          index: (prev.index - 1 + prev.photos.length) % prev.photos.length
        }));
      } else if (e.key === "ArrowRight" && photoGallery.photos.length > 1) {
        setPhotoGallery((prev) => ({
          ...prev,
          index: (prev.index + 1) % prev.photos.length
        }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photoGallery.open, photoGallery.photos.length]);

  // Fetch water sources from backend API
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        setLoading(true);
        const locRes = await fetch(`${API_URL}/water-locations`);
        const locData = await locRes.json();

        if (locData.success && Array.isArray(locData.data)) {
          setLocations(locData.data);
        }
      } catch (err) {
        console.error("Error fetching data for public map:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();
  }, [API_URL]);

  const renderMarkers = () => {
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
      const sStat = loc.status?.toLowerCase() === "undrinkable" ? "contaminated" : (loc.status?.toLowerCase() || "");
      const matchStatus =
        selectedStatus === "all" ||
        sStat === selectedStatus.toLowerCase() ||
        (selectedStatus === "unknown" && (sStat === "pending" || !sStat));
      return matchQuery && matchBarangay && matchStatus;
    });

    // Add markers for filtered locations
    filtered.forEach((loc) => {
      if (!loc.latitude || !loc.longitude) return;

      const isSafe = loc.status?.toLowerCase() === "safe";
      const isWarning = loc.status?.toLowerCase() === "warning";
      const isUnknown = loc.status?.toLowerCase() === "unknown" || loc.status?.toLowerCase() === "pending";
      const color = isSafe ? "#10b981" : isWarning ? "#f59e0b" : isUnknown ? "#64748b" : "#ef4444";
      const isSelected = selectedLocation?.id === loc.id;

      // When selected: solid blue border (without outer light blue circle)
      const borderStyle = isSelected
        ? "border: 3px solid #2563eb; box-shadow: 0 4px 12px rgba(0,0,0,0.35); transform: scale(1.15);"
        : "border: 2.5px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.35);";

      const labelStyle = isSelected
        ? "border-blue-500 bg-white/95 text-slate-900"
        : "border-slate-300 bg-white/95 text-slate-900";

      // Custom marker DOM element
      const el = document.createElement("div");
      el.className = `custom-water-marker cursor-pointer group flex flex-col items-center pointer-events-auto ${isSelected ? "z-2" : "z-1"}`;
      el.style.zIndex = isSelected ? "2" : "1";
      el.innerHTML = `
        <div class="transition-all duration-200 ease-out group-hover:scale-125 origin-center flex-shrink-0" style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; ${borderStyle}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
          </svg>
        </div>
        <div class="station-zoom-label hidden pointer-events-none mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-md whitespace-nowrap border text-center max-w-[160px] truncate ${labelStyle}">
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
        renderMarkers();
      };

      map.current.once("style.load", reAddLayers);
      map.current.once("idle", reAddLayers);
    }
  }, [mapStyle]);

  // Smoothly scroll and center map on selected barangay
  const handleBarangayChange = (brgy) => {
    setSelectedBarangay(brgy);
    setSelectedLocation(null);

    // Scroll stations sidebar list smoothly to top
    if (listContainerRef.current) {
      listContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (!map.current) return;

    if (brgy === "all") {
      // Smoothly zoom out to show all stations across Maasin City
      if (locations.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        let validCoords = 0;
        locations.forEach((loc) => {
          if (loc.longitude && loc.latitude) {
            bounds.extend([loc.longitude, loc.latitude]);
            validCoords++;
          }
        });
        if (validCoords > 0) {
          map.current.fitBounds(bounds, {
            padding: { top: 70, bottom: 70, left: 70, right: 70 },
            duration: 1500,
            essential: true,
          });
          return;
        }
      }
      map.current.flyTo({
        center: [124.8385, 10.1330],
        zoom: 13.5,
        duration: 1500,
        essential: true,
      });
      return;
    }

    // 1. Look up official GeoJSON boundary bounds to frame the barangay
    const feature = getBarangayFeature(brgy);
    if (feature) {
      const bounds = getBarangayBounds(feature);
      if (bounds) {
        map.current.fitBounds(bounds, {
          padding: { top: 80, bottom: 80, left: 80, right: 80 },
          maxZoom: 16.5,
          duration: 1500, // Smooth camera pan & zoom
          essential: true,
        });
        return;
      }
    }

    // 2. Fallback: Fit to the water sources inside that barangay
    const brgyLocs = locations.filter(
      (l) => l.barangay?.toLowerCase() === brgy.toLowerCase() && l.latitude && l.longitude
    );
    if (brgyLocs.length > 0) {
      if (brgyLocs.length === 1) {
        map.current.flyTo({
          center: [brgyLocs[0].longitude, brgyLocs[0].latitude],
          zoom: 16.5,
          duration: 1500,
          essential: true,
        });
      } else {
        const bounds = new mapboxgl.LngLatBounds();
        brgyLocs.forEach((loc) => bounds.extend([loc.longitude, loc.latitude]));
        map.current.fitBounds(bounds, {
          padding: { top: 80, bottom: 80, left: 80, right: 80 },
          maxZoom: 17,
          duration: 1500,
          essential: true,
        });
      }
    }
  };

  // Add / Update Mapbox Markers when locations, filters, or selection change
  useEffect(() => {
    renderMarkers();
  }, [locations, searchQuery, selectedBarangay, selectedStatus, selectedLocation]);

  // Unique barangays for filter dropdown (includes all official 70 barangays & dataset locations)
  const barangayOptions = Array.from(
    new Set([...MAASIN_BARANGAYS, ...locations.map((loc) => loc.barangay).filter(Boolean)])
  ).sort();

  const filteredLocations = locations.filter((loc) => {
    const matchQuery =
      loc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.barangay?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchBarangay = selectedBarangay === "all" || loc.barangay === selectedBarangay;
    const sStat = loc.status?.toLowerCase() === "undrinkable" ? "contaminated" : (loc.status?.toLowerCase() || "");
    const matchStatus =
      selectedStatus === "all" ||
      sStat === selectedStatus.toLowerCase() ||
      (selectedStatus === "unknown" && (sStat === "pending" || !sStat));
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
                onChange={(e) => handleBarangayChange(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
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
                <option value="contaminated">Contaminated</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
          </div>
        </div>

        {/* Locations List */}
        <div ref={listContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth">
          <div className="flex items-center justify-between px-2 text-xs font-semibold text-slate-500">
            <span>Water Stations ({filteredLocations.length})</span>
            {loading && <span className="text-blue-600 animate-pulse">Loading data...</span>}
          </div>

          {filteredLocations.map((loc) => {
            const isSafe = loc.status?.toLowerCase() === "safe";
            const isWarning = loc.status?.toLowerCase() === "warning";
            const isUnknown = loc.status?.toLowerCase() === "unknown" || loc.status?.toLowerCase() === "pending" || !loc.status;
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
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-slate-800 leading-tight">{loc.name}</h3>
                      {(() => {
                        const photos = parseLocationPhotos(loc);
                        if (photos.length === 0) return null;
                        return (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200 shrink-0"
                            title={`${photos.length} photo(s) available`}
                          >
                            <Camera size={10} />
                            <span>{photos.length}</span>
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Barangay {loc.barangay}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                      isSafe
                        ? "bg-emerald-100 text-emerald-700"
                        : isWarning
                        ? "bg-amber-100 text-amber-700"
                        : isUnknown
                        ? "bg-slate-100 text-slate-700 border border-slate-200"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {isUnknown ? "Unknown" : (loc.status || "Unknown")}
                  </span>
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
          .no-scrollbar::-webkit-scrollbar,
          .no-scrollbar *::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
          .no-scrollbar,
          .no-scrollbar * {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
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
        </div>

        {/* Selected Station Details: Google Maps-style Expandable Bottom Sheet */}
        {selectedLocation && (() => {
          const locPhotos = parseLocationPhotos(selectedLocation);
          const isSafe = selectedLocation.status?.toLowerCase() === "safe";
          const isWarning = selectedLocation.status?.toLowerCase() === "warning";
          const isUnknown = selectedLocation.status?.toLowerCase() === "unknown" || selectedLocation.status?.toLowerCase() === "pending" || !selectedLocation.status;
          const isContaminated = !isSafe && !isWarning && !isUnknown;
          const hasEColi = Boolean(selectedLocation.e_coli || (selectedLocation.e_coli_count && Number(selectedLocation.e_coli_count) > 0));

          return (
            <div
              className={`fixed sm:fixed z-40 bg-white transition-all duration-300 ease-out flex flex-col shadow-2xl border-slate-200 overflow-hidden
                /* Mobile: Docked Bottom Sheet */
                bottom-0 left-0 right-0 rounded-t-3xl border-t
                ${sheetExpanded ? "h-[calc(100dvh-5rem)]" : "h-[290px]"}
                /* Desktop: Floating Corner Card */
                sm:bottom-6 sm:right-6 sm:left-auto sm:w-96 sm:h-auto sm:max-h-[85vh] sm:rounded-3xl sm:border
              `}
            >
              {/* Drag Handle Bar & Peek Area (Mobile Only) */}
              <div
                className="w-full pt-2.5 pb-1 flex flex-col items-center justify-center cursor-pointer select-none touch-none hover:bg-slate-50/70 rounded-t-3xl transition-colors shrink-0 sm:hidden"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => setSheetExpanded((prev) => !prev)}
                title={sheetExpanded ? "Drag or tap to collapse" : "Drag or tap to expand"}
              >
                <div className="w-12 h-1.5 bg-slate-300 rounded-full transition-colors hover:bg-slate-400" />
                <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 mt-1">
                  {sheetExpanded ? (
                    <>
                      <ChevronDown size={12} />
                      <span>Tap or drag down to minimize</span>
                    </>
                  ) : (
                    <>
                      <ChevronUp size={12} />
                      <span>Scroll or drag up to view more</span>
                    </>
                  )}
                </div>
              </div>

              {/* Sheet Content (Scrollable) */}
              <div
                ref={sheetScrollRef}
                onScroll={handleContentScroll}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5 space-y-3.5 scroll-smooth sm:pt-5 no-scrollbar"
              >
                {/* Title, Status Badge & Close Button */}
                <div className="flex items-start justify-between gap-3 pt-1 sm:pt-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                        Water Station
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          isSafe
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : isWarning
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : isUnknown
                            ? "bg-slate-100 text-slate-700 border border-slate-200"
                            : "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {isSafe && <ShieldCheck size={11} />}
                        {isWarning && <AlertTriangle size={11} />}
                        {isContaminated && <XCircle size={11} />}
                        {isUnknown && <HelpCircle size={11} />}
                        <span>{isUnknown ? "Unknown" : selectedLocation.status}</span>
                      </span>
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 leading-tight mt-0.5 truncate">
                      {selectedLocation.name}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      <span>Barangay {selectedLocation.barangay}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedLocation(null);
                      setSheetExpanded(false);
                    }}
                    className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer shrink-0 transition-colors"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Google Maps-style Quick Action Buttons Row */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedLocation.latitude},${selectedLocation.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shrink-0 shadow-sm cursor-pointer"
                  >
                    <Navigation size={13} className="fill-white" />
                    <span>Directions</span>
                  </a>

                  {locPhotos.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPhotoGallery({
                          open: true,
                          photos: locPhotos,
                          index: 0,
                          title: selectedLocation.name,
                          barangay: selectedLocation.barangay,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-medium text-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <Camera size={13} className="text-blue-600" />
                      <span>Photos ({locPhotos.length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopyCoords(selectedLocation.latitude, selectedLocation.longitude)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-medium text-xs transition-colors shrink-0 cursor-pointer"
                  >
                    {copiedCoords ? (
                      <>
                        <Check size={13} className="text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} className="text-slate-500" />
                        <span>Copy Coords</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSheetExpanded((prev) => !prev)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs transition-colors shrink-0 cursor-pointer sm:hidden"
                  >
                    {sheetExpanded ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                    <span>{sheetExpanded ? "Less" : "More"}</span>
                  </button>
                </div>

                {/* Detailed Station Metrics & Information */}
                <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/70 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Safety Status:</span>
                    <span className="font-bold uppercase text-slate-900">
                      {isUnknown ? "Unknown" : selectedLocation.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-500 font-medium">E. Coli Presence:</span>
                    {isUnknown || selectedLocation.e_coli === null || selectedLocation.e_coli === undefined || selectedLocation.e_coli === "unknown" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span>Unknown</span>
                      </span>
                    ) : hasEColi ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-800 border border-red-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                        <span>Present</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        <span>Not Present</span>
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Coordinates:</span>
                    <span className="font-mono text-slate-700 font-medium">
                      {selectedLocation.latitude?.toFixed(4)}, {selectedLocation.longitude?.toFixed(4)}
                    </span>
                  </div>

                  {selectedLocation.sample_date && (
                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/60">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        <span>Tested Date:</span>
                      </span>
                      <span className="font-mono text-slate-800 font-medium">
                        {selectedLocation.sample_date} {selectedLocation.sample_time ? `• ${selectedLocation.sample_time}` : ""}
                      </span>
                    </div>
                  )}
                </div>

                {/* Photo Preview Banner / Strip */}
                {locPhotos.length > 0 ? (
                  <div>
                    <div
                      className="relative rounded-2xl overflow-hidden border border-slate-200 group cursor-pointer shadow-xs hover:shadow-md transition-all"
                      onClick={() =>
                        setPhotoGallery({
                          open: true,
                          photos: locPhotos,
                          index: 0,
                          title: selectedLocation.name,
                          barangay: selectedLocation.barangay,
                        })
                      }
                    >
                      <img
                        src={locPhotos[0]}
                        alt={selectedLocation.name}
                        className="w-full h-48 sm:h-40 object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-between p-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/95 backdrop-blur-md text-[11px] font-bold text-slate-900 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Camera size={13} className="text-blue-600 group-hover:text-white" />
                          <span>See {locPhotos.length === 1 ? "Photo" : `All ${locPhotos.length} Photos`}</span>
                        </span>
                        {locPhotos.length > 1 && (
                          <span className="text-[10px] font-bold text-white bg-slate-900/80 px-2.5 py-1 rounded-lg backdrop-blur-xs">
                            1 of {locPhotos.length}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Thumbnail row if multiple photos */}
                    {locPhotos.length > 1 && (
                      <div className="flex gap-2 mt-2 overflow-x-auto pb-1 no-scrollbar">
                        {locPhotos.map((photoUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              setPhotoGallery({
                                open: true,
                                photos: locPhotos,
                                index: idx,
                                title: selectedLocation.name,
                                barangay: selectedLocation.barangay,
                              })
                            }
                            className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer"
                          >
                            <img src={photoUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : sheetExpanded ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 flex flex-col items-center justify-center text-center text-slate-400">
                    <ImageIcon size={26} className="text-slate-300 mb-1.5" />
                    <p className="text-xs font-semibold text-slate-600">No photos available for this station</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Photos uploaded by inspectors or staff will appear here</p>
                  </div>
                ) : null}


              </div>
            </div>
          );
        })()}

        {/* Water Source Photo Lightbox Modal */}
        {photoGallery.open && photoGallery.photos.length > 0 && (
          <div
            className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-fade-in"
            onClick={() => setPhotoGallery((prev) => ({ ...prev, open: false }))}
          >
            <div
              className="bg-white rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{photoGallery.title}</h4>
                  <p className="text-xs text-slate-500">Barangay {photoGallery.barangay}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                    {photoGallery.index + 1} of {photoGallery.photos.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPhotoGallery((prev) => ({ ...prev, open: false }))}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="relative mt-3 flex items-center justify-center bg-slate-950 rounded-2xl overflow-hidden min-h-[300px] max-h-[65vh]">
                <img
                  src={photoGallery.photos[photoGallery.index]}
                  alt={`${photoGallery.title} - Photo ${photoGallery.index + 1}`}
                  className="max-h-[60vh] w-auto object-contain rounded-lg transition-all"
                />

                {photoGallery.photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoGallery((prev) => ({
                          ...prev,
                          index: (prev.index - 1 + prev.photos.length) % prev.photos.length
                        }));
                      }}
                      className="absolute left-3 p-2.5 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white backdrop-blur-sm cursor-pointer transition-transform hover:scale-110 shadow-lg"
                      title="Previous photo"
                    >
                      <ChevronLeft size={22} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoGallery((prev) => ({
                          ...prev,
                          index: (prev.index + 1) % prev.photos.length
                        }));
                      }}
                      className="absolute right-3 p-2.5 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white backdrop-blur-sm cursor-pointer transition-transform hover:scale-110 shadow-lg"
                      title="Next photo"
                    >
                      <ChevronRight size={22} />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail Navigation Row */}
              {photoGallery.photos.length > 1 && (
                <div className="flex gap-2 pt-3 overflow-x-auto justify-center no-scrollbar">
                  {photoGallery.photos.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPhotoGallery((prev) => ({ ...prev, index: idx }))}
                      className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                        photoGallery.index === idx ? "border-blue-600 scale-105 shadow-md" : "border-slate-200 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicMap;
