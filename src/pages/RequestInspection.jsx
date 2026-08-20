import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Search, MapPin, Send, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { motion } from "framer-motion";

const RequestInspection = () => {
  const { user, token, API_URL } = useAuth();
  const [locations, setLocations] = useState([]);
  const [formData, setFormData] = useState({
    location_id: "",
    description: "",
    priority: "medium",
    barangay: user?.barangay || "",
    latitude: 10.1330,
    longitude: 124.8700
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
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

    fetchLocations();
  }, [user, API_URL]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const payload = {
        location_id: formData.location_id || null,
        description: formData.description,
        priority: formData.priority,
        barangay: formData.barangay || user?.barangay,
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
        setSuccessMsg("Inspection request submitted successfully! A Sanitization Inspector will be assigned.");
        setFormData({
          location_id: "",
          description: "",
          priority: "medium",
          barangay: user?.barangay || "",
          latitude: 10.1330,
          longitude: 124.8700
        });
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
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-800 rounded-3xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <Search size={24} className="text-cyan-300" />
          <h1 className="text-3xl font-extrabold text-white">Request Water Inspection</h1>
        </div>
        <p className="text-white/80 text-sm max-w-xl">
          If you suspect water contamination, noticeable odor, or unusual taste, request an official field audit from our Sanitization Inspectors.
        </p>
      </div>

      {successMsg && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
          <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Request Logged</p>
            <p>{successMsg}</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Submission Error</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Registered Water Station (Optional)
              </label>
              <select
                value={formData.location_id}
                onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              >
                <option value="">-- General Household / Unregistered Source --</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.source_type || 'Source'})
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
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
            <input
              type="text"
              value={formData.barangay}
              onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
              placeholder="e.g. Combado, Tagnipa, Rizal"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Detailed Reason / Symptoms
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the condition of the water, approximate number of households affected, or specific concerns..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-full bg-blue-900 hover:bg-blue-800 text-white font-semibold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
    </div>
  );
};

export default RequestInspection;
