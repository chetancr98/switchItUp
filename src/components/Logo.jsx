// A toggle switch — "SwitchItUp". The knob slides across on hover (see .logo-switch in lively.css).
export default function Logo({ size = 30 }) {
  return (
    <svg className="logo-switch" width={size * 1.7} height={size} viewBox="0 0 51 30" aria-hidden="true">
      <defs>
        <linearGradient id="logo-track" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <rect className="logo-track" x="1" y="1" width="49" height="28" rx="14" fill="url(#logo-track)" />
      <circle className="logo-knob" cx="15" cy="15" r="10.5" fill="#fff" />
      <path className="logo-bolt" d="M16.5 8.5 11.5 16h3.5l-1.5 5.5 5-7.5h-3.5z" fill="#4f46e5" />
    </svg>
  )
}
