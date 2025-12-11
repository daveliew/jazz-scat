'use client';

import { Genre, GENRE_OPTIONS } from '@/types/improv';

interface GenreSelectorProps {
  selectedGenre: Genre;
  bpm: number;
  onGenreChange: (genre: Genre) => void;
  onBpmChange: (bpm: number) => void;
  disabled?: boolean;
}

export function GenreSelector({
  selectedGenre,
  bpm,
  onGenreChange,
  onBpmChange,
  disabled = false,
}: GenreSelectorProps) {
  const currentGenreOption = GENRE_OPTIONS.find((g) => g.id === selectedGenre);
  const [minBpm, maxBpm] = currentGenreOption?.bpmRange || [60, 160];

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
      {/* Genre Selector */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400 uppercase tracking-wider">Vibe</label>
        <select
          value={selectedGenre}
          onChange={(e) => {
            const newGenre = e.target.value as Genre;
            onGenreChange(newGenre);
            // Reset BPM to default for new genre
            const genreOption = GENRE_OPTIONS.find((g) => g.id === newGenre);
            if (genreOption) {
              onBpmChange(genreOption.defaultBpm);
            }
          }}
          disabled={disabled}
          className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600
                     focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none
                     disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
        >
          {GENRE_OPTIONS.map((genre) => (
            <option key={genre.id} value={genre.id}>
              {genre.name}
            </option>
          ))}
        </select>
      </div>

      {/* BPM Selector */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400 uppercase tracking-wider">
          BPM: {bpm}
        </label>
        <input
          type="range"
          min={minBpm}
          max={maxBpm}
          value={bpm}
          onChange={(e) => onBpmChange(Number(e.target.value))}
          disabled={disabled}
          className="w-32 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                     disabled:opacity-50 disabled:cursor-not-allowed
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-4
                     [&::-webkit-slider-thumb]:h-4
                     [&::-webkit-slider-thumb]:bg-purple-500
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>

      {/* Genre Description */}
      <div className="flex-1 min-w-[150px]">
        <p className="text-sm text-slate-400">
          {currentGenreOption?.description}
        </p>
      </div>
    </div>
  );
}
