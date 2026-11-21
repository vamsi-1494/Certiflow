import React from 'react';

export default function StatCard({ title, value, icon: Icon, color = 'var(--primary)', subtitle }) {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <div>
        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>{title}</div>
        <div style={{ fontSize: '26px', fontWeight: '700', color: 'var(--navy)', marginTop: '4px' }}>{value}</div>
        {subtitle && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{subtitle}</div>}
      </div>
      {Icon && (
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            backgroundColor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Icon size={24} color={color} />
        </div>
      )}
    </div>
  );
}
