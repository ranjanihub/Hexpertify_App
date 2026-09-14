import React, { useState } from 'react';
import { api } from '../lib/apiClient';
import { createPortal } from 'react-dom';
import {
  Play,
  ArrowLeft,
  Code,
  Clock,
  Search,
  X,
  Copy,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Plus,
  MoreVertical,
  Users,
  Repeat,
  Sparkles,
  Heart,
  Brain,
  Wind,
  Activity as ActivityIcon,
  Flame,
  FileText,
  Trash2
} from 'lucide-react';
import { activityCodeRegistry, getCodedActivityComponent } from '../activities';

export interface ActivityCardItem {
  id: string;
  name: string;
  description: string;
  filePath: string;
  isVisible: boolean;
  categoryTag: string;
  duration: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  repeat: string;
  assignedClientName: string;
  assignedTherapistName: string;
  assignedInfo: string;
  imageUrl: string;
  templateId: string;
}

const initialActivities: ActivityCardItem[] = [
  {
    id: 'ACT-01',
    name: '5-4-3-2-1 Grounding Technique',
    description: '10-minute guided breathing session focusing on awareness of breath, sensory details, and body sensations.',
    filePath: 'src/activities/templates/GroundingTechnique54321.tsx',
    isVisible: true,
    categoryTag: 'MINDFULNESS',
    duration: '10 min',
    difficulty: 'Easy',
    repeat: 'Daily',
    assignedClientName: 'Sarah Jenkins',
    assignedTherapistName: 'Dr. Alex Harrison',
    assignedInfo: '2 Clients (Sarah Jenkins, +1) • Daily',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600',
    templateId: 'ACT-01'
  },
  {
    id: 'ACT-02',
    name: 'CBT Automatic Thought Record',
    description: 'Document recent anxiety trigger and write a balanced, rational reframe using Beck 5-column technique.',
    filePath: 'src/activities/templates/CBTThoughtRecord.tsx',
    isVisible: true,
    categoryTag: 'CBT',
    duration: '15 min',
    difficulty: 'Medium',
    repeat: '2-3 Times / Week',
    assignedClientName: 'Emily Rodriguez',
    assignedTherapistName: 'Dr. Elena Rostova',
    assignedInfo: 'Emily Rodriguez • 2-3 Times / Week',
    imageUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600',
    templateId: 'ACT-02'
  },
  {
    id: 'ACT-03',
    name: 'Progressive Muscle Relaxation (PMR)',
    description: 'Guided audio session with pre/post somatic tension sliders to reduce physical stress and muscle tightness.',
    filePath: 'src/activities/templates/ProgressiveMuscleRelaxation.tsx',
    isVisible: true,
    categoryTag: 'SOMATIC',
    duration: '8 min',
    difficulty: 'Easy',
    repeat: 'Daily',
    assignedClientName: 'Amanda Miller',
    assignedTherapistName: 'Marcus Vance',
    assignedInfo: 'Amanda Miller • Daily',
    imageUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600',
    templateId: 'ACT-03'
  },
  {
    id: 'ACT-04',
    name: 'Fear Hierarchy & Exposure Ladder',
    description: 'Hierarchy ladder for anxiety triggers using SUDS 0-100 graded exposure steps and habituation tracking.',
    filePath: 'src/activities/templates/ExposureHierarchyLadder.tsx',
    isVisible: true,
    categoryTag: 'EXPOSURE',
    duration: '25 min',
    difficulty: 'Advanced',
    repeat: 'Weekly',
    assignedClientName: 'Robert Garcia',
    assignedTherapistName: 'Dr. Sophia Bennett',
    assignedInfo: '3 Clients (Robert Garcia, +2) • Weekly',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600',
    templateId: 'ACT-04'
  },
  {
    id: 'ACT-05',
    name: 'Behavioral Activation Tracker',
    description: 'Schedule rewarding daily activities, track mood changes, and monitor Pleasure & Mastery scores.',
    filePath: 'src/activities/templates/BehavioralActivationTracker.tsx',
    isVisible: true,
    categoryTag: 'BEHAVIORAL',
    duration: '12 min',
    difficulty: 'Medium',
    repeat: 'Daily',
    assignedClientName: 'Michael Chen',
    assignedTherapistName: 'Dr. Alex Harrison',
    assignedInfo: 'Michael Chen • Daily',
    imageUrl: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600',
    templateId: 'ACT-05'
  }
];

