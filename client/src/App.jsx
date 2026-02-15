import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layouts/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Enrichment from './pages/Enrichment';
import ApplicationJourney from './pages/ApplicationJourney';
import Settings from './pages/Settings';

function App() {
  // TODO: Add Auth Context check
  const isAuthenticated = true; // Mock

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="applications" element={<ApplicationJourney />} />
          <Route path="applicants" element={<div className="text-2xl text-gray-400 font-bold text-center mt-20">Applicants Page Stub</div>} />
          <Route path="enrichment" element={<Enrichment />} />
          <Route path="partners" element={<div className="text-2xl text-gray-400 font-bold text-center mt-20">Partners Page Stub</div>} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
