import React, { useState, useRef, useEffect } from 'react'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function CommentFeed({ comments, currentTime, onSend, author }) {
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
        letterSpacing: '0.08em',
      }}>
        Commentaires temps réel
      </p>

      <div
        ref={feedRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingRight: '2px',
        }}
      >
        {comments.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#374151',
            fontSize: '13px',
            textAlign: 'center',
          }}>
            Aucun commentaire.<br />Soyez le premier !
          </div>
        )}

        {comments.map((c) => {
          const isMine = c.author === author
          return (
            <div
              key={c.id}
              style={{
                background: isMine ? 'rgba(37,99,235,0.12)' : '#111827',
                border: isMine ? '1px solid rgba(59,130,246,0.3)' : '1px solid #1f2937',
                borderRadius: '8px',
                padding: '10px 12px',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '5px',
              }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: isMine ? '#60a5fa' : '#9ca3af',
                }}>
                  {c.author}
                </span>
                <span style={{
                  fontSize: '11px',
                  color: '#f59e0b',
                  fontFamily: 'monospace',
                  cursor: 'default',
                }}
                  title={`Timecode : ${formatTime(c.timestamp)}`}
                >
                  @ {formatTime(c.timestamp)}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#d1d5db', lineHeight: 1.5 }}>
                {c.text}
              </p>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Commenter à ${formatTime(currentTime)}…`}
          style={{
            flex: 1,
            padding: '9px 12px',
            background: '#111827',
            border: '1px solid #374151',
            borderRadius: '6px',
            color: '#f3f4f6',
            fontSize: '13px',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
          onBlur={(e) => e.currentTarget.style.borderColor = '#374151'}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          style={{
            padding: '9px 14px',
            background: text.trim() ? '#2563eb' : '#1f2937',
            color: text.trim() ? '#fff' : '#6b7280',
            border: 'none',
            borderRadius: '6px',
            cursor: text.trim() ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            fontWeight: 600,
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          Envoyer
        </button>
      </div>
    </div>
  )
}
