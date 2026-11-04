import { useId } from 'react'

export function IlustracionTutoria({ className }: { className?: string }) {
  const fondo = useId()

  return (
    <svg className={className} viewBox="0 0 430 260" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={fondo} x1="0" y1="130" x2="430" y2="130" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1678f5" /><stop offset="1" stopColor="#68b4ff" />
        </linearGradient>
      </defs>
      <rect width="430" height="260" rx="24" fill={`url(#${fondo})`} />
      <circle cx="310" cy="130" r="105" fill="#fff" fillOpacity=".18" />
      <circle cx="122" cy="94" r="46" fill="#ff9f12" />
      <circle cx="301" cy="111" r="46" fill="#fff" />
      <rect x="72" y="186" width="290" height="28" rx="13" fill="#1453aa" />
      <rect x="166" y="142" width="100" height="54" rx="9" fill="#fff" />
    </svg>
  )
}
