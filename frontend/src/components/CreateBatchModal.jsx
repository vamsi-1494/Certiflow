import React, { useState } from 'react';
import api from '../services/api.js';
import { X, PlusCircle } from 'lucide-react';

const PRESET_COURSES = [
  { name: 'Solar Panel Installation Technician', code: 'SPIT-101' },
  { name: 'Healthcare General Duty Assistant', code: 'GDA-202' },
  { name: 'Electric Vehicle Service Specialist', code: 'EVSS-303' },
  { name: 'Data Entry & Office Automation', code: 'DEOA-104' },
  { name: 'Telecom Tower Technician', code: 'TTT-107' }
];

export default function CreateBatchModal({ onClose, onSuccess }) {
  const [courseName, setCourseName] = useState(PRESET_COURSES[0].name);
  const [courseCode, setCourseCode] = useState(PRESET_COURSES[0].code);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleCourseChange = (e) => {
    const selected = PRESET_COURSES.find(c => c.name === e.target.value);
    if (selected) {
      setCourseName(selected.name);
      setCourseCode(selected.code);
    } else {
      setCourseName(e.target.value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post('/batches', { courseName, courseCode });
      onSuccess(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

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
          maxWidth: '520px',
          width: '100%',
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--navy)' }}>
            Create New Training Batch
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--navy)', marginBottom: '6px' }}>
              Select Approved Course
            </label>
            <select
              value={courseName}
              onChange={handleCourseChange}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '14px', background: '#fff' }}
            >
              {PRESET_COURSES.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--navy)', marginBottom: '6px' }}>
              Course Code
            </label>
            <input
              type="text"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '14px' }}
            />
          </div>

          <div style={{ background: 'var(--bg-page)', padding: '12px 16px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            <strong>Note:</strong> The batch will be created in <strong>DRAFT</strong> status. You can upload candidate spreadsheets immediately after creation.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', background: '#ffffff', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: '#ffffff', fontSize: '13px', fontWeight: '600' }}
            >
              {submitting ? 'Creating...' : 'Create Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
