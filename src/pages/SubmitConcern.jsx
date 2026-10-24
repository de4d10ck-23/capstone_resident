import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  UploadCloud, 
  X, 
  Loader2, 
  Clock, 
  RefreshCw, 
  Eye, 
  Trash2,
  Droplets
} from "lucide-react";
import ReportDetailModal from "../components/ReportDetailModal";
import BarangayWaterSourcesMap from "../components/BarangayWaterSourcesMap";

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

const SubmitConcern = () => {
  const { user, token, API_URL } = useAuth();
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "request_inspection";
  
  const [formData, setFormData] = useState({
    description: "",
    category: initialCategory,
    otherCategory: "",
  });

  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState("");

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) {
      setFormData((prev) => ({ ...prev, category: cat }));
    }
  }, [searchParams]);

  // Fetch water sources available ONLY for the resident's designated barangay
  useEffect(() => {
    const fetchBarangayLocations = async () => {
      if (!user?.barangay) return;
      try {
        setLoadingLocations(true);
        const res = await fetch(`${API_URL}/water-locations?barangay=${encodeURIComponent(user.barangay)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          // Strictly filter so only water sources from resident's designated barangay appear
          const designatedLocs = data.data.filter(
            (l) => !l.barangay || l.barangay.toLowerCase() === user.barangay.toLowerCase()
          );
          setLocations(designatedLocs);
        }
      } catch (err) {
        console.error("Error fetching water sources for designated barangay:", err);
      } finally {
        setLoadingLocations(false);
      }
    };

    fetchBarangayLocations();
  }, [user?.barangay, API_URL]);

  const handleLocationChange = (locId) => {
    setSelectedLocationId(locId);
  };

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [myReports, setMyReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedProof, setSelectedProof] = useState(null);
  const [detailReport, setDetailReport] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fileInputRef = useRef(null);

  // Fetch Resident's Own Submitted Concerns (excluding unregistered sources)
  const fetchMyReports = async () => {
    try {
      setLoadingReports(true);
      const res = await fetch(`${API_URL}/resident-reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // Filter out unregistered sources so they appear on their dedicated page
        const concernsOnly = data.data.filter(
          (r) => r.type !== "unregistered_source" && r.category !== "unregistered_source"
        );
        setMyReports(concernsOnly);
      }
    } catch (err) {
      console.error("Error fetching my resident reports:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  // Delete a pending concern submitted by the resident
  const handleDeleteConcern = async (id) => {
    if (!window.confirm("Are you sure you want to delete this pending concern?")) return;
    try {
      setDeletingId(id);
      const res = await fetch(`${API_URL}/resident-reports/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.detail || data.message || "Failed to delete concern");
      }
      setMyReports((prev) => prev.filter((r) => r.id !== id));
      if (detailReport?.id === id) {
        setDetailReport(null);
      }
    } catch (err) {
      console.error("Error deleting concern:", err);
      alert(err.message || "Failed to delete concern.");
    } finally {
      setDeletingId(null);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
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

      setUploadStatus("Sending report to Barangay...");

      const selectedLoc = locations.find((l) => String(l.id) === String(selectedLocationId));
      
      let fullDesc = formData.description.trim();
      if (formData.category === "other" && formData.otherCategory?.trim()) {
        fullDesc = `Concern: Other (${formData.otherCategory.trim()})\n\n${fullDesc}`;
      }
      if (selectedLoc) {
        fullDesc = `${fullDesc}\n\n[Inspected Source: ${selectedLoc.full_name || selectedLoc.name} (ID: ${selectedLoc.id})]`;
      }

      const categoryTitles = {
        request_inspection: "Water Inspection Request",
        water_quality: "Water Quality Concern",
        broken_pipe: "Damaged / Broken Pipeline",
        toilet_proximity: "Unhygienic Toilet Proximity",
        other: "Other Concern",
      };

      let autoTitle =
        formData.category === "other" && formData.otherCategory?.trim()
          ? `Other: ${formData.otherCategory.trim()}`
          : (categoryTitles[formData.category] || "Community Concern");
      if (selectedLoc) {
        autoTitle = `${autoTitle} - ${selectedLoc.full_name || selectedLoc.name}`;
      } else if (user?.barangay) {
        autoTitle = `${autoTitle} (Brgy. ${user.barangay})`;
      }

      const payload = {
        title: autoTitle,
        description: fullDesc,
        category: formData.category,
        type: formData.category,
        barangay: user?.barangay || "Combado",
        latitude: selectedLoc?.latitude ? parseFloat(selectedLoc.latitude) : null,
        longitude: selectedLoc?.longitude ? parseFloat(selectedLoc.longitude) : null,
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
          "Concern / inspection request submitted! Your Barangay Officials will review and endorse this directly to Sanitization Inspectors."
        );
        setFormData({
          description: "",
          category: "request_inspection",
          otherCategory: "",
        });
        setSelectedLocationId("");
        handleRemoveImage();
        fetchMyReports();
      } else {
        setErrorMsg(data.detail || "Failed to submit report. Please try again.");
      }
    } catch (err) {
      console.error("Error submitting resident report:", err);
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
          <h1 className="text-3xl font-extrabold text-white">Submit Concern & Inspection Request</h1>
        </div>
        <p className="text-white/80 text-sm max-w-xl">
          Report broken water pipes, unhygienic toilet proximity, contaminated supplies, or request water quality inspections directly to your Barangay Officials for triage.
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
        <h2 className="text-base font-bold text-slate-900 mb-4">New Concern or Inspection Details</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category & Water Source Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Concern / Request Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => {
                  const nextCat = e.target.value;
                  setFormData({ ...formData, category: nextCat });
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
              >
                <option value="request_inspection">Water Inspection Request (Field Audit / Sampling)</option>
                <option value="water_quality">Water Quality (Odor, Color, Taste)</option>
                <option value="broken_pipe">Damaged / Broken Pipeline</option>
                <option value="toilet_proximity">Unhygienic Toilet Near Water Source</option>
                <option value="other">Other</option>
              </select>

              {formData.category === "other" && (
                <div className="mt-2.5">
                  <input
                    type="text"
                    value={formData.otherCategory}
                    onChange={(e) => setFormData({ ...formData, otherCategory: e.target.value })}
                    placeholder="Please specify other concern..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                    required
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Droplets size={13} className="text-cyan-600" />
                  <span>Water Source in Brgy. {user?.barangay || "Community"}</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full lowercase">
                  {loadingLocations ? "loading..." : `${locations.length} available`}
                </span>
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
              >
                <option value="">-- General Tap / Household / Unlisted Source in Brgy. {user?.barangay} --</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={String(loc.id)}>
                    {loc.full_name || loc.name} ({loc.source_type?.replace(/_/g, " ") || loc.type?.replace(/_/g, " ") || "Station"})
                  </option>
                ))}
              </select>
              {locations.length === 0 && !loadingLocations && (
                <p className="text-[11px] text-slate-400 mt-1">
                  No public stations listed in Brgy. {user?.barangay}. You can still file your report for your general household tap.
                </p>
              )}
            </div>
          </div>

          {/* Interactive Map of Barangay Water Sources */}
          <div>
            <BarangayWaterSourcesMap
              locations={locations}
              selectedLocationId={selectedLocationId}
              onSelectLocation={handleLocationChange}
              barangayName={user?.barangay || "Community"}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Detailed Description
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide specific details to help Barangay Officials and Health Inspectors investigate..."
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
            <h2 className="text-base font-bold text-slate-900">My Submitted Concerns & Requests</h2>
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
            You haven't submitted any concerns or inspection requests yet.
          </div>
        ) : (
          <div className="space-y-3">
            {myReports.map((r) => {
              const isEscalated = r.status === "escalated" || r.status === "passed_to_chu";
              const isDone = r.status === "done" || r.status === "resolved" || r.status === "completed";
              const isDismissed = r.status === "dismissed" || r.status === "rejected";
              const isPending = !isEscalated && !isDone && !isDismissed;
              const canDelete = !r.status || r.status === "pending";
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
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${
                        (r.type || r.category) === "request_inspection"
                          ? "bg-cyan-50 border-cyan-200 text-cyan-800"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}>
                        {(r.type || r.category || "Concern").replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{displayDesc}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span>Brgy. {r.barangay}</span>
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
                        onClick={() => handleDeleteConcern(r.id)}
                        disabled={deletingId === r.id}
                        className="px-3 py-1 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                        title="Delete this pending concern"
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

      {/* Detailed Concern Modal for Resident with Mapbox */}
      {detailReport && (
        <ReportDetailModal
          report={detailReport}
          onClose={() => setDetailReport(null)}
          onDelete={handleDeleteConcern}
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
