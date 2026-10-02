import React, { useState, useEffect, useRef } from 'react';
import {
  Wind,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  Activity,
  Heart,
  ShieldCheck
} from 'lucide-react';
import type { BaseActivityComponentProps } from '../types';
import { audioEngine } from '../utils/therapeuticAudioEngine';

interface BreathingConfig {
  title: string;
  categoryTag: string;
  badge: string;
  pacingDesc: string;
  phases: { name: 'Inhale' | 'Hold' | 'Exhale' | 'Hold (Rest)'; duration: number; cue: string; voiceCue: string; color: string }[];
  targetCycles: number;
  clinicalEffect: string;
  primaryGlow: string;
  secondaryGlow: string;
}

const BREATH_PROTOCOLS: Record<string, BreathingConfig> = {
  'ACT-01': {
    title: 'Diaphragmatic Bio-Breathing',
    categoryTag: 'VAGAL STIMULATION',
    badge: 'PARASYMPATHETIC ACTIVATOR',
    pacingDesc: '4s Deep Inhale • 2s Stillness • 6s Slow Exhale',
    phases: [
      { name: 'Inhale', duration: 4, cue: 'Expand lower abdomen deeply, allowing diaphragm to descend', voiceCue: 'Breathe in deeply through your nose, expanding your belly', color: '#5e2be2' },
      { name: 'Hold', duration: 2, cue: 'Suspend air effortlessly with open throat & dropped shoulders', voiceCue: 'Hold softly and stay peaceful', color: '#7c3aed' },
      { name: 'Exhale', duration: 6, cue: 'Gently release through pursed lips, emptying lungs completely', voiceCue: 'Slowly exhale through your mouth, releasing all tension', color: '#06b6d4' }
    ],
    targetCycles: 6,
    clinicalEffect: 'Lowers systemic blood pressure, stimulates acetylcholine release via the vagus nerve, and restores heart-rate variability (HRV).',
    primaryGlow: '#5e2be2',
    secondaryGlow: '#06b6d4'
  },
  'ACT-02': {
    title: 'Tactical Box Resonance',
    categoryTag: 'NEURO-REGULATION',
    badge: 'TACTICAL FOCUS PROTOCOL',
    pacingDesc: '4s Inhale • 4s Retain • 4s Exhale • 4s Empty Hold',
    phases: [
      { name: 'Inhale', duration: 4, cue: 'Inhale smoothly through the nose, expanding chest and ribs evenly', voiceCue: 'Inhale steadily for four seconds', color: '#4f46e5' },
      { name: 'Hold', duration: 4, cue: 'Hold breath with tranquil focus, maintaining total physical stillness', voiceCue: 'Hold your breath, staying perfectly still', color: '#7c3aed' },
      { name: 'Exhale', duration: 4, cue: 'Release breath in a controlled, steady stream through the mouth', voiceCue: 'Exhale smoothly and empty your lungs', color: '#06b6d4' },
      { name: 'Hold (Rest)', duration: 4, cue: 'Rest calmly in the empty space before the next breath', voiceCue: 'Rest in the quiet pause', color: '#2563eb' }
    ],
    targetCycles: 5,
    clinicalEffect: 'Equalizes autonomic nervous system balance (SNS/PNS ratio), eliminating cognitive tunnel vision under acute distress.',
    primaryGlow: '#4f46e5',
    secondaryGlow: '#7c3aed'
  },
  'ACT-03': {
    title: '4-7-8 Somatic Tranquilizer',
    categoryTag: 'NEURAL SEDATIVE',
    badge: 'RAPID ANXIOLYTIC RESET',
    pacingDesc: '4s Inhale • 7s Oxygen Lock • 8s Whoosh Exhale',
    phases: [
      { name: 'Inhale', duration: 4, cue: 'Inhale quietly through nose with tip of tongue against roof of mouth', voiceCue: 'Inhale quietly through your nose', color: '#5e2be2' },
      { name: 'Hold', duration: 7, cue: 'Retain oxygen deeply, allowing cellular perfusion and brain calming', voiceCue: 'Hold your breath for seven seconds', color: '#db2777' },
      { name: 'Exhale', duration: 8, cue: 'Whoosh exhale completely through mouth with an audible releasing sigh', voiceCue: 'Whoosh exhale all the air out slowly', color: '#059669' }
    ],
    targetCycles: 4,
    clinicalEffect: 'Dr. Andrew Weil ratio forces carbon dioxide expulsion, triggering deep autonomic downregulation within 90 seconds.',
    primaryGlow: '#5e2be2',
    secondaryGlow: '#db2777'
  },
  'ACT-04': {
    title: 'Alternate Nostril Synapse Flow',
    categoryTag: 'HEMISPHERIC BALANCE',
    badge: 'NADI SHODHANA HARMONIZER',
    pacingDesc: '4s Left Inhale • 2s Hold • 4s Right Exhale • 4s Right Inhale • 4s Left Exhale',
    phases: [
      { name: 'Inhale', duration: 4, cue: 'Block right nostril with thumb -> Inhale deeply through Left nostril', voiceCue: 'Close right nostril, inhale through the left', color: '#d97706' },
      { name: 'Hold', duration: 2, cue: 'Close both nostrils softly and pause in calm equilibrium', voiceCue: 'Hold both nostrils closed', color: '#7c3aed' },
      { name: 'Exhale', duration: 4, cue: 'Release right nostril -> Exhale completely through Right side', voiceCue: 'Open right nostril and exhale', color: '#db2777' },
      { name: 'Inhale', duration: 4, cue: 'Keep right nostril open -> Inhale smoothly through Right nostril', voiceCue: 'Inhale through the right nostril', color: '#06b6d4' },
      { name: 'Hold', duration: 2, cue: 'Close both nostrils softly and pause in calm equilibrium', voiceCue: 'Hold gently', color: '#7c3aed' },
      { name: 'Exhale', duration: 4, cue: 'Release left nostril -> Exhale completely through Left side', voiceCue: 'Open left nostril and exhale completely', color: '#059669' }
    ],
    targetCycles: 4,
    clinicalEffect: 'Harmonizes EEG brainwave activity across both cerebral hemispheres, dispelling brain fog and ruminative overdrive.',
    primaryGlow: '#d97706',
    secondaryGlow: '#5e2be2'
  }
};

