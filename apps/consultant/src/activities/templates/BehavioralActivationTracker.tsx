import React, { useState } from 'react';
import { Smile, Award } from 'lucide-react';
import type { BaseActivityComponentProps } from '../types';

export const BehavioralActivationTracker: React.FC<BaseActivityComponentProps> = ({
  activityName,
  onComplete,
  isReadOnly = false
}) => {
  const [entries, setEntries] = useState([
    { id: '1', title: '30-minute morning park walk', pleasure: 8, mastery: 7 },
    { id: '2', title: 'Cleaned kitchen & organized desk', pleasure: 4, mastery: 9 }
  ]);

  const [title, setTitle] = useState('');
  const [pleasure, setPleasure] = useState(7);
  const [mastery, setMastery] = useState(7);

  const handleAdd = () => {
    if (!title) return;
    const updated = [...entries, { id: Date.now().toString(), title, pleasure, mastery }];
    setEntries(updated);
    setTitle('');
    if (onComplete) onComplete(updated);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-5 font-['Plus_Jakarta_Sans']">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] rounded-full border border-emerald-200 uppercase tracking-wider">
            Coded Component · ACT-05
          </span>
          <h3 className="text-xl font-extrabold text-slate-900 mt-1">{activityName}</h3>
        </div>
      </div>

      <div className="space-y-3 text-xs">
        {entries.map((item, i) => (
          <div key={item.id} className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                #{i + 1}
              </span>
              <p className="font-extrabold text-slate-900 text-xs">{item.title}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 font-extrabold rounded-lg flex items-center gap-1">
                <Smile className="w-3.5 h-3.5 text-emerald-600" />
                Pleasure: {item.pleasure}/10
              </span>
              <span className="px-2.5 py-1 bg-white border border-emerald-200 text-purple-900 font-extrabold rounded-lg flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-purple-600" />
                Mastery: {item.mastery}/10
              </span>
            </div>
          </div>
        ))}
      </div>

      {!isReadOnly && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
          <label className="font-extrabold text-slate-800 block">Log Completed Activity</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Called a friend for 15 minutes"
            className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-semibold text-slate-800"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Pleasure Rating ({pleasure}/10)</label>
              <input type="range" min="1" max="10" value={pleasure} onChange={(e) => setPleasure(Number(e.target.value))} className="w-full accent-emerald-600" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mastery Rating ({mastery}/10)</label>
              <input type="range" min="1" max="10" value={mastery} onChange={(e) => setMastery(Number(e.target.value))} className="w-full accent-purple-600" />
            </div>
          </div>
          <button type="button" onClick={handleAdd} className="w-full py-2.5 bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-xs">
            Add Activity Log
          </button>
        </div>
      )}
    </div>
  );
};

export default BehavioralActivationTracker;
