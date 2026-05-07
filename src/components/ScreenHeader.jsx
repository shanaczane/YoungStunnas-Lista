export default function ScreenHeader({
  children,
  className = 'flex items-center justify-between px-5 pt-6 pb-4 bg-card-bg border-b border-divider',
}) {
  return (
    <header className={className}>
      {children}
    </header>
  )
}
