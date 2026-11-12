// SPDX-License-Identifier: MIT

/** Lightweight canvas confetti celebration when unlocking milestones or completing goals. */
export function triggerConfetti(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const canvas = document.createElement('canvas')
  canvas.style.position = 'fixed'
  canvas.style.inset = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = '9999'
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  ctx.scale(dpr, dpr)

  const palette = ['#1f5f52', '#2a7a68', '#d4a34a', '#15191e', '#8a4b2a', '#f4f1ea']
  const particles = Array.from({ length: 85 }, (_, i) => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4
    const speed = 6 + Math.random() * 10
    return {
      x: window.innerWidth * (0.25 + (i % 3) * 0.25),
      y: window.innerHeight * 0.72,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      w: 5 + Math.random() * 5,
      h: 4 + Math.random() * 6,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.24,
      color: palette[i % palette.length],
      alpha: 1,
    }
  })

  let frame = 0
  const maxFrames = 130

  function tick() {
    if (!ctx) return
    frame += 1
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

    for (const p of particles) {
      p.vy += 0.28
      p.vx *= 0.985
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vrot
      p.alpha = Math.max(0, 1 - frame / maxFrames)

      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    }

    if (frame < maxFrames) {
      requestAnimationFrame(tick)
    } else {
      canvas.remove()
    }
  }

  requestAnimationFrame(tick)
}
