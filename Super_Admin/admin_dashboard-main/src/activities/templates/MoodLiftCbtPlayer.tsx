import React, { useState } from 'react';
import {
  Brain,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  Lock,
  Archive,
  Clock,
  Scale
} from 'lucide-react';
import type { BaseActivityComponentProps } from '../types';

export const MoodLiftCbtPlayer: React.FC<BaseActivityComponentProps> = ({
  activityId = 'ACT-10',
  activityName,
  onComplete
}) => {
  if (activityId === 'ACT-10') {
    return <CbtThoughtChallengerGame activityName={activityName} onComplete={onComplete} />;
  } else {
    return <WorryBoxGame activityName={activityName} onComplete={onComplete} />;
  }
};

/* ─────────────────────────────────────────────────────────────
   ACT-10: CBT THOUGHT-CHALLENGER (Cognitive Restructuring)
   ───────────────────────────────────────────────────────────── */
function CbtThoughtChallengerGame({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [step, setStep] = useState(1);
  const [thoughtData, setThoughtData] = useState({
    automaticThought: '',
    distortion: 'Catastrophizing',
    evidenceFor: '',
    evidenceAgainst: '',
    balancedReframe: '',
    initialBelief: 85,
    finalBelief: 30
  });
  const [completed, setCompleted] = useState(false);

  const distortions = [
    { name: 'Catastrophizing', desc: 'Expecting the absolute worst possible outcome' },
    { name: 'All-or-Nothing Thinking', desc: 'Viewing situations in black-and-white extremes' },
    { name: 'Mind Reading', desc: 'Assuming you know what other people negatively think' },
    { name: 'Emotional Reasoning', desc: 'Assuming that because you feel anxious, danger is real' },
    { name: 'Overgeneralization', desc: 'Believing one negative event defines everything' },
    { name: 'Should Statements', desc: 'Demanding unrealistic standards upon yourself or others' }
  ];

  const handleFinish = () => {
    setCompleted(true);
    if (onComplete) onComplete(thoughtData);
  };

  const handleReset = () => {
    setStep(1);
    setThoughtData({
      automaticThought: '',
      distortion: 'Catastrophizing',
      evidenceFor: '',
      evidenceAgainst: '',
      balancedReframe: '',
      initialBelief: 85,
      finalBelief: 30
    });
    setCompleted(false);
  };

  return (
    <div className="w-full rounded-3xl bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-2xl border border-indigo-500/20 font-['Plus_Jakarta_Sans'] relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-400/30 text-indigo-300">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              ACT-10 • BECK COGNITIVE RESTRUCTURING
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">{activityName || 'CBT Thought-Challenger'}</h2>
            <p className="text-xs text-white/70">Dismantle irrational automatic thoughts using clinical evidence testing.</p>
          </div>
        </div>
        <button onClick={handleReset} className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {!completed ? (
        <div className="max-w-xl mx-auto space-y-6">
          {/* Step 1: Automatic Thought & Distortion */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <label className="text-xs font-bold text-indigo-300">
                  1. What automatic negative thought is troubling you right now?
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. If I make a mistake in this presentation, everyone will think I'm incompetent."
                  value={thoughtData.automaticThought}
                  onChange={(e) => setThoughtData({ ...thoughtData, automaticThought: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-indigo-300">
                  2. Select the cognitive distortion pattern:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {distortions.map((d) => (
                    <button
                      key={d.name}
                      onClick={() => setThoughtData({ ...thoughtData, distortion: d.name })}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        thoughtData.distortion === d.name
                          ? 'bg-indigo-600/40 border-indigo-400 text-white shadow-md'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-extrabold">{d.name}</div>
                      <div className="text-[10px] text-white/50 mt-0.5">{d.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  disabled={!thoughtData.automaticThought.trim()}
                  onClick={() => setStep(2)}
                  className="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all"
                >
                  Examine Evidence <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Evidence For vs Against */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-white/80">
                <span className="font-bold text-indigo-300">Target Thought:</span> "{thoughtData.automaticThought}" ({thoughtData.distortion})
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Scale className="w-4 h-4" /> Evidence FOR the thought:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Factual data supporting it..."
                    value={thoughtData.evidenceFor}
                    onChange={(e) => setThoughtData({ ...thoughtData, evidenceFor: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Scale className="w-4 h-4" /> Evidence AGAINST the thought:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Real-world counter-evidence..."
                    value={thoughtData.evidenceAgainst}
                    onChange={(e) => setThoughtData({ ...thoughtData, evidenceAgainst: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2"
                >
                  Create Balanced Reframe <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Balanced Reframe */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <label className="text-xs font-bold text-emerald-300">
                  Write a realistic, balanced, and compassionate alternative reframe:
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. One small stumble doesn't erase my competence. People care about the message, and I am well prepared."
                  value={thoughtData.balancedReframe}
                  onChange={(e) => setThoughtData({ ...thoughtData, balancedReframe: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-indigo-300">Belief in Original Thought Now</span>
                  <span className="text-amber-300">{thoughtData.finalBelief}% (Down from {thoughtData.initialBelief}%)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={thoughtData.finalBelief}
                  onChange={(e) => setThoughtData({ ...thoughtData, finalBelief: Number(e.target.value) })}
                  className="w-full accent-emerald-400"
                />
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold"
                >
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2"
                >
                  Save Cognitive Restructuring <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 space-y-5 max-w-md mx-auto animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">Thought Successfully Reframed!</h3>
            <p className="text-xs text-white/70 mt-1">
              "{thoughtData.balancedReframe}"
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
          >
            Challenge Another Thought
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ACT-12: WORRY BOX (Worry Postponement & Externalization)
   ───────────────────────────────────────────────────────────── */
function WorryBoxGame({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [worryText, setWorryText] = useState('');
  const [worryTime, setWorryTime] = useState('5:30 PM');
  const [isLocked, setIsLocked] = useState(false);

  const handleDeposit = () => {
    if (!worryText.trim()) return;
    setIsLocked(true);
    if (onComplete) onComplete({ worryText, worryTime });
  };

  const handleReset = () => {
    setWorryText('');
    setIsLocked(false);
  };

  return (
    <div className="w-full rounded-3xl bg-gradient-to-b from-amber-950 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-2xl border border-amber-500/20 font-['Plus_Jakarta_Sans'] relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-400/30 text-amber-300">
            <Archive className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-400/30">
              ACT-12 • WORRY POSTPONEMENT VAULT
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">{activityName || 'Worry Box'}</h2>
            <p className="text-xs text-white/70">Externalize and lock away intrusive worries until designated "Worry Time".</p>
          </div>
        </div>
      </div>

      {!isLocked ? (
        <div className="max-w-md mx-auto space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-amber-300">
              What persistent worry is taking up your mental bandwidth?
            </label>
            <textarea
              rows={3}
              placeholder="Type your worry note here to deposit it into the vault..."
              value={worryText}
              onChange={(e) => setWorryText(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950/60 border border-white/15 rounded-2xl text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-white/70 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Designated Worry Time:
              </label>
              <input
                type="text"
                value={worryTime}
                onChange={(e) => setWorryTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/60 border border-white/15 rounded-xl text-xs text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-white/70">Worry Duration:</label>
              <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/80 font-bold">
                15 Minutes Max
              </div>
            </div>
          </div>

          <button
            disabled={!worryText.trim()}
            onClick={handleDeposit}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-amber-500/30 transition-all mt-2"
          >
            <Lock className="w-4 h-4" /> Lock & Deposit into Worry Box
          </button>
        </div>
      ) : (
        <div className="text-center py-8 space-y-5 max-w-md mx-auto animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center justify-center mx-auto shadow-2xl">
            <Lock className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">Worry Locked in Vault</h3>
            <p className="text-xs text-white/70 mt-1">
              Your worry is safely stored and scheduled for review at <strong className="text-amber-300">{worryTime}</strong>. You are permitted to disengage from it now.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
          >
            Deposit Another Worry
          </button>
        </div>
      )}
    </div>
  );
}

export default MoodLiftCbtPlayer;
