import React from 'react'

function Button({ 
  children, 
  variant = 'primary', 
  disabled = false, 
  loading = false,
  onClick,
  className = '',
  ...props 
}) {
  return (
    <button
      className={`btn btn-${variant} ${loading ? 'loading' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
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
