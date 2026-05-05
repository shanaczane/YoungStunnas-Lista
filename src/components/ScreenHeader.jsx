export default function ScreenHeader({
  children,
  className = 'flex items-center justify-between px-5 pt-6 pb-4 bg-white border-b border-black/6',
}) {
  return (
    <header className={className}>
      {children}
    </header>
  )
}
