import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
          Music Genie
        </h1>
        <p className="text-slate-300 text-xl max-w-md mx-auto">
          Practice like a pro. AI-generated backing tracks + real-time coaching.
        </p>
      </div>

      {/* Visual element */}
      <div className="relative w-56 h-56 md:w-72 md:h-72 mb-8">
        {/* Animated rings */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-20 animate-ping" />
        <div className="absolute inset-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-30 animate-pulse" />
        <div className="absolute inset-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 opacity-50" />

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-7xl md:text-8xl">🎤</span>
        </div>
      </div>

      {/* Main CTA */}
      <Link
        href="/improv"
        className="w-72 h-20 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500
                   text-white text-2xl font-bold rounded-2xl shadow-lg shadow-purple-500/25
                   transform hover:scale-105 transition-all active:scale-95
                   flex items-center justify-center gap-3"
      >
        <span>Start Jamming</span>
        <span className="text-3xl">🎵</span>
      </Link>

      {/* Features */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
        <div className="text-center p-4">
          <div className="text-4xl mb-2">🎹</div>
          <h3 className="text-white font-semibold mb-1">AI Backing Tracks</h3>
          <p className="text-slate-400 text-sm">
            Generate bass, harmony, and rhythm layers instantly
          </p>
        </div>
        <div className="text-center p-4">
          <div className="text-4xl mb-2">🎙️</div>
          <h3 className="text-white font-semibold mb-1">Record Your Improv</h3>
          <p className="text-slate-400 text-sm">
            Sing, scat, or hum over the AI-generated tracks
          </p>
        </div>
        <div className="text-center p-4">
          <div className="text-4xl mb-2">🎯</div>
          <h3 className="text-white font-semibold mb-1">AI Coach Feedback</h3>
          <p className="text-slate-400 text-sm">
            Get tips to improve your vocal technique
          </p>
        </div>
      </div>

      {/* Genre tags */}
      <div className="mt-12 flex flex-wrap justify-center gap-2">
        {["Doo-Wop", "Gospel", "Barbershop", "Lo-Fi", "Jazz", "Pop"].map(
          (genre) => (
            <span
              key={genre}
              className="px-4 py-2 bg-slate-700/50 text-slate-300 rounded-full text-sm
                         border border-slate-600 hover:border-purple-500 transition-colors cursor-default"
            >
              {genre}
            </span>
          )
        )}
      </div>

      {/* Tagline */}
      <p className="mt-12 text-slate-500 text-sm">
        Powered by ElevenLabs AI
      </p>
    </div>
  );
}
