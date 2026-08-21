import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import PublicNavbar from './components/PublicNavbar';

// Public Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import PublicMap from './pages/PublicMap';

// Protected Pages (Resident Portal)
import MyBarangay from './pages/MyBarangay';
import Notifications from './pages/Notifications';
import RequestInspection from './pages/RequestInspection';
import SubmitConcern from './pages/SubmitConcern';

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
            <Route path="/public-map" element={<PublicMap />} />
          </Route>
          
          {/* Protected Routes (Resident Portal) */}
          <Route path="/portal" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/portal/my-barangay" replace />} />
            <Route path="my-barangay" element={<MyBarangay />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="request-inspection" element={<RequestInspection />} />
            <Route path="submit-concern" element={<SubmitConcern />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
