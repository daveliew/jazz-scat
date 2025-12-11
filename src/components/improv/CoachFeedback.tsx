'use client';

interface CoachFeedbackProps {
  feedback: string | null;
  tips?: string[];
  isAnalyzing: boolean;
  onAnalyze: () => void;
  hasUserRecording: boolean;
}

export function CoachFeedback({
  feedback,
  tips,
  isAnalyzing,
  onAnalyze,
  hasUserRecording,
}: CoachFeedbackProps) {
  return (
    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🤖</span>
        <h3 className="text-lg font-semibold text-white">AI Coach</h3>
      </div>

      {/* Feedback Display */}
      <div className="min-h-[80px] p-4 bg-slate-900/50 rounded-lg mb-4">
        {isAnalyzing ? (
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <span className="text-slate-400">Listening to your improv...</span>
          </div>
        ) : feedback ? (
          <div className="space-y-3">
            <p className="text-slate-200 leading-relaxed">{feedback}</p>
            {tips && tips.length > 0 && (
              <div className="pt-2 border-t border-slate-700">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Tips:</p>
                <ul className="space-y-1">
                  {tips.map((tip, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-purple-400">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-slate-500 italic">
            Record your improv and click &quot;Get Feedback&quot; to hear what the AI Coach thinks!
          </p>
        )}
      </div>

      {/* Analyze Button */}
      <button
        onClick={onAnalyze}
        disabled={!hasUserRecording || isAnalyzing}
        className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600
                   hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg
                   font-medium transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed
                   shadow-lg hover:shadow-xl"
      >
        {isAnalyzing ? 'Analyzing...' : '🎤 Get Feedback'}
      </button>
    </div>
  );
}
