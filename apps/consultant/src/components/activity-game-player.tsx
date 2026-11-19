import { useState, useEffect } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Brain, 
  Heart, 
  Wind, 
  Smile, 
  Check, 
  Award, 
  Star,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import GroundingTechnique54321 from "../activities/templates/GroundingTechnique54321";
import MoodLiftBreathingPlayer from "../activities/templates/MoodLiftBreathingPlayer";
import MoodLiftMindfulnessGrounding from "../activities/templates/MoodLiftMindfulnessGrounding";
import MoodLiftSomaticPlayer from "../activities/templates/MoodLiftSomaticPlayer";
import MoodLiftCbtPlayer from "../activities/templates/MoodLiftCbtPlayer";
import MoodLiftAffirmationPlayer from "../activities/templates/MoodLiftAffirmationPlayer";

interface ActivityGamePlayerProps {
  activity: {
    id: number | string;
    title: string;
    description: string;
    category: string;
    duration?: string;
    instructions?: string;
    assignedTherapistName?: string;
    [key: string]: any;
  };
  onComplete?: (submissionData?: any) => void;
}

export function ActivityGamePlayer({ activity, onComplete }: ActivityGamePlayerProps) {
  const category = (activity.category || "").toUpperCase();
  const id = String(activity.templateId || activity.id || activity._id || "");
  const title = activity.title || activity.name || "";
  const lower = title.toLowerCase();

  if (category === "BREATHING" || ["ACT-01", "ACT-02", "ACT-03", "ACT-04"].includes(id)) {
    let resolvedId = id;
    if (!["ACT-01", "ACT-02", "ACT-03", "ACT-04"].includes(id)) {
      if (lower.includes("box")) resolvedId = "ACT-02";
      else if (lower.includes("4-7-8") || lower.includes("478")) resolvedId = "ACT-03";
      else if (lower.includes("alternate") || lower.includes("nostril")) resolvedId = "ACT-04";
      else resolvedId = "ACT-01";
    }
    return <MoodLiftBreathingPlayer activityId={resolvedId} activityName={title} onComplete={onComplete} />;
  }

  if (
    ["ACT-05", "ACT-06", "ACT-07", "ACT-13"].includes(id) ||
    lower.includes("physical grounding") ||
    lower.includes("sensory room") ||
    lower.includes("name the moment") ||
    lower.includes("cognitive grounding")
  ) {
    let resolvedId = id;
    if (!["ACT-05", "ACT-06", "ACT-07", "ACT-13"].includes(id)) {
      if (lower.includes("physical grounding")) resolvedId = "ACT-07";
      else if (lower.includes("name the moment") || lower.includes("emotional")) resolvedId = "ACT-06";
      else if (lower.includes("cognitive")) resolvedId = "ACT-13";
      else resolvedId = "ACT-05";
    }
    return <MoodLiftMindfulnessGrounding activityId={resolvedId} activityName={title} onComplete={onComplete} />;
  }

  if (["ACT-08", "ACT-09"].includes(id) || lower.includes("somatic") || lower.includes("butterfly") || lower.includes("shake") || lower.includes("posture")) {
    let resolvedId = id;
    if (!["ACT-08", "ACT-09"].includes(id)) {
      if (lower.includes("butterfly")) resolvedId = "ACT-09";
      else resolvedId = "ACT-08";
    }
    return <MoodLiftSomaticPlayer activityId={resolvedId} activityName={title} onComplete={onComplete} />;
  }

  if (["ACT-10", "ACT-12"].includes(id) || lower.includes("cbt") || lower.includes("thought") || lower.includes("worry")) {
    let resolvedId = id;
    if (!["ACT-10", "ACT-12"].includes(id)) {
      if (lower.includes("worry")) resolvedId = "ACT-12";
      else resolvedId = "ACT-10";
    }
    return <MoodLiftCbtPlayer activityId={resolvedId} activityName={title} onComplete={onComplete} />;
  }

  if (id === "ACT-11" || category === "GRATITUDE" || lower.includes("affirmation") || lower.includes("gratitude")) {
    return <MoodLiftAffirmationPlayer activityId="ACT-11" activityName={title} onComplete={onComplete} />;
  }

  if (category === "MINDFULNESS") {
    return <MoodLiftMindfulnessGrounding activityId="ACT-05" activityName={title} onComplete={onComplete} />;
  } else if (category === "CBT") {
    return <MoodLiftCbtPlayer activityId="ACT-10" activityName={title} onComplete={onComplete} />;
  } else if (category === "SOMATIC") {
    return <MoodLiftSomaticPlayer activityId="ACT-08" activityName={title} onComplete={onComplete} />;
  } else {
    return <GenericExercisePlayer activity={activity} onComplete={onComplete} />;
  }
}

