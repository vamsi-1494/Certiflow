import React, { useState } from 'react';
import api from '../services/api.js';
import StatusBadge from './StatusBadge.jsx';
import { X, AlertCircle, Edit2, Check, RefreshCw, Send } from 'lucide-react';

export default function BatchDetailsModal({ batch, onClose, onRefresh }) {
  const [editingCandidateId, setEditingCandidateId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const startEdit = (candidate) => {
    setEditingCandidateId(candidate.id);
    setEditForm({
      fullName: candidate.fullName,
      mobileNumber: candidate.mobileNumber,
      aadhaarLast4: candidate.aadhaarLast4,
      dateOfBirth: candidate.dateOfBirth?.split('T')[0] || candidate.dateOfBirth
    });
  };

  const handleSaveCandidate = async (candidateId) => {
    setSaving(true);
    setError(null);
    try {
      await api.put(`/batches/${batch.id}/candidates/${candidateId}`, editForm);
      setMessage('Candidate details updated successfully.');
      setEditingCandidateId(null);
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResubmit = async () => {
    setResubmitting(true);
    setError(null);
    try {
      const res = await api.post(`/batches/${batch.id}/resubmit`);
      setMessage(res.data.message);
      setTimeout(() => {
        onRefresh();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setResubmitting(false);
    }
  };

  const isReturned = batch.status === 'RETURNED_FOR_CORRECTION';
  const isDraft = batch.status === 'DRAFT';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 1000
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--navy)' }}>
                {batch.batchNumber}
              </h3>
              <StatusBadge status={batch.status} />
              {batch.currentApprovalRound > 1 && (
                <span style={{ fontSize: '11px', background: '#e2e8f0', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
                  Round {batch.currentApprovalRound}
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Course: {batch.courseName} ({batch.courseCode}) &bull; Candidates: {batch.totalCandidates || batch.candidates?.length || 0}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* Notification Banners */}
          {message && (
            <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: 'var(--success)' }}>
              {message}
            </div>
          )}
          {error && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          {/* Returned for Correction Reason Box */}
          {isReturned && (
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c2410c', fontWeight: '700', fontSize: '14px', marginBottom: '6px' }}>
                <AlertCircle size={18} /> Returned by District Officer for Correction
              </div>
              <p style={{ fontSize: '13px', color: '#7c2d12', margin: 0 }}>
                <strong>Officer Reason:</strong> {batch.correctionReason || 'Please inspect candidate records and correct any data discrepancies.'}
              </p>
              <div style={{ fontSize: '12px', color: '#9a3412', marginTop: '8px' }}>
                You can correct the candidates below. Once corrected, click <strong>"Resubmit Batch for Approval"</strong> to start a fresh approval round.
              </div>
            </div>
          )}

          {/* Candidates List Table */}
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--navy)', marginBottom: '12px' }}>
            Registered Candidate Records ({batch.candidates?.length || 0})
          </h4>

          {(!batch.candidates || batch.candidates.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '36px', background: 'var(--bg-page)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No candidate records uploaded yet for this batch.</p>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    <th style={{ padding: '10px 12px' }}>#</th>
                    <th style={{ padding: '10px 12px' }}>Candidate Name</th>
                    <th style={{ padding: '10px 12px' }}>Guardian</th>
                    <th style={{ padding: '10px 12px' }}>DOB</th>
                    <th style={{ padding: '10px 12px' }}>Mobile</th>
                    <th style={{ padding: '10px 12px' }}>Aadhaar (Last 4)</th>
                    {(isReturned || isDraft) && <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {batch.candidates.map((c, i) => {
                    const isEditing = editingCandidateId === c.id;
                    return (
                      <tr key={c.id || i} style={{ borderBottom: '1px solid var(--border)', background: isEditing ? 'var(--primary-subtle)' : '#fff' }}>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '12px' }}>{i + 1}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.fullName}
                              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                              style={{ width: '100%', padding: '4px 8px', fontSize: '12px', border: '1px solid var(--primary)', borderRadius: '4px' }}
                            />
                          ) : (
                            <span style={{ fontWeight: '600' }}>{c.fullName}</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{c.guardianName}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {isEditing ? (
                            <input
                              type="date"
                              value={editForm.dateOfBirth}
                              onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                              style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid var(--primary)', borderRadius: '4px' }}
                            />
                          ) : (
                            c.dateOfBirth?.split('T')[0] || c.dateOfBirth
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.mobileNumber}
                              onChange={(e) => setEditForm({ ...editForm, mobileNumber: e.target.value })}
                              style={{ width: '110px', padding: '4px 8px', fontSize: '12px', border: '1px solid var(--primary)', borderRadius: '4px' }}
                            />
                          ) : (
                            <code>{c.mobileNumber}</code>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.aadhaarLast4}
                              maxLength={4}
                              onChange={(e) => setEditForm({ ...editForm, aadhaarLast4: e.target.value })}
                              style={{ width: '60px', padding: '4px 8px', fontSize: '12px', border: '1px solid var(--primary)', borderRadius: '4px' }}
                            />
                          ) : (
                            <code>XXXX-XXXX-{c.aadhaarLast4}</code>
                          )}
                        </td>
                        {(isReturned || isDraft) && (
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            {isEditing ? (
                              <button
                                onClick={() => handleSaveCandidate(c.id)}
                                disabled={saving}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--success)', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}
                              >
                                <Check size={12} /> Save
                              </button>
                            ) : (
                              <button
                                onClick={() => startEdit(c)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', color: 'var(--text-main)' }}
                              >
                                <Edit2 size={12} /> Correct
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-page)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Batch ID: <code>{batch.id}</code>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', background: '#ffffff', fontSize: '13px' }}
            >
              Close
            </button>
            {isReturned && (
              <button
                onClick={handleResubmit}
                disabled={resubmitting}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: '#ffffff', fontSize: '13px', fontWeight: '600' }}
              >
                <RefreshCw size={14} /> {resubmitting ? 'Resubmitting...' : 'Resubmit Batch for Approval'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
