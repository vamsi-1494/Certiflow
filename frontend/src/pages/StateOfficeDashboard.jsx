import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatCard from '../components/StatCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import BatchDetailsModal from '../components/BatchDetailsModal.jsx';
import NotificationModal from '../components/NotificationModal.jsx';
import { Award, Clock, AlertOctagon, CheckCircle, ShieldAlert, FileText, Ban, Eye, Search, Layers, Activity, MessageSquare } from 'lucide-react';

export default function StateOfficeDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({ stats: null, pendingBatches: [], overdueBatches: [], recentCertificates: [] });
  const [auditLogs, setAuditLogs] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [activeTab, setActiveTab] = useState('PENDING'); // PENDING, CERTIFICATES, AUDIT_LOGS, OVERDUE
  const [loading, setLoading] = useState(true);
  const [showNotifModal, setShowNotifModal] = useState(false);

  // Modals & Action States
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [actionBatch, setActionBatch] = useState(null);
  const [actionType, setActionType] = useState(null); // 'APPROVE' or 'REJECT'
  const [reasonInput, setReasonInput] = useState('');

  // Cancellation Modal
  const [cancelCertTarget, setCancelCertTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [auditSearch, setAuditSearch] = useState('');

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [dashRes, certsRes, logsRes] = await Promise.all([
        api.get('/state/dashboard'),
        api.get('/state/certificates'),
        api.get('/state/audit-logs')
      ]);
      setData(dashRes.data.data);
      setCertificates(certsRes.data.data);
      setAuditLogs(logsRes.data.data);
    } catch (err) {
      console.error('Failed to load state dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  const handleBatchDecision = async (e) => {
    e.preventDefault();
    if (!actionBatch || !actionType) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      let res;
      if (actionType === 'APPROVE') {
        res = await api.post(`/state/batches/${actionBatch.id}/approve`, { comments: reasonInput });
      } else {
        res = await api.post(`/state/batches/${actionBatch.id}/reject`, { reason: reasonInput });
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

  const handleCancelCertificate = async (e) => {
    e.preventDefault();
    if (!cancelCertTarget || !cancelReason) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.post(`/state/certificates/${cancelCertTarget.id}/cancel`, {
        reason: cancelReason
      });
      setFeedback({ success: true, message: res.data.data.message });
      setCancelCertTarget(null);
      setCancelReason('');
      fetchDashboard();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      setFeedback({ success: false, message: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLogs = auditLogs.filter(l => {
    if (!auditSearch) return true;
    const q = auditSearch.toLowerCase();
    return (l.action && l.action.toLowerCase().includes(q)) ||
           (l.batchId && l.batchId.toLowerCase().includes(q)) ||
           (l.reason && l.reason.toLowerCase().includes(q)) ||
           (l.role && l.role.toLowerCase().includes(q));
  });

  return (
    <div>
      {/* Top Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--navy)' }}>
            State Office Executive Governance Portal
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Pragati Skills Mission Central Directorate &bull; Logged in as <strong>{user.name}</strong> (State Approver & Revocation Officer)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowNotifModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#dcfce7',
              border: '1px solid #bbf7d0',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#16a34a'
            }}
          >
            <MessageSquare size={14} /> WhatsApp Gateway Monitor
          </button>
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={14} /> Final Issuance Authority & Compliance Audit
          </div>
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
          {feedback.success ? <CheckCircle size={18} /> : <ShieldAlert size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <StatCard
          title="Awaiting Final Sign-off"
          value={data.stats?.pendingFinalApproval || data.pendingBatches?.length || 0}
          icon={Clock}
          color="#d97706"
          subtitle="Passed District & QA review"
        />
        <StatCard
          title="Issued Certificates"
          value={data.stats?.issuedCertificatesCount || 0}
          icon={Award}
          color="var(--success)"
          subtitle="Active verified credentials"
        />
        <StatCard
          title="Revoked Certificates"
          value={data.stats?.cancelledCertificatesCount || 0}
          icon={Ban}
          color="var(--danger)"
          subtitle="Cancelled for compliance audits"
        />
        <StatCard
          title="SLA Overdue Batches"
          value={data.stats?.overdueCount || 0}
          icon={AlertOctagon}
          color="#ea580c"
          subtitle="Pending > 48 hours in queue"
        />
      </div>

      {/* Navigation Tabs */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px', flexWrap: 'wrap', background: 'var(--bg-page)' }}>
          {[
            { id: 'PENDING', label: `Pending Final Approval (${data.pendingBatches?.length || 0})`, icon: Clock },
            { id: 'CERTIFICATES', label: `Certificate Management & Revocation (${certificates.length})`, icon: Award },
            { id: 'AUDIT_LOGS', label: `Compliance Audit Log Explorer (${auditLogs.length})`, icon: Activity },
            { id: 'OVERDUE', label: `Overdue SLA Alerts (${data.overdueBatches?.length || 0})`, icon: AlertOctagon }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: isActive ? '1px solid var(--primary)' : '1px solid transparent',
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? 'var(--primary-dark)' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '500',
                  boxShadow: isActive ? 'var(--shadow-sm)' : 'none'
                }}
              >
                <Icon size={14} color={isActive ? 'var(--primary)' : '#64748b'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Batches Pending State Final Approval */}
        {activeTab === 'PENDING' && (
          <div>
            {data.pendingBatches?.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                <CheckCircle size={36} color="var(--success)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--navy)' }}>All Pending Batches Cleared</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  No batches currently waiting for state final approval.
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                    <tr>
                      <th style={{ padding: '12px 18px', fontWeight: '600' }}>Batch Number</th>
                      <th style={{ padding: '12px 18px', fontWeight: '600' }}>Training Centre & District</th>
                      <th style={{ padding: '12px 18px', fontWeight: '600' }}>Course & Size</th>
                      <th style={{ padding: '12px 18px', fontWeight: '600' }}>Clearance Pipeline</th>
                      <th style={{ padding: '12px 18px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pendingBatches.map((b) => (
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
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            <strong>{b.totalCandidates || b.candidates?.length || 0}</strong> candidates
                          </div>
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '11px', background: 'var(--success-bg)', color: 'var(--success)', padding: '2px 8px', borderRadius: '4px', fontWeight: '600', width: 'fit-content' }}>
                              ✓ 2/2 District Approvals
                            </span>
                            {(b.totalCandidates || 0) > 50 && (
                              <span style={{ fontSize: '11px', background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: '4px', fontWeight: '600', width: 'fit-content' }}>
                                ✓ Quality Review Cleared
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => setSelectedBatch(b)}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}
                            >
                              <Eye size={13} /> Inspect
                            </button>

                            <button
                              onClick={() => { setActionBatch(b); setActionType('APPROVE'); }}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--success)', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', color: '#fff', fontWeight: '600' }}
                            >
                              <Award size={13} /> Grant Final Approval
                            </button>

                            <button
                              onClick={() => { setActionBatch(b); setActionType('REJECT'); }}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--danger-bg)', border: '1px solid var(--danger)', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', color: 'var(--danger)', fontWeight: '600' }}
                            >
                              Reject
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
        )}

        {/* Tab 2: Certificate Management & Revocation */}
        {activeTab === 'CERTIFICATES' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  <th style={{ padding: '12px 18px', fontWeight: '600' }}>Certificate #</th>
                  <th style={{ padding: '12px 18px', fontWeight: '600' }}>Candidate Name</th>
                  <th style={{ padding: '12px 18px', fontWeight: '600' }}>Course & Batch</th>
                  <th style={{ padding: '12px 18px', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px 18px', fontWeight: '600' }}>Issue Date</th>
                  <th style={{ padding: '12px 18px', fontWeight: '600', textAlign: 'right' }}>Revocation Action</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', background: c.status === 'CANCELLED' ? '#fff5f5' : '#fff' }}>
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ fontWeight: '700', color: 'var(--navy)' }}>{c.certificateNumber}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Code: {c.verificationCode}</div>
                    </td>
                    <td style={{ padding: '12px 18px', fontWeight: '600' }}>
                      {c.candidate?.fullName || c.candidateName}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <div>{c.batch?.courseName || c.courseName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.batch?.batchNumber || c.batchNumber}</div>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <StatusBadge status={c.status} />
                      {c.status === 'CANCELLED' && c.cancellationReason && (
                        <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '2px', maxWidth: '240px' }}>
                          Reason: {c.cancellationReason}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 18px', color: 'var(--text-muted)' }}>
                      {new Date(c.issueDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      {c.status === 'ISSUED' ? (
                        <button
                          onClick={() => setCancelCertTarget(c)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#fee2e2',
                            border: '1px solid #fecaca',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: 'var(--danger)',
                            fontWeight: '600'
                          }}
                        >
                          <Ban size={12} /> Revoke / Cancel
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                          Revoked on {c.cancelledAt ? new Date(c.cancelledAt).toLocaleDateString() : 'N/A'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Compliance Audit Log Explorer */}
        {activeTab === 'AUDIT_LOGS' && (
          <div>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-page)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--navy)' }}>
                Immutable Audit Trail (Append-Only Compliance Ledger)
              </div>
              <div style={{ position: 'relative', minWidth: '240px' }}>
                <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Filter logs by action, role, reason..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px 6px 30px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px' }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '520px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '10px 14px' }}>Timestamp</th>
                    <th style={{ padding: '10px 14px' }}>Action</th>
                    <th style={{ padding: '10px 14px' }}>Actor (Role)</th>
                    <th style={{ padding: '10px 14px' }}>Batch / Cert Target</th>
                    <th style={{ padding: '10px 14px' }}>State Transition</th>
                    <th style={{ padding: '10px 14px' }}>Reason / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontWeight: '700', color: 'var(--navy)', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div>{log.user?.name || log.role || 'System'}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{log.role}</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <code>{log.batchId || log.certificateId || '-'}</code>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {log.previousState && log.newState ? (
                          <span><code>{log.previousState}</code> &rarr; <code>{log.newState}</code></span>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', maxWidth: '280px', color: log.reason ? 'var(--navy)' : 'var(--text-muted)' }}>
                        {log.reason || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Overdue Batches */}
        {activeTab === 'OVERDUE' && (
          <div>
            {data.overdueBatches?.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                <CheckCircle size={36} color="var(--success)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--navy)' }}>Zero Overdue SLA Breaches</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  All batches across all districts are operating within the 48-hour processing window.
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                    <tr>
                      <th style={{ padding: '12px 18px', fontWeight: '600' }}>Batch Number</th>
                      <th style={{ padding: '12px 18px', fontWeight: '600' }}>District & Centre</th>
                      <th style={{ padding: '12px 18px', fontWeight: '600' }}>Queue Status</th>
                      <th style={{ padding: '12px 18px', fontWeight: '600' }}>SLA Delay</th>
                      <th style={{ padding: '12px 18px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.overdueBatches.map((b) => (
                      <tr key={b.id} style={{ borderBottom: '1px solid var(--border)', background: '#fffbeb' }}>
                        <td style={{ padding: '12px 18px', fontWeight: '700', color: 'var(--navy)' }}>
                          {b.batchNumber}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <div>{b.trainingCentre?.name || b.trainingCentreName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.district?.name || b.districtName}</div>
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <StatusBadge status={b.status} />
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                            &gt; 48 HOURS STALLED
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                          <button
                            onClick={() => setSelectedBatch(b)}
                            style={{ background: '#fff', border: '1px solid var(--border)', padding: '5px 10px', borderRadius: '6px', fontSize: '12px' }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Batch Decision Modal */}
      {actionBatch && actionType && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', maxWidth: '520px', width: '100%', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--navy)' }}>
                {actionType === 'APPROVE' ? 'Grant Final State Approval' : 'Reject Batch at State Level'}
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Batch: {actionBatch.batchNumber} &bull; {actionBatch.courseName}
              </div>
            </div>

            <form onSubmit={handleBatchDecision} style={{ padding: '24px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {actionType === 'APPROVE'
                  ? 'Granting final approval triggers automated background certificate generation and simulated WhatsApp notification dispatch for all verified candidates.'
                  : 'Rejecting this batch at the State level stops certificate issuance permanently.'}
              </p>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  {actionType === 'APPROVE' ? 'Executive Order Comments (Optional)' : 'Mandatory State Rejection Reason'}
                </label>
                <textarea
                  rows={4}
                  required={actionType !== 'APPROVE'}
                  placeholder={actionType === 'APPROVE' ? 'e.g. State Directorate verification verified. Approved for certificate issuance.' : 'Enter detailed rejection finding...'}
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
                    background: actionType === 'APPROVE' ? 'var(--success)' : 'var(--danger)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  {submitting ? 'Processing...' : `Confirm ${actionType === 'APPROVE' ? 'Final Approval' : 'Rejection'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Certificate Revocation Modal (Exception 4) */}
      {cancelCertTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', maxWidth: '520px', width: '100%', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', background: 'var(--danger-bg)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--danger)' }}>
                Revoke Certificate (Administrative Order)
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--danger)' }}>
                Target: {cancelCertTarget.certificateNumber} &bull; Candidate: {cancelCertTarget.candidate?.fullName || cancelCertTarget.candidateName}
              </div>
            </div>

            <form onSubmit={handleCancelCertificate} style={{ padding: '24px' }}>
              <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '6px', padding: '12px', fontSize: '12px', color: '#9f1239', marginBottom: '16px' }}>
                <strong>Exception 4 Compliance:</strong> The certificate record and generated PDF will NOT be deleted. Its status will change to <code>CANCELLED</code>, and public verification will immediately report it as cancelled.
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Mandatory Revocation Reason
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Duplicate Aadhaar identified during State Vigilance audit, or invalid training centre attendance records."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setCancelCertTarget(null)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', background: '#fff', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: 'var(--danger)', color: '#ffffff', fontSize: '13px', fontWeight: '600' }}
                >
                  {submitting ? 'Revoking...' : 'Revoke Certificate Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Gateway Modal */}
      {showNotifModal && (
        <NotificationModal onClose={() => setShowNotifModal(false)} />
      )}

      {/* Batch Inspection Modal */}
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
