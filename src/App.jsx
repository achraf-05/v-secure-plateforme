import React, { useState, useRef, useCallback } from 'react'
import VideoPlayer from './components/VideoPlayer.jsx'
import AnnotationCanvas from './components/AnnotationCanvas.jsx'
import ChapterNav from './components/ChapterNav.jsx'
import CommentFeed from './components/CommentFeed.jsx'
import AnalyzePanel from './components/AnalyzePanel.jsx'
import { useAnnotations } from './hooks/useAnnotations.js'
import { useWebSocket } from './hooks/useWebSocket.js'
import { exportToJSON } from './utils/exportAnnotations.js'

const VIDEO_SRC = 'https://www.w3schools.com/html/mov_bbb.mp4'
const AUTHOR = 'User_' + Math.random().toString(36).slice(2, 6).toUpperCase()

export default function App() {
  const [currentTime, setCurrentTime] = useState(0)
  const [chapters, setChapters] = useState([])
  const playerRef = useRef(null)

  const { annotations, addAnnotation, updateAnnotation } = useAnnotations()

  const { comments, emitAnnotation, emitComment } = useWebSocket({
    onAnnotationCreated: addAnnotation,
    onAnnotationUpdated: updateAnnotation,
  })

 const handleSeek = useCallback((time) => {
  const video = document.querySelector('video')
  if (video) {
    video.currentTime = time
    video.play?.()
  }
}, [])
  const handleAnnotationAdd = useCallback((annotation) => {
    const full = { ...annotation, author: AUTHOR }
    addAnnotation(full)
    emitAnnotation('annotation_created', full)
  }, [addAnnotation, emitAnnotation])

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#0a0a0a',
      color: '#e5e7eb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: 'hidden',
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        gap: '12px',
        overflowY: 'auto',
        minWidth: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f9fafb', letterSpacing: '-0.02em' }}>
            V-Secure <span style={{ color: '#3b82f6' }}>&</span> Collaborate
          </h1>
          <span style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>
            {AUTHOR}
          </span>
        </div>

        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          background: '#000',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        }}>
          <VideoPlayer
            src={VIDEO_SRC}
            onTimeUpdate={setCurrentTime}
            chapters={chapters}
            playerRef={playerRef}
          />
          <AnnotationCanvas
            annotations={annotations}
            currentTime={currentTime}
            onAnnotationAdd={handleAnnotationAdd}
            author={AUTHOR}
          />
        </div>

        <ChapterNav chapters={chapters} onSeek={handleSeek} currentTime={currentTime} />
        <AnalyzePanel onChaptersLoaded={setChapters} />

        <button
          onClick={() => exportToJSON(annotations, VIDEO_SRC)}
          style={{
            alignSelf: 'flex-start',
            padding: '8px 16px',
            background: '#1d4ed8',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
          onMouseLeave={e => e.currentTarget.style.background = '#1d4ed8'}
        >
          Exporter les annotations ({annotations.length})
        </button>
      </div>

      <div style={{
        width: '360px',
        flexShrink: 0,
        borderLeft: '1px solid #1f2937',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <CommentFeed
  comments={comments}
  currentTime={currentTime}
  onSend={emitComment}
  onSeek={handleSeek}   
  author={AUTHOR}
/>
      </div>
    </div>
  )
}
