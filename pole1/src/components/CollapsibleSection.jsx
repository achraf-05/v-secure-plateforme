import React from 'react'

export default function CollapsibleSection({ title, isOpen, onToggle, children, toggleLabels }) {
  const labels = toggleLabels || { open: 'Masquer', closed: 'Afficher' }

  return (
    <div>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left',
          background: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '6px',
          padding: '8px 14px',
          fontSize: '13px',
          color: '#d1d5db',
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#111827'
        }}
      >
        <span>{title}</span>
        <span style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isOpen ? labels.open : labels.closed}
        </span>
      </button>

      <div className="collapsible-content" data-open={isOpen}>
        <div className="collapsible-inner">{children}</div>
      </div>

      <style>{`
        .collapsible-content {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 220ms ease;
        }
        .collapsible-content[data-open="true"] {
          grid-template-rows: 1fr;
        }
        .collapsible-inner {
          min-height: 0;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}
