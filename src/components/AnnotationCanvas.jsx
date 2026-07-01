import React, { useRef, useEffect, useState, useCallback } from 'react'

const TOOLS = [
  { id: 'rectangle', label: '▭', title: 'Rectangle' },
  { id: 'arrow', label: '↗', title: 'Flèche' },
  { id: 'text', label: 'T', title: 'Texte' },
]

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ffffff']

const CANVAS_W = 1280
const CANVAS_H = 720

function drawArrow(ctx, x1, y1, x2, y2) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLen = 14
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6)
  )
  ctx.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6)
  )
  ctx.closePath()
  ctx.fill()
}

function paintAnnotation(ctx, ann) {
  ctx.strokeStyle = ann.color
  ctx.fillStyle = ann.color
  ctx.lineWidth = 2.5

  if (ann.type === 'rectangle') {
    const { x1, y1, x2, y2 } = ann.coordinates
    ctx.strokeRect(
      x1 * CANVAS_W,
      y1 * CANVAS_H,
      (x2 - x1) * CANVAS_W,
      (y2 - y1) * CANVAS_H
    )
  } else if (ann.type === 'arrow') {
    const { x1, y1, x2, y2 } = ann.coordinates
    drawArrow(ctx, x1 * CANVAS_W, y1 * CANVAS_H, x2 * CANVAS_W, y2 * CANVAS_H)
  } else if (ann.type === 'text') {
    ctx.font = 'bold 18px -apple-system, sans-serif'
    ctx.shadowColor = 'rgba(0,0,0,0.8)'
    ctx.shadowBlur = 4
    ctx.fillText(ann.text || '', ann.coordinates.x * CANVAS_W, ann.coordinates.y * CANVAS_H)
    ctx.shadowBlur = 0
  }
}

