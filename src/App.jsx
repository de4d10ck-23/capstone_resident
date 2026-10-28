import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import PublicNavbar from './components/PublicNavbar';

// Public Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import EmailAccess from './pages/EmailAccess';
import PublicMap from './pages/PublicMap';

// Protected Pages (Resident Portal)
import MyBarangay from './pages/MyBarangay';
import Notifications from './pages/Notifications';
import SubmitConcern from './pages/SubmitConcern';
import AddWaterSource from './pages/AddWaterSource';
import Profile from './pages/Profile';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes with Navbar */}
          <Route element={<PublicNavbar />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<EmailAccess key="verify" mode="verify-email" />} />
            <Route path="/forgot-password" element={<EmailAccess key="forgot" mode="forgot-password" />} />
            <Route path="/reset-password" element={<EmailAccess key="reset" mode="reset-password" />} />
            <Route path="/public-map" element={<PublicMap />} />
          </Route>
          
          {/* Protected Routes (Resident Portal) */}
          <Route path="/portal" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/portal/my-barangay" replace />} />
            <Route path="my-barangay" element={<MyBarangay />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
            <Route path="add-water-source" element={<AddWaterSource />} />
            <Route path="request-inspection" element={<Navigate to="/portal/submit-concern?category=request_inspection" replace />} />
            <Route path="submit-concern" element={<SubmitConcern />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
