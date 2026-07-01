export function exportToJSON(annotations, videoSrc) {
  const payload = {
    exported_at: new Date().toISOString(),
    video_src: videoSrc,
    annotations: annotations.map(({ id, type, timestamp, coordinates, color, author, text }) => ({
      id,
      type,
      timestamp,
      coordinates,
      color,
      author,
      ...(text !== undefined ? { text } : {}),
    })),
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `annotations_${Date.now()}.json`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
