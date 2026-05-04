export default function HomeScreen({ displayName }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center px-6">
      <p className="text-2xl font-semibold text-white">Good morning, {displayName}!</p>
      <p className="text-white/40 text-sm mt-2">Home screen coming soon.</p>
    </div>
  )
}
