import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Signin from './pages/Signin.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import EmployeeDashboard from './pages/EmployeeDashboard.jsx';
import { setupOfflineInterceptor } from './config/offlineInterceptor.js';
import './App.css';

// Role-based dashboard router
const DashboardRouter = () => {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/signin" replace />;
    }

    if (user.role === 'EMPLOYEE') {
        return <EmployeeDashboard />;
    }

    return <Dashboard />;
};

function App() {
    useEffect(() => {
        // Setup offline interceptor
        setupOfflineInterceptor();
    }, []);

    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/signin" element={<Signin />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <DashboardRouter />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
                <Toaster position="top-right" />
            </Router>
        </AuthProvider>
    );
}

export default App;
