import React, { useState, useRef } from 'react'

const INGEST_URL = 'http://localhost:8000/ingest'

export default function UploadPanel({ onIngested }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const fileInputRef = useRef(null)

  const resetStatus = () => {
    setError(null)
    setSuccess(false)
  }

  const handleIngestResponse = async (res) => {
    if (!res.ok) {
      let detail = `HTTP ${res.status}`
      try {
        const data = await res.json()
        if (data && data.detail) detail = data.detail
      } catch {
        // ignore JSON parse failure, keep default detail
      }
      throw new Error(detail)
    }
    return res.json()
  }

  const ingestFile = async (file) => {
    resetStatus()
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(INGEST_URL, {
        method: 'POST',
        body: formData,
      })
      await handleIngestResponse(res)
      setSuccess(true)
      onIngested?.()
    } catch (err) {
      setError(err.message || "Échec de l'ingestion de la vidéo.")
    } finally {
      setLoading(false)
    }
  }

  const ingestUrl = async (url) => {
    resetStatus()
    setLoading(true)
    try {
      const res = await fetch(INGEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      await handleIngestResponse(res)
      setSuccess(true)
      onIngested?.()
    } catch (err) {
      setError(err.message || "Échec de l'ingestion de la vidéo.")
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) ingestFile(file)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    if (loading) return
    const file = e.dataTransfer.files?.[0]
    if (file) ingestFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleUrlSubmit = (e) => {
    e.preventDefault()
    if (!urlValue.trim() || loading) return
    ingestUrl(urlValue.trim())
  }

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
        Charger une nouvelle vidéo
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div
          onClick={() => !loading && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          style={{
            padding: '14px',
            background: '#0f172a',
            border: '1px dashed #374151',
            borderRadius: '6px',
            textAlign: 'center',
            fontSize: '13px',
            color: loading ? '#4b5563' : '#9ca3af',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'border-color 0.15s',
          }}
        >
          Déposer un fichier vidéo ici, ou cliquer pour parcourir
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            disabled={loading}
            style={{ display: 'none' }}
          />
        </div>

        <form
          onSubmit={handleUrlSubmit}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <input
            type="text"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            disabled={loading}
            placeholder="Coller une URL vidéo…"
            style={{
              flex: 1,
              padding: '8px 10px',
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '6px',
              color: '#e5e7eb',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={loading || !urlValue.trim()}
            style={{
              padding: '8px 16px',
              background: loading || !urlValue.trim() ? '#374151' : '#7c3aed',
              color: loading || !urlValue.trim() ? '#9ca3af' : '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: loading || !urlValue.trim() ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { if (!loading && urlValue.trim()) e.currentTarget.style.background = '#6d28d9' }}
            onMouseLeave={(e) => { if (!loading && urlValue.trim()) e.currentTarget.style.background = '#7c3aed' }}
          >
            Charger
          </button>
        </form>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              border: '2px solid #9ca3af',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin-upload 0.8s linear infinite',
            }} />
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
              Encodage HLS en cours… (peut prendre jusqu'à 1-2 min)
            </span>
          </div>
        )}

        {error && (
          <span style={{ fontSize: '12px', color: '#f87171' }}>
            {error}
          </span>
        )}

        {success && !loading && (
          <span style={{ fontSize: '12px', color: '#34d399' }}>
            Vidéo chargée avec succès.
          </span>
        )}
      </div>

      <style>{`
        @keyframes spin-upload { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
