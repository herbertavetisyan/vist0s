import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import LocaleWrapper from './components/LocaleWrapper';
import Login from './pages/Login';
import Applications from './pages/Applications';
import NewApplication from './pages/NewApplication';
import ApplicationDetail from './pages/ApplicationDetail';
import Partners from './pages/Partners';
import LoanTypes from './pages/LoanTypes';
import DmsSettings from './pages/DmsSettings';
import SystemLogs from './pages/SystemLogs';

const App = () => {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Root redirect to default locale */}
                    <Route path="/" element={<Navigate to="/hy" replace />} />
                    
                    {/* Backward compatibility for auth redirects that might not have locale */}
                    <Route path="/login" element={<Navigate to="/hy/login" replace />} />

                    <Route path="/:locale" element={<LocaleWrapper />}>
                        <Route path="login" element={<Login />} />

                        {/* Protected Routes inside Main Dashboard Layout */}
                        <Route element={
                            <ProtectedRoute>
                                <MainLayout />
                            </ProtectedRoute>
                        }>
                            <Route index element={<Navigate to="applications" replace />} />
                            <Route path="applications" element={<Applications />} />
                            <Route path="applications/new" element={<NewApplication />} />
                            <Route path="applications/:id" element={<ApplicationDetail />} />
                            <Route path="applications/:id/:stage" element={<ApplicationDetail />} />
                            <Route path="partners" element={<Partners />} />

                            {/* Placeholders for the rest of the navigation */}
                            <Route path="applicants" element={<div className="animate-fade-in"><h1>Applicants</h1><p>Applicant Management coming soon...</p></div>} />
                            <Route path="loan-types" element={<LoanTypes />} />
                            <Route path="settings" element={<DmsSettings />} />
                            <Route path="logs" element={<SystemLogs />} />
                        </Route>
                    </Route>

                    {/* Fallback route */}
                    <Route path="*" element={<Navigate to="/hy" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
};

export default App;
