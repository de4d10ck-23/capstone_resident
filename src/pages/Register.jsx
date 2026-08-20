import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Mail, MapPin, ArrowLeft, ShieldCheck, Droplets, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    barangay: ''
  });
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    const result = await register(formData);
    if (!result.success) {
      setError(result.message);
    } else {
      navigate('/login?registered=true');
    }
    
    setIsSubmitting(false);
  };

  const barangayList = [
    "Abgao", "Asuncion", "Bactul I", "Bactul II", "Bilibol", "Batuan",
    "Canturing", "Combado", "Dongon", "Guadalupe", "Hanginan", "Hantag",
    "Hinapu Daku", "Hinapu Gamay", "Ibarra", "Isagani", "Laboon", "Lunas",
    "Mababoy", "Malapoc Norte", "Malapoc Sur", "Mambajao", "Manhilo",
    "Mantahan", "Maria Clara", "Matin-ao", "Nasaug", "Panan-awan",
    "Pasay", "Rizal", "San Agustin", "San Isidro", "San Jose", "San Rafael",
    "Santa Cruz", "Santa Rosa", "Santo Niño", "Santo Rosario", "Sua",
    "Tagnipa", "Tam-is", "Tawid", "Tigbawan", "Tomoy-tomoy", "Tunga-tunga"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-cyan-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Background ambient shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -right-10 w-96 h-96 bg-blue-200/50 rounded-full filter blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-cyan-200/40 rounded-full filter blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-4xl bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 grid grid-cols-1 md:grid-cols-12"
      >
        {/* Left Column (Brand banner) */}
        <div className="md:col-span-5 bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-800 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-xs font-medium uppercase tracking-wider transition-colors">
              <ArrowLeft size={16} />
              <span>Back to Home</span>
            </Link>

            <div className="space-y-3 pt-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                <Droplets size={28} className="text-cyan-300" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Join WaterWatch</h2>
              <p className="text-white/80 text-sm leading-relaxed">
                Create a resident account to actively protect your household and report water concerns directly to local health authorities.
              </p>
            </div>
          </div>

          <div className="relative z-10 space-y-3 pt-8 border-t border-white/10 text-xs text-white/70">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-400" />
              <span>Free Community Access</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-cyan-300" />
              <span>Direct Barangay Assistance</span>
            </div>
          </div>
        </div>

        {/* Right Column (Form) */}
        <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Create Account</h2>
            <p className="text-slate-500 text-sm mt-1">Join the water quality surveillance network</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-sm flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  name="full_name"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Juan Dela Cruz"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="juandelacruz"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Barangay
                </label>
                <select
                  name="barangay"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  value={formData.barangay}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Barangay</option>
                  {barangayList.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  name="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="juan@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  name="password"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-full bg-blue-900 hover:bg-blue-800 text-white font-semibold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Registering Account...</span>
                </>
              ) : (
                <span>Complete Registration</span>
              )}
            </button>

            <div className="text-center pt-2 text-sm text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Sign In
              </Link>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
