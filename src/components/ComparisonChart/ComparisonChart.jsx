import { useRef, useEffect } from 'react'
import './ComparisonChart.css'

const RPPG_COLOR = '#14b8a6'    // teal-500
const BLE_COLOR = '#f59e0b'     // warning / amber

/**
 * Side-by-side BPM trace for rPPG (camera) vs BLE (device).
 *
 * @param {object} props
 * @param {Array<{t:number, rppg:?number, ble:?number}>} props.data
 *    Rolling window of joint samples; nulls are drawn as gaps.
 * @param {number} [props.width=320]
 * @param {number} [props.height=140]
 */
export function ComparisonChart({ data = [], width = 320, height = 140 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.clearRect(0, 0, width, height)
    drawGrid(ctx, width, height)

    const rppgValues = data.map(d => d.rppg).filter(v => typeof v === 'number')
    const bleValues = data.map(d => d.ble).filter(v => typeof v === 'number')
    const combined = rppgValues.concat(bleValues)

    if (combined.length === 0 || data.length < 2) {
      drawPlaceholder(ctx, width, height)
      return
    }

    // Pad the y-range slightly; widen if the range is very small so the line doesn't jitter
    let minVal = Math.min(...combined)
    let maxVal = Math.max(...combined)
    if (maxVal - minVal < 10) {
      const mid = (maxVal + minVal) / 2
      minVal = mid - 5
      maxVal = mid + 5
    }
    const range = maxVal - minVal
    const padding = range * 0.15

    const yScale = (val) => {
      const normalized = (val - minVal + padding) / (range + padding * 2)
      return height - normalized * height
    }
    const xStep = width / Math.max(1, data.length - 1)

    drawSeries(ctx, data, 'rppg', RPPG_COLOR, xStep, yScale)
    drawSeries(ctx, data, 'ble', BLE_COLOR, xStep, yScale)
    drawAxisLabels(ctx, width, height, minVal, maxVal)
  }, [data, width, height])

  return (
    <div className="comparison-chart">
      <div className="comparison-chart__legend">
        <span className="comparison-chart__legend-item">
          <span className="comparison-chart__swatch comparison-chart__swatch--rppg" />
          rPPG (camera)
        </span>
        <span className="comparison-chart__legend-item">
          <span className="comparison-chart__swatch comparison-chart__swatch--ble" />
          BLE device
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className="comparison-chart__canvas"
        aria-label="Heart rate comparison between camera and Bluetooth device"
        role="img"
      />
    </div>
  )
}

function drawSeries(ctx, data, key, color, xStep, yScale) {
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  let drawing = false
  ctx.beginPath()
  for (let i = 0; i < data.length; i++) {
    const v = data[i][key]
    if (typeof v !== 'number') {
      drawing = false
      continue
    }
    const x = i * xStep
    const y = yScale(v)
    if (!drawing) {
      ctx.moveTo(x, y)
      drawing = true
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.stroke()
}

function drawGrid(ctx, w, h) {
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)'
  ctx.lineWidth = 1
  const hLines = 4
  for (let i = 1; i < hLines; i++) {
    const y = (h / hLines) * i
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
  const vLines = 6
  for (let i = 1; i < vLines; i++) {
    const x = (w / vLines) * i
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }
}

function drawAxisLabels(ctx, w, h, minVal, maxVal) {
  ctx.fillStyle = 'rgba(148, 163, 184, 0.8)'
  ctx.font = '10px Inter, system-ui, sans-serif'
  ctx.textBaseline = 'top'
  ctx.textAlign = 'right'
  ctx.fillText(`${Math.round(maxVal)}`, w - 4, 2)
  ctx.textBaseline = 'bottom'
  ctx.fillText(`${Math.round(minVal)}`, w - 4, h - 2)
}

function drawPlaceholder(ctx, w, h) {
  ctx.fillStyle = 'rgba(148, 163, 184, 0.5)'
  ctx.font = '14px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Waiting for readings…', w / 2, h / 2)
}
