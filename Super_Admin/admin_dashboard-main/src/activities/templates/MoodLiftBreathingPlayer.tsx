import React, { useState, useEffect } from 'react';
import {
  Wind,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  Activity,
  Info
} from 'lucide-react';
import type { BaseActivityComponentProps } from '../types';

interface BreathingModeConfig {
  name: string;
  subtitle: string;
  patternName: string;
  phases: { name: 'Inhale' | 'Hold' | 'Exhale' | 'Hold (Empty)'; duration: number; cue: string }[];
  totalCyclesTarget: number;
  description: string;
  colorScheme: {
    bgGradient: string;
    orbGradient: string;
    accentGlow: string;
    textColor: string;
    borderColor: string;
  };
}

const BREATHING_CONFIGS: Record<string, BreathingModeConfig> = {
  'ACT-01': {
    name: 'Diaphragmatic Breathing',
    subtitle: 'Deep Belly Resonance & Vagus Nerve Activation',
    patternName: '4s Inhale • 2s Hold • 6s Slow Exhale',
    phases: [
      { name: 'Inhale', duration: 4, cue: 'Expand your belly outwards, letting diaphragm drop deeply' },
      { name: 'Hold', duration: 2, cue: 'Softly suspend breath with relaxed shoulders' },
      { name: 'Exhale', duration: 6, cue: 'Slowly release through pursed lips, drawing belly in' }
    ],
    totalCyclesTarget: 6,
    description: 'Deep belly breathing signals your brain that you are safe, downregulating acute anxiety and restoring heart-rate variability.',
    colorScheme: {
      bgGradient: 'from-emerald-950 via-teal-950 to-slate-950',
      orbGradient: 'from-teal-400 via-emerald-500 to-cyan-400',
      accentGlow: 'rgba(20, 184, 166, 0.45)',
      textColor: 'text-teal-300',
      borderColor: 'border-teal-500/30'
    }
  },
  'ACT-02': {
    name: 'Box Breathing',
    subtitle: 'Navy SEAL 4-4-4-4 Tactical Focus & Nervous System Balance',
    patternName: '4s Inhale • 4s Hold • 4s Exhale • 4s Hold',
    phases: [
      { name: 'Inhale', duration: 4, cue: 'Breathe in smoothly through your nose filling upper & lower lungs' },
      { name: 'Hold', duration: 4, cue: 'Retain air gently without clamping throat' },
      { name: 'Exhale', duration: 4, cue: 'Smooth, even exhale emptying lungs completely' },
      { name: 'Hold (Empty)', duration: 4, cue: 'Stay comfortable and still in empty space' }
    ],
    totalCyclesTarget: 5,
    description: 'Used by elite tactical performers and first responders to eliminate panic and sharpen laser mental clarity.',
    colorScheme: {
      bgGradient: 'from-indigo-950 via-blue-950 to-slate-950',
      orbGradient: 'from-blue-400 via-indigo-500 to-cyan-400',
      accentGlow: 'rgba(99, 102, 241, 0.45)',
      textColor: 'text-indigo-300',
      borderColor: 'border-indigo-500/30'
    }
  },
  'ACT-03': {
    name: '4-7-8 Breathing',
    subtitle: 'Dr. Andrew Weil Parasympathetic Reset & Natural Tranquilizer',
    patternName: '4s Inhale • 7s Deep Hold • 8s Extended Exhale',
    phases: [
      { name: 'Inhale', duration: 4, cue: 'Quietly inhale through your nose with tongue tip behind upper teeth' },
      { name: 'Hold', duration: 7, cue: 'Hold breath steadily, allowing oxygen saturation to rise' },
      { name: 'Exhale', duration: 8, cue: 'Whoosh exhale completely through mouth with audible sound' }
    ],
    totalCyclesTarget: 4,
    description: 'The extended 8-second exhale powerfully engages the parasympathetic rest-and-digest system, ideal before sleep or acute stress.',
    colorScheme: {
      bgGradient: 'from-purple-950 via-violet-950 to-slate-950',
      orbGradient: 'from-purple-400 via-violet-500 to-fuchsia-400',
      accentGlow: 'rgba(168, 85, 247, 0.45)',
      textColor: 'text-purple-300',
      borderColor: 'border-purple-500/30'
    }
  },
  'ACT-04': {
    name: 'Alternate Nostril Breathing',
    subtitle: 'Nadi Shodhana Hemispheric Synchronization',
    patternName: '4s Left Inhale • 4s Right Exhale • 4s Right Inhale • 4s Left Exhale',
    phases: [
      { name: 'Inhale', duration: 4, cue: 'Close right nostril with thumb -> Inhale through Left nostril' },
      { name: 'Hold', duration: 2, cue: 'Close both nostrils softly and pause' },
      { name: 'Exhale', duration: 4, cue: 'Open right nostril -> Exhale completely through Right' },
      { name: 'Inhale', duration: 4, cue: 'Keep right nostril open -> Inhale deeply through Right' },
      { name: 'Hold', duration: 2, cue: 'Close both nostrils softly and pause' },
      { name: 'Exhale', duration: 4, cue: 'Open left nostril -> Exhale completely through Left' }
    ],
    totalCyclesTarget: 4,
    description: 'Harmonizes left (logical) and right (creative) brain hemispheres, clearing mental fog and calming agitated thought loops.',
    colorScheme: {
      bgGradient: 'from-amber-950 via-orange-950 to-slate-950',
      orbGradient: 'from-amber-400 via-orange-500 to-rose-400',
      accentGlow: 'rgba(245, 158, 11, 0.45)',
      textColor: 'text-amber-300',
      borderColor: 'border-amber-500/30'
    }
  }
};

