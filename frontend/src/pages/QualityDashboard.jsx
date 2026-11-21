import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatCard from '../components/StatCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import BatchDetailsModal from '../components/BatchDetailsModal.jsx';
import { CheckCircle2, AlertTriangle, Layers, ThumbsUp, XCircle, Eye, ShieldCheck } from 'lucide-react';

export default function QualityDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({ stats: null, batches: [] });
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Quality Decision Modal
  const [decisionBatch, setDecisionBatch] = useState(null);
  const [decisionType, setDecisionType] = useState(null); // 'APPROVE' or 'REJECT'
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/approvals/quality/dashboard');
      setData(res.data.data);
    } catch (err) {
      console.error('Failed to load quality dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!decisionBatch || !decisionType) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      let res;
      if (decisionType === 'APPROVE') {
        res = await api.post(`/approvals/quality/${decisionBatch.id}/approve`, { notes });
      } else {
        res = await api.post(`/approvals/quality/${decisionBatch.id}/reject`, { reason: notes });
      }

      setFeedback({ success: true, message: res.data.data.message });
      setDecisionBatch(null);
      setDecisionType(null);
      setNotes('');
      fetchDashboard();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      setFeedback({ success: false, message: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Top Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--navy)' }}>
            Quality Assurance Inspection Portal
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            State Quality Team &bull; Logged in as <strong>{user.name}</strong> (Large-Batch Sampling Auditor)
          </p>
        </div>
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: '#047857', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={14} /> Automatic Quality Gate (&gt; {data.stats?.largeBatchThreshold || 50} Candidates)
        </div>
      </div>

      {feedback && (
        <div
          style={{
            background: feedback.success ? 'var(--success-bg)' : 'var(--danger-bg)',
            border: `1px solid ${feedback.success ? 'var(--success)' : 'var(--danger)'}`,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: feedback.success ? 'var(--success)' : 'var(--danger)',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {feedback.success ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <StatCard
          title="Pending Quality Review"
          value={data.stats?.pendingQualityReview || data.batches?.length || 0}
          icon={AlertTriangle}
          color="#d97706"
          subtitle="Large batches awaiting audit"
        />
        <StatCard
          title="Threshold Trigger"
          value={`> ${data.stats?.largeBatchThreshold || 50}`}
          icon={Layers}
          color="#7c3aed"
          subtitle="Configurable env: LARGE_BATCH_THRESHOLD"
        />
        <StatCard
          title="Quality Audits Completed"
          value={data.stats?.reviewedCount || 0}
          icon={CheckCircle2}
          color="var(--success)"
          subtitle="Passed quality threshold"
        />
      </div>

      {/* Batches Table Card */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--navy)' }}>
            Batches Flagged for Quality Review ({data.batches?.length || 0})
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            These batches exceeded the 50-candidate threshold and were automatically routed for random sampling & video verification before final State Office approval.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading quality review queue...
          </div>
        ) : data.batches?.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <CheckCircle2 size={36} color="var(--success)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--navy)' }}>Quality Queue is Clear</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              No large batches currently require quality assurance review.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  <th style={{ padding: '12px 18px', fontWeight: '600' }}>Batch Number</th>
                  <th style={{ padding: '12px 18px', fontWeight: '600' }}>Training Centre</th>
                  <th style={{ padding: '12px 18px', fontWeight: '600' }}>Course & Size</th>
                  <th style={{ padding: '12px 18px', fontWeight: '600' }}>District Approvals</th>
                  <th style={{ padding: '12px 18px', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px 18px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.batches.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 18px', fontWeight: '700', color: 'var(--navy)' }}>
                      {b.batchNumber}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <div>{b.trainingCentre?.name || b.trainingCentreName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.district?.name || b.districtName}</div>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ fontWeight: '500' }}>{b.courseName}</div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#7c3aed' }}>
                        {b.totalCandidates || b.candidates?.length || 0} candidates (High Volume)
                      </div>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{ fontSize: '11px', background: 'var(--success-bg)', color: 'var(--success)', padding: '2px 8px', borderRadius: '10px', fontWeight: '700', border: '1px solid var(--border)' }}>
                        2 / 2 District Verified
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <StatusBadge status={b.status} />
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => setSelectedBatch(b)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid var(--border)', padding: '5px 10px', borderRadius: '6px', fontSize: '12px' }}
                        >
                          <Eye size={13} /> Inspect Records
                        </button>

                        <button
                          onClick={() => { setDecisionBatch(b); setDecisionType('APPROVE'); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--success)', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', color: '#fff', fontWeight: '600' }}
                        >
                          <ThumbsUp size={13} /> Approve QA
                        </button>

                        <button
                          onClick={() => { setDecisionBatch(b); setDecisionType('REJECT'); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--danger-bg)', border: '1px solid var(--danger)', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', color: 'var(--danger)', fontWeight: '600' }}
                        >
                          <XCircle size={13} /> Reject QA
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Decision Modal */}
      {decisionBatch && decisionType && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', maxWidth: '520px', width: '100%', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--navy)' }}>
                {decisionType === 'APPROVE' ? 'Approve Quality Review' : 'Reject Quality Review'}
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Batch: {decisionBatch.batchNumber} ({decisionBatch.totalCandidates} candidates)
              </div>
            </div>

            <form onSubmit={handleDecisionSubmit} style={{ padding: '24px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {decisionType === 'APPROVE'
                  ? 'Approving will clear the quality gate and advance this large batch to the State Office for final issuance approval.'
                  : 'Rejecting will mark the batch as QUALITY_REJECTED. A detailed inspection finding is mandatory.'}
              </p>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  {decisionType === 'APPROVE' ? 'Quality Audit Notes (Optional)' : 'Mandatory Rejection Finding'}
                </label>
                <textarea
                  rows={4}
                  required={decisionType !== 'APPROVE'}
                  placeholder={decisionType === 'APPROVE' ? 'e.g. 10% candidate sampling verified against training center practical logs.' : 'Enter detailed audit deficiency...'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => { setDecisionBatch(null); setDecisionType(null); }}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', background: '#fff', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    background: decisionType === 'APPROVE' ? 'var(--success)' : 'var(--danger)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  {submitting ? 'Submitting...' : `Confirm ${decisionType === 'APPROVE' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Details Modal */}
      {selectedBatch && (
        <BatchDetailsModal
          batch={selectedBatch}
          onClose={() => setSelectedBatch(null)}
          onRefresh={fetchDashboard}
        />
      )}
    </div>
  );
}
