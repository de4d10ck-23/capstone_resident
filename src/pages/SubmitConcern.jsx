import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Crosshair,
  UploadCloud,
  Image as ImageIcon,
  X,
  Loader2,
  FileText,
  Clock,
  ExternalLink,
  RefreshCw,
  Eye
} from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAASIN_BARANGAYS as barangays } from "../constants/barangays";
import ReportDetailModal from "../components/ReportDetailModal";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_KEY || "pk.eyJ1Ijoiamx0dCIsImEiOiJjbW9pNHBpZTgwMHB3MnFxMHNxcnY0MXBiIn0.__mzgeQcXuEDVkV6q8QNfQ";

const extractPhotoProof = (r) => {
  if (!r) return null;
  if (r.image_url) return r.image_url;
  if (r.photo_url) return r.photo_url;
  if (r.description) {
    const match = r.description.match(/\[(?:Attached )?Photo Proof:\s*(https?:\/\/[^\s\]]+)\]/i)
      || r.description.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|webp|gif))/i);
    if (match) return match[1];
  }
  return null;
};

const cleanDesc = (r) => {
  if (!r) return "";
  if (r.clean_description) return r.clean_description;
  if (r.description) {
    return r.description.replace(/\[(?:Attached )?Photo Proof:\s*https?:\/\/[^\s\]]+\]/gi, "").trim();
  }
  return "";
};

