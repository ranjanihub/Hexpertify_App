import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  Lock,
  Archive,
  Clock,
  Scale,
  Sparkles,
  Zap,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import type { BaseActivityComponentProps } from '../types';
import { audioEngine } from '../utils/therapeuticAudioEngine';

export const MoodLiftCbtPlayer: React.FC<BaseActivityComponentProps> = ({
  activityId = 'ACT-10',
  activityName,
  onComplete
}) => {
  if (activityId === 'ACT-10') {
    return <CbtNeuralSynapseChallenger activityName={activityName} onComplete={onComplete} />;
  } else {
    return <HolographicWorryVault activityName={activityName} onComplete={onComplete} />;
  }
};

/* ─────────────────────────────────────────────────────────────
   ACT-10: CBT NEURAL RE-WIRE MATRIX (Synaptic Distortion Breaker)
   ───────────────────────────────────────────────────────────── */
function CbtNeuralSynapseChallenger({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [thoughtData, setThoughtData] = useState({
    automaticThought: '',
    distortion: 'Catastrophizing',
    evidenceFor: '',
    evidenceAgainst: '',
    balancedReframe: '',
    initialBelief: 85,
    finalBelief: 25
  });
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const distortions = [
    { name: 'Catastrophizing', desc: 'Predicting extreme worst-case scenarios without basis', badge: 'HIGH ANXIETY' },
    { name: 'All-or-Nothing', desc: 'Viewing performance as absolute perfection or total failure', badge: 'PERFECTIONISM' },
    { name: 'Mind Reading', desc: 'Projecting assumed negative judgments onto other people', badge: 'SOCIAL FEAR' },
    { name: 'Emotional Reasoning', desc: 'Assuming subjective feelings equal objective factual reality', badge: 'COGNITIVE BLINDSPOT' },
    { name: 'Overgeneralization', desc: 'Extrapolating a single unpleasant incident into an eternal rule', badge: 'HELPLESSNESS' },
    { name: 'Should Statements', desc: 'Imposing rigid, punitive rules upon yourself or others', badge: 'SELF-CRITICISM' }
  ];

  // Neural Synapse Network Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 500);
    let height = (canvas.height = 160);

    const nodes: { x: number; y: number; vx: number; vy: number; radius: number; color: string }[] = [];
    for (let i = 0; i < 24; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 3 + 2,
        color: i % 2 === 0 ? '#5e2be2' : '#06b6d4'
      });
    }

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw Synaptic Connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            ctx.strokeStyle = `rgba(139, 92, 246, ${1 - dist / 100})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw Nodes
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        ctx.fillStyle = n.color;
        ctx.shadowColor = n.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleSelectDistortion = (dName: string) => {
    audioEngine.playSfx('neural_sparkle');
    setThoughtData({ ...thoughtData, distortion: dName });
  };

  const handleStepAdvance = (nextStep: 1 | 2 | 3) => {
    audioEngine.playSfx('sonar_ping');
    setStep(nextStep);
    if (nextStep === 2) {
      audioEngine.speak('Now, weigh the factual evidence for and against this automatic thought.');
    } else if (nextStep === 3) {
      audioEngine.speak('Synthesize a grounded, compassionate reframe.');
    }
  };

  const handleFinish = () => {
    audioEngine.playSfx('celebration_chords');
    audioEngine.speak('Cognitive distortion successfully reframed and locked into memory.');
    setIsCompleted(true);
    if (onComplete) onComplete(thoughtData);
  };

  const handleReset = () => {
    audioEngine.playSfx('tactile_tap');
    setStep(1);
    setThoughtData({
      automaticThought: '',
      distortion: 'Catastrophizing',
      evidenceFor: '',
      evidenceAgainst: '',
      balancedReframe: '',
      initialBelief: 85,
      finalBelief: 25
    });
    setIsCompleted(false);
  };

  // Weight Calculation for Interactive Evidence Scales
  const forLength = thoughtData.evidenceFor.trim().length;
  const againstLength = thoughtData.evidenceAgainst.trim().length;
  const scaleTilt = againstLength > 0 ? Math.min(18, (againstLength - forLength) / 5) : 0;

  return (
    <div className="w-full rounded-3xl bg-[#090615] p-6 sm:p-8 text-white shadow-2xl border border-purple-500/20 relative overflow-hidden font-['Plus_Jakarta_Sans']">
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#5e2be2]/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#06b6d4]/20 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/30 text-purple-300 shadow-inner">
            <Brain className="w-6 h-6 animate-pulse text-[#8b5cf6]" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
              ACT-10 • BECK COGNITIVE MATRIX
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
              {activityName || 'CBT Thought-Challenger'}
            </h2>
            <p className="text-xs text-purple-200/80 font-semibold mt-0.5">
              Decouple emotional certainty from cognitive reality through systematic evidence restructuring.
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="p-2.5 bg-white/5 hover:bg-white/15 text-white rounded-xl border border-white/10 transition-all text-xs cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {!isCompleted ? (
        <div className="max-w-2xl mx-auto space-y-6 relative z-10">
          {/* Synapse Canvas Banner */}
          <div className="relative w-full h-24 rounded-2xl overflow-hidden border border-purple-500/20 bg-slate-950/60 flex items-center justify-center">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            <div className="relative z-10 px-4 py-1.5 rounded-full bg-slate-950/80 border border-purple-500/30 text-xs font-bold text-cyan-300 backdrop-blur-md flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
              <span>Step {step} of 3: {step === 1 ? 'Capture Automatic Thought & Distortion' : step === 2 ? 'Neural Evidence Weighing Scales' : 'Synthesize Balanced Reframe'}</span>
            </div>
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  1. Identify the Automatic Intrusive Thought:
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. If I don't get this project right on the first try, I will fail completely and lose respect."
                  value={thoughtData.automaticThought}
                  onChange={(e) => setThoughtData({ ...thoughtData, automaticThought: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950/80 border border-purple-500/30 rounded-2xl text-xs text-white placeholder-purple-300/40 focus:outline-none focus:border-cyan-400 transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  2. Select the Primary Cognitive Distortion Pattern:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {distortions.map((d) => (
                    <button
                      key={d.name}
                      onClick={() => handleSelectDistortion(d.name)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        thoughtData.distortion === d.name
                          ? 'bg-purple-900/50 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400'
                          : 'bg-slate-950/60 border-purple-500/20 text-purple-200/80 hover:bg-purple-900/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-white">{d.name}</span>
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-purple-500/20 text-cyan-300 border border-purple-500/30">
                          {d.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-purple-300/60 mt-1 leading-snug">{d.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  disabled={!thoughtData.automaticThought.trim()}
                  onClick={() => handleStepAdvance(2)}
                  className="px-8 py-3.5 bg-gradient-to-r from-[#5e2be2] to-[#06b6d4] hover:opacity-95 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-xl shadow-purple-500/30 transition-all cursor-pointer"
                >
                  Weigh Neural Evidence <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-xs flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-purple-300/60 font-bold">Tested Thought: </span>
                  <span className="font-bold text-white">"{thoughtData.automaticThought}"</span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {thoughtData.distortion}
                </span>
              </div>

              {/* Dynamic Interactive Tilt Scale Graphic */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-purple-500/20 text-center relative overflow-hidden">
                <div className="flex items-center justify-center gap-2 text-xs font-extrabold text-purple-300 uppercase mb-3">
                  <Scale className="w-4 h-4 text-cyan-400" /> Evidence Equilibrium Beam
                </div>
                <div
                  className="w-48 h-2 bg-gradient-to-r from-amber-500 via-purple-500 to-emerald-400 rounded-full mx-auto transition-transform duration-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                  style={{ transform: `rotate(${-scaleTilt}deg)` }}
                />
                <div className="flex justify-between text-[11px] font-bold text-purple-300/80 mt-2 max-w-sm mx-auto">
                  <span className="text-amber-400 font-bold">Distortion Weight: {forLength} pts</span>
                  <span className="text-emerald-400 font-bold">Objective Reality: {againstLength} pts</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Evidence Supporting the Thought:
                  </label>
                  <textarea
                    rows={4}
                    placeholder="List observable facts that seem to support it..."
                    value={thoughtData.evidenceFor}
                    onChange={(e) => setThoughtData({ ...thoughtData, evidenceFor: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-amber-500/30 rounded-2xl text-xs text-white placeholder-amber-300/40 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Counter-Evidence Against Thought:
                  </label>
                  <textarea
                    rows={4}
                    placeholder="List past successes, objective feedback, alternative outcomes..."
                    value={thoughtData.evidenceAgainst}
                    onChange={(e) => setThoughtData({ ...thoughtData, evidenceAgainst: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-emerald-500/30 rounded-2xl text-xs text-white placeholder-emerald-300/40 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => handleStepAdvance(3)}
                  className="px-8 py-3.5 bg-gradient-to-r from-[#5e2be2] to-[#06b6d4] text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-xl shadow-purple-500/30 cursor-pointer"
                >
                  Crystallize Reframe <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Synthesize Grounded Neural Reframe:
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Iteration is a natural part of mastery. A single mistake does not diminish my competence or value, and I have proven capability."
                  value={thoughtData.balancedReframe}
                  onChange={(e) => setThoughtData({ ...thoughtData, balancedReframe: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950/80 border border-emerald-500/30 rounded-2xl text-xs text-white placeholder-emerald-300/40 focus:outline-none focus:border-emerald-400 font-medium"
                />
              </div>

              <div className="p-5 bg-slate-950/80 rounded-3xl border border-purple-500/30 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-200">Belief in Original Thought Now</span>
                  <span className="text-sm font-black text-cyan-300 bg-cyan-500/10 px-3 py-0.5 rounded-full border border-cyan-500/30">
                    {thoughtData.finalBelief}% (Down from {thoughtData.initialBelief}%)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={thoughtData.finalBelief}
                  onChange={(e) => setThoughtData({ ...thoughtData, finalBelief: Number(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Back
                </button>
                <button
                  disabled={!thoughtData.balancedReframe.trim()}
                  onClick={handleFinish}
                  className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
                >
                  Lock Reframe into Memory <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Completion State */
        <div className="py-10 text-center space-y-6 relative z-10 max-w-lg mx-auto animate-fade-in">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-500 to-cyan-400 p-1 mx-auto shadow-[0_0_50px_rgba(16,185,129,0.4)] flex items-center justify-center">
            <div className="w-full h-full rounded-3xl bg-slate-950/80 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-12 h-12" />
            </div>
          </div>

          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-white">Cognitive Distortion Neutralized</h3>
            <p className="text-xs sm:text-sm text-purple-200/80 mt-1">
              Belief intensity reduced by {thoughtData.initialBelief - thoughtData.finalBelief}% through objective neural reframing.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-slate-950/90 border border-emerald-500/40 text-left space-y-2 shadow-2xl">
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Integrated Neural Anchor
            </div>
            <p className="text-sm font-bold text-white leading-relaxed">
              "{thoughtData.balancedReframe}"
            </p>
          </div>

          <button
            onClick={handleReset}
            className="px-8 py-3.5 bg-gradient-to-r from-[#5e2be2] to-[#06b6d4] text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xl shadow-purple-500/30 cursor-pointer"
          >
            Process Another Thought
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ACT-12: HOLOGRAPHIC WORRY VAULT (Postponement & Externalization)
   ───────────────────────────────────────────────────────────── */
function HolographicWorryVault({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [worryText, setWorryText] = useState<string>('');
  const [worryTime, setWorryTime] = useState<string>('5:30 PM');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [vaultPulse, setVaultPulse] = useState<boolean>(false);

  const handleDeposit = () => {
    if (!worryText.trim()) return;
    setVaultPulse(true);
    audioEngine.playSfx('vault_lock');
    audioEngine.speak('Worry safely sealed in the vault. You are released to focus on the present.');

    setTimeout(() => {
      setIsLocked(true);
      setVaultPulse(false);
      if (onComplete) onComplete({ worryText, worryTime });
    }, 600);
  };

  const handleReset = () => {
    audioEngine.playSfx('tactile_tap');
    setWorryText('');
    setIsLocked(false);
  };

  return (
    <div className="w-full rounded-3xl bg-[#090615] p-6 sm:p-8 text-white shadow-2xl border border-purple-500/20 relative overflow-hidden font-['Plus_Jakarta_Sans']">
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#5e2be2]/20 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/30 text-amber-300 shadow-inner">
            <Archive className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              ACT-12 • QUANTUM COGNITIVE VAULT
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
              {activityName || 'Worry Box'}
            </h2>
            <p className="text-xs text-purple-200/80 font-semibold mt-0.5">
              Quarantine intrusive thoughts into an encrypted container until designated Worry Time.
            </p>
          </div>
        </div>
      </div>

      {!isLocked ? (
        <div className="max-w-md mx-auto space-y-4 relative z-10">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> What worry is consuming your cognitive bandwidth?
            </label>
            <textarea
              rows={4}
              placeholder="Deposit your raw thought or fear into the vault to mentally disengage..."
              value={worryText}
              onChange={(e) => setWorryText(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950/80 border border-amber-500/30 rounded-2xl text-xs text-white placeholder-amber-300/40 focus:outline-none focus:border-amber-400 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-purple-200/80 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Scheduled Review Time:
              </label>
              <input
                type="text"
                value={worryTime}
                onChange={(e) => setWorryTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/80 border border-purple-500/30 rounded-xl text-xs text-white font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-purple-200/80">Container Status:</label>
              <div className="px-3 py-2 bg-purple-950/40 border border-purple-500/30 rounded-xl text-xs text-amber-300 font-black">
                {vaultPulse ? 'ENCRYPTING...' : 'AWAITING LOCK'}
              </div>
            </div>
          </div>

          <button
            disabled={!worryText.trim()}
            onClick={handleDeposit}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all cursor-pointer mt-2"
          >
            <Lock className="w-4 h-4" /> Lock & Seal in Worry Vault
          </button>
        </div>
      ) : (
        <div className="text-center py-10 space-y-6 max-w-md mx-auto animate-fade-in relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-600 p-1 mx-auto shadow-[0_0_50px_rgba(245,158,11,0.5)] flex items-center justify-center">
            <div className="w-full h-full rounded-3xl bg-slate-950/80 flex items-center justify-center text-amber-300">
              <Lock className="w-12 h-12 animate-pulse" />
            </div>
          </div>

          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-white">Worry Safely Quarantined</h3>
            <p className="text-xs sm:text-sm text-purple-200/80 mt-1 leading-relaxed">
              Your concern is secured. You have permission to live in the present until your scheduled worry window at <strong className="text-amber-400 font-bold">{worryTime}</strong>.
            </p>
          </div>

          <button
            onClick={handleReset}
            className="px-8 py-3.5 bg-white/10 hover:bg-white/15 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            Deposit Another Thought
          </button>
        </div>
      )}
    </div>
  );
}

export default MoodLiftCbtPlayer;
