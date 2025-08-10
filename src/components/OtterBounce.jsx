import { useEffect, useRef, useState } from 'react'
import otterImgUrl from '../assets/GxzZ-2nXwAAuNz_-removebg-preview.png'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

function drawGlowBall(ctx, x, y, r, color) {
  const gradient = ctx.createRadialGradient(x, y, 1, x, y, r * 1.5)
  gradient.addColorStop(0, 'rgba(255,255,255,0.95)')
  gradient.addColorStop(0.3, color)
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, r * 1.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'white'
  ctx.beginPath()
  ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2)
  ctx.fill()
}

function drawOtterFallback(ctx, cx, baseY, width, height) {
  // Body (rounded)
  const x = cx - width / 2
  const y = baseY - height
  const grad = ctx.createLinearGradient(0, y, 0, y + height)
  grad.addColorStop(0, '#b07a4a')
  grad.addColorStop(1, '#8a5b3c')
  ctx.fillStyle = grad
  drawRoundedRect(ctx, x, y, width, height, 24)
  ctx.fill()

  // Face (ellipse)
  const faceWidth = width * 0.6
  const faceHeight = height * 0.6
  const faceX = cx
  const faceY = y + height * 0.55
  ctx.save()
  ctx.translate(faceX, faceY)
  ctx.scale(faceWidth / 2, faceHeight / 2)
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, Math.PI * 2)
  ctx.restore()
  const faceGrad = ctx.createLinearGradient(0, faceY - faceHeight / 2, 0, faceY + faceHeight / 2)
  faceGrad.addColorStop(0, '#e9d2b5')
  faceGrad.addColorStop(1, '#d9b890')
  ctx.fillStyle = faceGrad
  ctx.beginPath()
  ctx.ellipse(faceX, faceY, faceWidth / 2, faceHeight / 2, 0, 0, Math.PI * 2)
  ctx.fill()

  // Ears
  ctx.fillStyle = '#8a5b3c'
  ctx.beginPath()
  ctx.arc(faceX - faceWidth * 0.35, faceY - faceHeight * 0.55, faceHeight * 0.18, 0, Math.PI * 2)
  ctx.arc(faceX + faceWidth * 0.35, faceY - faceHeight * 0.55, faceHeight * 0.18, 0, Math.PI * 2)
  ctx.fill()

  // Eyes
  ctx.fillStyle = '#1f2937'
  ctx.beginPath()
  ctx.arc(faceX - faceWidth * 0.18, faceY - faceHeight * 0.08, faceHeight * 0.08, 0, Math.PI * 2)
  ctx.arc(faceX + faceWidth * 0.18, faceY - faceHeight * 0.08, faceHeight * 0.08, 0, Math.PI * 2)
  ctx.fill()

  // Nose
  const noseY = y - 10 // a bit above body to be the bounce point visually
  const noseR = Math.max(8, height * 0.14)
  const noseGrad = ctx.createRadialGradient(cx - 2, noseY - 2, 2, cx, noseY, noseR)
  noseGrad.addColorStop(0, '#3b2f2f')
  noseGrad.addColorStop(1, '#1f1a1a')
  ctx.fillStyle = noseGrad
  ctx.beginPath()
  ctx.arc(cx, noseY, noseR, 0, Math.PI * 2)
  ctx.fill()

  // Whiskers
  ctx.strokeStyle = 'rgba(31,41,55,0.7)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(faceX - faceWidth * 0.15, faceY + faceHeight * 0.1)
  ctx.lineTo(faceX - faceWidth * 0.45, faceY + faceHeight * 0.0)
  ctx.moveTo(faceX - faceWidth * 0.12, faceY + faceHeight * 0.18)
  ctx.lineTo(faceX - faceWidth * 0.42, faceY + faceHeight * 0.12)
  ctx.moveTo(faceX + faceWidth * 0.15, faceY + faceHeight * 0.1)
  ctx.lineTo(faceX + faceWidth * 0.45, faceY + faceHeight * 0.0)
  ctx.moveTo(faceX + faceWidth * 0.12, faceY + faceHeight * 0.18)
  ctx.lineTo(faceX + faceWidth * 0.42, faceY + faceHeight * 0.12)
  ctx.stroke()

  return { noseX: cx, noseY, noseR }
}

