import React, { useState, useRef, useCallback, useEffect } from 'react'

function ImageCompare({ originalSrc, resultSrc }) {
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)

  const handleMove = useCallback((clientX) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100)
    setSliderPosition(percentage)
  }, [])

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
    handleMove(e.clientX)
  }, [handleMove])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    handleMove(e.clientX)
  }, [isDragging, handleMove])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleTouchStart = useCallback((e) => {
    setIsDragging(true)
    handleMove(e.touches[0].clientX)
  }, [handleMove])

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return
    handleMove(e.touches[0].clientX)
  }, [isDragging, handleMove])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleTouchMove)
      window.addEventListener('touchend', handleMouseUp)
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove])

  return (
    <div 
      className="image-compare"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Result image (full width, behind) */}
      <div className="compare-layer compare-result">
        <img src={resultSrc} alt="Upscaled result" draggable={false} />
        <span className="compare-label compare-label-right">After</span>
      </div>
      
      {/* Original image (clipped by slider) */}
      <div 
        className="compare-layer compare-original"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img src={originalSrc} alt="Original image" draggable={false} />
        <span className="compare-label compare-label-left">Before</span>
      </div>
      
      {/* Slider handle */}
      <div 
        className="compare-slider"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="compare-slider-line" />
        <div className="compare-slider-handle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 12H4m0 0l3-3m-3 3l3 3M16 12h4m0 0l-3-3m3 3l-3 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      
      {/* Instruction hint */}
      <div className="compare-hint">
        <span>Drag to compare</span>
      </div>
    </div>
  )
}

export default ImageCompare
