import React, { useState, useEffect } from 'react';
import {
  Brain,
  Eye,
  Hand,
  Volume2,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  Heart,
  Zap,
  Tag,
  Compass
} from 'lucide-react';
import type { BaseActivityComponentProps } from '../types';

interface MindfulnessActivityProps extends BaseActivityComponentProps {
  activityId?: string;
}

export const MoodLiftMindfulnessGrounding: React.FC<MindfulnessActivityProps> = ({
  activityId = 'ACT-05',
  activityName,
  onComplete
}) => {
  // Activity ID Routing
  if (activityId === 'ACT-05') {
    return <DescribeYourRoomGame activityName={activityName} onComplete={onComplete} />;
  } else if (activityId === 'ACT-06') {
    return <NameTheMomentGame activityName={activityName} onComplete={onComplete} />;
  } else if (activityId === 'ACT-07') {
    return <PhysicalGroundingGame activityName={activityName} onComplete={onComplete} />;
  } else {
    return <CognitiveGroundingGame activityName={activityName} onComplete={onComplete} />;
  }
};

/* ─────────────────────────────────────────────────────────────
   ACT-05: DESCRIBE YOUR ROOM (Sensory Detail Anchoring)
   ───────────────────────────────────────────────────────────── */
function DescribeYourRoomGame({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [step, setStep] = useState(1);
  const [items, setItems] = useState({
    item1: { name: '', color: '', texture: '', shadow: '' },
    item2: { name: '', color: '', texture: '', shadow: '' },
    item3: { name: '', color: '', texture: '', shadow: '' }
  });
  const [completed, setCompleted] = useState(false);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      setCompleted(true);
      if (onComplete) onComplete({ items });
    }
  };

  const handleReset = () => {
    setStep(1);
    setItems({
      item1: { name: '', color: '', texture: '', shadow: '' },
      item2: { name: '', color: '', texture: '', shadow: '' },
      item3: { name: '', color: '', texture: '', shadow: '' }
    });
    setCompleted(false);
  };

  const currentKey = `item${step}` as keyof typeof items;

  return (
    <div className="w-full rounded-3xl bg-gradient-to-b from-blue-950 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-2xl border border-blue-500/20 font-['Plus_Jakarta_Sans'] relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-400/30 text-blue-300">
            <Eye className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
              ACT-05 • MINDFUL SENSORY ANCHOR
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">{activityName || 'Describe Your Room'}</h2>
            <p className="text-xs text-white/70">Neutralize racing thoughts by objectively cataloging your surroundings.</p>
          </div>
        </div>
        <button onClick={handleReset} className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {!completed ? (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex items-center justify-between text-xs font-bold text-blue-300">
            <span>Object Observation {step} of 3</span>
            <span>Step {step}/3</span>
          </div>

          <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-400" />
                Spot an object in your room right now:
              </label>
              <input
                type="text"
                placeholder="e.g. Wooden coffee table, Ceramic mug, Plant leaf"
                value={items[currentKey].name}
                onChange={(e) => setItems({ ...items, [currentKey]: { ...items[currentKey], name: e.target.value } })}
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-blue-400 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-white/70">Exact Color Shade</label>
                <input
                  type="text"
                  placeholder="e.g. Deep olive green"
                  value={items[currentKey].color}
                  onChange={(e) => setItems({ ...items, [currentKey]: { ...items[currentKey], color: e.target.value } })}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-blue-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-white/70">Texture / Surface</label>
                <input
                  type="text"
                  placeholder="e.g. Smooth, matte finish"
                  value={items[currentKey].texture}
                  onChange={(e) => setItems({ ...items, [currentKey]: { ...items[currentKey], texture: e.target.value } })}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-blue-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-white/70">Shadow & Light</label>
                <input
                  type="text"
                  placeholder="e.g. Highlight on top edge"
                  value={items[currentKey].shadow}
                  onChange={(e) => setItems({ ...items, [currentKey]: { ...items[currentKey], shadow: e.target.value } })}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all"
            >
              {step === 3 ? 'Complete Observation' : 'Next Object'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 space-y-5 max-w-md mx-auto animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-400/40 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">Anchored in the Present!</h3>
            <p className="text-xs text-white/70 mt-1">
              By cataloging 3 concrete physical objects with precision, your brain has returned from internal worry to objective physical safety.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
          >
            Practice Again
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ACT-06: NAME THE MOMENT (Emotional Labeling & Self-Compassion)
   ───────────────────────────────────────────────────────────── */
function NameTheMomentGame({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [selectedEmotion, setSelectedEmotion] = useState<string>('');
  const [intensity, setIntensity] = useState<number>(7);
  const [selfCompassionStatement, setSelfCompassionStatement] = useState<string>('');
  const [completed, setCompleted] = useState<boolean>(false);

  const emotionsList = [
    { label: 'Anxious / Restless', color: 'from-amber-500 to-orange-600', note: 'Heightened nervous system readiness' },
    { label: 'Overwhelmed', color: 'from-rose-500 to-red-600', note: 'Too many cognitive inputs at once' },
    { label: 'Self-Critical', color: 'from-purple-500 to-indigo-600', note: 'Harsh internal judging voice' },
    { label: 'Exhausted', color: 'from-blue-500 to-slate-600', note: 'Depleted somatic & emotional battery' },
    { label: 'Uncertain / Fearful', color: 'from-teal-500 to-emerald-600', note: 'Discomfort with future unknowns' },
    { label: 'Frustrated', color: 'from-red-500 to-orange-600', note: 'Blocked expectations or boundaries' }
  ];

  const handleFinish = () => {
    setCompleted(true);
    if (onComplete) {
      onComplete({ selectedEmotion, intensity, selfCompassionStatement });
    }
  };

  const handleReset = () => {
    setSelectedEmotion('');
    setIntensity(7);
    setSelfCompassionStatement('');
    setCompleted(false);
  };

  return (
    <div className="w-full rounded-3xl bg-gradient-to-b from-purple-950 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-2xl border border-purple-500/20 font-['Plus_Jakarta_Sans'] relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/20 rounded-2xl border border-purple-400/30 text-purple-300">
            <Heart className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-400/30">
              ACT-06 • EMOTIONAL LABELING & COMPASSION
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">{activityName || 'Name the Moment'}</h2>
            <p className="text-xs text-white/70">"Name it to tame it" — reduce amygdala activation through non-judgmental awareness.</p>
          </div>
        </div>
        <button onClick={handleReset} className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {!completed ? (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="space-y-3">
            <label className="text-xs font-bold text-purple-300 flex items-center gap-2">
              <Tag className="w-4 h-4" /> 1. Select what you are feeling in this exact moment:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {emotionsList.map((e) => (
                <button
                  key={e.label}
                  onClick={() => {
                    setSelectedEmotion(e.label);
                    setSelfCompassionStatement(`Even though I feel ${e.label.toLowerCase()}, this feeling is temporary and I treat myself with kindness.`);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedEmotion === e.label
                      ? 'bg-purple-600/40 border-purple-400 text-white shadow-lg shadow-purple-500/30 ring-2 ring-purple-400'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  <div className="font-extrabold text-xs">{e.label}</div>
                  <div className="text-[10px] text-white/50 mt-1 leading-tight">{e.note}</div>
                </button>
              ))}
            </div>
          </div>

          {selectedEmotion && (
            <div className="space-y-4 p-5 bg-white/5 rounded-2xl border border-white/10 animate-fade-in">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-purple-300">2. Emotion Intensity Rating</span>
                  <span className="text-amber-300">{intensity} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full accent-purple-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-purple-300">
                  3. Self-Compassion Anchor Statement:
                </label>
                <textarea
                  rows={2}
                  value={selfCompassionStatement}
                  onChange={(e) => setSelfCompassionStatement(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400 font-medium"
                />
              </div>

              <button
                onClick={handleFinish}
                className="w-full py-3 bg-purple-500 hover:bg-purple-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 transition-all"
              >
                Validate & Release Moment <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 space-y-5 max-w-md mx-auto animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-400/40 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">Emotion Validated & Honored</h3>
            <p className="text-xs text-white/70 mt-1">
              "{selfCompassionStatement}"
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
          >
            Check-In Again
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ACT-07: PHYSICAL GROUNDING (Somatic 5-Sense Grounder)
   ───────────────────────────────────────────────────────────── */
function PhysicalGroundingGame({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const steps = [
    { num: 5, sense: 'SEE', icon: Eye, prompt: 'Notice 5 things you can see right now around you.' },
    { num: 4, sense: 'FEEL', icon: Hand, prompt: 'Notice 4 physical sensations (clothes on skin, feet on floor).' },
    { num: 3, sense: 'HEAR', icon: Volume2, prompt: 'Notice 3 subtle sounds around or outside your space.' },
    { num: 2, sense: 'SMELL', icon: Sparkles, prompt: 'Notice 2 aromas in the air (coffee, breeze, skin scent).' },
    { num: 1, sense: 'TASTE/BREATHE', icon: Heart, prompt: 'Take 1 deep grounding breath and notice any taste or cool air.' }
  ];

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [completed, setCompleted] = useState(false);

  const step = steps[currentStepIdx];
  const StepIcon = step.icon;

  const handleNext = () => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx(currentStepIdx + 1);
    } else {
      setCompleted(true);
      if (onComplete) onComplete({ completed: true });
    }
  };

  const handleReset = () => {
    setCurrentStepIdx(0);
    setCompleted(false);
  };

  return (
    <div className="w-full rounded-3xl bg-gradient-to-b from-teal-950 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-2xl border border-teal-500/20 font-['Plus_Jakarta_Sans'] relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-500/20 rounded-2xl border border-teal-400/30 text-teal-300">
            <Hand className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-500/20 text-teal-300 border border-teal-400/30">
              ACT-07 • SOMATIC 5-4-3-2-1 ANCHOR
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">{activityName || 'Physical Grounding'}</h2>
            <p className="text-xs text-white/70">Interrupt sympathetic fight-or-flight by grounding all 5 physical senses.</p>
          </div>
        </div>
        <button onClick={handleReset} className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {!completed ? (
        <div className="max-w-lg mx-auto text-center space-y-6">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-1 mx-auto shadow-xl shadow-teal-500/20 flex items-center justify-center">
            <div className="w-full h-full rounded-3xl bg-slate-950/40 backdrop-blur-md flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-white">{step.num}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-teal-300">{step.sense}</span>
            </div>
          </div>

          <div className="p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-center gap-2 text-teal-300 font-bold text-xs uppercase mb-1">
              <StepIcon className="w-4 h-4" /> Step {currentStepIdx + 1} of 5
            </div>
            <p className="text-base sm:text-lg font-extrabold text-white">{step.prompt}</p>
          </div>

          <button
            onClick={handleNext}
            className="px-8 py-3.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-teal-500/30 transition-all mx-auto"
          >
            {currentStepIdx === 4 ? 'Complete Grounding' : 'I Have Noticed These'} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="text-center py-8 space-y-5 max-w-md mx-auto animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-400/40 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">Full Physical Connection Restored</h3>
            <p className="text-xs text-white/70 mt-1">
              Your body and brain have received the neural confirmation of physical safety.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
          >
            Repeat Somatic Anchor
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ACT-13: COGNITIVE GROUNDING (Brain-Anchoring Puzzles)
   ───────────────────────────────────────────────────────────── */
function CognitiveGroundingGame({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [puzzleType, setPuzzleType] = useState<'categories' | 'countdown' | 'alphabet'>('categories');
  const [timerSeconds, setTimerSeconds] = useState(45);
  const [isActive, setIsActive] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds((prev) => prev - 1), 1000);
    } else if (timerSeconds === 0) {
      setIsActive(false);
      if (onComplete) onComplete({ score, puzzleType });
    }
    return () => clearInterval(interval);
  }, [isActive, timerSeconds, score, puzzleType, onComplete]);

  const handleStart = (type: 'categories' | 'countdown' | 'alphabet') => {
    setPuzzleType(type);
    setTimerSeconds(45);
    setScore(0);
    setIsActive(true);
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
              ACT-13 • COGNITIVE ENGAGEMENT PROTOCOL
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">{activityName || 'Cognitive Grounding'}</h2>
            <p className="text-xs text-white/70">Re-engage the prefrontal cortex with structured mental anchoring games.</p>
          </div>
        </div>
      </div>

      {!isActive ? (
        <div className="max-w-xl mx-auto space-y-4">
          <p className="text-xs text-center text-indigo-200 font-semibold mb-2">
            Select a cognitive anchoring challenge to shift brain energy from anxiety to focus:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => handleStart('categories')}
              className="p-4 rounded-2xl bg-white/5 hover:bg-indigo-600/30 border border-white/10 text-left transition-all space-y-2"
            >
              <Zap className="w-5 h-5 text-amber-400" />
              <div className="font-extrabold text-xs">Category Blitz</div>
              <div className="text-[10px] text-white/60">Name items in specific categories (e.g. 5 animals, 5 cities).</div>
            </button>

            <button
              onClick={() => handleStart('countdown')}
              className="p-4 rounded-2xl bg-white/5 hover:bg-indigo-600/30 border border-white/10 text-left transition-all space-y-2"
            >
              <Compass className="w-5 h-5 text-teal-400" />
              <div className="font-extrabold text-xs">Reverse 7s</div>
              <div className="text-[10px] text-white/60">Count backwards from 100 by 7s (100, 93, 86, 79...).</div>
            </button>

            <button
              onClick={() => handleStart('alphabet')}
              className="p-4 rounded-2xl bg-white/5 hover:bg-indigo-600/30 border border-white/10 text-left transition-all space-y-2"
            >
              <Sparkles className="w-5 h-5 text-purple-400" />
              <div className="font-extrabold text-xs">A-Z Word Chain</div>
              <div className="text-[10px] text-white/60">Name a calming or positive word for each letter of the alphabet.</div>
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
            <span>{puzzleType.toUpperCase()} MODE</span>
            <span className="text-amber-300 font-black">{timerSeconds}s Remaining</span>
          </div>

          <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-3">
            {puzzleType === 'categories' && (
              <>
                <div className="text-xs font-bold text-amber-300 uppercase">Challenge Prompt</div>
                <div className="text-xl font-black text-white">"Name 5 green foods, 5 countries, and 5 book titles out loud"</div>
              </>
            )}
            {puzzleType === 'countdown' && (
              <>
                <div className="text-xs font-bold text-teal-300 uppercase">Challenge Prompt</div>
                <div className="text-xl font-black text-white">100 → 93 → 86 → 79 → 72 → 65 → 58...</div>
              </>
            )}
            {puzzleType === 'alphabet' && (
              <>
                <div className="text-xs font-bold text-purple-300 uppercase">Challenge Prompt</div>
                <div className="text-xl font-black text-white">A (Apples) → B (Breeze) → C (Calm) → D (Dawn)...</div>
              </>
            )}

            <div className="pt-2">
              <button
                onClick={() => setScore((s) => s + 1)}
                className="px-6 py-2 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black text-xs uppercase rounded-xl transition-all"
              >
                +1 Item Found ({score} Total)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MoodLiftMindfulnessGrounding;
