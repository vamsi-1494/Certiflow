import React from 'react';

const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  SUBMITTED: { label: 'Submitted', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
  DISTRICT_REVIEW: { label: 'District Review', bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
  DISTRICT_APPROVED: { label: 'District Approved', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  QUALITY_REVIEW: { label: 'Quality Review', bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe' },
  QUALITY_REJECTED: { label: 'Quality Rejected', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
  STATE_APPROVAL: { label: 'State Approval', bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' },
  APPROVED: { label: 'Approved', bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  CERTIFICATE_GENERATION: { label: 'Generating Certs', bg: '#fdf4ff', color: '#a21caf', border: '#f5d0fe' },
  ISSUED: { label: 'Certificates Issued', bg: '#dcfce7', color: '#166534', border: '#4ade80' },
  RETURNED_FOR_CORRECTION: { label: 'Returned for Correction', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  REJECTED: { label: 'Rejected', bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
  CANCELLED: { label: 'Cancelled', bg: '#fef2f2', color: '#991b1b', border: '#f87171' }
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        whiteSpace: 'nowrap'
      }}
    >
      {config.label}
    </span>
  );
}
