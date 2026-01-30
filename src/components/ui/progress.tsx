import React from 'react'

export function Progress({ value = 0 }: { value?: number }) {
  return (
    <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%` }} className="h-2 bg-stone-900 rounded-full transition-all" />
    </div>
  )
}