export const MoodLiftBreathingPlayer: React.FC<BaseActivityComponentProps> = ({
  activityId = 'ACT-01',
  activityName,
  onComplete
}) => {
  const protocol = BREATH_PROTOCOLS[activityId] || BREATH_PROTOCOLS['ACT-01'];

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [phaseIndex, setPhaseIndex] = useState<number>(0);
  const [phaseSecsLeft, setPhaseSecsLeft] = useState<number>(protocol.phases[0].duration);
  const [completedCycles, setCompletedCycles] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const [hrvCoherence, setHrvCoherence] = useState<number>(64);
  const [postSuds, setPostSuds] = useState<number>(2);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);

  const currentPhase = protocol.phases[phaseIndex];

  // Sync state to engine
  useEffect(() => {
    audioEngine.soundEnabled = soundEnabled;
    audioEngine.voiceEnabled = voiceEnabled;
  }, [soundEnabled, voiceEnabled]);

  const triggerPhaseFeedback = (phase: typeof currentPhase) => {
    if (phase.name === 'Inhale') {
      audioEngine.playSfx('inhale_whoosh');
    } else if (phase.name === 'Exhale') {
      audioEngine.playSfx('exhale_whoosh');
    } else {
      audioEngine.playSfx('singing_bowl');
    }

    if (voiceEnabled) {
      audioEngine.speak(phase.voiceCue);
    }
  };

  // 60FPS Realistic Canvas Particle Vortex Simulation (Light Theme Palette)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    let height = (canvas.height = 360);

    interface Particle {
      x: number;
      y: number;
      radius: number;
      angle: number;
      distance: number;
      speed: number;
      baseAlpha: number;
      color: string;
    }

    const particleCount = 160;
    const particles: Particle[] = [];
    const colors = ['#5e2be2', '#7c3aed', '#06b6d4', '#db2777', '#3b82f6'];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: width / 2,
        y: height / 2,
        radius: Math.random() * 2.5 + 1.2,
        angle: Math.random() * Math.PI * 2,
        distance: Math.random() * 95 + 35,
        speed: (Math.random() * 0.015 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
        baseAlpha: Math.random() * 0.6 + 0.25,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    let pulseRadius = 75;
    let targetPulseRadius = 75;
    let rotation = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (isPlaying) {
        if (currentPhase.name === 'Inhale') {
          targetPulseRadius = 140;
        } else if (currentPhase.name === 'Exhale') {
          targetPulseRadius = 65;
        } else {
          targetPulseRadius = 120;
        }
      } else {
        targetPulseRadius = 80;
      }

      pulseRadius += (targetPulseRadius - pulseRadius) * 0.04;
      rotation += 0.008;

      const centerX = width / 2;
      const centerY = height / 2;

      // Soft Light Background Glow Halo
      const bgGrad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, pulseRadius * 1.7);
      bgGrad.addColorStop(0, `${currentPhase.color}15`);
      bgGrad.addColorStop(0.6, `${protocol.secondaryGlow}08`);
      bgGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius * 1.7, 0, Math.PI * 2);
      ctx.fill();

      // Resonance Shockwave Rings
      for (let r = 1; r <= 3; r++) {
        ctx.strokeStyle = `${currentPhase.color}${Math.floor((0.25 / r) * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 10]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius + r * 20, rotation * r, rotation * r + Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Bioluminescent Floating Atoms
      particles.forEach((p) => {
        p.angle += p.speed;
        const currentDist = (p.distance / 80) * pulseRadius;
        const px = centerX + Math.cos(p.angle) * currentDist;
        const py = centerY + Math.sin(p.angle) * currentDist;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.baseAlpha * (pulseRadius / 100);
        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // Central Hexpertify Purple-Violet-Cyan Biofeedback Sphere
      const sphereGrad = ctx.createRadialGradient(
        centerX - pulseRadius * 0.25,
        centerY - pulseRadius * 0.25,
        pulseRadius * 0.08,
        centerX,
        centerY,
        pulseRadius
      );
      sphereGrad.addColorStop(0, '#ffffff');
      sphereGrad.addColorStop(0.3, currentPhase.color);
      sphereGrad.addColorStop(0.75, protocol.secondaryGlow);
      sphereGrad.addColorStop(1, '#3b148a');

      ctx.save();
      ctx.shadowColor = `${currentPhase.color}66`;
      ctx.shadowBlur = 30;
      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Outer Crisp Rim
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      animFrameId.current = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [isPlaying, currentPhase, protocol]);

  // Main Breathing Interval Controller
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && !isCompleted) {
      timer = setInterval(() => {
        setSessionSeconds((s) => s + 1);
        setPhaseSecsLeft((prev) => {
          if (prev <= 1) {
            const nextIndex = (phaseIndex + 1) % protocol.phases.length;

            if (nextIndex === 0) {
              setCompletedCycles((c) => {
                const updated = c + 1;
                setHrvCoherence((h) => Math.min(98, h + 6));
                if (updated >= protocol.targetCycles) {
                  setIsPlaying(false);
                  setIsCompleted(true);
                  audioEngine.playSfx('celebration_chords');
                  audioEngine.speak('Excellent session. You have restored your autonomic balance and vagal tone.');
                  if (onComplete) {
                    onComplete({
                      activityId,
                      cyclesCompleted: updated,
                      coherenceScore: hrvCoherence + 6,
                      durationSeconds: sessionSeconds + 1
                    });
                  }
                }
                return updated;
              });
            }

            setPhaseIndex(nextIndex);
            const nextPhase = protocol.phases[nextIndex];
            triggerPhaseFeedback(nextPhase);
            return nextPhase.duration;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, phaseIndex, protocol, isCompleted, sessionSeconds, onComplete, activityId, hrvCoherence, voiceEnabled]);

  const handleTogglePlay = () => {
    audioEngine.playSfx('tactile_tap');
    if (!isPlaying) {
      triggerPhaseFeedback(currentPhase);
    } else {
      audioEngine.stopSpeaking();
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    audioEngine.playSfx('tactile_tap');
    audioEngine.stopSpeaking();
    setIsPlaying(false);
    setPhaseIndex(0);
    setPhaseSecsLeft(protocol.phases[0].duration);
    setCompletedCycles(0);
    setIsCompleted(false);
    setSessionSeconds(0);
    setHrvCoherence(64);
  };

  return (
    <div className="w-full rounded-3xl bg-white p-6 sm:p-8 text-slate-800 shadow-xl shadow-purple-500/5 border border-slate-100 relative overflow-hidden font-['Plus_Jakarta_Sans']">
      {/* Background Soft Ambient Blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-purple-100/60 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-cyan-100/50 blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 text-[#5e2be2] shadow-sm">
            <Wind className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-[#5e2be2] border border-purple-100">
                {activityId} • {protocol.badge}
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                Cycle {completedCycles}/{protocol.targetCycles}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
              {activityName || protocol.title}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">{protocol.pacingDesc}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-100 text-[11px] font-bold text-[#5e2be2] flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-current animate-pulse" />
            <span>Coherence: {hrvCoherence}%</span>
          </div>

          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2.5 rounded-xl border transition-all text-xs flex items-center gap-1.5 cursor-pointer ${
              voiceEnabled ? 'bg-purple-50 border-purple-200 text-[#5e2be2]' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
            title="Toggle Voice Guidance Coach"
          >
            {voiceEnabled ? <Mic className="w-4 h-4 text-[#5e2be2]" /> : <MicOff className="w-4 h-4 text-slate-400" />}
            <span className="hidden sm:inline font-bold text-[10px]">{voiceEnabled ? 'Voice ON' : 'Voice OFF'}</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-all text-xs flex items-center cursor-pointer"
            title="Toggle Meditative Sound Effects"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>
          <button
            onClick={handleReset}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-all text-xs cursor-pointer"
            title="Reset Session"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isCompleted ? (
        <div className="py-6 relative z-10 flex flex-col items-center justify-center">
          {/* Canvas 3D Particle Bio-Sphere (Light Frame) */}
          <div className="relative w-full max-w-md h-80 flex items-center justify-center my-2">
            <canvas ref={canvasRef} className="w-full h-full absolute inset-0 z-0 pointer-events-none" />

            {/* Floating Live State */}
            <div className="relative z-10 text-center pointer-events-none select-none flex flex-col items-center justify-center">
              <span
                className="text-xs sm:text-sm font-black uppercase tracking-widest transition-colors duration-500 drop-shadow-sm text-white"
              >
                {isPlaying ? currentPhase.name : 'System Ready'}
              </span>
              <span className="text-5xl sm:text-6xl font-black text-white tracking-tighter my-1 drop-shadow-md">
                {isPlaying ? phaseSecsLeft : 'Start'}
              </span>
              <span className="text-[11px] font-bold text-white/90">
                {isPlaying ? `${currentPhase.duration}s Phase Target` : 'Tap Button Below'}
              </span>
            </div>
          </div>

          {/* Somatic Clinical Cue Card */}
          <div className="w-full max-w-lg mt-2 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-1 shadow-sm">
            <div className="text-[10px] uppercase font-black tracking-wider text-[#5e2be2] flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Somatic Guidance
            </div>
            <p className="text-sm sm:text-base font-bold text-slate-800 tracking-wide leading-snug">
              {isPlaying ? currentPhase.cue : 'Settle into a relaxed seated posture, soften your jaw, and click Begin.'}
            </p>
          </div>

          {/* Controls */}
          <div className="w-full max-w-md mt-6 space-y-4">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleTogglePlay}
                className={`px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center gap-3 shadow-lg transition-all cursor-pointer ${
                  isPlaying
                    ? 'bg-purple-100 hover:bg-purple-200 text-[#5e2be2] border border-purple-200'
                    : 'bg-gradient-to-r from-[#5e2be2] to-indigo-600 hover:from-[#5022c4] hover:to-indigo-700 text-white shadow-purple-500/25 transform hover:scale-[1.02]'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-5 h-5 fill-current" /> Pause Session
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" /> Begin Breathwork
                  </>
                )}
              </button>
            </div>

            {/* Session Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>Protocol Target: {protocol.targetCycles} Full Cycles</span>
                <span className="text-[#5e2be2] font-black">{Math.round((completedCycles / protocol.targetCycles) * 100)}% Complete</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-[#5e2be2] to-cyan-500 transition-all duration-500 rounded-full shadow-sm"
                  style={{ width: `${Math.min(100, (completedCycles / protocol.targetCycles) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Clinical Completion Ceremony */
        <div className="py-10 text-center space-y-6 relative z-10 max-w-lg mx-auto animate-fade-in">
          <div className="w-24 h-24 rounded-3xl bg-purple-50 border border-purple-100 p-1 mx-auto shadow-xl shadow-purple-500/10 flex items-center justify-center">
            <div className="w-full h-full rounded-3xl bg-white flex items-center justify-center text-[#5e2be2]">
              <CheckCircle2 className="w-12 h-12" />
            </div>
          </div>

          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900">Vagal Equilibrium Restored</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Completed {completedCycles} breathwork cycles in {Math.floor(sessionSeconds / 60)}m {sessionSeconds % 60}s.
            </p>
          </div>

          {/* Autonomic Coherence Card */}
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/80 space-y-4 text-left shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs uppercase tracking-wider text-[#5e2be2] flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> Neural Coherence Index
              </span>
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                OPTIMAL PARASYMPATHETIC STATE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-2xl border border-slate-200">
                <div className="text-slate-400 text-[10px] uppercase font-bold">HRV Coherence</div>
                <div className="text-2xl text-[#5e2be2] font-black mt-0.5">{hrvCoherence}%</div>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-200">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Somatic Calm Rating</div>
                <div className="text-2xl text-emerald-600 font-black mt-0.5">{10 - postSuds} / 10</div>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] text-slate-600 font-bold">Rate your residual tension (0 = Serene, 10 = High):</label>
              <input
                type="range"
                min="0"
                max="10"
                value={postSuds}
                onChange={(e) => setPostSuds(Number(e.target.value))}
                className="w-full accent-[#5e2be2]"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={handleReset}
              className="px-8 py-3.5 bg-gradient-to-r from-[#5e2be2] to-indigo-600 hover:from-[#5022c4] text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-purple-500/25 cursor-pointer flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Repeat Session
            </button>
          </div>
        </div>
      )}

      {/* Clinical Footer */}
      <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500 relative z-10 font-medium">
        <ShieldCheck className="w-4 h-4 text-[#5e2be2] shrink-0" />
        <span>{protocol.clinicalEffect}</span>
      </div>
    </div>
  );
};

export default MoodLiftBreathingPlayer;
