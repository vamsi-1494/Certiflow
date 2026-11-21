import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import { ShieldCheck, ShieldAlert, AlertTriangle, Search, CheckCircle, ExternalLink, ArrowLeft, RefreshCw, Zap, Lock } from 'lucide-react';

export default function PublicVerify() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [queryCode, setQueryCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searchedCode, setSearchedCode] = useState('');

  const executeVerification = async (codeToVerify) => {
    const code = (codeToVerify || queryCode).trim();
    if (!code) return;

    setLoading(true);
    setResult(null);
    setSearchedCode(code);

    try {
      const res = await api.get(`/certificates/verify/${encodeURIComponent(code)}`);
      setResult(res.data.data);
      // Update browser URL query without reloading
      setSearchParams({ code });
    } catch (err) {
      setResult({
        isValid: false,
        status: 'ERROR',
        message: err.response?.data?.message || 'Verification service temporarily unavailable. Please retry.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialCode = searchParams.get('code');
    if (initialCode) {
      setQueryCode(initialCode);
      executeVerification(initialCode);
    }
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    executeVerification(queryCode);
  };

  const handleDemoPreset = (presetCode) => {
    setQueryCode(presetCode);
    executeVerification(presetCode);
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '16px 20px 48px' }}>
      {/* Navigation Return Button */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} /> Back to Staff & Evaluator Portal
        </button>

        <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Lock size={12} /> Zero-Authentication Public Gateway
        </span>
      </div>

      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '28px 24px',
          boxShadow: 'var(--shadow-md)',
          marginBottom: '24px',
          textAlign: 'center'
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', background: 'rgba(255,255,255,0.15)', borderRadius: '50%', marginBottom: '12px' }}>
          <ShieldCheck size={32} color="#ffffff" />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px', letterSpacing: '-0.3px' }}>
          Pragati Skills Mission &bull; National Credential Registry
        </h1>
        <p style={{ fontSize: '14px', opacity: 0.9, maxWidth: '580px', margin: '0 auto', lineHeight: '1.5' }}>
          Official public verification gateway for skill certificates issued under the Government of India skill development framework.
        </p>
      </div>

      {/* Search Input Card */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--border)', padding: '24px', boxShadow: 'var(--shadow-sm)', marginBottom: '24px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={queryCode}
              onChange={(e) => setQueryCode(e.target.value)}
              placeholder="Enter Certificate No (e.g., PSM-2026-BPL-OFAP-0001) or Verification Code (e.g., VRF-ROH-8899-VALID)"
              style={{
                width: '100%',
                padding: '12px 14px 12px 42px',
                borderRadius: '8px',
                border: '2px solid var(--border)',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'monospace',
                fontWeight: '600'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !queryCode.trim()}
            style={{
              background: 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0 24px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {loading ? <RefreshCw size={16} className="spin-animate" /> : <Search size={16} />}
            Verify
          </button>
        </form>

        {/* Evaluator Quick-Test Buttons */}
        <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>
            ⚡ Hackathon Evaluation Quick-Test Presets:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleDemoPreset('PSM-2026-BPL-OFAP-0001')}
              style={{ fontSize: '12px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '6px 12px', borderRadius: '6px', fontWeight: '600' }}
            >
              ✓ Authentic Cert (Rohan Sharma)
            </button>
            <button
              type="button"
              onClick={() => handleDemoPreset('PSM-2026-BPL-TTT-0002-REVOKED')}
              style={{ fontSize: '12px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', fontWeight: '600' }}
            >
              ⚠ Revoked Cert (Vikram Aditya)
            </button>
            <button
              type="button"
              onClick={() => handleDemoPreset('VRF-ROH-8899-VALID')}
              style={{ fontSize: '12px', background: 'var(--primary-subtle)', color: 'var(--primary-dark)', border: '1px solid var(--primary-light)', padding: '6px 12px', borderRadius: '6px', fontWeight: '600' }}
            >
              📷 QR Verification Hash
            </button>
            <button
              type="button"
              onClick={() => handleDemoPreset('PSM-2026-FAKE-0000')}
              style={{ fontSize: '12px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontWeight: '600' }}
            >
              ✕ Non-Existent ID
            </button>
          </div>
        </div>
      </div>

      {/* Verification Result Display */}
      {result && (
        <div>
          {/* 1. AUTHENTIC & VALID CERTIFICATE */}
          {result.status === 'VERIFIED' && (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '2px solid #22c55e', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
              {/* Header Status Bar */}
              <div style={{ background: '#22c55e', color: '#ffffff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle size={24} />
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '16px', letterSpacing: '0.3px' }}>
                      CERTIFICATE AUTHENTICATED & VALID
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>
                      Verified against the Pragati Skills Mission National Master Register
                    </div>
                  </div>
                </div>
                {result.fromCache && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                    <Zap size={12} /> Redis L2 Cached
                  </span>
                )}
              </div>

              {/* Certificate Details Grid */}
              <div style={{ padding: '28px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '24px' }}>
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>
                      Candidate Full Name
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)' }}>
                      {result.candidateName}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>
                      Certificate Registration Number
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--primary)' }}>
                      {result.certificateNumber}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>
                      Course / Skill Qualification
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
                      {result.courseName} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>({result.courseCode})</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>
                      Training Centre & District
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>
                      {result.trainingCentre}, {result.district}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>
                      Date of Issuance
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>
                      {result.issueDate ? new Date(result.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Verified'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>
                      Issuing Authority
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>
                      {result.issuingAuthority || 'Pragati Skills Mission, Govt of India'}
                    </div>
                  </div>
                </div>

                {/* Privacy & Compliance Assurance Notice */}
                <div style={{ background: 'var(--bg-page)', borderRadius: '8px', padding: '14px 16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Lock size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    <strong>DPDP Act & Privacy Shield:</strong> Candidate contact phone number, guardian name, and Aadhaar numbers are permanently masked from public records to protect candidate privacy.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. OFFICIALLY REVOKED / CANCELLED CERTIFICATE */}
          {result.status === 'CANCELLED' && (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '2px solid #dc2626', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
              {/* Header Status Bar */}
              <div style={{ background: '#dc2626', color: '#ffffff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldAlert size={26} />
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '16px', letterSpacing: '0.3px' }}>
                      CERTIFICATE OFFICIALLY REVOKED / CANCELLED
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>
                      This digital credential has been invalidated by State Office Directive
                    </div>
                  </div>
                </div>
                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>
                  VOID & INVALID
                </span>
              </div>

              {/* Cancellation Alert Body */}
              <div style={{ padding: '24px' }}>
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px' }}>
                  <div style={{ fontWeight: '700', color: '#991b1b', fontSize: '14px', marginBottom: '4px' }}>
                    Official Revocation Directive:
                  </div>
                  <div style={{ color: '#7f1d1d', fontSize: '13px', lineHeight: '1.5' }}>
                    {result.cancellationReason || 'Revoked pursuant to State Office compliance and vigilance directive.'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Candidate Name:</span>
                    <strong style={{ fontSize: '15px' }}>{result.candidateName}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Certificate Number:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#dc2626' }}>{result.certificateNumber}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Original Issue Date:</span>
                    <span>{result.issueDate ? new Date(result.issueDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Revocation Recorded:</span>
                    <span style={{ color: '#dc2626', fontWeight: '700' }}>{result.cancelledAt ? new Date(result.cancelledAt).toLocaleString('en-IN') : 'Confirmed'}</span>
                  </div>
                </div>

                <div style={{ marginTop: '20px', padding: '12px', background: '#f8fafc', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  This credential holds <strong>zero legal, academic, or professional validity</strong>. Attempting to present this credential for employment constitutes an offence under applicable regulations.
                </div>
              </div>
            </div>
          )}

          {/* 3. RECORD NOT FOUND */}
          {result.status === 'NOT_FOUND' && (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--border)', padding: '36px 24px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', background: '#fef3c7', borderRadius: '50%', marginBottom: '14px' }}>
                <AlertTriangle size={30} color="#d97706" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--navy)', marginBottom: '8px' }}>
                No Matching Credential Record Found
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '500px', margin: '0 auto 16px', lineHeight: '1.5' }}>
                No record matching <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>{searchedCode}</code> was found in the Pragati Skills Mission registry.
              </p>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Please check the exact spelling or scan the QR code located on the official certificate.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
