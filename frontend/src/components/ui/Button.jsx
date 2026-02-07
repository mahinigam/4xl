import React, { useRef } from 'react'

function Button({ 
  children, 
  variant = 'primary', 
  disabled = false, 
  loading = false,
  onClick,
  className = '',
  ...props 
}) {
  const btnRef = useRef(null)

  const handleClick = (event) => {
    if (disabled || loading) return

    const btn = btnRef.current
    if (btn) {
      const ripple = document.createElement('span')
      ripple.className = 'btn-ripple'

      const rect = btn.getBoundingClientRect()
      ripple.style.left = `${event.clientX - rect.left}px`
      ripple.style.top = `${event.clientY - rect.top}px`

      btn.appendChild(ripple)
      ripple.addEventListener('animationend', () => ripple.remove())
    }

    if (onClick) onClick(event)
  }

  return (
    <button
      ref={btnRef}
      className={`btn btn-${variant} ${loading ? 'loading' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading && (
        <span className="btn-spinner" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle 
              cx="12" cy="12" r="10" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
              strokeDasharray="60"
              strokeDashoffset="20"
            />
          </svg>
        </span>
      )}
      <span className="btn-text">{children}</span>
    </button>
  )
}

export default Button
