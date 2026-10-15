import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  PlusCircle, 
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
  Eye, 
  Trash2,
  Droplets,
  Maximize2,
  Layers
} from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import ReportDetailModal from "../components/ReportDetailModal";
import {
  getBarangayFeature,
  getBarangayBounds,
  getBarangayCenter,
  checkBarangayJurisdiction,
  formatBarangayName
} from "../utils/barangayBoundary";

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
    return r.description
      .replace(/\[(?:Attached )?Photo Proof:\s*https?:\/\/[^\s\]]+\]/gi, "")
      .replace(/\[Inspected Source:[^\]]+\]\s*/gi, "")
      .trim();
  }
  return "";
};

const AddWaterSource = () => {
  const { user, token, API_URL } = useAuth();

  const userBrgy = user?.barangay || "Abgao";
  const defaultFeat = getBarangayFeature(userBrgy);
  const defaultCenter = defaultFeat ? getBarangayCenter(defaultFeat) : [124.84343, 10.135769];
  const defaultLng = defaultCenter ? parseFloat(defaultCenter[0].toFixed(6)) : 124.84343;
  const defaultLat = defaultCenter ? parseFloat(defaultCenter[1].toFixed(6)) : 10.135769;

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    barangay: userBrgy,
    latitude: defaultLat,
    longitude: defaultLng,
  });

  const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/streets-v12");

  const [locationValidation, setLocationValidation] = useState({
    isValid: true,
    detectedArea: "",
    message: "",
  });
  const [validatingLoc, setValidatingLoc] = useState(false);
  const debounceTimerRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [mySources, setMySources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [detailReport, setDetailReport] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fileInputRef = useRef(null);
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);

  // Fetch Resident's Own Submitted Water Sources
  const fetchMySources = async () => {
    try {
      setLoadingSources(true);
      const res = await fetch(`${API_URL}/resident-reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const sourcesOnly = data.data.filter(
          (r) => r.type === "unregistered_source" || r.category === "unregistered_source"
        );
        setMySources(sourcesOnly);
      }
    } catch (err) {
      console.error("Error fetching my water sources:", err);
    } finally {
      setLoadingSources(false);
    }
  };

  // Delete pending source submitted by resident
  const handleDeleteSource = async (id) => {
    if (!window.confirm("Are you sure you want to delete this pending water source report?")) return;
    try {
      setDeletingId(id);
      const res = await fetch(`${API_URL}/resident-reports/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.detail || data.message || "Failed to delete water source report");
      }
      setMySources((prev) => prev.filter((r) => r.id !== id));
      if (detailReport?.id === id) {
        setDetailReport(null);
      }
    } catch (err) {
      console.error("Error deleting source:", err);
      alert(err.message || "Failed to delete water source report.");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchMySources();
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

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const userBarangayRef = useRef(user?.barangay || "Abgao");
  useEffect(() => {
    userBarangayRef.current = user?.barangay || "Abgao";
  }, [user?.barangay]);

  // Render boundary overlay layers on Mapbox map
  const renderBoundaryLayer = (brgyName, shouldFit = false) => {
    if (!map.current) return;

    const target = brgyName || userBarangayRef.current || "Abgao";
    const feature = getBarangayFeature(target);
    if (!feature) return;

    // If style isn't fully ready yet, queue once on 'idle' when style & tiles are guaranteed ready
    if (!map.current.isStyleLoaded()) {
      map.current.once("idle", () => {
        renderBoundaryLayer(brgyName, shouldFit);
      });
      return;
    }

    const sourceData = {
      type: "FeatureCollection",
      features: [feature],
    };

    try {
      // 1. Ensure GeoJSON source exists and is updated
      const existingSource = map.current.getSource("barangay-boundary");
      if (existingSource) {
        existingSource.setData(sourceData);
      } else {
        map.current.addSource("barangay-boundary", {
          type: "geojson",
          data: sourceData,
        });
      }

      // 2. Ensure fill layer exists (vibrant translucent sky blue)
      if (!map.current.getLayer("barangay-boundary-fill")) {
        map.current.addLayer({
          id: "barangay-boundary-fill",
          type: "fill",
          source: "barangay-boundary",
          paint: {
            "fill-color": "#0ea5e9",
            "fill-opacity": 0.28,
          },
        });
      }

      // 3. Ensure outer perimeter glow exists (bright sky cyan for high satellite contrast)
      if (!map.current.getLayer("barangay-boundary-glow")) {
        map.current.addLayer({
          id: "barangay-boundary-glow",
          type: "line",
          source: "barangay-boundary",
          paint: {
            "line-color": "#38bdf8",
            "line-width": 6,
            "line-opacity": 0.85,
          },
        });
      }

      // 4. Ensure dashed border perimeter line exists
      if (!map.current.getLayer("barangay-boundary-line")) {
        map.current.addLayer({
          id: "barangay-boundary-line",
          type: "line",
          source: "barangay-boundary",
          paint: {
            "line-color": "#0284c7",
            "line-width": 3.5,
            "line-dasharray": [2, 1.5],
          },
        });
      }
    } catch (err) {
      console.warn("Error rendering boundary layer:", err);
    }

    if (shouldFit) {
      const bounds = getBarangayBounds(feature);
      if (bounds) {
        map.current.fitBounds(bounds, { padding: 45, maxZoom: 16.5, duration: 800 });
      }
    }
  };

  // Re-center and frame the map on designated barangay boundary
  const handleFitToBoundary = () => {
    if (!map.current) return;
    renderBoundaryLayer(userBarangayRef.current || "Abgao", true);
  };

  // Change Map Style (Streets / Satellite) and reliably preserve boundary
  const handleMapStyleChange = (newStyle) => {
    if (newStyle === mapStyle) return;
    setMapStyle(newStyle);
    if (!map.current) return;

    // Use map.once("idle") to re-apply the boundary as soon as the new style is completely ready
    map.current.once("idle", () => {
      renderBoundaryLayer(userBarangayRef.current || "Abgao", false);
    });

    map.current.setStyle(newStyle, { diff: false });
  };

  // Validate whether coordinates fall within resident's designated barangay
  const validateCoordinates = async (lat, lng) => {
    const targetBrgy = (user?.barangay || "Combado").trim();
    if (isNaN(lat) || isNaN(lng)) return;
    setValidatingLoc(true);

    // 1. Strict check against official GeoJSON barangay polygon boundaries
    const jurisdiction = checkBarangayJurisdiction(lng, lat, targetBrgy);
    if (jurisdiction.targetFeature) {
      if (jurisdiction.isInsideTarget) {
        setLocationValidation({
          isValid: true,
          detectedArea: targetBrgy,
          message: `Location verified inside Barangay ${targetBrgy}.`,
        });
      } else {
        const detected = jurisdiction.detectedBarangay;
        setLocationValidation({
          isValid: false,
          detectedArea: detected || "Outside boundary",
          message:
            detected && detected.toLowerCase() !== targetBrgy.toLowerCase()
              ? `Location is in Barangay ${detected} (Outside Barangay ${targetBrgy}). Please pin inside.`
              : `Location is outside Barangay ${targetBrgy}. Please pin inside.`,
        });
      }
      setValidatingLoc(false);
      return;
    }

    // 2. Fallback to Mapbox geocoding reverse lookup if not caught by polygon rings
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();
      const features = data.features || [];

      let detectedName = null;
      for (const f of features) {
        const pt = f.place_type || [];
        if (pt.includes("locality") || pt.includes("neighborhood")) {
          detectedName = f.text;
          break;
        } else if (pt.includes("address")) {
          const ctx = (f.context || []).find((c) => c.id.startsWith("locality") || c.id.startsWith("neighborhood"));
          if (ctx) {
            detectedName = ctx.text;
            break;
          }
        }
      }

      const targetLower = targetBrgy.toLowerCase();
      const isMatch = features.some((f) => {
        const pName = (f.place_name || "").toLowerCase();
        const text = (f.text || "").toLowerCase();
        return pName.includes(targetLower) || text === targetLower;
      });

      const isExplicitDifferent = detectedName && detectedName.toLowerCase() !== targetLower;
      const isValid = isMatch && !isExplicitDifferent;

      if (isValid) {
        setLocationValidation({
          isValid: true,
          detectedArea: detectedName || targetBrgy,
          message: `Location verified inside Barangay ${targetBrgy}.`
        });
      } else {
        const areaText = detectedName ? `in Barangay ${detectedName}` : "outside your barangay boundary";
        setLocationValidation({
          isValid: false,
          detectedArea: detectedName || "Outside boundary",
          message: `Location is ${areaText} (outside Barangay ${targetBrgy}). Please pin inside.`
        });
      }
    } catch (err) {
      console.warn("Location boundary check error:", err);
    } finally {
      setValidatingLoc(false);
    }
  };

  // Center map and load boundary on resident's designated barangay upon loading
  useEffect(() => {
    const targetBrgy = user?.barangay || "Combado";

    // 1. Check if we have official GeoJSON polygon for this barangay
    const feat = getBarangayFeature(targetBrgy);
    if (feat) {
      const center = getBarangayCenter(feat);
      if (center) {
        const [cLng, cLat] = center;
        const lat = parseFloat(cLat.toFixed(6));
        const lng = parseFloat(cLng.toFixed(6));
        setFormData((prev) => ({
          ...prev,
          barangay: targetBrgy,
          latitude: lat,
          longitude: lng,
        }));
        if (marker.current) {
          marker.current.setLngLat([cLng, cLat]);
        }
        validateCoordinates(lat, lng);
      }
      renderBoundaryLayer(targetBrgy, true);
      return;
    }

    // 2. Fallback: Geocode via Mapbox forward API
    const initBarangay = async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(targetBrgy + ', Maasin, Southern Leyte')}.json?access_token=${MAPBOX_TOKEN}`;
        const res = await fetch(url);
        const data = await res.json();
        const featData = data.features?.[0];
        if (featData && featData.center) {
          const [cLng, cLat] = featData.center;
          const lat = parseFloat(cLat.toFixed(6));
          const lng = parseFloat(cLng.toFixed(6));
          setFormData((prev) => ({
            ...prev,
            barangay: targetBrgy,
            latitude: lat,
            longitude: lng,
          }));
          if (map.current) {
            map.current.flyTo({ center: [cLng, cLat], zoom: 15 });
          }
          if (marker.current) {
            marker.current.setLngLat([cLng, cLat]);
          }
          validateCoordinates(lat, lng);
        }
      } catch (err) {
        console.warn("Error geocoding resident barangay center:", err);
      }
    };

    initBarangay();
  }, [user?.barangay]);

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const initialLng = defaultLng;
    const initialLat = defaultLat;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [initialLng, initialLat],
      zoom: 15.5,
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

    // On marker dragend: update form coordinates & validate boundary
    marker.current.on("dragend", () => {
      const lngLat = marker.current.getLngLat();
      const lat = parseFloat(lngLat.lat.toFixed(6));
      const lng = parseFloat(lngLat.lng.toFixed(6));
      setFormData((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
      }));
      validateCoordinates(lat, lng);
    });

    // On map click: move marker, update coordinates & validate boundary
    map.current.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      const fLat = parseFloat(lat.toFixed(6));
      const fLng = parseFloat(lng.toFixed(6));
      marker.current.setLngLat([lng, lat]);
      setFormData((prev) => ({
        ...prev,
        latitude: fLat,
        longitude: fLng,
      }));
      validateCoordinates(fLat, fLng);
    });

    // Render initial boundary overlay once map finishes loading
    map.current.on("load", () => {
      renderBoundaryLayer(userBarangayRef.current, true);
    });

    // Render boundary overlay whenever any style finishes loading
    map.current.on("style.load", () => {
      renderBoundaryLayer(userBarangayRef.current, false);
    });

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
  }, []);

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

        // Validate if acquired GPS location is inside resident's designated barangay
        validateCoordinates(lat, lng);
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

    if (isValidLat && isValidLng) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        validateCoordinates(lat, lng);
      }, 400);
    }
  };

  const handleManualCoordChange = (field, val) => {
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
          console.warn("Direct resident-reports upload failed, trying fallback...", uploadErr);
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

      setUploadStatus("Sending water source details to Barangay...");

      if (!locationValidation.isValid) {
        setErrorMsg(
          `Cannot submit: The chosen location is outside Barangay ${user?.barangay || "Abgao"}. Please place the pin inside your designated barangay.`
        );
        setIsSubmitting(false);
        setUploadStatus("");
        return;
      }

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: "unregistered_source",
        type: "unregistered_source",
        barangay: user?.barangay || "Combado",
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
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
          "Water source reported! Your Barangay Officials and Health Inspectors will review and verify this location for formal inspection."
        );
        setFormData((prev) => ({
          ...prev,
          title: "",
          description: "",
          barangay: user?.barangay || "Combado",
        }));
        handleRemoveImage();
        fetchMySources();
      } else {
        setErrorMsg(data.detail || "Failed to submit water source. Please try again.");
      }
    } catch (err) {
      console.error("Error submitting water source:", err);
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
          <PlusCircle size={26} className="text-cyan-300" />
          <h1 className="text-3xl font-extrabold text-white">Add Water Source</h1>
        </div>
        <p className="text-white/80 text-sm max-w-xl">
          Report and pinpoint new or unregistered drinking water sources (deep wells, springs, or public stations) directly to your Barangay Officials and Health Inspectors for inspection and verification.
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
        <h2 className="text-base font-bold text-slate-900 mb-4">Water Source Details</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Water Source Name / Landmark
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Purok 4 Community Deep Well"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Designated Barangay
              </label>
              <div className="w-full px-4 py-3 bg-slate-100/80 border border-slate-200 rounded-xl text-sm text-slate-800 font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-blue-600 flex-shrink-0" />
                  <span>Barangay {user?.barangay || "Combado"}</span>
                </div>
                <span className="text-[11px] font-medium text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                  Assigned Jurisdiction
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Map & GPS Pinpoint Section */}
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

            {/* Real-time Location Boundary Verification Status */}
            {validatingLoc ? (
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2 animate-pulse">
                <Loader2 size={15} className="animate-spin text-blue-600 flex-shrink-0" />
                <span>Verifying coordinates within Barangay {user?.barangay || "assigned area"}...</span>
              </div>
            ) : !locationValidation.isValid ? (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 shadow-2xs">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                <span className="font-semibold">
                  {locationValidation.detectedArea && locationValidation.detectedArea !== "Outside boundary"
                    ? `Location is in Barangay ${locationValidation.detectedArea} (Outside Barangay ${user?.barangay || "Abgao"}). Please pin inside.`
                    : `Location is outside Barangay ${user?.barangay || "Abgao"}. Please pin inside.`}
                </span>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span className="font-semibold">Location Verified: Inside Barangay {user?.barangay || "Community"}</span>
              </div>
            )}

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
              
              {/* Map Style Selector (Streets / Satellite) */}
              <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-md px-2 py-1.5 rounded-xl shadow-lg border border-slate-200/90 flex items-center gap-1 text-xs">
                <div className="px-1 text-slate-400">
                  <Layers size={14} />
                </div>
                <button
                  type="button"
                  onClick={() => handleMapStyleChange("mapbox://styles/mapbox/streets-v12")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mapStyle === "mapbox://styles/mapbox/streets-v12"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  Streets
                </button>
                <button
                  type="button"
                  onClick={() => handleMapStyleChange("mapbox://styles/mapbox/satellite-streets-v12")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mapStyle === "mapbox://styles/mapbox/satellite-streets-v12"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  Satellite
                </button>
              </div>
              

              {/* Floating Boundary Badge & Focus Button on bottom-left of map */}
              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-slate-800 text-xs font-medium shadow-lg border border-slate-200/90 flex items-center gap-2.5 z-10">
                <span className="w-3.5 h-3.5 rounded-full bg-sky-500/20 border-2 border-sky-600 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                </span>
                <span className="font-semibold text-slate-700">
                  Barangay {user?.barangay || "Abgao"} Boundary
                </span>
                <button
                  type="button"
                  onClick={handleFitToBoundary}
                  className="ml-1 px-2.5 py-0.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-bold border border-sky-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Focus view on designated barangay boundary"
                >
                  <Maximize2 size={11} />
                  <span>Fit Boundary</span>
                </button>
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

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Detailed Description
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe who constructed the water source, estimated households using it, visible sanitation hazards, or landmark directions..."
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
              id="water-source-image-input"
            />

            {!previewUrl ? (
              <label
                htmlFor="water-source-image-input"
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
          {/* Validation Warning above button if invalid */}
          {!locationValidation.isValid && (
            <div className="p-3.5 rounded-2xl bg-red-100/90 border border-red-300 text-red-900 text-xs flex items-center gap-2 font-medium">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
              <span>
                Submission disabled: Selected location is outside Barangay {user?.barangay}. Please position the pin within your designated barangay to enable submission.
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !locationValidation.isValid || validatingLoc}
            className={`w-full py-4 rounded-full font-semibold text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
              !locationValidation.isValid
                ? "bg-slate-400 text-white cursor-not-allowed opacity-80 shadow-none"
                : "bg-blue-900 hover:bg-blue-800 text-white hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{uploadStatus || "Submitting Water Source..."}</span>
              </>
            ) : !locationValidation.isValid ? (
              <>
                <AlertCircle size={16} />
                <span>Cannot Submit — Location Outside Brgy. {user?.barangay || "Designated Barangay"}</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Submit Water Source to Barangay</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* My Submitted Water Sources & Live Status Tracking */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">My Added Water Sources</h2>
            <p className="text-xs text-slate-500">Track real-time inspection status as your Barangay and Health Inspectors verify your submitted water sources</p>
          </div>
          <button
            onClick={fetchMySources}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh status"
          >
            <RefreshCw size={15} className={loadingSources ? "animate-spin" : ""} />
          </button>
        </div>

        {loadingSources ? (
          <div className="text-center py-8 text-slate-400 text-xs">Loading submission status...</div>
        ) : mySources.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            You haven't submitted any new water sources yet.
          </div>
        ) : (
          <div className="space-y-3">
            {mySources.map((r) => {
              const isEscalated = r.status === "escalated" || r.status === "passed_to_chu";
              const isDone = r.status === "done" || r.status === "resolved" || r.status === "completed";
              const isDismissed = r.status === "dismissed" || r.status === "rejected";
              const isPending = !isEscalated && !isDone && !isDismissed;
              const canDelete = !r.status || r.status === "pending";
              const displayDesc = cleanDesc(r) || r.description;

              return (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:bg-slate-50"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{r.title}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 border border-blue-200 text-blue-700">
                        New Water Source
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{displayDesc}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span>Brgy. {r.barangay}</span>
                      {r.latitude && r.longitude && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-slate-500">
                            {parseFloat(r.latitude).toFixed(4)}, {parseFloat(r.longitude).toFixed(4)}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span>{r.created_at ? new Date(r.created_at).toLocaleDateString() : "Recent"}</span>
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

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSource(r.id)}
                        disabled={deletingId === r.id}
                        className="px-3 py-1 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                        title="Delete this pending water source"
                      >
                        <Trash2 size={12} />
                        <span>{deletingId === r.id ? "Deleting..." : "Delete"}</span>
                      </button>
                    )}

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      isEscalated
                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                        : isDone
                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                        : isDismissed
                        ? "bg-rose-100 text-rose-800 border border-rose-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}>
                      {isPending && <Clock size={11} />}
                      {isEscalated && <Send size={11} />}
                      <span>
                        {isEscalated
                          ? "Passed to CHU"
                          : isDone
                          ? "Done"
                          : isDismissed
                          ? "Dismissed"
                          : "Pending Barangay Review"}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detailed Report Modal with Mapbox */}
      {detailReport && (
        <ReportDetailModal
          report={detailReport}
          onClose={() => setDetailReport(null)}
          onDelete={handleDeleteSource}
        />
      )}
    </div>
  );
};

export default AddWaterSource;
