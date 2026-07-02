import React, { useState, useRef, useCallback } from 'react'
import VideoPlayer from './components/VideoPlayer.jsx'
import AnnotationCanvas from './components/AnnotationCanvas.jsx'
import CommentFeed from './components/CommentFeed.jsx'
import AnalyzePanel from './components/AnalyzePanel.jsx'
import FeatureBar from './components/FeatureBar.jsx'
import { useAnnotations } from './hooks/useAnnotations.js'
import { useWebSocket } from './hooks/useWebSocket.js'
import { exportToJSON } from './utils/exportAnnotations.js'

const VIDEO_SRC = 'http://localhost:8082/hls/output.m3u8'
const AUTHOR = 'User_' + Math.random().toString(36).slice(2, 6).toUpperCase()

export default function App() {
  const [currentTime, setCurrentTime] = useState(0)
  const [chapters, setChapters] = useState([])
  const playerRef = useRef(null)

  const { annotations, addAnnotation, updateAnnotation, clearAnnotations } = useAnnotations()

  const { comments, emitAnnotation, emitComment } = useWebSocket({
    onAnnotationCreated: addAnnotation,
    onAnnotationUpdated: updateAnnotation,
    onAnnotationsCleared: clearAnnotations,
  })

  const handleSeek = useCallback((time) => {
    if (playerRef.current) {
      playerRef.current.currentTime(time)
    }
  }, [])

  const handleAnnotationAdd = useCallback((annotation) => {
    const full = { ...annotation, author: AUTHOR }
    addAnnotation(full)
    emitAnnotation('annotation_created', full)
  }, [addAnnotation, emitAnnotation])

  const handleResetAnnotations = useCallback(() => {
    clearAnnotations()
    emitAnnotation('annotations_cleared', {})
  }, [clearAnnotations, emitAnnotation])

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#0a0a0a',
      color: '#e5e7eb',
      fontFamily: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
          overflow: 'auto',
          boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
          minHeight: '480px',
          resize: 'vertical',
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
            onReset={handleResetAnnotations}
            author={AUTHOR}
          />
        </div>

        <FeatureBar
          chapters={chapters}
          onSeek={handleSeek}
          currentTime={currentTime}
          comments={comments}
          annotations={annotations}
          onExport={() => exportToJSON(annotations, VIDEO_SRC)}
          exportCount={annotations.length}
          onReset={handleResetAnnotations}
        />
        <AnalyzePanel onChaptersLoaded={setChapters} />
      </div>

      <div style={{
        width: '320px',
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
          author={AUTHOR}
        />
      </div>
    </div>
  )
}
