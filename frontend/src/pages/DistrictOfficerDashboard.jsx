import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatCard from '../components/StatCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import BatchDetailsModal from '../components/BatchDetailsModal.jsx';
import { Shield, Clock, CheckCircle, AlertTriangle, Eye, ThumbsUp, XCircle, RotateCcw, AlertOctagon } from 'lucide-react';

export default function DistrictOfficerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({ stats: null, batches: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING'); // PENDING, OVERDUE, ALL

  // Action Modals & State
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [actionBatch, setActionBatch] = useState(null);
  const [actionType, setActionType] = useState(null); // 'APPROVE', 'REJECT', 'RETURN'
  const [reasonInput, setReasonInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/approvals/district/dashboard');
      setData(res.data.data);
    } catch (err) {
      console.error('Failed to load district dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!actionBatch || !actionType) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      let res;
      if (actionType === 'APPROVE') {
        res = await api.post(`/approvals/batches/${actionBatch.id}/approve`, { comments: reasonInput });
      } else if (actionType === 'REJECT') {
        res = await api.post(`/approvals/batches/${actionBatch.id}/reject`, { reason: reasonInput });
      } else if (actionType === 'RETURN') {
        res = await api.post(`/approvals/batches/${actionBatch.id}/return`, { reason: reasonInput });
      }

      setFeedback({ success: true, message: res.data.data.message });
      setActionBatch(null);
      setActionType(null);
      setReasonInput('');
      fetchDashboard();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      setFeedback({ success: false, message: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBatches = data.batches.filter((b) => {
    if (filter === 'PENDING') return b.status === 'DISTRICT_REVIEW';
    if (filter === 'OVERDUE') return b.isOverdue;
    return true;
  });

  return (
    <div>
      {/* Top Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--navy)' }}>
            District Officer Review Portal
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {user.district?.name || 'Bhopal'} District &bull; Logged in as <strong>{user.name}</strong> (Dual-Approval Signatory)
          </p>
        </div>
        <div style={{ background: '#e0e7ff', border: '1px solid #c7d2fe', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: '#4338ca', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Shield size={14} /> Dual-Custody Active (2 Different Officers Required)
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
          {feedback.success ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <StatCard
          title="Pending District Review"
          value={data.stats?.pendingReview || 0}
          icon={Clock}
          color="#d97706"
          subtitle="Awaiting officer signatures"
        />
        <StatCard
          title="SLA Overdue Batches"
          value={data.stats?.overdueCount || 0}
          icon={AlertOctagon}
          color="var(--danger)"
          subtitle="Pending > 48 hours"
        />
        <StatCard
          title="Total District Approved"
          value={data.stats?.approvedCount || 0}
          icon={CheckCircle}
          color="var(--success)"
          subtitle="Passed district dual-approval"
        />
      </div>

      {/* Batches Table Card */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        {/* Filter Tabs */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'PENDING', label: `Pending District Review (${data.stats?.pendingReview || 0})` },
            { id: 'OVERDUE', label: `Overdue SLA Alerts (${data.stats?.overdueCount || 0})` },
            { id: 'ALL', label: `All District Batches (${data.batches?.length || 0})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: filter === tab.id ? '1px solid var(--primary)' : '1px solid transparent',
                background: filter === tab.id ? 'var(--primary-subtle)' : 'transparent',
                color: filter === tab.id ? 'var(--primary-dark)' : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: filter === tab.id ? '600' : '500'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Batches Table */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading district records...
          </div>
        ) : filteredBatches.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <CheckCircle size={36} color="var(--success)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--navy)' }}>All batches cleared!</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              No batches currently pending your review in this queue.
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
                  <th style={{ padding: '12px 18px', fontWeight: '600' }}>Approval Progress</th>
                  <th style={{ padding: '12px 18px', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px 18px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border)', background: b.isOverdue ? '#fffbeb' : '#fff' }}>
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ fontWeight: '700', color: 'var(--navy)' }}>{b.batchNumber}</div>
                      {b.isOverdue && (
                        <span style={{ fontSize: '11px', background: 'var(--danger-bg)', color: 'var(--danger)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                          OVERDUE SLA
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <div>{b.trainingCentre?.name || b.trainingCentreName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Round {b.currentApprovalRound || 1}</div>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ fontWeight: '500' }}>{b.courseName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        <strong>{b.totalCandidates || b.candidates?.length || 0}</strong> candidates
                        {(b.totalCandidates || 0) > 50 && (
                          <span style={{ marginLeft: '6px', color: '#7c3aed', fontWeight: '600' }}>(&gt; 50 triggers QA)</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: b.approvalsInRound >= 2 ? 'var(--success-bg)' : b.approvalsInRound === 1 ? '#fef3c7' : '#f1f5f9',
                            color: b.approvalsInRound >= 2 ? 'var(--success)' : b.approvalsInRound === 1 ? '#b45309' : '#64748b',
                            border: '1px solid var(--border)'
                          }}
                        >
                          {b.approvalsInRound || 0} / 2 Approvals
                        </span>
                      </div>
                      {b.approvers && b.approvers.length > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Signed: {b.approvers.join(', ')}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <StatusBadge status={b.status} />
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => setSelectedBatch(b)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#ffffff',
                            border: '1px solid var(--border)',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                        >
                          <Eye size={13} /> View
                        </button>

                        {b.status === 'DISTRICT_REVIEW' && (
                          <>
                            {b.hasCurrentUserApproved ? (
                              <button
                                disabled
                                style={{
                                  background: '#f1f5f9',
                                  border: '1px solid var(--border)',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  color: 'var(--text-muted)',
                                  cursor: 'not-allowed'
                                }}
                              >
                                Signed by You
                              </button>
                            ) : (
                              <button
                                onClick={() => { setActionBatch(b); setActionType('APPROVE'); }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'var(--success)',
                                  border: 'none',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  color: '#ffffff',
                                  fontWeight: '600'
                                }}
                              >
                                <ThumbsUp size={13} /> Approve
                              </button>
                            )}

                            <button
                              onClick={() => { setActionBatch(b); setActionType('RETURN'); }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#fff7ed',
                                border: '1px solid #fed7aa',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: '#c2410c',
                                fontWeight: '600'
                              }}
                            >
                              <RotateCcw size={13} /> Return
                            </button>

                            <button
                              onClick={() => { setActionBatch(b); setActionType('REJECT'); }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'var(--danger-bg)',
                                border: '1px solid var(--danger)',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: 'var(--danger)',
                                fontWeight: '600'
                              }}
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Decision Modal (Approve / Return / Reject) */}
      {actionBatch && actionType && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', maxWidth: '520px', width: '100%', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--navy)' }}>
                {actionType === 'APPROVE' && 'Confirm District Batch Approval'}
                {actionType === 'RETURN' && 'Return Batch for Correction'}
                {actionType === 'REJECT' && 'Reject Training Batch'}
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Batch: {actionBatch.batchNumber} &bull; {actionBatch.courseName}
              </div>
            </div>

            <form onSubmit={handleActionSubmit} style={{ padding: '24px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {actionType === 'APPROVE' && `You are signing as District Officer (${user.name}). If this is the 2nd approval, the batch will automatically advance to ${actionBatch.totalCandidates > 50 ? 'Quality Review' : 'State Approval'}.`}
                {actionType === 'RETURN' && 'Specify the exact discrepancies or records that need correction. The Training Centre will be able to edit and resubmit.'}
                {actionType === 'REJECT' && 'Rejecting a batch is a permanent administrative decision. A mandatory explanation is required.'}
              </p>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  {actionType === 'APPROVE' ? 'Officer Verification Comments (Optional)' : 'Mandatory Explanation / Reason'}
                </label>
                <textarea
                  rows={4}
                  required={actionType !== 'APPROVE'}
                  placeholder={actionType === 'APPROVE' ? 'e.g. Infrastructure and trainee biometric logs verified.' : 'Enter detailed reason...'}
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => { setActionBatch(null); setActionType(null); }}
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
                    background: actionType === 'APPROVE' ? 'var(--success)' : actionType === 'RETURN' ? '#c2410c' : 'var(--danger)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  {submitting ? 'Recording...' : `Confirm ${actionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details / Inspection Modal */}
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
