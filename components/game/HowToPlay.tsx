'use client'

const STEPS = [
  {
    icon: '🗺️',
    title: 'Explore the World',
    body: 'Walk with WASD (or the D-pad on mobile). The world is a 10×10 grid of 100 plots — Bronze, Silver, Gold, and Diamond.',
  },
  {
    icon: '🏠',
    title: 'Claim Your Plot',
    body: 'Walk around and explore freely. When you\'re ready to play, connect a Solana wallet and claim any unclaimed plot to start farming.',
  },
  {
    icon: '🌾',
    title: 'Plant & Harvest',
    body: 'Open your plot → Crops tab. Plant seeds and come back when they\'re ready to harvest. Sell them for USDC.',
  },
  {
    icon: '🐄',
    title: 'Raise Animals',
    body: 'Animals produce eggs, milk, wool, and more on a timer. The more animals, the more passive income.',
  },
  {
    icon: '⬆️',
    title: 'Upgrade Your Plot',
    body: 'Spend USDC to upgrade your plot up to Level 4 for a 2× yield multiplier on all crops and animals.',
  },
  {
    icon: '🏆',
    title: 'Top the Leaderboard',
    body: 'Score points by owning plots (Diamond=100, Gold=50, Silver=20, Bronze=10). Claim the top spot!',
  },
]

export default function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/75 z-[100]"
      onClick={onClose}
    >
      <div
        className="pixel-panel w-[560px] max-w-[96vw] max-h-[88vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pixel-panel-header flex items-center justify-between p-4">
          <div>
            <h2 className="font-bold text-base" style={{ color: 'var(--ui-text-dark)' }}>
              How to Play — Land Grab
            </h2>
            <p style={{ fontSize: 9, color: 'var(--ui-dark)', marginTop: 2 }}>
              Competitive Solana farming · claim · grow · raid
            </p>
          </div>
          <button onClick={onClose} className="pixel-btn w-10 h-10 flex items-center justify-center text-xl">×</button>
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'var(--ui-tan-light)' }}>
          {STEPS.map((s, i) => (
            <div
              key={i}
              className="pixel-inset"
              style={{ display: 'flex', gap: 14, padding: '10px 14px', alignItems: 'flex-start' }}
            >
              <div style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>{s.icon}</div>
              <div>
                <div style={{
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize:   9,
                  color:      'var(--ui-text-dark)',
                  marginBottom: 5,
                }}>
                  {i + 1}. {s.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ui-dark)', lineHeight: 1.6 }}>
                  {s.body}
                </div>
              </div>
            </div>
          ))}

          {/* Controls */}
          <div className="pixel-inset" style={{ padding: '10px 14px' }}>
            <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: 'var(--ui-text-dark)', marginBottom: 8 }}>
              Controls
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11, color: 'var(--ui-dark)' }}>
              <span><strong style={{ color: 'var(--ui-text)' }}>WASD</strong> — walk your character</span>
              <span><strong style={{ color: 'var(--ui-text)' }}>Click plot</strong> — open plot details</span>
              <span><strong style={{ color: 'var(--ui-text)' }}>▲▼◀▶ arrows</strong> — jump between plots</span>
              <span><strong style={{ color: 'var(--ui-text)' }}>Mini map</strong> — see the full world</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '3px solid var(--ui-dark)', background: 'var(--ui-tan)' }}>
          <button onClick={onClose} className="pixel-btn w-full py-3">
            Start Playing!
          </button>
        </div>
      </div>
    </div>
  )
}