const SubmitConcern = () => {
  const { user, token, API_URL } = useAuth();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    barangay: user?.barangay || "Combado",
    category: "water_quality",
    latitude: 10.1330,
    longitude: 124.8700,
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [myReports, setMyReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedProof, setSelectedProof] = useState(null);
  const [detailReport, setDetailReport] = useState(null);

  const fileInputRef = useRef(null);
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);

  const isUnregisteredSource = formData.category === "unregistered_source";

  // Fetch Resident's Own Submitted Reports
  const fetchMyReports = async () => {
    try {
      setLoadingReports(true);
      const res = await fetch(`${API_URL}/resident-reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMyReports(data.data);
      }
    } catch (err) {
      console.error("Error fetching my resident reports:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchMyReports();
  }, [token, API_URL]);

  // Handle Image Selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("Selected image is larger than 10MB. Please choose a smaller image.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file (PNG, JPG, JPEG, WebP).");
      return;
    }

    setErrorMsg("");
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Clean up preview object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Initialize and handle Mapbox map when category is "New / Unregistered Water Source"
  useEffect(() => {
    if (!isUnregisteredSource) {
      if (map.current) {
        map.current.remove();
        map.current = null;
        marker.current = null;
      }
      return;
    }

    if (!mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const initialLng = parseFloat(formData.longitude) || 124.8700;
    const initialLat = parseFloat(formData.latitude) || 10.1330;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [initialLng, initialLat],
      zoom: 13,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

    // Custom interactive marker element
    const el = document.createElement("div");
    el.className = "cursor-grab active:cursor-grabbing";
    el.innerHTML = `
      <div class="flex flex-col items-center group">
        <div class="px-2.5 py-1 rounded-full bg-blue-900 text-white text-[10px] font-bold shadow-lg mb-1 whitespace-nowrap border border-cyan-400 flex items-center gap-1 animate-pulse">
          <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
          <span>New Source Location</span>
        </div>
        <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 border-2 border-white shadow-xl flex items-center justify-center text-white ring-4 ring-blue-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      </div>
    `;

    marker.current = new mapboxgl.Marker({
      element: el,
      draggable: true,
      anchor: "bottom",
    })
      .setLngLat([initialLng, initialLat])
      .addTo(map.current);

    // On marker dragend: update form coordinates
    marker.current.on("dragend", () => {
      const lngLat = marker.current.getLngLat();
      setFormData((prev) => ({
        ...prev,
        latitude: parseFloat(lngLat.lat.toFixed(6)),
        longitude: parseFloat(lngLat.lng.toFixed(6)),
      }));
    });

    // On map click: move marker and update coordinates
    map.current.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      marker.current.setLngLat([lng, lat]);
      setFormData((prev) => ({
        ...prev,
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lng.toFixed(6)),
      }));
    });

    // Resize map once DOM rendered
    const timer = setTimeout(() => {
      if (map.current) {
        map.current.resize();
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      if (map.current) {
        map.current.remove();
        map.current = null;
        marker.current = null;
      }
    };
  }, [isUnregisteredSource]);

  // Geolocation handler to use user's current GPS location
  const handleUseCurrentLocation = () => {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your web browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));

        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));

        if (map.current) {
          map.current.flyTo({
            center: [lng, lat],
            zoom: 16,
            essential: true,
          });
        }
        if (marker.current) {
          marker.current.setLngLat([lng, lat]);
        }
        setLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocating(false);
        if (error.code === 1) {
          setGeoError("Location permission denied. Please allow GPS access in your browser or click on the map to pinpoint.");
        } else {
          setGeoError("Unable to acquire your exact location. Please select the location manually on the map.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const updateMapMarker = (latVal, lngVal) => {
    const lat = parseFloat(latVal);
    const lng = parseFloat(lngVal);
    const isValidLat = !isNaN(lat) && lat >= -90 && lat <= 90;
    const isValidLng = !isNaN(lng) && lng >= -180 && lng <= 180;

    if (isValidLat && isValidLng && marker.current && map.current) {
      try {
        marker.current.setLngLat([lng, lat]);
        map.current.flyTo({ center: [lng, lat] });
      } catch (err) {
        console.warn("Could not update map marker position:", err);
      }
    }
  };

  const handleManualCoordChange = (field, val) => {
    // Check if user pasted a coordinate pair like "10.1330, 124.8700"
    if (typeof val === "string") {
      const matches = val.match(/[-+]?[0-9]*\.?[0-9]+/g);
      if (matches && matches.length >= 2) {
        let n1 = parseFloat(matches[0]);
        let n2 = parseFloat(matches[1]);
        if (!isNaN(n1) && !isNaN(n2)) {
          let lat = n1;
          let lng = n2;
          if (Math.abs(n1) > 90 && Math.abs(n2) <= 90) {
            lat = n2;
            lng = n1;
          }
          setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
          updateMapMarker(lat, lng);
          return;
        }
      }
    }

    const updated = {
      ...formData,
      [field]: val,
    };
    setFormData(updated);

    const lat = parseFloat(field === "latitude" ? val : formData.latitude);
    const lng = parseFloat(field === "longitude" ? val : formData.longitude);
    updateMapMarker(lat, lng);
  };

  const handleCoordPaste = (e) => {
    const pasteText = e.clipboardData?.getData("text") || "";
    const matches = pasteText.match(/[-+]?[0-9]*\.?[0-9]+/g);
    if (matches && matches.length >= 2) {
      e.preventDefault();
      let n1 = parseFloat(matches[0]);
      let n2 = parseFloat(matches[1]);
      if (!isNaN(n1) && !isNaN(n2)) {
        let lat = n1;
        let lng = n2;
        if (Math.abs(n1) > 90 && Math.abs(n2) <= 90) {
          lat = n2;
          lng = n1;
        }
        setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
        updateMapMarker(lat, lng);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    setGeoError("");
    setIsSubmitting(true);
    setUploadStatus("");

    try {
      let uploadedImageUrl = null;

      // If optional image was selected, upload it first
      if (selectedFile) {
        setUploadStatus("Uploading proof photo...");
        const imgFormData = new FormData();
        imgFormData.append("file", selectedFile);

        try {
          const uploadRes = await fetch(`${API_URL}/resident-reports/upload-image`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: imgFormData,
          });

          const uploadData = await uploadRes.json();
          if (uploadData.success && uploadData.image_url) {
            uploadedImageUrl = uploadData.image_url;
          }
        } catch (uploadErr) {
          console.warn("Direct resident-reports upload failed, trying water-locations upload endpoint...", uploadErr);
          const fallbackRes = await fetch(`${API_URL}/water-locations/upload-image`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: imgFormData,
          });
          const fallbackData = await fallbackRes.json();
          if (fallbackData.success && fallbackData.image_url) {
            uploadedImageUrl = fallbackData.image_url;
          }
        }
      }

      setUploadStatus("Sending concern to Barangay...");

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        type: formData.category,
        barangay: formData.barangay,
        latitude: isUnregisteredSource ? parseFloat(formData.latitude) : null,
        longitude: isUnregisteredSource ? parseFloat(formData.longitude) : null,
        image_url: uploadedImageUrl,
        photo_url: uploadedImageUrl,
      };

      const res = await fetch(`${API_URL}/resident-reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(
          "Concern submitted! Your Barangay Officials will review and endorse this directly to Sanitization Inspectors."
        );
        setFormData({
          title: "",
          description: "",
          barangay: user?.barangay || "Combado",
          category: "water_quality",
          latitude: 10.1330,
          longitude: 124.8700,
        });
        handleRemoveImage();
        fetchMyReports();
      } else {
        setErrorMsg(data.detail || "Failed to submit concern. Please try again.");
      }
    } catch (err) {
      console.error("Error submitting resident concern:", err);
      setErrorMsg("Network connection error. Could not reach the server.");
    } finally {
      setIsSubmitting(false);
      setUploadStatus("");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-800 rounded-3xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <MessageSquare size={24} className="text-cyan-300" />
          <h1 className="text-3xl font-extrabold text-white">Submit Community Concern</h1>
        </div>
        <p className="text-white/80 text-sm max-w-xl">
          Report broken water pipes, unhygienic toilet proximity, contaminated supplies, or new unregistered water stations directly to your Barangay Officials for review and inspection triage.
        </p>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3 shadow-sm">
          <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Submission Received</p>
            <p>{successMsg}</p>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div className="p-5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3 shadow-sm">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Submission Error</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Main Form Container */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-4">New Concern Details</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Concern Subject / Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Brown water coming out of tap on Rizal St."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Concern Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
              >
                <option value="water_quality">Water Quality (Odor, Color, Taste)</option>
                <option value="broken_pipe">Damaged / Broken Pipeline</option>
                <option value="toilet_proximity">Unhygienic Toilet Near Water Source</option>
                <option value="unregistered_source">New / Unregistered Water Source</option>
                <option value="other">Other Community Health Issue</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Barangay Location
            </label>
            <select
              value={formData.barangay}
              onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
              required
            >
              {barangays.map((b) => (
                <option key={b} value={b}>
                  Barangay {b}
                </option>
              ))}
            </select>
          </div>

          {/* Interactive Map & GPS Pinpoint Section - Appears when "New / Unregistered Water Source" is selected */}
          {isUnregisteredSource && (
            <div className="space-y-4 p-5 sm:p-6 rounded-2xl bg-slate-50 border border-blue-200 animate-fade-in shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPin size={18} className="text-blue-600" />
                    <h3 className="font-bold text-sm text-slate-900">
                      Water Source Location Pinpoint
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Click anywhere on the map or drag the pin to set the exact coordinates of the unregistered source.
                  </p>
                </div>

                {/* Use Current GPS Location Button */}
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locating}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 flex-shrink-0"
                >
                  {locating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Acquiring GPS...</span>
                    </>
                  ) : (
                    <>
                      <Crosshair size={15} />
                      <span>Use Current Location</span>
                    </>
                  )}
                </button>
              </div>

              {/* Geolocation Warning / Feedback */}
              {geoError && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
                  <span>{geoError}</span>
                </div>
              )}

              {/* Map Container */}
              <div className="relative w-full h-80 rounded-2xl overflow-hidden border border-slate-300 shadow-md">
                <div ref={mapContainer} className="w-full h-full" />
                
                {/* Floating GPS badge on map */}
                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-xs font-mono shadow-md border border-white/10 pointer-events-none flex items-center gap-2 z-10">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  <span>
                    Lat: {parseFloat(formData.latitude).toFixed(6)} | Lng: {parseFloat(formData.longitude).toFixed(6)}
                  </span>
                </div>
              </div>

              {/* Coordinate Numeric Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                      Latitude (GPS)
                    </label>
                    <span className="text-[10px] text-slate-400">Accepts paste (lat, lng)</span>
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.latitude}
                    onChange={(e) => handleManualCoordChange("latitude", e.target.value)}
                    onPaste={handleCoordPaste}
                    placeholder="10.133000"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                      Longitude (GPS)
                    </label>
                    <span className="text-[10px] text-slate-400">Accepts paste (lat, lng)</span>
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.longitude}
                    onChange={(e) => handleManualCoordChange("longitude", e.target.value)}
                    onPaste={handleCoordPaste}
                    placeholder="124.870000"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Detailed Description
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={
                isUnregisteredSource
                  ? "Describe who constructed the water source, estimated households using it, visible sanitation hazards, or landmark directions..."
                  : "Provide specific details to help Barangay Officials and Health Inspectors investigate..."
              }
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
              required
            />
          </div>

          {/* Optional Image / Proof Upload Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Photo Proof / Attachment
              </label>
              <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                Optional
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              id="concern-image-input"
            />

            {!previewUrl ? (
              <label
                htmlFor="concern-image-input"
                className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl bg-slate-50/70 hover:bg-blue-50/30 transition-all cursor-pointer text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-white group-hover:bg-blue-100 text-slate-400 group-hover:text-blue-600 border border-slate-200 group-hover:border-blue-200 flex items-center justify-center shadow-xs transition-all mb-3">
                  <UploadCloud size={24} />
                </div>
                <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-900">
                  Click to upload photo proof
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports PNG, JPG, JPEG or WebP (Max 10MB)
                </p>
              </label>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 bg-slate-100 flex-shrink-0">
                    <img
                      src={previewUrl}
                      alt="Proof Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {selectedFile?.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {selectedFile?.size ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : "Attached photo"}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 mt-0.5">
                      <CheckCircle2 size={12} /> Ready to submit
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                  title="Remove image"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-full bg-blue-900 hover:bg-blue-800 text-white font-semibold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{uploadStatus || "Submitting Concern..."}</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Send to Barangay & Health Inspectors</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* My Submitted Concerns & Live Status Tracking */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">My Submitted Concerns</h2>
            <p className="text-xs text-slate-500">Track real-time progress as your Barangay and Inspectors process your reports</p>
          </div>
          <button
            onClick={fetchMyReports}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh status"
          >
            <RefreshCw size={15} className={loadingReports ? "animate-spin" : ""} />
          </button>
        </div>

        {loadingReports ? (
          <div className="text-center py-8 text-slate-400 text-xs">Loading submission status...</div>
        ) : myReports.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            You haven't submitted any concerns yet.
          </div>
        ) : (
          <div className="space-y-3">
            {myReports.map((r) => {
              const isPending = !r.status || r.status === "pending";
              const isEscalated = r.status === "escalated";
              const isValidated = r.status === "validated";
              const isRejected = r.status === "rejected" || r.status === "dismissed";
              const photo = extractPhotoProof(r);
              const displayDesc = cleanDesc(r) || r.description;

              return (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:bg-slate-50"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{r.title}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 capitalize">
                        {(r.type || r.category || "Concern").replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{displayDesc}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span>Brgy. {r.barangay}</span>
                      <span>•</span>
                      <span>{r.created_at ? new Date(r.created_at).toLocaleDateString() : "Recent"}</span>
                      {photo && (
                        <>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => setSelectedProof(photo)}
                            className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={12} />
                            <span>View Proof</span>
                          </button>
                        </>
                      )}
                      {r.reason && (
                        <>
                          <span>•</span>
                          <span className="text-amber-700 italic">Brgy Note: {r.reason}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setDetailReport(r)}
                      className="px-3 py-1 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 hover:border-blue-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="View complete details of this submission"
                    >
                      <Eye size={12} />
                      <span>View</span>
                    </button>

                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      isPending
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : isEscalated
                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                        : isValidated
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-slate-200 text-slate-700"
                    }`}>
                      {isPending && <Clock size={12} />}
                      {isEscalated && <Send size={12} />}
                      {isValidated && <CheckCircle2 size={12} />}
                      <span>
                        {isPending
                          ? "Pending Barangay Review"
                          : isEscalated
                          ? "Passed to CHU"
                          : isValidated
                          ? "Validated & Verified"
                          : "Dismissed"}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detailed Concern Modal for Resident with Mapbox */}
      {detailReport && (
        <ReportDetailModal
          report={detailReport}
          onClose={() => setDetailReport(null)}
        />
      )}

      {/* Photo Proof Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Submitted Photo Proof</h3>
              <button
                onClick={() => setSelectedProof(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="w-full max-h-[60vh] overflow-hidden rounded-2xl bg-slate-100 flex items-center justify-center">
              <img
                src={selectedProof}
                alt="Proof Preview"
                className="max-h-[58vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmitConcern;
