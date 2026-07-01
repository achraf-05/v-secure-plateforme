import { useState, useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

const WS_URL = 'http://localhost:3001'

export function useWebSocket({ onAnnotationCreated, onAnnotationUpdated }) {
  const [comments, setComments] = useState([])
  const socketRef = useRef(null)

  const onAnnotationCreatedRef = useRef(onAnnotationCreated)
  const onAnnotationUpdatedRef = useRef(onAnnotationUpdated)

  useEffect(() => { onAnnotationCreatedRef.current = onAnnotationCreated }, [onAnnotationCreated])
  useEffect(() => { onAnnotationUpdatedRef.current = onAnnotationUpdated }, [onAnnotationUpdated])

  useEffect(() => {
    const socket = io(WS_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[WS] Connecté au serveur de collaboration')
    })

    socket.on('disconnect', (reason) => {
      console.warn('[WS] Déconnecté :', reason)
    })

    socket.on('connect_error', () => {
      console.warn('[WS] Serveur inaccessible, nouvelle tentative…')
    })

    socket.on('annotation_created', (data) => {
      onAnnotationCreatedRef.current(data)
    })

    socket.on('annotation_updated', (data) => {
      onAnnotationUpdatedRef.current(data)
    })

    socket.on('comment_added', (data) => {
      setComments((prev) => {
        if (prev.some((c) => c.id === data.id)) return prev
        return [...prev, data]
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const emitAnnotation = useCallback((event, data) => {
    socketRef.current?.emit(event, data)
  }, [])

  const emitComment = useCallback((comment) => {
    const withId = {
      ...comment,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    }
    setComments((prev) => [...prev, withId])
    socketRef.current?.emit('comment_added', withId)
  }, [])

  return { comments, emitAnnotation, emitComment }
}
