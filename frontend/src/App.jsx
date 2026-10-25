import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DocumentsPage from './pages/DocumentsPage';
import AskPage from './pages/AskPage';
import ReviewPage from './pages/ReviewPage';
import GraphPage from './pages/GraphPage';
import EvaluationsPage from './pages/EvaluationsPage';
import BentoThemePage from './pages/BentoThemePage';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        {/* Persistent Bento Blueprint Grid & Ambient Vignette Background */}
        <div className="bento-viewport-bg" aria-hidden="true">
          <div className="bento-grid-pattern" />
          <div className="bento-overlay-gradient" />
        </div>

        <div className="app-container">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<DocumentsPage />} />
              <Route path="/ask" element={<AskPage />} />
              <Route path="/review" element={<ReviewPage />} />
              <Route path="/graph" element={<GraphPage />} />
              <Route path="/evaluations" element={<EvaluationsPage />} />
              <Route path="/theme" element={<BentoThemePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}
