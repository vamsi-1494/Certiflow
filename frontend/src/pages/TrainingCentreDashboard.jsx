import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import StatCard from '../components/StatCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import CreateBatchModal from '../components/CreateBatchModal.jsx';
import UploadModal from '../components/UploadModal.jsx';
import BatchDetailsModal from '../components/BatchDetailsModal.jsx';
import { Layers, Clock, AlertTriangle, CheckCircle, Plus, Upload, Eye, Send, Search, RefreshCw } from 'lucide-react';

export default function TrainingCentreDashboard() {
  const [batches, setBatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUploadBatch, setSelectedUploadBatch] = useState(null);
  const [selectedDetailsBatch, setSelectedDetailsBatch] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [batchesRes, statsRes] = await Promise.all([
        api.get('/batches'),
        api.get('/batches/stats')
      ]);
      setBatches(batchesRes.data.data);
      setStats(statsRes.data.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSubmitBatch = async (batchId) => {
    if (!window.confirm('Are you sure you want to submit this batch for District Officer dual-approval?')) {
      return;
    }
    try {
      const res = await api.post(`/batches/${batchId}/submit`);
      setActionMessage(res.data.message);
      fetchDashboardData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const filteredBatches = batches.filter((b) => {
    const matchesSearch = b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.courseCode.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'DRAFT') return b.status === 'DRAFT';
    if (filterStatus === 'IN_REVIEW') return ['SUBMITTED', 'DISTRICT_REVIEW', 'QUALITY_REVIEW', 'STATE_APPROVAL'].includes(b.status);
    if (filterStatus === 'RETURNED') return b.status === 'RETURNED_FOR_CORRECTION';
    if (filterStatus === 'ISSUED') return ['APPROVED', 'ISSUED'].includes(b.status);
    return true;
  });

  return (
    <div>
      {/* Top Banner & Stats */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--navy)' }}>
            Training Centre Management Portal
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Apex Skill Development Centre (TC-BPL-001) &bull; Logged in as <strong>Anika Sharma</strong>
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '13px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <Plus size={16} /> Create New Batch
        </button>
      </div>

      {actionMessage && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: 'var(--success)', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} /> {actionMessage}
        </div>
      )}

      {/* Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <StatCard
          title="Total Batches"
          value={stats?.totalBatches || batches.length}
          icon={Layers}
          color="var(--primary)"
          subtitle="Enrolled programme batches"
        />
        <StatCard
          title="Under Review"
          value={stats?.inReviewBatches || batches.filter(b => ['SUBMITTED', 'DISTRICT_REVIEW', 'QUALITY_REVIEW', 'STATE_APPROVAL'].includes(b.status)).length}
          icon={Clock}
          color="#d97706"
          subtitle="Pending district or state approval"
        />
        <StatCard
          title="Action Required"
          value={stats?.returnedBatches || batches.filter(b => b.status === 'RETURNED_FOR_CORRECTION').length}
          icon={AlertTriangle}
          color="var(--danger)"
          subtitle="Returned for candidate correction"
        />
        <StatCard
          title="Issued / Approved"
          value={stats?.approvedBatches || batches.filter(b => ['APPROVED', 'ISSUED'].includes(b.status)).length}
          icon={CheckCircle}
          color="var(--success)"
          subtitle="Certificates generated"
        />
      </div>

      {/* Batches Table Card */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        {/* Table Filters & Search */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Batches' },
              { id: 'DRAFT', label: 'Drafts' },
              { id: 'IN_REVIEW', label: 'Under Review' },
              { id: 'RETURNED', label: 'Returned for Correction' },
              { id: 'ISSUED', label: 'Issued' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: filterStatus === tab.id ? '1px solid var(--primary)' : '1px solid transparent',
                  background: filterStatus === tab.id ? 'var(--primary-subtle)' : 'transparent',
                  color: filterStatus === tab.id ? 'var(--primary-dark)' : 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: filterStatus === tab.id ? '600' : '500'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search batch or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                fontSize: '13px'
              }}
            />
          </div>
        </div>

        {/* Batches Table */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading batch records...
          </div>
        ) : filteredBatches.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <Layers size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--navy)' }}>No batches found</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {filterStatus !== 'ALL' ? 'Try clearing your filter selection.' : 'Click "Create New Batch" to get started.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  <th style={{ padding: '12px 18px', fontWeight: '600' }}>Batch ID & Code</th>
                  <th style={{ padding: '12px 18px', fontWeight: '600' }}>Course Name</th>
                  <th style={{ padding: '12px 18px', fontWeight: '600' }}>Candidates</th>
                  <th style={{ padding: '12px 18px', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px 18px', fontWeight: '600' }}>Round</th>
                  <th style={{ padding: '12px 18px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ fontWeight: '700', color: 'var(--navy)' }}>{b.batchNumber}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.courseCode}</div>
                    </td>
                    <td style={{ padding: '12px 18px', fontWeight: '500' }}>
                      {b.courseName}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{ fontWeight: '600' }}>{b.totalCandidates || b.candidates?.length || 0}</span> candidates
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <StatusBadge status={b.status} />
                      {b.status === 'RETURNED_FOR_CORRECTION' && (
                        <div style={{ fontSize: '11px', color: '#c2410c', marginTop: '2px', fontWeight: '500' }}>
                          Correction Needed
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                        Round {b.currentApprovalRound || 1}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => setSelectedDetailsBatch(b)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#ffffff',
                            border: '1px solid var(--border)',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: 'var(--text-main)'
                          }}
                        >
                          <Eye size={13} /> View
                        </button>

                        {(b.status === 'DRAFT' || b.status === 'RETURNED_FOR_CORRECTION') && (
                          <button
                            onClick={() => setSelectedUploadBatch(b)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'var(--primary-subtle)',
                              border: '1px solid var(--primary-light)',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              color: 'var(--primary-dark)',
                              fontWeight: '600'
                            }}
                          >
                            <Upload size={13} /> Upload CSV
                          </button>
                        )}

                        {b.status === 'DRAFT' && (b.totalCandidates > 0 || b.candidates?.length > 0) && (
                          <button
                            onClick={() => handleSubmitBatch(b.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'var(--primary)',
                              border: 'none',
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              color: '#ffffff',
                              fontWeight: '600'
                            }}
                          >
                            <Send size={13} /> Submit
                          </button>
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

      {/* Modals */}
      {showCreateModal && (
        <CreateBatchModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newBatch) => {
            setShowCreateModal(false);
            fetchDashboardData();
            setSelectedUploadBatch(newBatch);
          }}
        />
      )}

      {selectedUploadBatch && (
        <UploadModal
          batch={selectedUploadBatch}
          onClose={() => setSelectedUploadBatch(null)}
          onSuccess={() => {
            setSelectedUploadBatch(null);
            fetchDashboardData();
          }}
        />
      )}

      {selectedDetailsBatch && (
        <BatchDetailsModal
          batch={selectedDetailsBatch}
          onClose={() => setSelectedDetailsBatch(null)}
          onRefresh={fetchDashboardData}
        />
      )}
    </div>
  );
}
