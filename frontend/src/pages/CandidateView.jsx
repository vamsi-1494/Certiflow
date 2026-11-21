import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import { Download, ShieldCheck, CheckCircle2, AlertOctagon, ArrowLeft, ExternalLink, Calendar, MapPin, Award, User, Lock } from 'lucide-react';

export default function CandidateView() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchCertificate = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/certificates/access/${token}`);
        setCert(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid or expired certificate access token.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchCertificate();
    }
  }, [token]);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      // Use direct window download via browser for binary PDF stream
      window.location.href = `http://localhost:5000/api/certificates/download/${token}`;
    } catch (err) {
      alert('Failed to initiate PDF download. Please try again.');
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '680px', margin: '60px auto', textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--primary)' }}>
          Retrieving your official digital credential...
        </div>
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '24px' }}>
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--border)', padding: '36px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', background: '#fee2e2', borderRadius: '50%', marginBottom: '16px' }}>
            <AlertOctagon size={32} color="#dc2626" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--navy)', marginBottom: '8px' }}>
            Access Link Invalid or Expired
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
            {error || 'The certificate access token could not be verified. Please check the link sent via WhatsApp or contact your Training Centre.'}
          </p>
          <button
            onClick={() => navigate('/verify')}
            style={{
              background: 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Go to Public Verification Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px 20px 48px' }}>
      {/* Top Bar Navigation */}
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
          <ArrowLeft size={16} /> Pragati Skills Mission Portal
        </button>

        <span style={{ fontSize: '12px', color: '#16a34a', background: '#dcfce7', padding: '4px 10px', borderRadius: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle2 size={13} /> Official Candidate Access
        </span>
      </div>

      {/* Action Header Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          padding: '20px 24px',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px'
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--navy)', marginBottom: '4px' }}>
            Digital Skill Credential
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Issued to <strong>{cert.candidateName || cert.candidate?.fullName}</strong> &bull; Registration: <span style={{ fontFamily: 'monospace', fontWeight: '700' }}>{cert.certificateNumber}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            style={{
              background: 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(2,132,199,0.25)'
            }}
          >
            <Download size={16} />
            {downloading ? 'Preparing PDF...' : 'Download Official PDF'}
          </button>

          <button
            onClick={() => navigate(`/verify?code=${cert.verificationCode}`)}
            style={{
              background: 'var(--bg-page)',
              color: 'var(--navy)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ShieldCheck size={16} color="var(--primary)" />
            Verify on National Portal
          </button>
        </div>
      </div>

      {/* Realistic Visual Certificate Canvas Preview */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '8px double #0284c7',
          padding: '40px 48px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          marginBottom: '24px',
          backgroundImage: 'radial-gradient(#f0f9ff 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      >
        {/* Header Emblem & Title */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-block', background: '#0284c7', color: '#ffffff', fontWeight: '900', fontSize: '13px', padding: '4px 14px', borderRadius: '4px', letterSpacing: '1px', marginBottom: '8px' }}>
            GOVERNMENT OF INDIA &bull; SKILL DEVELOPMENT MISSION
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px', marginBottom: '4px' }}>
            PRAGATI SKILLS MISSION
          </h2>
          <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
            National Certificate of Skill Qualification
          </div>
        </div>

        {/* Certificate Recipient Section */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', marginBottom: '8px' }}>
            This is to certify that
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#0284c7', marginBottom: '6px', textDecoration: 'underline', textUnderlineOffset: '6px' }}>
            {cert.candidateName || cert.candidate?.fullName}
          </div>
          {cert.candidate?.guardianName && (
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
              Ward of <strong>{cert.candidate.guardianName}</strong>
            </div>
          )}
          <div style={{ fontSize: '14px', color: '#334155', maxWidth: '640px', margin: '0 auto', lineHeight: '1.6' }}>
            has successfully completed the prescribed training programme and satisfied all assessment criteria for the vocational qualification:
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '12px' }}>
            {cert.courseName || cert.batch?.courseName}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
            Course Code: {cert.courseCode || cert.batch?.courseCode}
          </div>
        </div>

        {/* Certificate Meta Details */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', background: '#f8fafc', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '32px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700' }}>Training Centre</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{cert.trainingCentreName || cert.batch?.trainingCentre?.name || 'Apex Centre'}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700' }}>District</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{cert.districtName || cert.batch?.district?.name || 'Bhopal'}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700' }}>Issue Date</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
              {cert.issueDate ? new Date(cert.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Verified'}
            </div>
          </div>
        </div>

        {/* Footer Authority & QR Code */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Certificate Number</div>
            <div style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: '700', color: '#0284c7' }}>{cert.certificateNumber}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Verification Code: <strong style={{ color: '#0f172a' }}>{cert.verificationCode}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>Director General</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Pragati Skills Mission, Govt of India</div>
          </div>
        </div>
      </div>

      {/* Security Advisory */}
      <div style={{ background: 'var(--primary-subtle)', border: '1px solid var(--primary-light)', borderRadius: '8px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Lock size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '12px', color: 'var(--primary-dark)', lineHeight: '1.4' }}>
          <strong>Candidate Security Note:</strong> This personal credential link is private. Anyone possessing the physical or digital certificate can verify its authenticity using the public verification code on the national portal without accessing your private link.
        </div>
      </div>
    </div>
  );
}
