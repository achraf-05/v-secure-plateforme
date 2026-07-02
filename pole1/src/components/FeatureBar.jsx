import React, { useState } from 'react'
import CollapsibleSection from './CollapsibleSection'
import ChapterNav from './ChapterNav'
import ParticipantsList from './ParticipantsList'

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ffffff']

const TABS = [
  { id: 'chapitres', label: 'Chapitres' },
  { id: 'annotations', label: 'Annotations' },
  { id: 'participants', label: 'Participants' },
  { id: 'export', label: 'Export' },
]

export default function FeatureBar({ chapters, onSeek, currentTime, comments, annotations, onExport, exportCount, onReset }) {
  const [barOpen, setBarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(null)

  const activeTabLabel = TABS.find(t => t.id === activeTab)?.label

  return (
    <div style={{
      background: '#111827',
      border: '1px solid #1f2937',
      borderRadius: '8px',
      padding: '12px 14px',
    }}>
      <CollapsibleSection
        title="Fonctionnalités"
        isOpen={barOpen}
        onToggle={() => setBarOpen(o => !o)}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '10px' }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(prev => (prev === tab.id ? null : tab.id))}
                style={{
                  padding: '6px 14px',
                  background: isActive ? '#2563eb' : '#1f2937',
                  color: isActive ? '#fff' : '#9ca3af',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab !== null && (
          <div style={{ marginTop: '10px' }}>
            <CollapsibleSection
              title={activeTabLabel}
              isOpen={activeTab !== null}
              onToggle={() => setActiveTab(null)}
            >
              <div style={{ paddingTop: '10px' }}>
                {activeTab === 'chapitres' && (
                  <ChapterNav chapters={chapters} onSeek={onSeek} currentTime={currentTime} />
                )}

                {activeTab === 'annotations' && (
                  <div>
                    <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#d1d5db' }}>
                      Outils disponibles : Rectangle, Flèche, Texte
                    </p>
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                      {COLORS.map((c) => (
                        <div key={c} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <div style={{
                            width: '18px',
                            height: '18px',
                            background: c,
                            borderRadius: '50%',
                            border: '1px solid #374151',
                          }} />
                          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#6b7280' }}>
                            {c}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'participants' && (
                  <ParticipantsList comments={comments} annotations={annotations} />
                )}

                {activeTab === 'export' && (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={onExport}
                      style={{
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
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#2563eb' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#1d4ed8' }}
                    >
                      {`Exporter les annotations (${exportCount})`}
                    </button>

                    <button
                      onClick={() => {
                        if (exportCount === 0) return
                        if (window.confirm(`Supprimer les ${exportCount} annotation${exportCount > 1 ? 's' : ''} ? Cette action est irréversible.`)) {
                          onReset()
                        }
                      }}
                      disabled={exportCount === 0}
                      style={{
                        padding: '8px 16px',
                        background: exportCount === 0 ? '#1f2937' : '#7f1d1d',
                        color: exportCount === 0 ? '#6b7280' : '#fca5a5',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: exportCount === 0 ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { if (exportCount > 0) e.currentTarget.style.background = '#991b1b' }}
                      onMouseLeave={(e) => { if (exportCount > 0) e.currentTarget.style.background = '#7f1d1d' }}
                    >
                      Réinitialiser les annotations
                    </button>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </div>
        )}
      </CollapsibleSection>
    </div>
  )
}
