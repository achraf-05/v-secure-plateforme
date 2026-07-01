import React, { useEffect, useRef } from 'react'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'

export default function VideoPlayer({ src, onTimeUpdate, chapters, playerRef }) {
  const containerRef = useRef(null)
  const internalPlayerRef = useRef(null)
  const markersAddedRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current) return

    const videoEl = document.createElement('video')
    videoEl.className = 'video-js vjs-default-skin vjs-big-play-centered'

    containerRef.current.appendChild(videoEl)

    const player = videojs(videoEl, {
      controls: true,
      autoplay: false,
      preload: 'auto',
      fill: true,
      html5: {
        vhs: {
          enableLowInitialPlaylist: true,
          smoothQualityChange: true,
        },
      },
      sources: [{ src, type: 'application/x-mpegURL' }],
    })

    internalPlayerRef.current = player
    if (playerRef) playerRef.current = player

    player.on('timeupdate', () => {
      onTimeUpdate(player.currentTime())
    })

    player.on('error', () => {
      console.warn('[VideoPlayer] Erreur de chargement — vérifiez que le flux HLS est actif.')
    })

    return () => {
      if (internalPlayerRef.current && !internalPlayerRef.current.isDisposed()) {
        internalPlayerRef.current.dispose()
        internalPlayerRef.current = null
      }
    }
  }, [src])

  useEffect(() => {
    const player = internalPlayerRef.current
    if (!player || !chapters.length) return

    markersAddedRef.current = false

    const applyMarkers = () => {
      const duration = player.duration()
      if (!duration || markersAddedRef.current) return

      const progressHolder = player.el().querySelector('.vjs-progress-holder')
      if (!progressHolder) return

      progressHolder.querySelectorAll('.vjs-chapter-marker').forEach(m => m.remove())

      chapters.forEach((chapter) => {
        const pct = (chapter.start / duration) * 100
        const marker = document.createElement('div')
        marker.className = 'vjs-chapter-marker'
        marker.title = chapter.title
        marker.style.cssText = [
          'position: absolute',
          'top: -3px',
          `left: ${pct}%`,
          'width: 3px',
          'height: calc(100% + 6px)',
          'background: #f59e0b',
          'border-radius: 2px',
          'cursor: pointer',
          'z-index: 20',
          'transition: transform 0.1s',
        ].join(';')

        marker.addEventListener('mouseenter', () => {
          marker.style.transform = 'scaleY(1.4)'
        })
        marker.addEventListener('mouseleave', () => {
          marker.style.transform = 'scaleY(1)'
        })
        marker.addEventListener('click', (e) => {
          e.stopPropagation()
          player.currentTime(chapter.start)
        })

        progressHolder.appendChild(marker)
      })

      markersAddedRef.current = true
    }

    if (player.readyState() >= 1) {
      applyMarkers()
    } else {
      player.one('loadedmetadata', applyMarkers)
    }

    player.on('durationchange', applyMarkers)

    return () => {
      player.off('durationchange', applyMarkers)
    }
  }, [chapters])

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0 }}
    />
  )
}