/* ─────────────────────────────────────────────────────────────
   1. MINDFULNESS: Zen Breath & Focus Chamber
   ───────────────────────────────────────────────────────────── */
function ZenMindfulnessGame({ activity }: { activity: any }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [phase, setPhase] = useState<"Inhale" | "Hold" | "Exhale">("Inhale");
  const [zenScore, setZenScore] = useState(0);
  const [distractionsPopped, setDistractionsPopped] = useState(0);

  const [distractions, setDistractions] = useState([
    { id: 1, text: "Work Stress", x: 15, y: 25 },
    { id: 2, text: "Phone Notification", x: 70, y: 30 },
    { id: 3, text: "Self-Doubt", x: 30, y: 65 },
    { id: 4, text: "Tomorrow's Schedule", x: 75, y: 70 },
  ]);

  useEffect(() => {
    let interval: any = null;
    if (isPlaying && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev - 1;
        });

        setPhase((p) => (p === "Inhale" ? "Hold" : p === "Hold" ? "Exhale" : "Inhale"));
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timerSeconds]);

  const popDistraction = (id: number) => {
    setDistractions((prev) => prev.filter((d) => d.id !== id));
    setZenScore((prev) => prev + 25);
    setDistractionsPopped((prev) => prev + 1);
  };

  const resetGame = () => {
    setIsPlaying(false);
    setTimerSeconds(60);
    setPhase("Inhale");
    setZenScore(0);
    setDistractionsPopped(0);
    setDistractions([
      { id: 1, text: "Work Stress", x: 15, y: 25 },
      { id: 2, text: "Phone Notification", x: 70, y: 30 },
      { id: 3, text: "Self-Doubt", x: 30, y: 65 },
      { id: 4, text: "Tomorrow's Schedule", x: 75, y: 70 },
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl border border-purple-500/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-2xl border border-purple-400/30 backdrop-blur-md shrink-0">
              <Brain className="w-6 h-6 text-purple-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-500/30 text-purple-200 border-purple-400/30 text-[10px] uppercase font-bold">
                  Interactive Zen Game
                </Badge>
                <span className="text-xs text-purple-300 font-medium">Popped: {distractionsPopped}/4</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5">{activity.title}</h3>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight">{zenScore} PTS</div>
            <div className="text-[10px] sm:text-[11px] text-purple-300 font-semibold uppercase tracking-wider">Zen Score</div>
          </div>
        </div>

        <div className="relative h-64 bg-slate-950/60 rounded-2xl border border-purple-500/20 flex flex-col items-center justify-center overflow-hidden">
          <div className="relative flex items-center justify-center">
            <div 
              className={cn(
                "w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-500 to-purple-400 flex flex-col items-center justify-center text-white shadow-[0_0_50px_rgba(147,51,234,0.5)] transition-all duration-700 select-none",
                phase === "Inhale" ? "scale-110 sm:scale-125 shadow-[0_0_80px_rgba(168,85,247,0.8)]" : phase === "Hold" ? "scale-105 sm:scale-110 shadow-[0_0_60px_rgba(168,85,247,0.6)]" : "scale-90 opacity-80"
              )}
            >
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-purple-200">{phase}</span>
              <span className="text-xl sm:text-2xl font-black">{timerSeconds}s</span>
              <span className="text-[9px] sm:text-[10px] text-purple-200 font-semibold">{phase === "Inhale" ? "Expand Focus" : phase === "Hold" ? "Stay Present" : "Release Tension"}</span>
            </div>
          </div>

          {distractions.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => popDistraction(d.id)}
              style={{ left: `${Math.min(d.x, 65)}%`, top: `${Math.min(d.y, 70)}%` }}
              className="absolute px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/10 hover:bg-red-500/30 border border-white/20 hover:border-red-400 text-white text-[11px] sm:text-xs font-semibold backdrop-blur-md transition-all transform hover:scale-110 active:scale-95 cursor-pointer shadow-lg animate-bounce max-w-[130px] truncate"
            >
              ☁️ {d.text}
            </button>
          ))}

          {distractions.length === 0 && (
            <div className="absolute inset-0 bg-purple-950/80 backdrop-blur-md flex flex-col items-center justify-center space-y-2 animate-in fade-in p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-base sm:text-lg font-bold text-white">All Distractions Dissolved!</h4>
              <p className="text-xs text-purple-200 max-w-xs">Your mind is clear, centered, and deeply relaxed.</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setIsPlaying(!isPlaying)}
              className={cn(
                "h-10 px-4 sm:px-5 rounded-xl font-bold text-xs gap-2 transition-all cursor-pointer shadow-md flex-1 sm:flex-none",
                isPlaying ? "bg-amber-500 hover:bg-amber-600 text-slate-950" : "bg-purple-600 hover:bg-purple-500 text-white"
              )}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? "Pause" : "Start Game"}</span>
            </Button>
            <Button
              onClick={resetGame}
              variant="outline"
              className="h-10 px-3 rounded-xl border-white/20 text-white hover:bg-white/10 text-xs font-semibold cursor-pointer shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
          <span className="text-[11px] sm:text-xs text-purple-300 font-medium">Tap floating bubbles to clear thoughts!</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   2. CBT: Cognitive Reframe 5-Column Game
   ───────────────────────────────────────────────────────────── */
