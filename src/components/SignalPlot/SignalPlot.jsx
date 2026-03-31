import { useRef, useEffect } from 'react'
import './SignalPlot.css'

export function SignalPlot({ data = [], width = 300, height = 100 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    // Set canvas size accounting for device pixel ratio
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw background grid
    drawGrid(ctx, width, height)

    // Need at least 2 points to draw a line
    if (data.length < 2) {
      drawNoDataText(ctx, width, height)
      return
    }

    // Calculate data range for auto-scaling
    const minVal = Math.min(...data)
    const maxVal = Math.max(...data)
    const range = maxVal - minVal || 1
    const padding = range * 0.1

    // Map data to canvas coordinates
    const scaleY = (val) => {
      const normalized = (val - minVal + padding) / (range + padding * 2)
      return height - normalized * height
    }

    const stepX = width / (data.length - 1)

    // Draw the signal line
    ctx.beginPath()
    ctx.strokeStyle = '#14b8a6' // teal-500
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    for (let i = 0; i < data.length; i++) {
      const x = i * stepX
      const y = scaleY(data[i])

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.stroke()

    // Draw gradient fill under the line
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, 'rgba(20, 184, 166, 0.3)')
    gradient.addColorStop(1, 'rgba(20, 184, 166, 0.0)')

    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()
  }, [data, width, height])

  const drawGrid = (ctx, w, h) => {
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)' // gray-400 with low opacity
    ctx.lineWidth = 1

    // Horizontal lines
    const hLines = 4
    for (let i = 1; i < hLines; i++) {
      const y = (h / hLines) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    // Vertical lines
    const vLines = 6
    for (let i = 1; i < vLines; i++) {
      const x = (w / vLines) * i
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
  }

  const drawNoDataText = (ctx, w, h) => {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)'
    ctx.font = '14px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Waiting for signal...', w / 2, h / 2)
  }

  return (
    <div className="signal-plot">
      <canvas
        ref={canvasRef}
        className="signal-plot__canvas"
        aria-label="Heart rate signal visualization"
        role="img"
      />
    </div>
  )
}
