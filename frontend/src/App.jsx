import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import PersonaSwitcher from './components/PersonaSwitcher.jsx';
import TrainingCentreDashboard from './pages/TrainingCentreDashboard.jsx';
import DistrictOfficerDashboard from './pages/DistrictOfficerDashboard.jsx';
import QualityDashboard from './pages/QualityDashboard.jsx';
import StateOfficeDashboard from './pages/StateOfficeDashboard.jsx';
import PublicVerify from './pages/PublicVerify.jsx';
import CandidateView from './pages/CandidateView.jsx';
import { useSSE } from './utils/useSSE.js';
import './index.css';
import { Lock, ShieldCheck, Radio, CheckCircle2, AlertTriangle, Bell, ExternalLink } from 'lucide-react';

function DashboardRouter() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div style={{ padding: '60px 20px', maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--border)', padding: '36px', boxShadow: 'var(--shadow-sm)' }}>
          <Lock size={44} color="var(--primary)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--navy)', marginBottom: '8px' }}>
            Pragati Skills Mission &bull; Evaluation Portal
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
            Select any persona from the top emulation bar to view their role-tailored dashboard and test the approval workflow.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', textAlign: 'left', fontSize: '13px' }}>
            <div style={{ background: 'var(--bg-page)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <strong>Anika (Training Centre)</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Uploads candidate spreadsheets & manages batches.</div>
            </div>
            <div style={{ background: 'var(--bg-page)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <strong>Dev, Meera, Kabir</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>District Officers enforcing dual-approval.</div>
            </div>
            <div style={{ background: 'var(--bg-page)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <strong>Neha (Quality Team)</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Inspects large batches (&gt; 50 candidates).</div>
            </div>
            <div style={{ background: 'var(--bg-page)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <strong>Farah (State Office)</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Final issuance approval & revocation authority.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Route based on User Role
  switch (user.role) {
    case 'TRAINING_CENTRE':
      return <TrainingCentreDashboard />;

    case 'DISTRICT_OFFICER':
      return <DistrictOfficerDashboard />;

    case 'QUALITY_TEAM':
      return <QualityDashboard />;

    case 'STATE_OFFICE':
      return <StateOfficeDashboard />;

    default:
      return <div>Unknown Role</div>;
  }
}

function MainLayout() {
  const location = useLocation();
  const [liveToast, setLiveToast] = useState(null);

  // Connect to Real-Time SSE Stream
  const { isConnected } = useSSE((event) => {
    // Generate toast for live workflow events
    if (event.event !== 'CONNECTED') {
      let message = 'System notification received';
      if (event.event === 'APPROVAL_RECORDED') {
        message = `District approval recorded for ${event.data.batchNumber} by ${event.data.officer} (Round ${event.data.round})`;
      } else if (event.event === 'BATCH_STATUS_UPDATED') {
        message = `Batch ${event.data.batchNumber || ''} updated to ${event.data.status}`;
      } else if (event.event === 'QUALITY_REVIEW_COMPLETED') {
        message = `Quality review ${event.data.decision} for batch ${event.data.batchNumber} by ${event.data.reviewer}`;
      } else if (event.event === 'BATCH_APPROVED') {
        message = `State Office approved ${event.data.batchNumber}! Certificates queued for issuance.`;
      } else if (event.event === 'CERTIFICATES_ISSUED') {
        message = `Generated ${event.data.newlyCreated || 0} certificates for ${event.data.batchNumber || 'batch'}.`;
      } else if (event.event === 'CERTIFICATE_CANCELLED') {
        message = `Certificate ${event.data.certificateNumber} REVOKED by State Office: ${event.data.reason}`;
      }

      setLiveToast({ event: event.event, message });
      setTimeout(() => setLiveToast(null), 6000);
    }
  });

  const isStaffDashboard = location.pathname === '/' || location.pathname === '/dashboard';

  return (
    <div className="app-container">
      {/* Brand Header */}
      <header className="brand-header">
        <div className="brand-title">
          <div className="brand-logo-badge">PSM</div>
          <div>
            <div className="brand-name">CertiFlow</div>
            <div className="brand-subtext">Pragati Skills Mission &bull; Digital Certificate Issuance Platform</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* SSE Connection Status Indicator */}
          <div
            title={isConnected ? 'Connected to live real-time event stream' : 'Reconnecting to event stream...'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: '700',
              padding: '4px 10px',
              borderRadius: '12px',
              background: isConnected ? '#f0fdf4' : '#f8fafc',
              color: isConnected ? '#15803d' : '#64748b',
              border: isConnected ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: isConnected ? '#22c55e' : '#94a3b8',
                display: 'inline-block'
              }}
            />
            {isConnected ? 'Real-Time Sync Active' : 'Connecting...'}
          </div>

          {/* Navigation Shortcuts */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '2px' }}>
            <Link
              to="/"
              style={{
                fontSize: '12px',
                fontWeight: isStaffDashboard ? '700' : '500',
                padding: '4px 12px',
                borderRadius: '6px',
                color: isStaffDashboard ? '#ffffff' : 'var(--text-main)',
                background: isStaffDashboard ? 'var(--primary)' : 'transparent',
                textDecoration: 'none'
              }}
            >
              🏢 Staff Portal
            </Link>
            <Link
              to="/verify"
              style={{
                fontSize: '12px',
                fontWeight: location.pathname === '/verify' ? '700' : '500',
                padding: '4px 12px',
                borderRadius: '6px',
                color: location.pathname === '/verify' ? '#ffffff' : 'var(--text-main)',
                background: location.pathname === '/verify' ? 'var(--primary)' : 'transparent',
                textDecoration: 'none'
              }}
            >
              🔍 Public Verify
            </Link>
          </div>

          <span style={{ fontSize: '12px', background: 'var(--primary-subtle)', color: 'var(--primary-dark)', padding: '4px 10px', borderRadius: '12px', border: '1px solid var(--primary-light)', fontWeight: '600' }}>
            Phase 7 Active &bull; Redis Caching & Public Registry
          </span>
        </div>
      </header>

      {/* Floating Live Real-Time Toast */}
      {liveToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#0f172a',
            color: '#ffffff',
            borderRadius: '10px',
            padding: '14px 20px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '460px',
            fontSize: '13px',
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          <div style={{ background: 'var(--primary)', borderRadius: '50%', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={16} color="#ffffff" />
          </div>
          <div style={{ flex: 1, lineHeight: '1.4' }}>
            <div style={{ fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', color: 'var(--primary-light)', letterSpacing: '0.5px' }}>
              ⚡ Real-Time Update ({liveToast.event})
            </div>
            <div>{liveToast.message}</div>
          </div>
          <button
            onClick={() => setLiveToast(null)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer', padding: '0 4px' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Persona Switcher (visible on staff portal) */}
      {isStaffDashboard && <PersonaSwitcher />}

      {/* Main Content Area */}
      <main style={{ padding: '24px 24px', maxWidth: '1180px', margin: '0 auto', width: '100%', flex: 1 }}>
        <Routes>
          <Route path="/" element={<DashboardRouter />} />
          <Route path="/verify" element={<PublicVerify />} />
          <Route path="/certificate/:token" element={<CandidateView />} />
          <Route path="*" element={<DashboardRouter />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MainLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}