const presetCoverImages = [
  { name: 'Mindfulness Sunset', url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600' },
  { name: 'Notebook & CBT Pen', url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600' },
  { name: 'Group Gratitude & Yoga', url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600' },
  { name: 'Mountain Steps & Exposure', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600' },
  { name: 'Planner Calendar & Coffee', url: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600' },
  { name: 'Somatic Nature & Forest', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600' }
];

export const ActivitiesView: React.FC = () => {
  const [activitiesList, setActivitiesList] = useState<ActivityCardItem[]>(initialActivities);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);

  // Fetch live activities from MongoDB Atlas
  const fetchActivities = async () => {
    try {
      const data = await api.get('/api/admin/activities');
      if (data?.activities && Array.isArray(data.activities) && data.activities.length > 0) {
        setActivitiesList(data.activities);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  };

  React.useEffect(() => {
    fetchActivities();
  }, []);

  const [newActivityData, setNewActivityData] = useState({
    title: '',
    categoryTag: 'MINDFULNESS',
    difficulty: 'Easy' as 'Easy' | 'Medium' | 'Advanced',
    duration: '10 min',
    repeat: 'Daily',
    clientName: 'Sarah Jenkins',
    therapistName: 'Dr. Alex Harrison',
    description: '',
    imageUrl: presetCoverImages[0].url,
    customImageUrl: '',
    templateId: 'ACT-01'
  });

  const showToast = (text: string, type: 'success' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggleVisibility = async (activityId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const item = activitiesList.find((a) => a.id === activityId);
    if (!item) return;

    const nextState = !item.isVisible;
    setActivitiesList((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, isVisible: nextState } : a))
    );

    showToast(
      nextState
        ? `Activity ${item.name} is now VISIBLE on platform!`
        : `Activity ${item.name} is now HIDDEN from platform.`,
      nextState ? 'success' : 'warning'
    );

    // Persist to MongoDB Atlas
    try {
      await api.put(`/api/admin/activities/${activityId}`, { isVisible: nextState });
    } catch (err) {
      console.error('Error toggling activity visibility in DB:', err);
    }
  };

  const handleDeleteActivity = async (activityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = activitiesList.find((a) => a.id === activityId);
    setActivitiesList((prev) => prev.filter((a) => a.id !== activityId));
    if (target) {
      showToast(`Activity "${target.name}" permanently deleted from MongoDB.`, 'warning');
    }

    // Delete from MongoDB Atlas
    try {
      await api.delete(`/api/admin/activities/${activityId}`);
    } catch (err) {
      console.error('Error deleting activity from DB:', err);
    }
  };

  const handleCopyFilePath = (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(filePath);
    showToast('Code path copied to clipboard!', 'success');
  };

  const handleCreateActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityData.title.trim()) {
      showToast('Please enter an activity title', 'warning');
      return;
    }

    const templateItem = activityCodeRegistry[newActivityData.templateId] || activityCodeRegistry['ACT-01'];
    const finalImage = newActivityData.customImageUrl.trim() || newActivityData.imageUrl;
    const newId = `ACT-${Date.now().toString().slice(-4)}`;

    const newActivityItem: ActivityCardItem = {
      id: newId,
      name: newActivityData.title.trim(),
      description: newActivityData.description.trim() || templateItem.description,
      filePath: templateItem.filePath,
      isVisible: true,
      categoryTag: newActivityData.categoryTag.toUpperCase(),
      duration: newActivityData.duration,
      difficulty: newActivityData.difficulty,
      repeat: newActivityData.repeat,
      assignedClientName: 'All Clients',
      assignedTherapistName: 'Platform',
      assignedInfo: `${newActivityData.repeat} Schedule`,
      imageUrl: finalImage,
      templateId: newActivityData.templateId
    };

    setActivitiesList([newActivityItem, ...activitiesList]);
    showToast(`Activity "${newActivityData.title}" created & saved to MongoDB Atlas!`, 'success');
    setShowCreateModal(false);

    // Persist to MongoDB Atlas
    try {
      await api.post('/api/admin/activities', newActivityItem);
    } catch (err) {
      console.error('Error creating activity in DB:', err);
    }

    setNewActivityData({
      title: '',
      categoryTag: 'MINDFULNESS',
      difficulty: 'Easy',
      duration: '10 min',
      repeat: 'Daily',
      clientName: 'Sarah Jenkins',
      therapistName: 'Dr. Alex Harrison',
      description: '',
      imageUrl: presetCoverImages[0].url,
      customImageUrl: '',
      templateId: 'ACT-01'
    });
  };

  const filteredGames = activitiesList.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.assignedInfo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.assignedTherapistName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' ||
      g.categoryTag.toUpperCase() === selectedCategory.toUpperCase();

    return matchesSearch && matchesCategory;
  });

  const activeGameObj = selectedGameId ? activitiesList.find((a) => a.id === selectedGameId) : null;
  const activeGameComponent = activeGameObj ? getCodedActivityComponent(activeGameObj.templateId) : null;

  const categoriesList = ['All', 'MINDFULNESS', 'CBT', 'GRATITUDE', 'BREATHING', 'SOMATIC', 'EXPOSURE', 'BEHAVIORAL'];

  return (
    <div className="space-y-8 pb-12 animate-fade-in font-['Plus_Jakarta_Sans'] relative">
      {/* Toast Banner */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-8 z-50 px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border animate-in slide-in-from-top duration-300 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-amber-600 text-white border-amber-500'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-white shrink-0" />
          )}
          <span className="font-extrabold text-xs">{toastMessage.text}</span>
        </div>
      )}

      {/* ── VIEW MODE 1: ACTIVITIES DIRECTORY ─────────────── */}
      {!selectedGameId ? (
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Activities</h1>
              <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1">
                Prescribe and manage clinical exercises with frequency schedules for your clients.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search activities or clients..."
                  className="w-full pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 outline-none focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 transition-all placeholder:text-slate-400 shadow-xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Create & Assign Activity Action Button */}
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#5e2be2]/20 transition-all active:scale-95 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Create & Assign Activity</span>
              </button>
            </div>
          </div>

          {/* Category Filter Pills Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categoriesList.map((cat) => {
              const isActive = selectedCategory.toUpperCase() === cat.toUpperCase();
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold tracking-wide uppercase transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#5e2be2] text-white shadow-md shadow-[#5e2be2]/25'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Activity Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGames.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
                <div className="max-w-xs mx-auto space-y-3">
                  <ActivityIcon className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-extrabold text-slate-700 text-sm">No activities found matching your filters.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('All');
                    }}
                    className="text-[#5e2be2] font-bold text-xs hover:underline"
                  >
                    Reset search filters
                  </button>
                </div>
              </div>
            ) : (
              filteredGames.map((game) => {
                const isVisible = game.isVisible;
                const isMenuOpen = activeDropdownId === game.id;

                return (
                  <div
                    key={game.id}
                    className={`bg-white rounded-3xl border shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between group relative ${
                      isVisible ? 'border-slate-200/90' : 'border-amber-300 bg-amber-50/10'
                    }`}
                  >
                    {/* Top Image & Badges Container */}
                    <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100">
                      <img
                        src={game.imageUrl}
                        alt={game.name}
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                          !isVisible ? 'grayscale-[40%]' : ''
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-black/20" />

                      {/* Top-Left Category Badge */}
                      <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-2">
                        <span className="px-3 py-1 bg-white/95 backdrop-blur-md rounded-full text-[10px] font-extrabold text-slate-900 shadow-md flex items-center gap-1.5 uppercase tracking-wider border border-white/50">
                          {game.categoryTag === 'MINDFULNESS' && <Wind className="w-3 h-3 text-[#5e2be2]" />}
                          {game.categoryTag === 'CBT' && <Brain className="w-3 h-3 text-purple-600" />}
                          {game.categoryTag === 'SOMATIC' && <Sparkles className="w-3 h-3 text-emerald-500" />}
                          {game.categoryTag === 'GRATITUDE' && <Heart className="w-3 h-3 text-rose-500" />}
                          {game.categoryTag === 'EXPOSURE' && <Flame className="w-3 h-3 text-amber-500" />}
                          {game.categoryTag === 'BEHAVIORAL' && <Sparkles className="w-3 h-3 text-emerald-500" />}
                          <span>{game.categoryTag}</span>
                        </span>
                      </div>

                      {/* Top-Right Difficulty Badge & 3-Dots Admin Menu */}
                      <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-2">
                        <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-slate-800 rounded-full text-[11px] font-extrabold shadow-md">
                          {game.difficulty}
                        </span>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(isMenuOpen ? null : game.id);
                            }}
                            className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-md text-slate-700 hover:text-slate-900 flex items-center justify-center shadow-md border border-white/50 transition-all hover:scale-105"
                            title="More options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {isMenuOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(null);
                                }}
                              />
                              <div className="absolute right-0 top-9 z-30 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5 text-xs font-bold animate-fade-in">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    handleToggleVisibility(game.id, e);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-slate-700 hover:bg-purple-50 hover:text-[#5e2be2] flex items-center gap-2"
                                >
                                  {isVisible ? (
                                    <>
                                      <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Hide from Platform</span>
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Show on Platform</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    handleCopyFilePath(game.filePath, e);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-slate-700 hover:bg-purple-50 hover:text-[#5e2be2] flex items-center gap-2"
                                >
                                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Copy Code Path</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    handleDeleteActivity(game.id, e);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete Activity</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <h3 className="font-extrabold text-slate-900 text-base sm:text-lg group-hover:text-[#5e2be2] transition-colors leading-tight">
                          {game.name}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                          {game.description}
                        </p>
                      </div>

                      {/* Client Assignment Line */}
                      <div className="flex items-center gap-2 text-xs font-bold text-[#5e2be2] bg-purple-50/80 px-3.5 py-2 rounded-2xl border border-purple-100/80">
                        <Users className="w-3.5 h-3.5 shrink-0 text-[#5e2be2]" />
                        <span className="truncate">{game.assignedInfo}</span>
                      </div>

                      {/* Meta Footer: Duration & Repeat Frequency */}
                      <div className="flex items-center justify-between text-xs text-slate-500 font-bold pt-2 border-t border-slate-100">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {game.duration}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Repeat className="w-3.5 h-3.5 text-slate-400" />
                          {game.repeat}
                        </span>
                      </div>

                      {/* Code File Badge & Admin Visibility Status */}
                      <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono text-slate-400 truncate max-w-[180px]" title={game.filePath}>
                          {game.filePath.replace('src/activities/templates/', '')}
                        </span>
                        {!isVisible && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-extrabold text-[10px] rounded-md border border-amber-200">
                            Hidden
                          </span>
                        )}
                      </div>

                      {/* Launch / Play Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedGameId(game.id)}
                        className="w-full py-3 bg-[#5e2be2] hover:bg-[#4f28d9] text-white rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#5e2be2]/20 hover:shadow-lg transition-all active:scale-[0.98] mt-2"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Play / Open Interactive Exercise</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* ── VIEW MODE 2: ACTIVE GAME PLAYER VIEW ───────────────────────── */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Sticky Top Control Bar */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-4 z-30">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedGameId(null)}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-extrabold text-xs flex items-center gap-1.5 transition-all active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Activities</span>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-[#5e2be2] uppercase font-mono">
                    Playing · {activeGameObj?.id}
                  </span>
                  {activeGameObj && (
                    <span className="px-2 py-0.5 bg-purple-50 text-[#5e2be2] font-bold text-[10px] rounded-md uppercase">
                      {activeGameObj.categoryTag}
                    </span>
                  )}
                  {activeGameObj && !activeGameObj.isVisible && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-extrabold text-[10px] rounded-md border border-amber-200">
                      Hidden from Platform
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 leading-tight">{activeGameObj?.name}</h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => activeGameObj && handleToggleVisibility(activeGameObj.id, e)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition-all active:scale-95 ${
                  activeGameObj && activeGameObj.isVisible
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}
              >
                {activeGameObj && activeGameObj.isVisible ? (
                  <>
                    <Eye className="w-4 h-4 text-emerald-600" />
                    <span>Status: Show</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 text-amber-700" />
                    <span>Status: Hidden</span>
                  </>
                )}
              </button>

              <div className="px-3.5 py-2 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 border border-slate-800">
                <Code className="w-3.5 h-3.5 text-emerald-400" />
                <span>{activeGameObj?.filePath}</span>
              </div>
            </div>
          </div>

          {/* Render Active Game Component */}
          <div className="max-w-4xl mx-auto">
            {activeGameComponent ? (
              <activeGameComponent.component
                activityId={activeGameComponent.id}
                activityName={activeGameComponent.name}
              />
            ) : (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                <FileText className="w-10 h-10 text-purple-600 mx-auto mb-2" />
                <h3 className="font-extrabold text-slate-900 text-base">{activeGameObj?.name}</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{activeGameObj?.description}</p>
                <div className="mt-4 p-4 bg-purple-50 text-[#5e2be2] font-semibold text-xs rounded-2xl border border-purple-100 max-w-sm mx-auto">
                  Assigned To: {activeGameObj?.assignedInfo}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CREATE & ASSIGN ACTIVITY */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-5 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#5e2be2] flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Create & Assign Activity</h3>
                  <p className="text-xs text-slate-400">Prescribe a clinical exercise with custom details & frequency</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateActivitySubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700">Activity Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daily Somatic Breathing & Reflection"
                  value={newActivityData.title}
                  onChange={(e) => setNewActivityData({ ...newActivityData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">Category Tag *</label>
                  <select
                    value={newActivityData.categoryTag}
                    onChange={(e) => setNewActivityData({ ...newActivityData, categoryTag: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                  >
                    <option value="MINDFULNESS">MINDFULNESS</option>
                    <option value="CBT">CBT</option>
                    <option value="SOMATIC">SOMATIC</option>
                    <option value="GRATITUDE">GRATITUDE</option>
                    <option value="BREATHING">BREATHING</option>
                    <option value="EXPOSURE">EXPOSURE</option>
                    <option value="BEHAVIORAL">BEHAVIORAL</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">Difficulty Level *</label>
                  <select
                    value={newActivityData.difficulty}
                    onChange={(e) => setNewActivityData({ ...newActivityData, difficulty: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">Estimated Duration *</label>
                  <select
                    value={newActivityData.duration}
                    onChange={(e) => setNewActivityData({ ...newActivityData, duration: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                  >
                    <option value="5 min">5 min</option>
                    <option value="8 min">8 min</option>
                    <option value="10 min">10 min</option>
                    <option value="12 min">12 min</option>
                    <option value="15 min">15 min</option>
                    <option value="20 min">20 min</option>
                    <option value="25 min">25 min</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">Repeat Schedule *</label>
                  <select
                    value={newActivityData.repeat}
                    onChange={(e) => setNewActivityData({ ...newActivityData, repeat: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                  >
                    <option value="Daily">Daily</option>
                    <option value="2-3 Times / Week">2-3 Times / Week</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Bi-weekly">Bi-weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
              </div>

              {/* Frequency Schedule */}

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700">Activity File *</label>
                <select
                  value={newActivityData.templateId}
                  onChange={(e) => setNewActivityData({ ...newActivityData, templateId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-xs font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                >
                  {Object.values(activityCodeRegistry).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.filePath} ({item.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700">Cover Image Preset</label>
                <select
                  value={newActivityData.imageUrl}
                  onChange={(e) => setNewActivityData({ ...newActivityData, imageUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                >
                  {presetCoverImages.map((img, i) => (
                    <option key={i} value={img.url}>
                      {img.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700">Or Custom Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={newActivityData.customImageUrl}
                  onChange={(e) => setNewActivityData({ ...newActivityData, customImageUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                />
              </div>



              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-xs rounded-xl shadow-md"
                >
                  Create & Prescribe Activity
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ActivitiesView;