export default function AnnotationCanvas({ annotations, currentTime, onAnnotationAdd, author }) {
  const canvasRef = useRef(null)
  const [tool, setTool] = useState('rectangle')
  const [color, setColor] = useState('#ef4444')
  const [annotationMode, setAnnotationMode] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState(null)
  const [previewEnd, setPreviewEnd] = useState(null)
  const [textPlacement, setTextPlacement] = useState(null)
  const [textValue, setTextValue] = useState('')
  const textInputRef = useRef(null)

  const getRelativePos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    }
  }

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    const visible = annotations.filter(
      (a) => Math.abs(a.timestamp - currentTime) < 2
    )
    visible.forEach((ann) => paintAnnotation(ctx, ann))
  }, [annotations, currentTime])

  useEffect(() => {
    redraw()
  }, [redraw])

  const drawPreview = useCallback((endPos) => {
    redraw()
    if (!startPoint || !endPos) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 2.5
    ctx.setLineDash([6, 3])

    if (tool === 'rectangle') {
      ctx.strokeRect(
        startPoint.x * CANVAS_W,
        startPoint.y * CANVAS_H,
        (endPos.x - startPoint.x) * CANVAS_W,
        (endPos.y - startPoint.y) * CANVAS_H
      )
    } else if (tool === 'arrow') {
      drawArrow(
        ctx,
        startPoint.x * CANVAS_W,
        startPoint.y * CANVAS_H,
        endPos.x * CANVAS_W,
        endPos.y * CANVAS_H
      )
    }
    ctx.setLineDash([])
  }, [redraw, startPoint, color, tool])

  const handleMouseDown = (e) => {
    if (!annotationMode || tool === 'text') return
    setIsDrawing(true)
    const pos = getRelativePos(e)
    setStartPoint(pos)
    setPreviewEnd(pos)
  }

  const handleMouseMove = (e) => {
    if (!isDrawing || !startPoint) return
    const pos = getRelativePos(e)
    setPreviewEnd(pos)
    drawPreview(pos)
  }

  const handleMouseUp = (e) => {
    if (!isDrawing || !startPoint) return
    setIsDrawing(false)
    const pos = getRelativePos(e)

    const dx = Math.abs(pos.x - startPoint.x)
    const dy = Math.abs(pos.y - startPoint.y)
    if (dx < 0.01 && dy < 0.01) {
      setStartPoint(null)
      setPreviewEnd(null)
      return
    }

    const annotation = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      type: tool,
      timestamp: currentTime,
      color,
      author,
      coordinates: { x1: startPoint.x, y1: startPoint.y, x2: pos.x, y2: pos.y },
    }
    onAnnotationAdd(annotation)
    setStartPoint(null)
    setPreviewEnd(null)
  }

  const handleCanvasClick = (e) => {
    if (!annotationMode || tool !== 'text') return
    const pos = getRelativePos(e)
    setTextPlacement(pos)
    setTextValue('')
    setTimeout(() => textInputRef.current?.focus(), 0)
  }

  const handleTextKeyDown = (e) => {
    if (e.key === 'Enter' && textValue.trim()) {
      const annotation = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        type: 'text',
        timestamp: currentTime,
        color,
        author,
        text: textValue.trim(),
        coordinates: { x: textPlacement.x, y: textPlacement.y },
      }
      onAnnotationAdd(annotation)
      setTextPlacement(null)
      setTextValue('')
    } else if (e.key === 'Escape') {
      setTextPlacement(null)
      setTextValue('')
    }
  }

  const canvasPointerEvents = annotationMode ? 'auto' : 'none'
  const canvasCursor = tool === 'text' ? 'text' : 'crosshair'

  return (
    <>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: canvasPointerEvents,
          cursor: annotationMode ? canvasCursor : 'default',
          zIndex: 10,
        }}
      />

      {textPlacement && annotationMode && (
        <input
          ref={textInputRef}
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onKeyDown={handleTextKeyDown}
          placeholder="Tapez + Entrée"
          style={{
            position: 'absolute',
            left: `${textPlacement.x * 100}%`,
            top: `${textPlacement.y * 100}%`,
            transform: 'translateY(-100%)',
            background: 'rgba(0,0,0,0.75)',
            border: `2px solid ${color}`,
            borderRadius: '4px',
            color,
            fontSize: '16px',
            fontWeight: 'bold',
            padding: '4px 8px',
            outline: 'none',
            minWidth: '160px',
            zIndex: 30,
          }}
        />
      )}

      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        zIndex: 20,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        padding: '6px 10px',
        borderRadius: '8px',
        pointerEvents: 'auto',
      }}>
        <button
          onClick={() => setAnnotationMode((m) => !m)}
          title={annotationMode ? 'Désactiver les annotations' : 'Activer les annotations'}
          style={{
            padding: '4px 10px',
            background: annotationMode ? '#16a34a' : '#374151',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.03em',
            marginRight: '6px',
          }}
        >
          {annotationMode ? '✎ ON' : '✎ OFF'}
        </button>

        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={t.title}
            disabled={!annotationMode}
            style={{
              padding: '4px 10px',
              background: tool === t.id && annotationMode ? '#2563eb' : '#1f2937',
              color: annotationMode ? '#fff' : '#6b7280',
              border: 'none',
              borderRadius: '5px',
              cursor: annotationMode ? 'pointer' : 'not-allowed',
              fontSize: '16px',
              lineHeight: 1,
            }}
          >
            {t.label}
          </button>
        ))}

        <div style={{ width: '1px', height: '24px', background: '#374151', margin: '0 4px' }} />

        {COLORS.map((c) => (
          <div
            key={c}
            onClick={() => annotationMode && setColor(c)}
            title={c}
            style={{
              width: '18px',
              height: '18px',
              background: c,
              borderRadius: '50%',
              cursor: annotationMode ? 'pointer' : 'not-allowed',
              border: color === c && annotationMode ? '2px solid #fff' : '2px solid transparent',
              outline: color === c && annotationMode ? '1px solid #6b7280' : 'none',
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    </>
  )
}
