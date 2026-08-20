import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { MapPin, Droplets, AlertTriangle, ShieldCheck, Bell, Calendar, PlusCircle, CheckCircle, Info } from "lucide-react";
import { Link } from "react-router-dom";

const MyBarangay = () => {
  const { user, token, API_URL } = useAuth();
  const [sources, setSources] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sourcesRes, notifRes] = await Promise.all([
          fetch(`${API_URL}/water-locations?barangay=${encodeURIComponent(user?.barangay || '')}`),
          fetch(`${API_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const sourcesData = await sourcesRes.json();
        const notifData = await notifRes.json();

        if (sourcesData.success && Array.isArray(sourcesData.data)) {
          setSources(sourcesData.data);
        }
        if (notifData.success && Array.isArray(notifData.data)) {
          setNotifications(notifData.data);
        }
      } catch (err) {
        console.error("Error fetching barangay data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.barangay) {
      fetchData();
    }
  }, [user, token, API_URL]);

  const safeCount = sources.filter((s) => s.status?.toLowerCase() === "safe").length;
  const warningCount = sources.filter((s) => s.status?.toLowerCase() === "warning").length;
  const dangerCount = sources.filter((s) => s.status?.toLowerCase() === "undrinkable" || s.status?.toLowerCase() === "contaminated").length;

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-800 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">Local Surveillance Area</span>
          <h1 className="text-3xl font-extrabold text-white">Barangay {user?.barangay || "Community"}</h1>
          <p className="text-white/80 text-sm max-w-xl">
            Real-time drinking water monitoring, quality advisories, and direct links to health inspections for your neighborhood.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
          <Link
            to="/portal/submit-concern"
            className="px-5 py-2.5 rounded-full bg-white text-blue-900 font-semibold text-xs transition-all shadow hover:shadow-lg hover:-translate-y-0.5 text-center"
          >
            Report an Issue
          </Link>
          <Link
            to="/portal/request-inspection"
            className="px-5 py-2.5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-semibold text-xs transition-all shadow hover:shadow-lg hover:-translate-y-0.5 text-center"
          >
            Request Inspection
          </Link>
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Sources</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">{sources.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Droplets size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Safe Stations</p>
            <h3 className="text-3xl font-bold text-emerald-600 mt-1">{safeCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Warning Level</p>
            <h3 className="text-3xl font-bold text-amber-600 mt-1">{warningCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contaminated</p>
            <h3 className="text-3xl font-bold text-red-600 mt-1">{dangerCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <Info size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Local Water Sources Table */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Water Stations in Barangay {user?.barangay}</h2>
              <p className="text-xs text-slate-500">Verified status from latest laboratory and field test records</p>
            </div>
            <Link to="/public-map" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              View on Map →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-y border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Station Name</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">E. Coli</th>
                  <th className="py-3.5 px-4">Coliform</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sources.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-400">
                      {loading ? "Loading water sources..." : "No water sources registered for this barangay yet."}
                    </td>
                  </tr>
                ) : (
                  sources.map((s) => {
                    const isSafe = s.status?.toLowerCase() === "safe";
                    const isWarning = s.status?.toLowerCase() === "warning";

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{s.name}</td>
                        <td className="py-3.5 px-4 text-slate-600 capitalize">{s.source_type || "Well"}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isSafe ? "bg-emerald-100 text-emerald-800" : isWarning ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                          }`}>
                            {s.status || "Unknown"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">{s.e_coli_count ?? 0} CFU</td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">{s.coliform_count ?? 0} MPN</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Community Advisories & Notices */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Health Advisories</h2>
          </div>
          <p className="text-xs text-slate-500">Official bulletins from the City Health Office</p>

          <div className="space-y-3 pt-2">
            {notifications.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400">
                No active advisory alerts. Water quality conditions are standard.
              </div>
            ) : (
              notifications.slice(0, 4).map((n) => (
                <div key={n.id} className="p-4 rounded-xl bg-blue-50/50 border border-blue-100/80 space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-xs text-blue-900">{n.title}</span>
                    <span className="text-[10px] text-slate-400">
                      {n.created_at ? new Date(n.created_at).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyBarangay;
