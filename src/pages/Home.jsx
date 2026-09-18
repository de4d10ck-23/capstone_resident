import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import { motion } from "framer-motion";
import { 
  Droplets, 
  ShieldCheck, 
  Users, 
  MapPin, 
  ArrowRight, 
  Activity, 
  CheckCircle, 
  Search,
  Smartphone,
  Download,
  Share2,
  PlusSquare,
  X,
  Bell,
  Zap,
  Check,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import usePushNotifications from "../hooks/usePushNotifications";

// Import Swiper styles
import "swiper/css";
import "swiper/css/autoplay";

const Home = () => {
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // PWA Mobile Install Hook
  const { canInstall, isStandalone, isIOS, isMobile, promptInstall } = usePushNotifications();
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [guideTab, setGuideTab] = useState(isIOS ? "ios" : "android");

  // Keep guide tab synced if device is detected
  useEffect(() => {
    if (isIOS) setGuideTab("ios");
    else setGuideTab("android");
  }, [isIOS]);

  const handleInstallClick = async () => {
    if (canInstall) {
      const outcome = await promptInstall();
      if (!outcome) {
        setShowInstallGuide(true);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const barangays = [
    {
      name: "Combado",
      fullName: "Maasin City - Barangay Combado",
      logo: "/images/logo/combado.jpg",
    },
    {
      name: "Batuan",
      fullName: "Maasin City - Barangay Batuan",
      logo: "/images/logo/batuan.jpg",
    },
    {
      name: "Rizal",
      fullName: "Maasin City - Barangay Rizal",
      logo: "/images/logo/rizal.jpg",
    },
    {
      name: "Hantag",
      fullName: "Maasin City - Barangay Hantag",
      logo: "/images/logo/hantag.jpg",
    },
    {
      name: "Malapoc Sur",
      fullName: "Maasin City - Barangay Malapoc Sur",
      logo: "/images/logo/malapoc-sur.jpg",
    },
    {
      name: "Malapoc Norte",
      fullName: "Maasin City - Barangay Malapoc Norte",
      logo: "/images/logo/maasin.png",
    },
    {
      name: "Matin-ao",
      fullName: "Maasin City - Barangay Matin-ao",
      logo: "/images/logo/matin-ao.jpg",
    },
    {
      name: "San Isidro",
      fullName: "Maasin City - Barangay San Isidro",
      logo: "/images/logo/maasin.png",
    },
  ];

  const fadeInUp = {
    initial: { y: 40, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.6, ease: "easeOut" },
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.12,
      },
    },
  };

  return (
    <motion.div initial="initial" animate="animate" className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-b from-blue-50/50 via-white to-white">
        {/* Animated Ambient Blur Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              x: [0, 40, 0],
              y: [0, -30, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              repeatType: "reverse",
            }}
            className="absolute top-10 -left-10 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40"
          />
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              x: [0, -40, 0],
              y: [0, 40, 0],
            }}
            transition={{
              duration: 9,
              repeat: Infinity,
              repeatType: "reverse",
              delay: 1,
            }}
            className="absolute top-20 right-10 w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40"
          />
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              x: [0, 30, 0],
              y: [0, 20, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              repeatType: "reverse",
              delay: 2,
            }}
            className="absolute -bottom-10 left-1/3 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
          />
        </div>

        {/* Hero Content Container */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column (Text & Actions) */}
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="lg:col-span-7 space-y-8 text-left"
            >
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 border border-blue-200/60 text-blue-800 text-xs font-semibold uppercase tracking-wider shadow-sm">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                Maasin City Water Quality Platform
              </motion.div>

              <motion.div variants={fadeInUp} className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                  <span className="block text-blue-900">Safe Water for Every</span>
                  <span className="block bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                    Household in Maasin
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                  WaterWatch monitors water quality, tracks spatial household risks, and empowers residents and officials to ensure pure, safe drinking water across all barangays.
                </p>
              </motion.div>

              {/* Live Statistics Counters */}
              <motion.div variants={fadeInUp} className="grid grid-cols-3 gap-4 max-w-md pt-2 border-y border-slate-200/80 py-4">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-blue-900">10+</div>
                  <div className="text-xs sm:text-sm font-medium text-slate-500">Barangays</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-blue-600">24/7</div>
                  <div className="text-xs sm:text-sm font-medium text-slate-500">Monitoring</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-600">100%</div>
                  <div className="text-xs sm:text-sm font-medium text-slate-500">Real-time</div>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
                <Link
                  to="/public-map"
                  className="inline-flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-7 py-3.5 rounded-full text-sm sm:text-base font-semibold transition-all shadow-lg hover:shadow-blue-900/25 hover:-translate-y-0.5 w-full sm:w-auto"
                >
                  <MapPin size={18} />
                  <span>View Public Map</span>
                </Link>

                {!isStandalone && (
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white px-6 py-3.5 rounded-full text-sm sm:text-base font-bold transition-all shadow-lg shadow-cyan-600/25 hover:-translate-y-0.5 w-full sm:w-auto cursor-pointer"
                  >
                    <Smartphone size={18} className="text-cyan-200" />
                    <span>Install Mobile App</span>
                  </button>
                )}

                {user ? (
                  <Link
                    to="/portal"
                    className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 px-7 py-3.5 rounded-full text-sm sm:text-base font-semibold transition-all shadow-sm hover:shadow hover:-translate-y-0.5 w-full sm:w-auto"
                  >
                    <span>Go to Resident Portal</span>
                    <ArrowRight size={18} />
                  </Link>
                ) : (
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 px-7 py-3.5 rounded-full text-sm sm:text-base font-semibold transition-all shadow-sm hover:shadow hover:-translate-y-0.5 w-full sm:w-auto"
                  >
                    <span>Join Community</span>
                    <ArrowRight size={18} />
                  </Link>
                )}
              </motion.div>
            </motion.div>

            {/* Right Column (Hero Illustration) */}
            <motion.div
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="lg:col-span-5 flex justify-center items-center"
            >
              <div className="relative w-full max-w-lg aspect-square">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/20 to-cyan-300/20 rounded-3xl filter blur-2xl transform rotate-6 scale-95" />
                <img
                  src="/images/hero/hero-nobg.png"
                  alt="Water Quality Monitoring Illustration"
                  className="relative z-10 w-full h-full object-contain drop-shadow-2xl"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Mobile App Install Feature Section (Target: Mobile devices, shown if not yet installed) */}
      {!isStandalone && (
        <div className="py-12 bg-gradient-to-b from-blue-50/50 via-white to-slate-50 border-t border-blue-100/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-7 sm:p-12 text-white shadow-2xl border border-blue-800/40">
              {/* Background ambient lighting */}
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="space-y-4 max-w-2xl text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                    <Smartphone size={14} />
                    <span>Mobile App Available</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                    Install WaterWatch on Your Phone
                  </h2>

                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                    Install WaterWatch directly onto your mobile home screen. Enjoy fast 1-tap launching, full-screen map navigation, instant community health advisories, and offline access to emergency hotline numbers.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10 text-xs text-white">
                      <Zap size={16} className="text-cyan-400 flex-shrink-0" />
                      <span>Instant 1-Tap Launch</span>
                    </div>
                    <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10 text-xs text-white">
                      <Bell size={16} className="text-amber-400 flex-shrink-0" />
                      <span>Real-Time Push Alerts</span>
                    </div>
                    <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10 text-xs text-white">
                      <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0" />
                      <span>Works When Offline</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3 w-full sm:w-auto flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-3 cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <Download size={20} className="text-slate-950" />
                    <span>Install on Mobile</span>
                  </button>
                  <span className="text-[11px] text-slate-400 text-center">
                    Android & iPhone Safari • No app store needed
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feature Highlights Grid */}
      <div className="py-20 bg-slate-50 border-t border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Key Capabilities</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">How WaterWatch Protects Your Health</h2>
            <p className="text-slate-600 text-base sm:text-lg">
              Combining advanced geospatial data with community reporting for safer water resources.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <motion.div
              whileHover={{ y: -6 }}
              className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Droplets size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Live Quality Tracking</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Monitor microbial test parameters including E. coli and coliform counts for all registered water sources in real-time.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              whileHover={{ y: -6 }}
              className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Spatial Risk Forecasting</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Predictive algorithms assess proximity to unhygienic toilets, pinpointing households vulnerable to contamination.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              whileHover={{ y: -6 }}
              className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600">
                <Users size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Community Action</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Residents can directly submit concerns and request rapid field inspections from the Sanitization Inspectors.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Monitored Barangays Carousel Section */}
      <div className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Coverage Areas</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Monitored Barangays</h2>
            <p className="text-slate-600 text-base">Active water quality surveillance across the city</p>
          </div>

          <div className="relative py-4">
            <Swiper
              modules={[Autoplay]}
              spaceBetween={20}
              slidesPerView={1}
              breakpoints={{
                640: { slidesPerView: 2 },
                768: { slidesPerView: 3 },
                1024: { slidesPerView: 4 },
              }}
              loop={true}
              autoplay={{
                delay: 2500,
                disableOnInteraction: false,
              }}
              className="pb-4"
            >
              {barangays.map((b, index) => (
                <SwiperSlide key={index}>
                  <div className="bg-slate-50/80 hover:bg-white rounded-2xl p-6 border border-slate-200/70 hover:border-blue-200 shadow-sm hover:shadow-lg transition-all text-center flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-blue-100/50 flex items-center justify-center p-2 mb-4 overflow-hidden border border-blue-200/50">
                      <img
                        src={b.logo}
                        alt={b.name}
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => {
                          e.target.src = "/images/logo/maasin.png";
                        }}
                      />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 mb-1">{b.name}</h3>
                    <p className="text-xs text-slate-500">{b.fullName}</p>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-3">
              <img
                src="/images/logo/cropped_circle_image.png"
                alt="WaterWatch Logo"
                className="w-10 h-10 rounded-full border border-slate-700 object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div>
                <span className="text-lg font-bold text-white tracking-wide">WaterWatch</span>
                <p className="text-xs text-slate-500">Maasin Water Quality Monitoring</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <Link to="/public-map" className="hover:text-white transition-colors">Public Map</Link>
              <Link to="/login" className="hover:text-white transition-colors">Staff / Admin Login</Link>
              <Link to="/register" className="hover:text-white transition-colors">Resident Signup</Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
            © 2026 WaterWatch - City Health Office of Maasin. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Mobile PWA Installation Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative space-y-5 animate-scale-in">
            {/* Close Button */}
            <button
              onClick={() => setShowInstallGuide(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3.5 pr-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-100/80 text-blue-900 flex items-center justify-center flex-shrink-0">
                <Smartphone size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">Install Mobile App</h3>
                <p className="text-xs text-slate-500 mt-0.5">Follow these quick steps to add WaterWatch to your phone</p>
              </div>
            </div>

            {/* OS Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setGuideTab("android")}
                className={`py-2 rounded-xl transition-all ${
                  guideTab === "android"
                    ? "bg-white text-blue-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Android / Chrome
              </button>
              <button
                type="button"
                onClick={() => setGuideTab("ios")}
                className={`py-2 rounded-xl transition-all ${
                  guideTab === "ios"
                    ? "bg-white text-blue-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                iPhone / Safari
              </button>
            </div>

            {/* Step-by-Step Instructions */}
            {guideTab === "ios" ? (
              <div className="space-y-3.5 text-xs sm:text-sm text-slate-700 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">1</span>
                  <p className="leading-snug">
                    Open this page in <strong>Apple Safari</strong> browser on your iPhone.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">2</span>
                  <p className="leading-snug">
                    Tap the <strong>Share button</strong> (<span className="inline-block px-1.5 py-0.5 bg-white border border-slate-200 rounded font-semibold text-blue-900">📤</span>) in Safari's bottom toolbar.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">3</span>
                  <p className="leading-snug">
                    Scroll down and tap <strong>"Add to Home Screen"</strong> (<span className="inline-block px-1.5 py-0.5 bg-white border border-slate-200 rounded font-semibold text-blue-900">➕</span>).
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">4</span>
                  <p className="leading-snug">
                    Tap <strong>"Add"</strong> in the top-right corner. The WaterWatch icon will now appear on your home screen!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs sm:text-sm text-slate-700 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">1</span>
                  <p className="leading-snug">
                    Tap the <strong>three dots menu (⋮)</strong> in the top-right corner of Google Chrome.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">2</span>
                  <p className="leading-snug">
                    Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong> from the menu options.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">3</span>
                  <p className="leading-snug">
                    Tap <strong>"Install"</strong> to confirm. WaterWatch is now ready to open as a standalone app!
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Dismiss Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="w-full py-3 rounded-2xl bg-blue-900 hover:bg-blue-850 text-white font-bold text-sm shadow-md transition-all text-center cursor-pointer"
              >
                Got It, Thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Home;
