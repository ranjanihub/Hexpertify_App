import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { BaseActivityComponentProps } from '../types';

export const ExposureHierarchyLadder: React.FC<BaseActivityComponentProps> = ({
  activityName,
  onComplete,
  isReadOnly = false
}) => {
  const [steps, setSteps] = useState([
    { id: 's1', suds: 25, title: 'Saying hello to a store clerk' },
    { id: 's2', suds: 50, title: 'Asking a question during a team call' },
    { id: 's3', suds: 80, title: 'Giving a 5-minute impromptu talk' }
  ]);

  const [newTitle, setNewTitle] = useState('');
  const [newSuds, setNewSuds] = useState(40);

  const handleAddStep = () => {
    if (!newTitle) return;
    const added = [...steps, { id: `s_${Date.now()}`, suds: newSuds, title: newTitle }];
    added.sort((a, b) => a.suds - b.suds);
    setSteps(added);
    setNewTitle('');
    setNewSuds(40);
    if (onComplete) onComplete(added);
  };

  const handleRemoveStep = (id: string) => {
    const updated = steps.filter((s) => s.id !== id);
    setSteps(updated);
    if (onComplete) onComplete(updated);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-5 font-['Plus_Jakarta_Sans']">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <span className="px-2.5 py-1 bg-purple-50 text-[#5e2be2] font-extrabold text-[10px] rounded-full border border-purple-100 uppercase tracking-wider">
            Coded Component · ACT-04
          </span>
          <h3 className="text-xl font-extrabold text-slate-900 mt-1">{activityName}</h3>
        </div>
      </div>

      {/* Exposure Steps List */}
      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div key={step.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-purple-100 text-[#5e2be2] font-mono font-extrabold text-xs flex items-center justify-center shrink-0">
                #{idx + 1}
              </span>
              <div>
                <p className="font-extrabold text-xs text-slate-900">{step.title}</p>
                <p className="text-[10px] font-semibold text-slate-400">Subjective Distress Score (SUDS)</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-rose-50 text-rose-700 font-mono font-extrabold text-xs rounded-full border border-rose-200">
                SUDS {step.suds}/100
              </span>
              {!isReadOnly && (
                <button onClick={() => handleRemoveStep(step.id)} className="text-slate-400 hover:text-rose-600 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add New Step Form */}
      {!isReadOnly && (
        <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-3 text-xs">
          <span className="font-extrabold text-purple-900 block">Add Fear Trigger Step</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Describe feared situation..."
              className="sm:col-span-2 p-2.5 bg-white border border-purple-200 rounded-xl outline-none"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={newSuds}
                onChange={(e) => setNewSuds(Number(e.target.value))}
                className="w-20 p-2.5 bg-white border border-purple-200 rounded-xl font-mono text-center outline-none font-bold"
              />
              <button
                type="button"
                onClick={handleAddStep}
                className="flex-1 py-2.5 bg-[#5e2be2] text-white font-extrabold text-xs rounded-xl shadow-xs"
              >
                Add Step
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExposureHierarchyLadder;