export const MoodLiftBreathingPlayer: React.FC<BaseActivityComponentProps> = ({
  activityId = 'ACT-01',
  activityName,
  onComplete
}) => {
  const config = BREATHING_CONFIGS[activityId] || BREATHING_CONFIGS['ACT-01'];

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [secondsRemainingInPhase, setSecondsRemainingInPhase] = useState(config.phases[0].duration);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [preAnxiety] = useState(7);
  const [postAnxiety, setPostAnxiety] = useState(3);
  const [showCompletion, setShowCompletion] = useState(false);
  const [sessionDurationSecs, setSessionDurationSecs] = useState(0);

  const currentPhase = config.phases[currentPhaseIndex];

  // Play peaceful chime
  const playChime = (type: 'inhale' | 'exhale' | 'hold' | 'complete') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const freq = type === 'inhale' ? 528 : type === 'exhale' ? 396 : type === 'complete' ? 639 : 432;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    } catch (e) {
      // audio restrictions
    }
  };

  // Timer loop
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && !showCompletion) {
      interval = setInterval(() => {
        setSessionDurationSecs((prev) => prev + 1);
        setSecondsRemainingInPhase((prev) => {
          if (prev <= 1) {
            // Advance phase
            const nextIndex = (currentPhaseIndex + 1) % config.phases.length;
            if (nextIndex === 0) {
              // Completed a cycle
              setCompletedCycles((c) => {
                const updated = c + 1;
                if (updated >= config.totalCyclesTarget) {
                  setIsPlaying(false);
                  setShowCompletion(true);
                  playChime('complete');
                  if (onComplete) {
                    onComplete({
                      activityId,
                      cycles: updated,
                      preAnxiety,
                      postAnxiety,
                      durationSecs: sessionDurationSecs + 1
                    });
                  }
                }
                return updated;
              });
            }

            setCurrentPhaseIndex(nextIndex);
            const nextDuration = config.phases[nextIndex].duration;
            const phaseType = config.phases[nextIndex].name.toLowerCase().includes('inhale')
              ? 'inhale'
              : config.phases[nextIndex].name.toLowerCase().includes('exhale')
              ? 'exhale'
              : 'hold';
            playChime(phaseType as any);
            return nextDuration;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentPhaseIndex, config, showCompletion, preAnxiety, postAnxiety, activityId, onComplete, sessionDurationSecs]);

  const handleTogglePlay = () => {
    if (!isPlaying) {
      playChime('inhale');
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentPhaseIndex(0);
    setSecondsRemainingInPhase(config.phases[0].duration);
    setCompletedCycles(0);
    setShowCompletion(false);
    setSessionDurationSecs(0);
  };

  return (
    <div className={`w-full rounded-3xl bg-gradient-to-b ${config.colorScheme.bgGradient} p-6 sm:p-8 text-white shadow-2xl border ${config.colorScheme.borderColor} relative overflow-hidden font-['Plus_Jakarta_Sans']`}>
      {/* Background Decorative Rings */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/15 shrink-0 shadow-inner">
            <Wind className={`w-6 h-6 ${config.colorScheme.textColor} animate-pulse`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 ${config.colorScheme.textColor} border border-white/15`}>
                {activityId} • BREATHING THERAPY
              </span>
              <span className="text-xs text-white/50 font-medium">
                Cycle {completedCycles}/{config.totalCyclesTarget}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5 tracking-tight">
              {activityName || config.name}
            </h2>
            <p className="text-xs text-white/70 font-medium mt-0.5">{config.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/15 transition-all text-xs flex items-center gap-1.5"
            title="Toggle meditative chimes"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-white/40" />}
          </button>
          <button
            onClick={handleReset}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/15 transition-all text-xs flex items-center gap-1.5"
            title="Reset Session"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Breathing Biofeedback Arena */}
      {!showCompletion ? (
        <div className="py-8 relative z-10 flex flex-col items-center justify-center">
          {/* Pattern Ribbon */}
          <div className="mb-6 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-white/80 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Pacing Protocol: {config.patternName}</span>
          </div>

          {/* Central Pulsing Diaphragm Orb */}
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center my-4">
            {/* Outer Expanding Halo */}
            <div
              className={`absolute rounded-full transition-all duration-1000 ease-in-out`}
              style={{
                width: currentPhase.name === 'Inhale' ? '100%' : currentPhase.name === 'Exhale' ? '65%' : '85%',
                height: currentPhase.name === 'Inhale' ? '100%' : currentPhase.name === 'Exhale' ? '65%' : '85%',
                background: `radial-gradient(circle, ${config.colorScheme.accentGlow} 0%, rgba(0,0,0,0) 70%)`
              }}
            />

            {/* Glowing Center Core */}
            <div
              className={`relative rounded-full bg-gradient-to-tr ${config.colorScheme.orbGradient} p-1 shadow-2xl flex flex-col items-center justify-center text-center transition-all duration-1000 ease-in-out cursor-pointer select-none`}
              style={{
                width: currentPhase.name === 'Inhale' ? '210px' : currentPhase.name === 'Exhale' ? '145px' : '180px',
                height: currentPhase.name === 'Inhale' ? '210px' : currentPhase.name === 'Exhale' ? '145px' : '180px',
                boxShadow: `0 0 50px ${config.colorScheme.accentGlow}`
              }}
              onClick={handleTogglePlay}
            >
              <div className="w-full h-full rounded-full bg-slate-950/40 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-white/90">
                  {isPlaying ? currentPhase.name : 'Ready'}
                </span>
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tighter my-1">
                  {isPlaying ? secondsRemainingInPhase : 'Start'}
                </span>
                <span className="text-[11px] font-semibold text-white/80">
                  {isPlaying ? `${currentPhase.duration}s target` : 'Click to begin'}
                </span>
              </div>
            </div>
          </div>

          {/* Real-Time Somatic Instruction Cue */}
          <div className="max-w-md text-center mt-2 px-4 py-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
            <p className="text-sm sm:text-base font-bold text-white tracking-wide">
              {isPlaying ? currentPhase.cue : 'Sit comfortably with feet flat, shoulders dropped, and follow the rhythm.'}
            </p>
          </div>

          {/* Controls & Progress */}
          <div className="w-full max-w-md mt-6 space-y-4">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleTogglePlay}
                className={`px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center gap-2.5 shadow-xl transition-all ${
                  isPlaying
                    ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" /> Pause Exercise
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" /> Begin Breathwork
                  </>
                )}
              </button>
            </div>

            {/* Cycle Gauge */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-white/70">
                <span>Session Target: {config.totalCyclesTarget} Breath Cycles</span>
                <span>{Math.round((completedCycles / config.totalCyclesTarget) * 100)}% Complete</span>
              </div>
              <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, (completedCycles / config.totalCyclesTarget) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Completion State */
        <div className="py-10 text-center space-y-6 relative z-10 max-w-lg mx-auto animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-2xl">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-white">Exercise Complete!</h3>
            <p className="text-xs sm:text-sm text-white/70 mt-1">
              You completed {completedCycles} mindful breath cycles ({Math.floor(sessionDurationSecs / 60)}m {sessionDurationSecs % 60}s).
            </p>
          </div>

          {/* Pre / Post SUDS Anxiety Check */}
          <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-4 text-left">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
              <Activity className="w-4 h-4" /> Somatic SUDS Tension Check
            </h4>
            <div className="grid grid-cols-2 gap-4 text-xs font-bold text-white">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="text-white/50 text-[10px] uppercase">Pre-Session Tension</div>
                <div className="text-xl text-amber-400 font-black mt-0.5">{preAnxiety} / 10</div>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                <div className="text-emerald-300/70 text-[10px] uppercase">Post-Session Tension</div>
                <div className="text-xl text-emerald-400 font-black mt-0.5">{postAnxiety} / 10</div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-white/70 font-semibold">Rate your current tension level now (1-10):</label>
              <input
                type="range"
                min="1"
                max="10"
                value={postAnxiety}
                onChange={(e) => setPostAnxiety(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Repeat Session
            </button>
          </div>
        </div>
      )}

      {/* Clinical Reference Box */}
      <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-white/60 relative z-10">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-white/40 shrink-0" />
          <span>{config.description}</span>
        </div>
      </div>
    </div>
  );
};

export default MoodLiftBreathingPlayer;
