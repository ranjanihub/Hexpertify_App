import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Heart,
  Volume2,
  Coffee,
  Eye,
  Hand,
  Check,
} from 'lucide-react';
import type { BaseActivityComponentProps } from '../types';

export const MoodLiftSomaticPlayer: React.FC<BaseActivityComponentProps> = ({
  activityId = 'ACT-08',
  activityName,
  onComplete
}) => {
  if (activityId === 'ACT-08') {
    return <BiomechanicalPostureHUD activityName={activityName} onComplete={onComplete} />;
  } else {
    return <DbtMultiSensoryComfortMatrix activityName={activityName} onComplete={onComplete} />;
  }
};

/* ─────────────────────────────────────────────────────────────
   ACT-08: BIOMECHANICAL POSTURE HUD (Somatic Spine Alignment)
   ───────────────────────────────────────────────────────────── */
function BiomechanicalPostureHUD({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const steps = [
    { title: 'Plant Gravitational Base', desc: 'Place feet shoulder-width apart, flat on the ground. Uncross limbs and feel solid floor support.', holdSecs: 15, tag: 'GROUNDING' },
    { title: 'Scapular Depression & Roll', desc: 'Inhale while lifting shoulders up to ears; exhale smoothly as you roll them back and drop blades into spine pockets.', holdSecs: 20, tag: 'TENSION RELEASE' },
    { title: 'Axial Spine Elongation', desc: 'Visualize a golden cord lifting the crown of your skull. Gently tuck chin to decompress cervical vertebrae.', holdSecs: 20, tag: 'DECOMPRESSION' },
    { title: 'Full Diaphragmatic Expansion', desc: 'Place palms over lower ribs. Take a deep, 360-degree expansive breath filling the torso, then sigh out completely.', holdSecs: 25, tag: 'CHEST OPENER' }
  ];

  const [stepIdx, setStepIdx] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(steps[0].holdSecs);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  useEffect(() => {
    let timer: any = null;
    if (isActive && secondsLeft > 0) {
      timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    } else if (isActive && secondsLeft === 0) {
      if (stepIdx < steps.length - 1) {
        const next = stepIdx + 1;
        setStepIdx(next);
        setSecondsLeft(steps[next].holdSecs);
      } else {
        setIsActive(false);
        setIsCompleted(true);
        if (onComplete) onComplete({ completed: true });
      }
    }
    return () => clearInterval(timer);
  }, [isActive, secondsLeft, stepIdx, steps, onComplete]);

  const handleStart = () => setIsActive(true);
  const handleReset = () => {
    setIsActive(false);
    setStepIdx(0);
    setSecondsLeft(steps[0].holdSecs);
    setIsCompleted(false);
  };

  const currentStep = steps[stepIdx];

  return (
    <div className="w-full rounded-3xl bg-[#090615] p-6 sm:p-8 text-white shadow-2xl border border-purple-500/20 relative overflow-hidden font-['Plus_Jakarta_Sans']">
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#5e2be2]/20 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 text-emerald-300 shadow-inner">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              ACT-08 • SOMATIC ALIGNMENT HUD
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
              {activityName || 'Posture Reset'}
            </h2>
            <p className="text-xs text-purple-200/80 font-semibold mt-0.5">
              Reset physical posture to relieve musculoskeletal constriction and lower sympathetic nervous tension.
            </p>
          </div>
        </div>
        <button onClick={handleReset} className="p-2.5 bg-white/5 hover:bg-white/15 text-white rounded-xl text-xs transition-all">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {!isCompleted ? (
        <div className="max-w-md mx-auto text-center space-y-6 relative z-10">
          <div className="flex justify-between text-xs font-bold text-emerald-300">
            <span>Alignment Phase {stepIdx + 1} of 4</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-black">
              {currentStep.tag}
            </span>
          </div>

          <div className="p-6 bg-slate-950/80 rounded-3xl border border-purple-500/30 space-y-4 shadow-xl">
            <div className="text-xl font-black text-white tracking-tight">{currentStep.title}</div>
            <p className="text-xs text-purple-200/80 leading-relaxed font-medium">{currentStep.desc}</p>

            <div className="py-2">
              <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-400 p-1 mx-auto shadow-[0_0_35px_rgba(16,185,129,0.35)] flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-slate-950/80 flex flex-col items-center justify-center text-emerald-300">
                  <span className="text-3xl font-black">{secondsLeft}s</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-purple-200/60">Hold</span>
                </div>
              </div>
            </div>
          </div>

          {!isActive ? (
            <button
              onClick={handleStart}
              className="px-10 py-4 bg-gradient-to-r from-emerald-500 to-[#5e2be2] hover:opacity-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all mx-auto cursor-pointer"
            >
              Initiate Alignment Protocol
            </button>
          ) : (
            <div className="text-xs text-emerald-400 font-black uppercase tracking-wider animate-pulse flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Maintain alignment and breathe deeply...
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-10 space-y-6 max-w-md mx-auto animate-fade-in relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-500 to-[#5e2be2] p-1 mx-auto shadow-[0_0_50px_rgba(16,185,129,0.5)] flex items-center justify-center">
            <div className="w-full h-full rounded-3xl bg-slate-950/80 flex items-center justify-center text-emerald-300">
              <CheckCircle2 className="w-12 h-12" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-white">Posture & Spine Aligned</h3>
            <p className="text-xs sm:text-sm text-purple-200/80 mt-1">
              Spinal decompression complete, diaphragm unobstructed, and full respiratory volume unlocked.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-8 py-3.5 bg-white/10 hover:bg-white/15 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            Repeat Realignment
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ACT-09: DBT MULTI-SENSORY COMFORT MATRIX (Self-Soothing)
   ───────────────────────────────────────────────────────────── */
function DbtMultiSensoryComfortMatrix({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const selectedItems = {
    sight: 'Warm sunlight / serene nature landscape',
    sound: 'Gentle ambient rain or 432Hz theta frequencies',
    touch: 'Soft weighted texture or cool smooth marble',
    smell: 'Calming lavender, fresh cedar, or citrus',
    taste: 'Mindful sip of warm herbal tea or cool mint'
  };

  const [checkedSenses, setCheckedSenses] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const senses = [
    { key: 'sight', label: 'Visual Channel', icon: Eye, color: 'text-amber-400', glow: 'rgba(245,158,11,0.3)', default: 'Warm sunlight or pleasing minimalist art' },
    { key: 'sound', label: 'Auditory Channel', icon: Volume2, color: 'text-cyan-400', glow: 'rgba(6,182,212,0.3)', default: 'Gentle ambient acoustic tones or ocean waves' },
    { key: 'touch', label: 'Tactile Somatosensory', icon: Hand, color: 'text-purple-400', glow: 'rgba(168,85,247,0.3)', default: 'Comfortable textured fabric or smooth cool object' },
    { key: 'smell', label: 'Olfactory Scent', icon: Sparkles, color: 'text-rose-400', glow: 'rgba(244,63,94,0.3)', default: 'Lavender, cedarwood, or clean morning air' },
    { key: 'taste', label: 'Gustatory Savoring', icon: Coffee, color: 'text-emerald-400', glow: 'rgba(16,185,129,0.3)', default: 'Mindful warm chamomile tea or refreshing mint' }
  ];

  const toggleCheck = (key: string) => {
    if (checkedSenses.includes(key)) {
      setCheckedSenses(checkedSenses.filter((k) => k !== key));
    } else {
      const updated = [...checkedSenses, key];
      setCheckedSenses(updated);
      if (updated.length === senses.length) {
        setIsCompleted(true);
        if (onComplete) onComplete({ selectedItems });
      }
    }
  };

  const handleReset = () => {
    setCheckedSenses([]);
    setIsCompleted(false);
  };

  return (
    <div className="w-full rounded-3xl bg-[#090615] p-6 sm:p-8 text-white shadow-2xl border border-purple-500/20 relative overflow-hidden font-['Plus_Jakarta_Sans']">
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#5e2be2]/20 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/30 text-rose-300 shadow-inner">
            <Heart className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
              ACT-09 • DBT DISTRESS TOLERANCE
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
              {activityName || 'Self-Soothing'}
            </h2>
            <p className="text-xs text-purple-200/80 font-semibold mt-0.5">
              Bathe autonomic sensory channels in safe, comforting stimuli to arrest acute distress loops.
            </p>
          </div>
        </div>
        <button onClick={handleReset} className="p-2.5 bg-white/5 hover:bg-white/15 text-white rounded-xl text-xs transition-all">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {!isCompleted ? (
        <div className="max-w-xl mx-auto space-y-4 relative z-10">
          <div className="flex justify-between text-xs font-bold text-rose-300">
            <span>Sensory Channels Engaged ({checkedSenses.length}/5)</span>
            <span>Tap card as you experience each element</span>
          </div>

          <div className="space-y-3">
            {senses.map((s) => {
              const Icon = s.icon;
              const isChecked = checkedSenses.includes(s.key);
              return (
                <div
                  key={s.key}
                  onClick={() => toggleCheck(s.key)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    isChecked
                      ? 'bg-purple-900/40 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)] ring-1 ring-rose-400'
                      : 'bg-slate-950/60 border-purple-500/20 hover:bg-purple-950/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl bg-slate-950/80 border border-white/10 ${s.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-xs text-white">{s.label}</div>
                      <div className="text-[11px] text-purple-200/70 mt-0.5">{(selectedItems as any)[s.key] || s.default}</div>
                    </div>
                  </div>

                  <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                    isChecked ? 'bg-gradient-to-tr from-rose-500 to-[#5e2be2] border-rose-400 text-white' : 'border-purple-500/30 bg-slate-950'
                  }`}>
                    {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-10 space-y-6 max-w-md mx-auto animate-fade-in relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-rose-500 to-[#5e2be2] p-1 mx-auto shadow-[0_0_50px_rgba(244,63,94,0.5)] flex items-center justify-center">
            <div className="w-full h-full rounded-3xl bg-slate-950/80 flex items-center justify-center text-rose-300">
              <Heart className="w-12 h-12" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-white">Full Multisensory Comfort Reached</h3>
            <p className="text-xs sm:text-sm text-purple-200/80 mt-1">
              All 5 somatic channels have transmitted parasympathetic comfort signals to your nervous system.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-8 py-3.5 bg-white/10 hover:bg-white/15 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            Review Kit Again
          </button>
        </div>
      )}
    </div>
  );
}

export default MoodLiftSomaticPlayer;
