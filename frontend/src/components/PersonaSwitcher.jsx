import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { UserCheck, Shield, Building, Award, CheckCircle2, AlertCircle } from 'lucide-react';

const PERSONAS = [
  { key: 'anika', name: 'Anika', role: 'Training Centre', desc: 'Apex Skills (Uploads Batches)', icon: Building, color: '#0284c7' },
  { key: 'dev', name: 'Dev', role: 'District Officer 1', desc: 'Bhopal District (Dual-Approval)', icon: Shield, color: '#2563eb' },
  { key: 'meera', name: 'Meera', role: 'District Officer 2', desc: 'Bhopal District (Dual-Approval)', icon: Shield, color: '#4f46e5' },
  { key: 'kabir', name: 'Kabir', role: 'District Officer 3', desc: 'Bhopal District (Dual-Approval)', icon: Shield, color: '#7c3aed' },
  { key: 'neha', name: 'Neha', role: 'Quality Team', desc: 'State QA (> 50 candidates)', icon: CheckCircle2, color: '#059669' },
  { key: 'farah', name: 'Farah', role: 'State Office', desc: 'Final Approval & Revocation', icon: Award, color: '#dc2626' }
];

export default function PersonaSwitcher() {
  const { user, demoLogin, logout, loading, error } = useAuth();

  return (
    <div style={{ background: '#ffffff', borderBottom: '1px solid var(--border)', padding: '12px 24px', boxShadow: 'var(--shadow-sm)' }}>
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span><strong>Backend Connection Error:</strong> {error}. Make sure the backend is running with <code>cd backend && npm run dev</code> in a terminal.</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>
            Evaluation Persona Switcher (Single-Click Role Emulation)
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
            {PERSONAS.map((p) => {
              const isActive = user?.email?.toLowerCase().includes(p.key);
              const Icon = p.icon;
              return (
                <button
                  key={p.key}
                  onClick={() => demoLogin(p.key)}
                  disabled={loading || isActive}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: isActive ? `2px solid ${p.color}` : '1px solid var(--border)',
                    backgroundColor: isActive ? 'var(--primary-subtle)' : '#ffffff',
                    color: isActive ? p.color : 'var(--text-main)',
                    fontWeight: isActive ? '600' : '500',
                    fontSize: '12px',
                    cursor: isActive ? 'default' : 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={14} color={isActive ? p.color : '#64748b'} />
                  <span>{p.name} ({p.role.split(' ')[0]})</span>
                  {isActive && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: p.color }}></span>}
                </button>
              );
            })}
          </div>
        </div>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--navy)' }}>{user.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Role: <span style={{ fontWeight: '600', color: 'var(--primary-dark)' }}>{user.role}</span>
              </div>
            </div>
            <button
              onClick={logout}
              style={{
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: '#ffffff',
                color: 'var(--danger)',
                fontWeight: '500'
              }}
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
