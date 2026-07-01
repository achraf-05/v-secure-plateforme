import React, { useState, useRef, useEffect } from 'react'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function CommentFeed({
  comments,
  currentTime,
  onSend,
  author,
  onSeek,   // ✅ AJOUT IMPORTANT
}) {
  const [text, setText] = useState('')
  const feedRef = useRef(null)

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [comments])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend({ text: trimmed, timestamp: currentTime, author })
    setText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px', minHeight: 0 }}>

      <p style={{
        margin: 0,
        fontSize: '11px',
        fontWeight: 700,
        color: '#6b7280',
        textTransform: 'uppercase',
      }}>
        Commentaires temps réel
      </p>

      {/* FEED */}
      <div
        ref={feedRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {comments.length === 0 && (
          <div style={{ color: '#6b7280', textAlign: 'center' }}>
            Aucun commentaire
          </div>
        )}

        {comments.map((c) => (
          <div
            key={c.id}
            onClick={() => onSeek?.(c.timestamp)}   // ✅ IMPORTANT
            style={{
              background: '#111827',
              border: '1px solid #1f2937',
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer', // ✅ IMPORTANT
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '5px',
            }}>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                {c.author}
              </span>

              <span style={{
                fontSize: '11px',
                color: '#f59e0b',
                fontFamily: 'monospace',
              }}>
                @ {formatTime(c.timestamp)}
              </span>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#d1d5db' }}>
              {c.text}
            </p>
          </div>
        ))}
      </div>

      {/* INPUT */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Commenter à ${formatTime(currentTime)}…`}
          style={{
            flex: 1,
            padding: '9px',
            background: '#111827',
            border: '1px solid #374151',
            color: '#fff',
          }}
        />

        <button onClick={handleSend} disabled={!text.trim()}>
          Envoyer
        </button>
      </div>
    </div>
  )
}