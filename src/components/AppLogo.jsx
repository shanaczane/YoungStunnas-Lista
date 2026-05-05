import mainLogo from '../mascots/main-logo.png'

export default function AppLogo({ size = 'md' }) {
  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  }

  return (
    <img
      src={mainLogo}
      alt="Lista"
      className={`${sizes[size]} object-contain flex-shrink-0`}
      style={{ mixBlendMode: 'multiply' }}
    />
  )
}