function CbtReframeGame({ activity }: { activity: any }) {
  const [step, setStep] = useState(1);
  const [triggerThought, setTriggerThought] = useState("I am going to fail my team presentation tomorrow.");
  const [distressLevel, setDistressLevel] = useState(85);
  const [selectedDistortions, setSelectedDistortions] = useState<string[]>(["Catastrophizing", "Mind Reading"]);
  const [evidenceAgainst, setEvidenceAgainst] = useState("I prepared 20 slides, rehearsed 3 times, and my team gave positive feedback.");
  const [balancedThought, setBalancedThought] = useState("I am thoroughly prepared. Feeling nervous is normal, but I have a strong deck.");
  const [completed, setCompleted] = useState(false);

  const toggleDistortion = (d: string) => {
    if (selectedDistortions.includes(d)) {
      setSelectedDistortions(selectedDistortions.filter((item) => item !== d));
    } else {
      setSelectedDistortions([...selectedDistortions, d]);
    }
  };

  const handleFinishReframe = () => {
    setCompleted(true);
  };

  const resetGame = () => {
    setStep(1);
    setCompleted(false);
    setDistressLevel(85);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl border border-blue-500/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-400/30 backdrop-blur-md">
              <Sparkles className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <Badge className="bg-blue-500/30 text-blue-200 border-blue-400/30 text-[10px] uppercase font-bold">
                Interactive CBT Simulator
              </Badge>
              <h3 className="text-xl font-bold text-white mt-0.5">{activity.title}</h3>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-blue-300">Step {step} of 4</div>
            <Progress value={(step / 4) * 100} className="w-24 h-2 bg-blue-950 mt-1" />
          </div>
        </div>

        {!completed ? (
          <div className="bg-slate-950/70 rounded-2xl p-5 border border-blue-500/20 space-y-5">
            {step === 1 && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-blue-200 uppercase tracking-wider">Step 1: Automatic Negative Thought (ANT)</h4>
                <div className="space-y-2">
                  <label className="text-xs text-slate-300 font-semibold">Current Negative Automatic Thought:</label>
                  <textarea
                    value={triggerThought}
                    onChange={(e) => setTriggerThought(e.target.value)}
                    className="w-full h-20 bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-300">Initial Emotional Distress Level:</span>
                    <span className="text-red-400 font-bold">{distressLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={distressLevel}
                    onChange={(e) => setDistressLevel(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-blue-200 uppercase tracking-wider">Step 2: Identify Cognitive Distortions</h4>
                <p className="text-xs text-slate-300">Select the cognitive traps in this thought:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    "Catastrophizing",
                    "Mind Reading",
                    "All-or-Nothing",
                    "Emotional Reasoning",
                    "Overgeneralization",
                    "Personalization",
                  ].map((distortion) => {
                    const selected = selectedDistortions.includes(distortion);
                    return (
                      <button
                        key={distortion}
                        type="button"
                        onClick={() => toggleDistortion(distortion)}
                        className={cn(
                          "px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer",
                          selected
                            ? "bg-blue-600 border-blue-400 text-white shadow-md"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        )}
                      >
                        <span>{distortion}</span>
                        {selected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-blue-200 uppercase tracking-wider">Step 3: Objective Evidence Challenge</h4>
                <div className="space-y-2">
                  <label className="text-xs text-slate-300 font-semibold">Evidence AGAINST the negative thought:</label>
                  <textarea
                    value={evidenceAgainst}
                    onChange={(e) => setEvidenceAgainst(e.target.value)}
                    className="w-full h-20 bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-blue-200 uppercase tracking-wider">Step 4: Formulate Balanced Reframe</h4>
                <div className="space-y-2">
                  <label className="text-xs text-slate-300 font-semibold">Realistic Replacement Thought:</label>
                  <textarea
                    value={balancedThought}
                    onChange={(e) => setBalancedThought(e.target.value)}
                    className="w-full h-20 bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              {step > 1 ? (
                <Button
                  onClick={() => setStep((s) => s - 1)}
                  variant="outline"
                  className="h-9 px-4 rounded-xl border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Previous Step
                </Button>
              ) : <div />}

              {step < 4 ? (
                <Button
                  onClick={() => setStep((s) => s + 1)}
                  className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  Next Step →
                </Button>
              ) : (
                <Button
                  onClick={handleFinishReframe}
                  className="h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Complete Reframe!</span>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/90 rounded-2xl p-6 border border-emerald-500/30 text-center space-y-4 animate-in fade-in">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40 shadow-lg">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-white">Cognitive Reframe Mastered!</h4>
              <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                Distress dropped from <span className="text-red-400 font-bold">{distressLevel}%</span> down to <span className="text-emerald-400 font-bold">25%</span>.
              </p>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl text-left border border-slate-800 text-xs text-slate-200">
              <span className="text-emerald-400 font-bold block mb-1">New Balanced Perspective:</span>
              "{balancedThought}"
            </div>
            <Button
              onClick={resetGame}
              variant="outline"
              className="h-9 px-5 rounded-xl border-slate-700 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
            >
              Replay Reframe Game
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   3. GRATITUDE: Golden Gratitude Jar Game
   ───────────────────────────────────────────────────────────── */
function GratitudeJarGame({ activity }: { activity: any }) {
  const [items, setItems] = useState<string[]>(["Morning coffee in quiet sunshine", "Friendly message from a colleague"]);
  const [newItem, setNewItem] = useState("");
  const [starsCount, setStarsCount] = useState(2);

  const handleAddStar = () => {
    if (!newItem.trim()) return;
    setItems([...items, newItem.trim()]);
    setNewItem("");
    setStarsCount((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-900 via-yellow-950 to-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl border border-amber-500/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-400/30 backdrop-blur-md">
              <Heart className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <Badge className="bg-amber-500/30 text-amber-200 border-amber-400/30 text-[10px] uppercase font-bold">
                Interactive Gratitude Game
              </Badge>
              <h3 className="text-xl font-bold text-white mt-0.5">{activity.title}</h3>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-amber-300">{starsCount} Stars</div>
            <div className="text-[10px] text-amber-200 font-semibold uppercase">Jar Filled</div>
          </div>
        </div>

        <div className="bg-slate-950/70 rounded-2xl p-5 border border-amber-500/20 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type something positive from today..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddStar()}
              className="flex-1 bg-slate-900 border border-amber-500/30 rounded-xl px-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <Button
              onClick={handleAddStar}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl px-4 cursor-pointer gap-1"
            >
              <Star className="w-4 h-4 fill-current" />
              <span>Drop Star</span>
            </Button>
          </div>

          <div className="h-44 bg-gradient-to-b from-amber-950/30 to-slate-900/80 rounded-2xl border-2 border-amber-400/40 p-4 flex flex-col justify-end gap-2 overflow-y-auto relative">
            <div className="absolute top-2 right-3 text-[10px] font-bold text-amber-300/60 uppercase">🏺 Gratitude Jar Workspace</div>
            {items.map((item, idx) => (
              <div
                key={idx}
                className="bg-amber-500/20 border border-amber-400/30 rounded-xl px-3 py-2 text-xs font-semibold text-amber-200 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2"
              >
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   4. BREATHING: 4-7-8 Parasympathetic Wave Game
   ───────────────────────────────────────────────────────────── */
function BreathingWaveGame({ activity }: { activity: any }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState<"Inhale" | "Hold" | "Exhale">("Inhale");
  const [seconds, setSeconds] = useState(4);
  const [cycles, setCycles] = useState(0);
  const [simulatedHeartRate, setSimulatedHeartRate] = useState(84);

  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            if (phase === "Inhale") {
              setPhase("Hold");
              return 7;
            } else if (phase === "Hold") {
              setPhase("Exhale");
              return 8;
            } else {
              setPhase("Inhale");
              setCycles((c) => c + 1);
              setSimulatedHeartRate((hr) => Math.max(62, hr - 4));
              return 4;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, phase]);

  const resetBreathing = () => {
    setIsPlaying(false);
    setPhase("Inhale");
    setSeconds(4);
    setCycles(0);
    setSimulatedHeartRate(84);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl border border-emerald-500/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-400/30 backdrop-blur-md">
              <Wind className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <Badge className="bg-emerald-500/30 text-emerald-200 border-emerald-400/30 text-[10px] uppercase font-bold">
                Interactive Parasympathetic Game
              </Badge>
              <h3 className="text-xl font-bold text-white mt-0.5">{activity.title}</h3>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-emerald-300">{cycles} / 4</div>
            <div className="text-[10px] text-emerald-200 font-semibold uppercase">Cycles Completed</div>
          </div>
        </div>

        <div className="bg-slate-950/70 rounded-2xl p-6 border border-emerald-500/20 flex flex-col items-center justify-center space-y-5">
          <div
            className={cn(
              "w-40 h-40 rounded-full flex flex-col items-center justify-center text-white font-bold transition-all duration-1000 select-none shadow-2xl border-4",
              phase === "Inhale"
                ? "bg-blue-600/40 border-blue-400 scale-125 shadow-blue-500/50"
                : phase === "Hold"
                ? "bg-purple-600/40 border-purple-400 scale-110 shadow-purple-500/50"
                : "bg-emerald-600/40 border-emerald-400 scale-90 shadow-emerald-500/50"
            )}
          >
            <span className="text-xs uppercase tracking-widest text-emerald-200">{phase}</span>
            <span className="text-4xl font-black">{seconds}s</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-300 font-medium pt-2">
            <div>
              Simulated Heart Rate: <span className="text-emerald-400 font-bold">{simulatedHeartRate} BPM</span>
            </div>
            <div>
              Calm Index: <span className="text-emerald-400 font-bold">{Math.min(100, 50 + cycles * 12)}%</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsPlaying(!isPlaying)}
              className={cn(
                "h-10 px-6 rounded-xl font-bold text-xs gap-2 cursor-pointer shadow-md",
                isPlaying ? "bg-amber-500 hover:bg-amber-600 text-slate-950" : "bg-emerald-500 hover:bg-emerald-600 text-slate-950"
              )}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? "Pause Rhythm" : "Start 4-7-8 Breathing"}</span>
            </Button>
            <Button
              onClick={resetBreathing}
              variant="outline"
              className="h-10 px-3 rounded-xl border-slate-700 text-white hover:bg-slate-800 text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   5. SOMATIC: Muscle Tension & Release Lab Game
   ───────────────────────────────────────────────────────────── */
function SomaticPmrGame({ activity }: { activity: any }) {
  const [selectedMuscle, setSelectedMuscle] = useState("Shoulders & Neck");
  const [isTensing, setIsTensing] = useState(false);
  const [tensionMeter, setTensionMeter] = useState(0);
  const [released, setReleased] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isTensing && tensionMeter < 100) {
      interval = setInterval(() => {
        setTensionMeter((prev) => Math.min(100, prev + 20));
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isTensing, tensionMeter]);

  const handleTenseStart = () => {
    setIsTensing(true);
    setReleased(false);
  };

  const handleRelease = () => {
    setIsTensing(false);
    setTensionMeter(0);
    setReleased(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-rose-950 via-pink-950 to-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl border border-rose-500/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-500/20 rounded-2xl border border-rose-400/30 backdrop-blur-md">
              <Smile className="w-6 h-6 text-rose-300" />
            </div>
            <div>
              <Badge className="bg-rose-500/30 text-rose-200 border-rose-400/30 text-[10px] uppercase font-bold">
                Interactive Somatic PMR Lab
              </Badge>
              <h3 className="text-xl font-bold text-white mt-0.5">{activity.title}</h3>
            </div>
          </div>
        </div>

        <div className="bg-slate-950/70 rounded-2xl p-5 border border-rose-500/20 space-y-4">
          <div className="flex flex-wrap gap-2">
            {["Shoulders & Neck", "Hands & Forearms", "Jaw & Face", "Thighs & Feet"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setSelectedMuscle(m); setReleased(false); setTensionMeter(0); }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                  selectedMuscle === m
                    ? "bg-rose-600 border-rose-400 text-white shadow-md"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                )}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs font-bold">
              <span>Selected Group: {selectedMuscle}</span>
              <span className={isTensing ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                {isTensing ? `Tensing (${tensionMeter}%)` : released ? "Fully Released (0%)" : "Ready"}
              </span>
            </div>
            <Progress value={tensionMeter} className="h-3 bg-slate-900 accent-red-500" />
          </div>

          <div className="flex items-center gap-3 pt-3">
            <Button
              onMouseDown={handleTenseStart}
              onMouseUp={handleRelease}
              onTouchStart={handleTenseStart}
              onTouchEnd={handleRelease}
              className={cn(
                "flex-1 h-12 rounded-xl font-bold text-xs gap-2 select-none cursor-pointer transition-all shadow-md",
                isTensing ? "bg-red-600 text-white scale-105" : "bg-rose-500 hover:bg-rose-600 text-slate-950"
              )}
            >
              <span>{isTensing ? "HOLDING TENSION..." : "PRESS & HOLD TO TENSE (5s)"}</span>
            </Button>
          </div>

          {released && (
            <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-xl p-3 text-center text-xs text-emerald-200 font-bold animate-in fade-in">
              ✨ Deep somatic relaxation wave released across {selectedMuscle}!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   6. DEFAULT / GENERIC: Interactive Step-by-Step Player
   ───────────────────────────────────────────────────────────── */
function GenericExercisePlayer({ activity, onComplete }: { activity: any; onComplete?: (data?: any) => void }) {
  const instructions = (activity.instructions || activity.description || "").split("\n").filter(Boolean);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const toggleStep = (idx: number) => {
    if (completedSteps.includes(idx)) {
      setCompletedSteps(completedSteps.filter((i) => i !== idx));
    } else {
      setCompletedSteps([...completedSteps, idx]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-900 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl border border-purple-500/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-2xl border border-purple-400/30 backdrop-blur-md">
              <Zap className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <Badge className="bg-purple-500/30 text-purple-200 border-purple-400/30 text-[10px] uppercase font-bold">
                Interactive Guided Exercise
              </Badge>
              <h3 className="text-xl font-bold text-white mt-0.5">{activity.title}</h3>
            </div>
          </div>
        </div>

        <div className="bg-slate-950/70 rounded-2xl p-5 border border-purple-500/20 space-y-3">
          <div className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">Interactive Step Checklist:</div>
          {instructions.map((stepText: string, idx: number) => {
            const isDone = completedSteps.includes(idx);
            return (
              <div
                key={idx}
                onClick={() => toggleStep(idx)}
                className={cn(
                  "p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all flex items-center justify-between select-none",
                  isDone
                    ? "bg-purple-900/40 border-purple-400/50 text-purple-200 line-through opacity-80"
                    : "bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700"
                )}
              >
                <span>{stepText}</span>
                <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center", isDone ? "bg-purple-500 border-purple-400 text-white" : "border-slate-700")}>
                  {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            onClick={() => {
              if (onComplete) onComplete({ completedSteps: completedSteps.length });
            }}
            className="rounded-full bg-[#5e2be2] hover:bg-[#4d1fc4] text-white font-bold text-xs px-6 h-10 shadow-md gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Complete Exercise</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
