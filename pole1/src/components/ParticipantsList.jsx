import React, { useMemo } from 'react'

export default function ParticipantsList({ comments, annotations }) {
  const participants = useMemo(() => {
    const counts = new Map()
    ;[...comments, ...annotations].forEach(item => {
      if (!item?.author) return
      counts.set(item.author, (counts.get(item.author) || 0) + 1)
    })
    return Array.from(counts.entries()).map(([author, count]) => ({ author, count }))
  }, [comments, annotations])

  if (participants.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#374151',
        fontSize: '13px',
        textAlign: 'center',
        padding: '16px 0',
      }}>
        Aucun participant pour l'instant.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {participants.map(({ author, count }) => (
        <div
          key={author}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '7px 10px',
            background: '#0f172a',
            border: '1px solid #1f2937',
            borderRadius: '6px',
          }}
        >
          <span style={{ fontSize: '13px', color: '#d1d5db', fontWeight: 600 }}>
            {author}
          </span>
          <span style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>
            {count} contribution{count > 1 ? 's' : ''}
          </span>
        </div>
      ))}
    </div>
  )
}
