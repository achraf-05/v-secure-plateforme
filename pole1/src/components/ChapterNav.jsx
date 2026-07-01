import React from 'react'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ChapterNav({ chapters, onSeek, currentTime }) {
  if (!chapters.length) return null

  return (
    <div style={{
      background: '#111827',
      borderRadius: '8px',
      padding: '12px 14px',
      border: '1px solid #1f2937',
    }}>
      <p style={{
        margin: '0 0 10px',
        fontSize: '11px',
        fontWeight: 700,
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        Chapitres
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {chapters.map((chapter) => {
          const isActive = currentTime >= chapter.start && currentTime < chapter.end
          return (
            <button
              key={chapter.id}
              onClick={() => onSeek(chapter.start)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '7px 10px',
                background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                border: isActive ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                borderRadius: '6px',
                color: isActive ? '#93c5fd' : '#9ca3af',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                  e.currentTarget.style.color = '#d1d5db'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#9ca3af'
                }
              }}
            >
              <span style={{
                fontSize: '11px',
                color: '#f59e0b',
                fontFamily: 'monospace',
                minWidth: '34px',
                flexShrink: 0,
              }}>
                {formatTime(chapter.start)}
              </span>
              <span style={{ fontSize: '13px', fontWeight: isActive ? 600 : 400 }}>
                {chapter.title}
              </span>
              {isActive && (
                <span style={{
                  marginLeft: 'auto',
                  width: '6px',
                  height: '6px',
                  background: '#3b82f6',
                  borderRadius: '50%',
                  flexShrink: 0,
                }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
