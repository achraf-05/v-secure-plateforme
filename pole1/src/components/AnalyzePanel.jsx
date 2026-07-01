import React, { useState, forwardRef, useImperativeHandle } from 'react'

const ANALYZE_URL = 'http://localhost:8000/analyze/hls'

const AnalyzePanel = forwardRef(function AnalyzePanel({ onChaptersLoaded }, ref) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(ANALYZE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setResult(data)
      onChaptersLoaded(Array.isArray(data.chapters) ? data.chapters : [])
    } catch {
      setError("Service d'analyse indisponible — les chapitres resteront vides.")
      onChaptersLoaded([])
    } finally {
      setLoading(false)
    }
  }

  useImperativeHandle(ref, () => ({
    analyze: handleAnalyze,
  }))

  return (
    <div style={{
      background: '#111827',
      borderRadius: '8px',
      padding: '12px 14px',
      border: '1px solid #1f2937',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          style={{
            padding: '8px 18px',
            background: loading ? '#374151' : '#7c3aed',
            color: loading ? '#9ca3af' : '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#6d28d9' }}
          onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#7c3aed' }}
        >
          {loading && (
            <span style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              border: '2px solid #9ca3af',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          )}
          {loading ? 'Analyse en cours…' : '⚡ Analyser la vidéo'}
        </button>

        {error && (
          <span style={{ fontSize: '12px', color: '#f87171', maxWidth: '260px' }}>
            {error}
          </span>
        )}
      </div>

      {result && (
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {result.summary && (
            <div>
              <p style={{
                margin: '0 0 5px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                Résumé
              </p>
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: '#d1d5db',
                lineHeight: 1.6,
                background: '#0f172a',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #1e293b',
              }}>
                {result.summary}
              </p>
            </div>
          )}

          {Array.isArray(result.keywords) && result.keywords.length > 0 && (
            <div>
              <p style={{
                margin: '0 0 6px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                Mots-clés
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {result.keywords.map((kw, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '3px 10px',
                      background: 'rgba(109,40,217,0.2)',
                      color: '#c4b5fd',
                      borderRadius: '999px',
                      fontSize: '12px',
                      border: '1px solid rgba(109,40,217,0.4)',
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(result.chapters) && result.chapters.length > 0 && (
            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
              {result.chapters.length} chapitre{result.chapters.length > 1 ? 's' : ''} détecté{result.chapters.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
})

export default AnalyzePanel
