interface Props {
  /** size of the rounded tile in px */
  size?: number
  className?: string
}

/**
 * SaqueFlow brand mark — gradient tile with the stylized "withdrawal flow" glyph.
 * Used in the sidebar and the login screen.
 */
export function BrandMark({ size = 32, className = '' }: Props) {
  const glyph = Math.round(size * 0.56)
  return (
    <div
      className={`flex-shrink-0 grid place-items-center rounded-[28%] bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.3)_inset,0_6px_14px_-4px_rgba(59,130,246,0.45)] ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={glyph}
        height={glyph}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 7h11a4 4 0 0 1 0 8H7l-3 3" />
        <path d="M20 17V9" />
      </svg>
    </div>
  )
}
