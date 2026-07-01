import React, { useEffect, useRef } from 'react'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'

export default function VideoPlayer({ src, onTimeUpdate, chapters, playerRef }) {
  const containerRef = useRef(null)
  const playerInstance = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const videoEl = document.createElement('video')
    videoEl.className = 'video-js vjs-default-skin'
    containerRef.current.appendChild(videoEl)

    const player = videojs(videoEl, {
      controls: true,
      autoplay: false,
      preload: 'auto',
      fluid: true,
      sources: [{
        src,
        type: src.endsWith('.m3u8')
          ? 'application/x-mpegURL'
          : 'video/mp4'
      }]
    })

    playerInstance.current = player
    if (playerRef) playerRef.current = player

    player.on('timeupdate', () => {
      onTimeUpdate(player.currentTime())
    })

    return () => {
      if (playerInstance.current) {
        playerInstance.current.dispose()
      }
    }
  }, [src])

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
  )
}