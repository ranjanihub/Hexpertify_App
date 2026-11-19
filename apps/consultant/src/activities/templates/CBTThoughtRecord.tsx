import React, { useState } from 'react';
import { Save, Sparkles, CheckCircle2 } from 'lucide-react';
import type { BaseActivityComponentProps } from '../types';

export const CBTThoughtRecord: React.FC<BaseActivityComponentProps> = ({
  activityName,
  onComplete,
  isReadOnly = false
}) => {
  const [formData, setFormData] = useState({
    situation: '',
    automaticThought: '',
    emotionRating: 80,
    distortion: 'Catastrophizing',
    alternativeReframe: '',
    postEmotionRating: 30
  });
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    if (onComplete) onComplete(formData);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-5 font-['Plus_Jakarta_Sans']">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <span className="px-2.5 py-1 bg-purple-50 text-[#5e2be2] font-extrabold text-[10px] rounded-full border border-purple-100 uppercase tracking-wider">
            Coded Component · ACT-02
          </span>
          <h3 className="text-xl font-extrabold text-slate-900 mt-1">{activityName}</h3>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="space-y-1.5">
          <label className="font-extrabold text-slate-700 block">1. Triggering Situation / Event</label>
          <textarea
            rows={2}
            disabled={isReadOnly}
            value={formData.situation}
            onChange={(e) => setFormData({ ...formData, situation: e.target.value })}
            placeholder="Describe what happened, where you were, and who was present..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#5e2be2]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-extrabold text-slate-700 block">2. Automatic Negative Thought (ANT)</label>
          <textarea
            rows={2}
            disabled={isReadOnly}
            value={formData.automaticThought}
            onChange={(e) => setFormData({ ...formData, automaticThought: e.target.value })}
            placeholder="What unhelpful thought automatically went through your head?"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#5e2be2]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-700 block">3. Initial Emotion Intensity ({formData.emotionRating}%)</label>
            <input
              type="range"
              min="0"
              max="100"
              disabled={isReadOnly}
              value={formData.emotionRating}
              onChange={(e) => setFormData({ ...formData, emotionRating: Number(e.target.value) })}
              className="w-full accent-[#5e2be2]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-700 block">4. Cognitive Distortion Category</label>
            <select
              disabled={isReadOnly}
              value={formData.distortion}
              onChange={(e) => setFormData({ ...formData, distortion: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none"
            >
              <option value="Catastrophizing">Catastrophizing</option>
              <option value="All-or-Nothing Thinking">All-or-Nothing Thinking</option>
              <option value="Mind Reading">Mind Reading</option>
              <option value="Overgeneralization">Overgeneralization</option>
              <option value="Emotional Reasoning">Emotional Reasoning</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-extrabold text-slate-700 block">5. Rational Alternative Reframe</label>
          <textarea
            rows={3}
            disabled={isReadOnly}
            value={formData.alternativeReframe}
            onChange={(e) => setFormData({ ...formData, alternativeReframe: e.target.value })}
            placeholder="What is an objective, realistic, and compassionate alternative perspective?"
            className="w-full p-3 bg-purple-50/50 border border-purple-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#5e2be2]"
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-[11px] font-extrabold text-purple-900">Beck CBT 5-Step Model</span>
          </div>

          <button
            type="submit"
            disabled={isReadOnly}
            className="px-5 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Save Thought Log</span>
          </button>
        </div>
      </form>

      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>CBT Thought Log saved successfully!</span>
        </div>
      )}
    </div>
  );
};

export default CBTThoughtRecord;
