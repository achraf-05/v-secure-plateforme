import { useState, useEffect, useRef, useCallback } from 'react'

const WS_URL = 'ws://localhost:3001'

export function useWebSocket({ onAnnotationCreated, onAnnotationUpdated }) {
  const [comments, setComments] = useState([])
  const socketRef = useRef(null)

  const onAnnotationCreatedRef = useRef(onAnnotationCreated)
  const onAnnotationUpdatedRef = useRef(onAnnotationUpdated)

  useEffect(() => {
    onAnnotationCreatedRef.current = onAnnotationCreated
  }, [onAnnotationCreated])

  useEffect(() => {
    onAnnotationUpdatedRef.current = onAnnotationUpdated
  }, [onAnnotationUpdated])

  useEffect(() => {
    const socket = new WebSocket(WS_URL)
    socketRef.current = socket

    socket.onopen = () => {
      console.log('[WS] Connecté')
    }

    socket.onclose = () => {
      console.warn('[WS] Déconnecté')
    }

    socket.onerror = () => {
      console.warn('[WS] Erreur connexion')
    }

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      if (msg.type === 'annotation_created') {
        onAnnotationCreatedRef.current(msg.data)
      }

      if (msg.type === 'annotation_updated') {
        onAnnotationUpdatedRef.current(msg.data)
      }

      if (msg.type === 'comment_added') {
        setComments((prev) => {
          if (prev.some((c) => c.id === msg.data.id)) return prev
          return [...prev, msg.data]
        })
      }
    }

    return () => socket.close()
  }, [])

  const emitAnnotation = useCallback((type, data) => {
    socketRef.current?.send(JSON.stringify({ type, data }))
  }, [])

  const emitComment = useCallback((comment) => {
    const withId = {
      ...comment,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    }

    setComments((prev) => [...prev, withId])

    socketRef.current?.send(
      JSON.stringify({
        type: 'comment_added',
        data: withId,
      })
    )
  }, [])

  return { comments, emitAnnotation, emitComment }
}