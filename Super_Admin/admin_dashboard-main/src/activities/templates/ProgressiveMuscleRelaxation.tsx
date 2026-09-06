import React, { useState } from 'react';
import { Volume2, Play, Pause } from 'lucide-react';
import type { BaseActivityComponentProps } from '../types';

export const ProgressiveMuscleRelaxation: React.FC<BaseActivityComponentProps> = ({
  activityName,
  onComplete,
  isReadOnly = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [preTension, setPreTension] = useState(7);
  const [postTension, setPostTension] = useState(3);
  const [notes, setNotes] = useState('');

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (onComplete) onComplete({ preTension, postTension, notes });
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-5 font-['Plus_Jakarta_Sans']">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <span className="px-2.5 py-1 bg-purple-50 text-[#5e2be2] font-extrabold text-[10px] rounded-full border border-purple-100 uppercase tracking-wider">
            Coded Component · ACT-03
          </span>
          <h3 className="text-xl font-extrabold text-slate-900 mt-1">{activityName}</h3>
        </div>
      </div>

      {/* Guided Audio Player Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-900 via-purple-900 to-[#3b1799] text-white space-y-4 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-extrabold uppercase tracking-widest text-purple-200">
            Guided Audio Track · 12 Mins
          </span>
          <Volume2 className="w-5 h-5 text-purple-200" />
        </div>

        <div className="text-center py-4 space-y-3">
          <button
            type="button"
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white text-[#4f28d9] mx-auto flex items-center justify-center shadow-lg hover:scale-105 transition-all"
          >
            {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
          </button>
          <p className="text-xs font-semibold text-purple-100">
            {isPlaying ? 'Audio Track Playing: Muscular Release Guide...' : 'Click to start guided voice relaxation'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <label className="font-extrabold text-slate-700 block">Pre-Exercise Body Tension (1-10)</label>
          <input
            type="range"
            min="1"
            max="10"
            disabled={isReadOnly}
            value={preTension}
            onChange={(e) => setPreTension(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
          <span className="text-[11px] font-extrabold text-indigo-700 block text-right">{preTension} / 10</span>
        </div>

        <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <label className="font-extrabold text-slate-700 block">Post-Exercise Relaxation (1-10)</label>
          <input
            type="range"
            min="1"
            max="10"
            disabled={isReadOnly}
            value={postTension}
            onChange={(e) => setPostTension(Number(e.target.value))}
            className="w-full accent-emerald-600"
          />
          <span className="text-[11px] font-extrabold text-emerald-700 block text-right">{postTension} / 10</span>
        </div>
      </div>

      <div className="space-y-1 text-xs">
        <label className="font-extrabold text-slate-700 block">Reflection & Somatic Notes</label>
        <textarea
          rows={2}
          disabled={isReadOnly}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Which body parts felt most relaxed during the tension release cycle?"
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
        />
      </div>
    </div>
  );
};

export default ProgressiveMuscleRelaxation;
