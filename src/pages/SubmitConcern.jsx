import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { MessageSquare, Send, CheckCircle2, AlertCircle, UploadCloud, MapPin } from "lucide-react";

const SubmitConcern = () => {
  const { user, token, API_URL } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    barangay: user?.barangay || "",
    category: "water_quality",
    photo_url: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/resident-reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Community concern submitted to Barangay Officials and Health Officers!");
        setFormData({
          title: "",
          description: "",
          barangay: user?.barangay || "",
          category: "water_quality",
          photo_url: ""
        });
      } else {
        setErrorMsg(data.detail || "Failed to submit concern.");
      }
    } catch (err) {
      console.error("Error submitting resident concern:", err);
      setErrorMsg("Network error. Could not connect to server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in font-sans">
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-800 rounded-3xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <MessageSquare size={24} className="text-cyan-300" />
          <h1 className="text-3xl font-extrabold text-white">Submit Community Concern</h1>
        </div>
        <p className="text-white/80 text-sm max-w-xl">
          Report broken water pipes, unhygienic toilet proximity, or contaminated water supplies directly to your Barangay Officials for validation.
        </p>
      </div>

      {successMsg && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
          <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Report Submitted</p>
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              >
                <option value="water_quality">Water Quality (Odor, Color, Taste)</option>
                <option value="broken_pipe">Damaged / Broken Pipeline</option>
                <option value="toilet_proximity">Unhygienic Toilet Near Water Source</option>
                <option value="unregistered_source">New / Unregistered Well</option>
                <option value="other">Other Community Health Issue</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Barangay / Street Location
            </label>
            <input
              type="text"
              value={formData.barangay}
              onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
              placeholder="e.g. Purok 4, Combado"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              required
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
              placeholder="Provide specific details to help Barangay Officials and CHO investigate..."
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
                <span>Submitting Concern...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Send to Barangay & CHO</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SubmitConcern;
