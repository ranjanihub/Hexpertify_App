import React, { useState } from 'react';
import { Eye, Hand, Volume2, Sparkles, Coffee, CheckCircle2, RefreshCw } from 'lucide-react';
import type { BaseActivityComponentProps } from '../types';

export const GroundingTechnique54321: React.FC<BaseActivityComponentProps> = ({
  activityName,
  onComplete,
  isReadOnly = false
}) => {
  const [step, setStep] = useState(1);
  const [responses, setResponses] = useState({
    see: ['', '', '', '', ''],
    feel: ['', '', '', ''],
    hear: ['', '', ''],
    smell: ['', ''],
    taste: ['']
  });
  const [completed, setCompleted] = useState(false);

  const stepsConfig = [
    { step: 1, count: 5, sense: 'SEE', icon: Eye, label: '5 Things You Can See', color: 'from-blue-600 to-indigo-600', key: 'see' as const },
    { step: 2, count: 4, sense: 'FEEL', icon: Hand, label: '4 Things You Can Touch', color: 'from-emerald-600 to-teal-600', key: 'feel' as const },
    { step: 3, count: 3, sense: 'HEAR', icon: Volume2, label: '3 Things You Can Hear', color: 'from-purple-600 to-violet-600', key: 'hear' as const },
    { step: 4, count: 2, sense: 'SMELL', icon: Sparkles, label: '2 Things You Can Smell', color: 'from-amber-600 to-orange-600', key: 'smell' as const },
    { step: 5, count: 1, sense: 'TASTE', icon: Coffee, label: '1 Thing You Can Taste', color: 'from-rose-600 to-pink-600', key: 'taste' as const }
  ];

  const current = stepsConfig[step - 1];

  const handleInputChange = (index: number, value: string) => {
    setResponses((prev) => {
      const updated = [...prev[current.key]];
      updated[index] = value;
      return { ...prev, [current.key]: updated };
    });
  };

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      setCompleted(true);
      if (onComplete) onComplete(responses);
    }
  };

  const handleReset = () => {
    setStep(1);
    setResponses({ see: ['', '', '', '', ''], feel: ['', '', '', ''], hear: ['', '', ''], smell: ['', ''], taste: [''] });
    setCompleted(false);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-6 font-['Plus_Jakarta_Sans']">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <span className="px-2.5 py-1 bg-purple-50 text-[#5e2be2] font-extrabold text-[10px] rounded-full border border-purple-100 uppercase tracking-wider">
            Coded Component · ACT-01
          </span>
          <h3 className="text-xl font-extrabold text-slate-900 mt-1">{activityName}</h3>
        </div>
        <button onClick={handleReset} className="p-2 text-slate-400 hover:text-[#5e2be2] rounded-xl transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {!completed ? (
        <div className="space-y-5">
          {/* Step Progress Bar */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                  s === step ? 'bg-[#5e2be2]' : s < step ? 'bg-purple-300' : 'bg-slate-100'
                }`}
              />
            ))}
          </div>

          {/* Current Sense Card Header */}
          <div className={`p-5 rounded-2xl bg-gradient-to-r ${current.color} text-white space-y-2 shadow-md`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full">
                Step {step} of 5 · Sensory Focus
              </span>
              <current.icon className="w-5 h-5 text-white/90" />
            </div>
            <h4 className="text-lg font-extrabold">{current.label}</h4>
            <p className="text-xs text-white/80">Take a deep breath and name {current.count} items in your environment.</p>
          </div>

          {/* Input Fields for Current Step */}
          <div className="space-y-3">
            {Array.from({ length: current.count }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-purple-50 text-[#5e2be2] font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-purple-100">
                  {i + 1}
                </span>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={responses[current.key][i] || ''}
                  onChange={(e) => handleInputChange(i, e.target.value)}
                  placeholder={`Observe & type item #${i + 1}...`}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#5e2be2]"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
              >
                Previous Step
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
            >
              {step === 5 ? 'Finish Grounding Exercise' : 'Continue to Next Sense →'}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h4 className="text-lg font-extrabold text-emerald-950">Grounding Session Completed!</h4>
          <p className="text-xs text-emerald-800 max-w-md mx-auto">
            You have successfully grounded your nervous system using 5-4-3-2-1 sensory orientation.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="px-5 py-2.5 bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md"
          >
            Start Fresh Session
          </button>
        </div>
      )}
    </div>
  );
};

export default GroundingTechnique54321;
