import './index.css'
import OtterBounce from './components/OtterBounce'

function App() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-950 via-slate-900 to-sky-950 text-white">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-20">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="h-5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_22px_rgba(56,189,248,0.9)]" />
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-white/90 select-none">Otter Nose Bounce</h1>
        </div>
      </div>

      {/* Play area */}
      <div className="pt-16 px-4">
        <div className="mx-auto max-w-5xl">
          <div
            className="relative rounded-3xl border border-indigo-400/30 bg-gradient-to-b from-slate-900/70 to-slate-950/70 shadow-[0_0_80px_rgba(56,189,248,0.12)] backdrop-blur-xl overflow-hidden"
            style={{ height: 'min(78vh, 900px)', minHeight: '520px' }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.15),transparent_60%)]" />
            <OtterBounce />
          </div>
        </div>
      </div>
    </div>
  )
}
export default App

