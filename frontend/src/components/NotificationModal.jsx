import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { X, MessageSquare, CheckCheck, AlertTriangle, RefreshCw, Smartphone } from 'lucide-react';

export default function NotificationModal({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/certificates/notifications');
      setNotifications(res.data.data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

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
          maxWidth: '780px',
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#dcfce7', padding: '6px', borderRadius: '8px' }}>
              <MessageSquare size={18} color="#16a34a" />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--navy)' }}>
                Simulated WhatsApp Gateway &bull; Live Delivery Monitor
              </h3>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Powered by BullMQ with Exponential Backoff Retry Simulation
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          <div style={{ background: 'var(--bg-page)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            <strong>Mock Gateway Spec (Exception 3):</strong> Simulates 20% telecom failure rates, carrier delays, and BullMQ automatic retries (up to 3 attempts with exponential backoff).
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Loading WhatsApp delivery receipts...
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No WhatsApp messages sent yet. Approve a batch at the State Office to trigger certificate issuance notifications!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notifications.map((n) => {
                const isDelivered = n.status === 'DELIVERED';
                return (
                  <div
                    key={n.id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '14px',
                      background: isDelivered ? '#ffffff' : '#fff5f5'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Smartphone size={16} color="var(--primary)" />
                        <span style={{ fontWeight: '700', fontSize: '13px' }}>{n.recipientPhone}</span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: isDelivered ? 'var(--success-bg)' : 'var(--danger-bg)',
                            color: isDelivered ? 'var(--success)' : 'var(--danger)'
                          }}
                        >
                          {n.status} (Attempt {n.attempts || 1}/3)
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(n.lastAttemptAt || n.createdAt).toLocaleTimeString()}
                      </div>
                    </div>

                    <pre style={{ background: 'var(--bg-page)', padding: '10px', borderRadius: '6px', fontSize: '11px', whiteSpace: 'pre-wrap', border: '1px solid var(--border)', fontFamily: 'inherit', color: 'var(--text-main)' }}>
                      {n.messageBody}
                    </pre>

                    {n.failureReason && (
                      <div style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '6px', fontWeight: '500' }}>
                        Error Notice: {n.failureReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-page)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={fetchNotifications}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}
          >
            <RefreshCw size={13} /> Refresh Gateway Logs
          </button>
          <button
            onClick={onClose}
            style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
