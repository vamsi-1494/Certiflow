import React, { useState } from 'react';
import api from '../services/api.js';
import { UploadCloud, AlertTriangle, CheckCircle, FileSpreadsheet, X, Download } from 'lucide-react';

export default function UploadModal({ batch, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [validating, setValidating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Sample CSV generator for immediate hackathon demonstration
  const downloadSampleCsv = (isInvalid = false) => {
    let content = `Full Name,Guardian Name,Date of Birth,Gender,Mobile Number,Aadhaar Last 4,Course Code,Training Completion Date\n`;
    if (isInvalid) {
      content += `Aarav Sharma,Sunil Sharma,2001-05-15,Male,9876543210,1234,${batch.courseCode},2026-01-30\n`;
      content += `Priya Patel,Kishore Patel,2002-08-20,Female,12345,5678,${batch.courseCode},2026-01-30\n`; // Bad mobile
      content += `Deepak Kumar,Rajesh Kumar,2000-11-12,Male,9812345678,99,${batch.courseCode},2026-01-30\n`; // Bad Aadhaar
    } else {
      content += `Aarav Sharma,Sunil Sharma,2001-05-15,Male,9876543210,1234,${batch.courseCode},2026-01-30\n`;
      content += `Priya Patel,Kishore Patel,2002-08-20,Female,9823456789,5678,${batch.courseCode},2026-01-30\n`;
      content += `Deepak Kumar,Rajesh Kumar,2000-11-12,Male,9812345678,9012,${batch.courseCode},2026-01-30\n`;
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', isInvalid ? `sample_candidates_invalid.csv` : `sample_candidates_valid.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFile(selected);
    setValidationResult(null);
    setErrorMsg(null);
  };

  const handleValidateOnly = async () => {
    if (!file) return;
    setValidating(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/batches/validate-spreadsheet', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setValidationResult(res.data.data);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message);
    } finally {
      setValidating(false);
    }
  };

  const handleUploadAndSave = async () => {
    if (!file) return;
    setUploading(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/batches/${batch.id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onSuccess(res.data.data);
    } catch (err) {
      if (err.response?.data?.details) {
        setValidationResult(err.response.data.details);
      }
      setErrorMsg(err.response?.data?.message || err.message);
    } finally {
      setUploading(false);
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
          maxWidth: '760px',
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
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--navy)' }}>
              Upload Candidate Spreadsheet &bull; {batch.batchNumber}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Course: {batch.courseName} ({batch.courseCode})
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* Quick Demo Template Helpers */}
          <div style={{ background: 'var(--primary-subtle)', border: '1px solid var(--primary-light)', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary-dark)', marginBottom: '8px' }}>
              Hackathon Evaluation Test Files:
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => downloadSampleCsv(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ffffff',
                  border: '1px solid var(--border)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--success)'
                }}
              >
                <Download size={14} /> Download Valid Sample CSV
              </button>

              <button
                onClick={() => downloadSampleCsv(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ffffff',
                  border: '1px solid var(--border)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--danger)'
                }}
              >
                <Download size={14} /> Download Invalid Sample CSV (Exception 1 Test)
              </button>
            </div>
          </div>

          {/* File Picker */}
          <div style={{ border: '2px dashed var(--border)', borderRadius: '10px', padding: '24px', textAlign: 'center', marginBottom: '20px' }}>
            <FileSpreadsheet size={36} color="var(--primary)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--navy)' }}>
              Choose a CSV or Excel spreadsheet
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Accepted formats: .csv, .xlsx, .xls (Max: 10MB)
            </div>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              style={{ fontSize: '13px' }}
            />
            {file && (
              <div style={{ marginTop: '12px', fontSize: '13px', fontWeight: '600', color: 'var(--primary-dark)' }}>
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          {errorMsg && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Validation Analysis Box */}
          {validationResult && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: 'var(--bg-page)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Rows</div>
                  <div style={{ fontSize: '20px', fontWeight: '700' }}>{validationResult.totalRows}</div>
                </div>
                <div style={{ background: 'var(--success-bg)', padding: '12px', borderRadius: '6px', border: '1px solid var(--success)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--success)', textTransform: 'uppercase' }}>Valid Rows</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--success)' }}>{validationResult.validRows}</div>
                </div>
                <div style={{ background: validationResult.invalidRows > 0 ? 'var(--danger-bg)' : 'var(--bg-page)', padding: '12px', borderRadius: '6px', border: `1px solid ${validationResult.invalidRows > 0 ? 'var(--danger)' : 'var(--border)'}`, textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: validationResult.invalidRows > 0 ? 'var(--danger)' : 'var(--text-muted)', textTransform: 'uppercase' }}>Invalid Rows</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: validationResult.invalidRows > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{validationResult.invalidRows}</div>
                </div>
              </div>

              {validationResult.invalidRows > 0 ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                    <AlertTriangle size={16} /> All-or-Nothing Rule: {validationResult.invalidRows} row(s) failed validation. Batch will NOT be saved until all errors are resolved.
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                      <thead style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                        <tr>
                          <th style={{ padding: '8px 12px' }}>Row #</th>
                          <th style={{ padding: '8px 12px' }}>Field</th>
                          <th style={{ padding: '8px 12px' }}>Value</th>
                          <th style={{ padding: '8px 12px' }}>Error Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResult.errors.map((err, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: '#fff' }}>
                            <td style={{ padding: '8px 12px', fontWeight: '600', color: 'var(--danger)' }}>Row {err.rowNumber}</td>
                            <td style={{ padding: '8px 12px', fontWeight: '500' }}>{err.field}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}><code>{err.value || '(empty)'}</code></td>
                            <td style={{ padding: '8px 12px', color: 'var(--danger)' }}>{err.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: '8px', padding: '12px 16px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}>
                  <CheckCircle size={18} /> All {validationResult.validRows} rows are valid and ready to be imported.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-page)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', background: '#ffffff', fontSize: '13px', fontWeight: '500' }}
          >
            Cancel
          </button>

          <button
            onClick={handleValidateOnly}
            disabled={!file || validating || uploading}
            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--primary)', background: 'var(--primary-subtle)', color: 'var(--primary-dark)', fontSize: '13px', fontWeight: '600' }}
          >
            {validating ? 'Validating...' : 'Dry-Run Validate'}
          </button>

          <button
            onClick={handleUploadAndSave}
            disabled={!file || uploading || (validationResult && validationResult.invalidRows > 0)}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              background: validationResult && validationResult.invalidRows > 0 ? '#94a3b8' : 'var(--primary)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: validationResult && validationResult.invalidRows > 0 ? 'not-allowed' : 'pointer'
            }}
          >
            {uploading ? 'Importing...' : 'Validate & Import Candidates'}
          </button>
        </div>
      </div>
    </div>
  );
}