export default function OtterBounce() {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const animationRef = useRef(0)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem('otter_high_score') || 0))
  const [isRunning, setIsRunning] = useState(false)
  const [isGameOver, setIsGameOver] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  // Mirrors of state for stable refs used inside RAF and listeners
  const runningRef = useRef(false)
  const scoreRef = useRef(0)
  const highScoreRef = useRef(highScore)
  const otterImageRef = useRef(null)
  const pausedRef = useRef(false)
  const startGameRef = useRef(() => {})
  const resumeGameRef = useRef(() => {})

  useEffect(() => {
    scoreRef.current = score
  }, [score])
  useEffect(() => {
    highScoreRef.current = highScore
  }, [highScore])

  // Game state stored in refs to avoid re-renders in RAF
  const stateRef = useRef({
    ball: { x: 200, y: 120, vx: 8, vy: 8, r: 10, color: 'rgba(99, 179, 237, 0.9)' },
    paddle: { cx: 200, width: 160, height: 120, speed: 9 },
    ballSpeed: 9,
    speedIncreasePerHit: 0.6,
    maxSpeed: 24,
    lastTime: 0,
    dpi: 1,
    trail: [],
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = containerRef.current
    if (!canvas || !parent) return

    const ctx = canvas.getContext('2d')

    // Load otter image once
    if (!otterImageRef.current) {
      const img = new Image()
      img.src = otterImgUrl
      img.onload = () => {
        otterImageRef.current = img
      }
    }

    function resize() {
      const rect = parent.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      stateRef.current.dpi = dpr
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      // Adjust paddle size based on width
      stateRef.current.paddle.width = clamp(rect.width * 0.22, 140, 260)
      stateRef.current.paddle.height = clamp(rect.height * 0.18, 90, 160)
      stateRef.current.paddle.cx = rect.width / 2
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(parent)

    function resetBall() {
      const width = canvas.width / stateRef.current.dpi
      stateRef.current.ball.x = width * 0.5
      stateRef.current.ball.y = 100
      const speed = 10
      const toRight = Math.random() < 0.5
      const angle = (toRight ? 60 : 120) * (Math.PI / 180)
      stateRef.current.ball.vx = Math.cos(angle) * speed
      stateRef.current.ball.vy = Math.sin(angle) * speed
      stateRef.current.ballSpeed = speed
      stateRef.current.trail = []
    }

    function startGame() {
      setScore(0)
      scoreRef.current = 0
      setIsGameOver(false)
      setIsRunning(true)
      setIsPaused(false)
      runningRef.current = true
      pausedRef.current = false
      resetBall()
    }
    startGameRef.current = startGame

    function resumeGame() {
      if (runningRef.current) return
      setIsPaused(false)
      pausedRef.current = false
      setIsRunning(true)
      runningRef.current = true
    }
    resumeGameRef.current = resumeGame

    function pauseGame() {
      if (!runningRef.current) return
      setIsPaused(true)
      pausedRef.current = true
      setIsRunning(false)
      runningRef.current = false
    }

    const onMouseMove = (e) => {
      if (!runningRef.current) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      stateRef.current.paddle.cx = clamp(x, 40, rect.width - 40)
    }
    const onTouchMove = (e) => {
      if (!runningRef.current || !e.touches || e.touches.length === 0) return
      const rect = canvas.getBoundingClientRect()
      const x = e.touches[0].clientX - rect.left
      stateRef.current.paddle.cx = clamp(x, 40, rect.width - 40)
    }
    const keys = new Set()
    const onKeyDown = (e) => {
      if (e.code === 'Space') {
        if (!runningRef.current) {
          if (pausedRef.current) {
            resumeGame()
          } else {
            startGame()
          }
        }
        e.preventDefault()
      }
      if (e.code === 'Escape') {
        if (runningRef.current) pauseGame()
        else if (pausedRef.current) resumeGame()
      }
      keys.add(e.key.toLowerCase())
    }
    const onKeyUp = (e) => keys.delete(e.key.toLowerCase())

    const onClick = () => {
      if (!runningRef.current) {
        if (pausedRef.current) resumeGame()
        else startGame()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('touchmove', onTouchMove, { passive: true })
    canvas.addEventListener('click', onClick)

    function updateKeys() {
      const rect = canvas.getBoundingClientRect()
      const paddle = stateRef.current.paddle
      if (keys.has('arrowleft') || keys.has('a')) {
        paddle.cx = clamp(paddle.cx - paddle.speed, 40, rect.width - 40)
      }
      if (keys.has('arrowright') || keys.has('d')) {
        paddle.cx = clamp(paddle.cx + paddle.speed, 40, rect.width - 40)
      }
    }

    function drawBackground() {
      const w = canvas.width
      const h = canvas.height
      // Panel background (subtle dark gradient)
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, '#0b1220')
      g.addColorStop(0.6, '#0a1630')
      g.addColorStop(1, '#0b1120')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      // Inner glow vignette
      const vg = ctx.createRadialGradient(w / 2, h / 2.2, 40, w / 2, h / 2, Math.max(w, h) / 1.2)
      vg.addColorStop(0, 'rgba(56,189,248,0.08)')
      vg.addColorStop(1, 'rgba(0,0,0,0.6)')
      ctx.fillStyle = vg
      ctx.fillRect(0, 0, w, h)
      // Bokeh lights
      for (let i = 0; i < 16; i++) {
        const rx = (i * 127.3) % w
        const ry = (i * 89.1) % h
        const rr = 20 + ((i * 37.7) % 80)
        const a = 0.05 + ((i * 13.3) % 0.08)
        const g2 = ctx.createRadialGradient(rx, ry, 1, rx, ry, rr)
        g2.addColorStop(0, `rgba(99,102,241,${a + 0.05})`)
        g2.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g2
        ctx.beginPath()
        ctx.arc(rx, ry, rr, 0, Math.PI * 2)
        ctx.fill()
      }
      // Border
      ctx.strokeStyle = 'rgba(99,102,241,0.25)'
      ctx.lineWidth = 2
      ctx.strokeRect(1, 1, w - 2, h - 2)
    }

    function step(ts) {
      const dpr = stateRef.current.dpi
      const width = canvas.width / dpr
      const height = canvas.height / dpr
      const ball = stateRef.current.ball
      const paddle = stateRef.current.paddle

      // Clear
      ctx.save()
      ctx.scale(dpr, dpr)
      drawBackground()

      // Controls only while running
      if (runningRef.current) {
        updateKeys()
      }

      // Physics (pong-like constant speed)
      if (runningRef.current) {
        ball.x += ball.vx
        ball.y += ball.vy

        // Walls
        if (ball.x - ball.r < 0) {
          ball.x = ball.r
          ball.vx *= -1
        } else if (ball.x + ball.r > width) {
          ball.x = width - ball.r
          ball.vx *= -1
        }
        if (ball.y - ball.r < 0) {
          ball.y = ball.r
          ball.vy *= -1
        }

        // Nose bar collision zone (aligned to image nose if loaded)
        const barWidth = paddle.width * 0.55
        const barHeight = 18
        let barX = paddle.cx - barWidth / 2
        let barY
        const img = otterImageRef.current
        if (img) {
          const imageWidthFactor = 0.45
          const drawW = paddle.width * imageWidthFactor
          const scale = drawW / img.width
          const drawH = img.height * scale
          const baseY = height - 2
          const drawY = baseY - drawH
          const noseY = drawY + drawH * 0.22
          barY = noseY - barHeight / 2
        } else {
          // Fallback aligns with vector nose
          const baseY = height - 20
          const noseY = baseY - 10
          barY = noseY - barHeight / 2
        }

        // Circle-rect collision approximation
        const closestX = clamp(ball.x, barX, barX + barWidth)
        const closestY = clamp(ball.y, barY, barY + barHeight)
        const dx = ball.x - closestX
        const dy = ball.y - closestY
        const distSq = dx * dx + dy * dy
        if (distSq < ball.r * ball.r && ball.vy > 0) {
          // Reflect with controlled angle towards the side hit
          ball.y = barY - ball.r
          const hitOffset = (ball.x - (barX + barWidth / 2)) / (barWidth / 2) // -1..1
          const t = (hitOffset + 1) / 2 // 0..1
          const minDeg = 55
          const maxDeg = 125
          const angleDeg = maxDeg - (maxDeg - minDeg) * t
          const angle = (angleDeg * Math.PI) / 180
          // Speed up per hit
          stateRef.current.ballSpeed = Math.min(
            stateRef.current.maxSpeed,
            stateRef.current.ballSpeed + stateRef.current.speedIncreasePerHit
          )
          const s = stateRef.current.ballSpeed
          ball.vx = Math.cos(angle) * s
          ball.vy = -Math.abs(Math.sin(angle) * s)
          setScore((s) => s + 1)
          scoreRef.current += 1
        }

        // Normalize to maintain target speed after bounces
        const cur = Math.hypot(ball.vx, ball.vy)
        if (cur > 0) {
          const target = stateRef.current.ballSpeed
          ball.vx = (ball.vx / cur) * target
          ball.vy = (ball.vy / cur) * target
        }

        // Miss -> game over
        if (ball.y - ball.r > height + 40) {
          setIsRunning(false)
          runningRef.current = false
          setIsGameOver(true)
          setIsPaused(false)
          pausedRef.current = false
          const nextHigh = Math.max(highScoreRef.current, scoreRef.current)
          setHighScore(nextHigh)
          highScoreRef.current = nextHigh
          localStorage.setItem('otter_high_score', String(nextHigh))
        }

        // Trail
        const trail = stateRef.current.trail
        trail.push({ x: ball.x, y: ball.y, r: ball.r })
        if (trail.length > 18) trail.shift()
      }

      // Draw trail
      for (let i = 0; i < stateRef.current.trail.length; i++) {
        const t = stateRef.current.trail[i]
        const alpha = (i + 1) / stateRef.current.trail.length
        ctx.fillStyle = `rgba(99,179,237,${alpha * 0.25})`
        ctx.beginPath()
        ctx.arc(t.x, t.y, t.r * (0.9 + alpha * 0.6), 0, Math.PI * 2)
        ctx.fill()
      }

      // Draw ball
      drawGlowBall(ctx, ball.x, ball.y, ball.r, 'rgba(99, 179, 237, 0.85)')

      // Draw otter (image if loaded, fallback otherwise)
      let otter
      const img = otterImageRef.current
      if (img) {
        const imageWidthFactor = 0.45
        const drawW = paddle.width * imageWidthFactor // make image smaller
        const scale = drawW / img.width
        const drawH = img.height * scale
        const baseY = height - 2 // sit at the bottom of the play box
        const drawX = paddle.cx - drawW / 2
        const drawY = baseY - drawH
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, drawX, drawY, drawW, drawH)
        // Approximate nose near 22% from top of image and centered
        const noseX = paddle.cx
        const noseY = drawY + drawH * 0.22
        const noseR = Math.max(8, drawH * 0.05)
        otter = { noseX, noseY, noseR }
      } else {
        otter = drawOtterFallback(ctx, paddle.cx, height - 20, paddle.width, paddle.height)
      }
      // Optional: glow on nose when close
      const dxn = ball.x - otter.noseX
      const dyn = ball.y - otter.noseY
      const dn = Math.sqrt(dxn * dxn + dyn * dyn)
      if (dn < 120) {
        const glow = ctx.createRadialGradient(otter.noseX, otter.noseY, 4, otter.noseX, otter.noseY, 120)
        glow.addColorStop(0, 'rgba(255,255,255,0.08)')
        glow.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(otter.noseX, otter.noseY, 120, 0, Math.PI * 2)
        ctx.fill()
      }

      // HUD
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.font = '600 28px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
      ctx.fillText(`Score: ${scoreRef.current}`, 20, 40)
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.font = '500 16px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
      ctx.fillText(`High: ${highScoreRef.current}`, 22, 64)

      // Overlay UI when paused or game over
      if (!runningRef.current) {
        // Blur background panel subtly
        ctx.fillStyle = 'rgba(2,6,23,0.45)'
        ctx.fillRect(0, 0, width, height)

        const panelW = Math.min(520, width * 0.8)
        const panelH = 160
        const panelX = width / 2 - panelW / 2
        const panelY = height * 0.18

        // Panel
        const panelGrad = ctx.createLinearGradient(0, panelY, 0, panelY + panelH)
        panelGrad.addColorStop(0, 'rgba(15,23,42,0.9)')
        panelGrad.addColorStop(1, 'rgba(2,8,23,0.9)')
        ctx.fillStyle = panelGrad
        drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 16)
        ctx.fill()
        ctx.strokeStyle = 'rgba(99,102,241,0.4)'
        ctx.lineWidth = 2
        drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 16)
        ctx.stroke()

        // Title
        const title = isGameOver ? 'Game Over' : 'Paused'
        ctx.fillStyle = 'rgba(255,255,255,0.98)'
        ctx.font = '700 28px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
        const tw = ctx.measureText(title).width
        ctx.fillText(title, width / 2 - tw / 2, panelY + 44)

        // Score line
        const subtitle = `Score: ${scoreRef.current}    High: ${highScoreRef.current}`
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.font = '500 16px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
        const sw = ctx.measureText(subtitle).width
        ctx.fillText(subtitle, width / 2 - sw / 2, panelY + 74)

        // Buttons
        const btnW = 140
        const btnH = 38
        const gap = 16
        const totalW = isGameOver ? btnW : btnW * 2 + gap
        const startX = width / 2 - totalW / 2
        const btnY = panelY + 104

        // Primary (Play/Resume)
        const primaryX = startX
        ctx.fillStyle = 'rgba(56,189,248,0.25)'
        drawRoundedRect(ctx, primaryX, btnY, btnW, btnH, 10)
        ctx.fill()
        ctx.strokeStyle = 'rgba(56,189,248,0.8)'
        ctx.lineWidth = 1.5
        drawRoundedRect(ctx, primaryX, btnY, btnW, btnH, 10)
        ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,255,0.95)'
        ctx.font = '600 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
        const pLabel = isGameOver ? 'Play again' : 'Resume'
        const plw = ctx.measureText(pLabel).width
        ctx.fillText(pLabel, primaryX + btnW / 2 - plw / 2, btnY + 24)

        // Secondary (Restart) when paused
        if (!isGameOver) {
          const secondaryX = primaryX + btnW + gap
          ctx.fillStyle = 'rgba(99,102,241,0.22)'
          drawRoundedRect(ctx, secondaryX, btnY, btnW, btnH, 10)
          ctx.fill()
          ctx.strokeStyle = 'rgba(99,102,241,0.7)'
          drawRoundedRect(ctx, secondaryX, btnY, btnW, btnH, 10)
          ctx.stroke()
          ctx.fillStyle = 'rgba(255,255,255,0.95)'
          const sLabel = 'Restart'
          const slw = ctx.measureText(sLabel).width
          ctx.fillText(sLabel, secondaryX + btnW / 2 - slw / 2, btnY + 24)
        }
      }


      ctx.restore()
      animationRef.current = requestAnimationFrame(step)
    }

    animationRef.current = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(animationRef.current)
      ro.disconnect()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('click', onClick)
    }
  }, [])

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Pause Button */}
      <button
        type="button"
        onClick={() => {
          if (runningRef.current) {
            // pause
            setIsPaused(true)
            pausedRef.current = true
            setIsRunning(false)
            runningRef.current = false
          } else if (pausedRef.current) {
            // resume
            setIsPaused(false)
            pausedRef.current = false
            setIsRunning(true)
            runningRef.current = true
          }
        }}
        className="absolute right-3 top-3 z-10 rounded-md border border-white/20 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur hover:bg-slate-800/70 active:scale-[0.99]"
      >
        {(!runningRef.current && pausedRef.current) ? 'Resume' : (runningRef.current ? 'Pause' : 'Pause')}
      </button>

      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  )
}


