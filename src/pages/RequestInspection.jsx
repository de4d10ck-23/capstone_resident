import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  Search, 
  MapPin, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Clock, 
  RefreshCw, 
  Loader2,
  FileCheck2,
  Play
} from "lucide-react";
import { MAASIN_BARANGAYS as barangays } from "../constants/barangays";

const RequestInspection = () => {
  const { user, token, API_URL } = useAuth();
  const [locations, setLocations] = useState([]);
  const [myInspections, setMyInspections] = useState([]);
  const [loadingInspections, setLoadingInspections] = useState(true);

  const [formData, setFormData] = useState({
    location_id: "",
    description: "",
    priority: "medium",
    barangay: user?.barangay || "Combado",
    latitude: 10.1330,
    longitude: 124.8700
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${API_URL}/water-locations?barangay=${encodeURIComponent(user?.barangay || '')}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setLocations(data.data);
      }
    } catch (err) {
      console.error("Error fetching locations for inspection request:", err);
    }
  };

  const fetchMyInspections = async () => {
    try {
      setLoadingInspections(true);
      const res = await fetch(`${API_URL}/inspections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMyInspections(data.data);
      }
    } catch (err) {
      console.error("Error fetching my inspections:", err);
    } finally {
      setLoadingInspections(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    fetchMyInspections();
  }, [user, token, API_URL]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const payload = {
        location_id: formData.location_id || null,
        description: formData.description.trim(),
        priority: formData.priority,
        barangay: formData.barangay || user?.barangay || "Combado",
        latitude: parseFloat(formData.latitude) || 10.1330,
        longitude: parseFloat(formData.longitude) || 124.8700
      };

      const res = await fetch(`${API_URL}/inspections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Inspection request submitted successfully! Sanitization Inspectors and Barangay Officials have been notified.");
        setFormData({
          location_id: "",
          description: "",
          priority: "medium",
          barangay: user?.barangay || "Combado",
          latitude: 10.1330,
          longitude: 124.8700
        });
        fetchMyInspections();
      } else {
        setErrorMsg(data.detail || "Failed to submit request.");
      }
    } catch (err) {
      console.error("Error submitting inspection request:", err);
      setErrorMsg("Network error. Could not connect to server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-800 rounded-3xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <Search size={24} className="text-cyan-300" />
          <h1 className="text-3xl font-extrabold text-white">Request Water Inspection</h1>
        </div>
        <p className="text-white/80 text-sm max-w-xl">
          If you suspect water contamination, noticeable odor, or unusual taste, request an official field microbial audit from our Sanitization Inspectors.
        </p>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3 shadow-sm">
          <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Request Logged</p>
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

      {/* Form Container */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-4">Inspection Request Details</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Registered Water Station (Optional)
              </label>
              <select
                value={formData.location_id}
                onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
              >
                <option value="">-- General Household / Unregistered Source --</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.source_type?.replace(/_/g, " ") || 'Source'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Urgency / Priority Level
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
              >
                <option value="low">Low - Routine Verification</option>
                <option value="medium">Medium - Discoloration / Strange Smell</option>
                <option value="high">High - Suspected Outbreak / Acute Illness</option>
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

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Detailed Reason / Symptoms
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the condition of the water, noticeable odor/taste, approximate number of households affected, or health symptoms..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-full bg-blue-900 hover:bg-blue-800 text-white font-semibold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Submitting Request...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Submit Inspection Request</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* My Inspection Requests & Live Status Tracker */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">My Inspection Requests</h2>
            <p className="text-xs text-slate-500">Track field audits and laboratory findings conducted for your requests</p>
          </div>
          <button
            onClick={fetchMyInspections}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw size={15} className={loadingInspections ? "animate-spin" : ""} />
          </button>
        </div>

        {loadingInspections ? (
          <div className="text-center py-8 text-slate-400 text-xs">Loading inspection status...</div>
        ) : myInspections.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            You haven't submitted any inspection requests yet.
          </div>
        ) : (
          <div className="space-y-3">
            {myInspections.map((i) => {
              const isPending = !i.status || i.status === "pending";
              const isAssigned = i.status === "assigned";
              const isInProgress = i.status === "in_progress";
              const isCompleted = i.status === "completed";

              return (
                <div
                  key={i.id}
                  className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:bg-slate-50"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">
                        Brgy. {i.barangay} Inspection
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        i.priority === "high"
                          ? "bg-red-100 text-red-800"
                          : i.priority === "medium"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {i.priority || "Medium"} Priority
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{i.description}</p>
                    
                    {i.notes && (
                      <div className="mt-2 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                        <span className="font-bold">Inspector Findings: </span>
                        <span>{i.notes}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span>{i.created_at ? new Date(i.created_at).toLocaleDateString() : "Recent"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      isCompleted
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : isInProgress
                        ? "bg-cyan-100 text-cyan-800 border border-cyan-200"
                        : isAssigned
                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}>
                      {isCompleted && <CheckCircle2 size={12} />}
                      {isInProgress && <Play size={12} />}
                      {isAssigned && <FileCheck2 size={12} />}
                      {isPending && <Clock size={12} />}
                      <span>
                        {isCompleted
                          ? "Completed & Verified"
                          : isInProgress
                          ? "Field Sampling In Progress"
                          : isAssigned
                          ? "Assigned to Inspector"
                          : "Pending Review"}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestInspection;
