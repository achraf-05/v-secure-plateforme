import { useState, useCallback } from 'react'

export function useAnnotations() {
  const [annotations, setAnnotations] = useState([])

  const addAnnotation = useCallback((annotation) => {
    setAnnotations((prev) => {
      if (prev.some((a) => a.id === annotation.id)) return prev
      return [...prev, annotation]
    })
  }, [])

  const updateAnnotation = useCallback((annotation) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === annotation.id ? { ...a, ...annotation } : a))
    )
  }, [])

  const removeAnnotation = useCallback((id) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id))
  }, [])

  return { annotations, addAnnotation, updateAnnotation, removeAnnotation }
}
