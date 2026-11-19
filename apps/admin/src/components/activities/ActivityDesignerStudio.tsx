import React, { useState } from 'react';
import {
  ArrowLeft,
  Save,
  Code,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Check,
  Play,
  Volume2,
  Clock,
  Layers,
  FileText
} from 'lucide-react';
import type { Activity, ActivityTemplateType, ActivityField } from '../../types';
import { getCodedActivityComponent } from '../../activities';

interface ActivityDesignerStudioProps {
  activity: Activity;
  onSave: (updated: Activity) => void;
  onBack: () => void;
  onShowToast: (message: string, type?: 'success' | 'warning') => void;
}

export const ActivityDesignerStudio: React.FC<ActivityDesignerStudioProps> = ({
  activity,
  onSave,
  onBack,
  onShowToast
}) => {
  // Main Activity Form State
  const [formData, setFormData] = useState<Activity>(JSON.parse(JSON.stringify(activity)));
  const [copiedSchema, setCopiedSchema] = useState(false);

  // Studio Sub-Tabs: 'metadata' | 'builder' | 'json'
  const [activeTab, setActiveTab] = useState<'metadata' | 'builder' | 'json'>('builder');

  // Preview interactive state
  const [sampleMood, setSampleMood] = useState<string>('Calm');

  const config = formData.config || {
    templateType: 'cbt_thought_record',
    instructions: 'Follow the steps below to complete this exercise.',
    mediaUrl: '',
    fields: [],
    developerNotes: '',
    customHtmlChunk: ''
  };

  const handleTemplateChange = (newType: ActivityTemplateType) => {
    let defaultFields: ActivityField[] = [];
    let defaultInstructions = '';

    if (newType === 'cbt_thought_record') {
      defaultInstructions = 'Identify the trigger situation, negative automatic thought, distortion category, and balanced alternative thought.';
      defaultFields = [
        { id: 'f1', label: 'Triggering Situation / Event', type: 'textarea', placeholder: 'What happened? Where were you?' },
        { id: 'f2', label: 'Automatic Negative Thought (ANT)', type: 'textarea', placeholder: 'What exact thought ran through your mind?' },
        { id: 'f3', label: 'Initial Emotion Intensity (1-100%)', type: 'slider' },
        { id: 'f4', label: 'Cognitive Distortion Category', type: 'select', options: ['Catastrophizing', 'All-or-Nothing Thinking', 'Mind Reading', 'Overgeneralization', 'Emotional Reasoning'] },
        { id: 'f5', label: 'Alternative Rational Reframe', type: 'textarea', placeholder: 'What is a more realistic and objective view?' }
      ];
    } else if (newType === 'mindfulness_audio') {
      defaultInstructions = 'Find a quiet space, put on headphones, and follow the guided audio instructions.';
      defaultFields = [
        { id: 'f1', label: 'Pre-Exercise Stress Rating (1-10)', type: 'slider' },
        { id: 'f2', label: 'Post-Exercise Calm Rating (1-10)', type: 'slider' },
        { id: 'f3', label: 'Reflection Notes', type: 'textarea', placeholder: 'How did your body feel after completing the session?' }
      ];
    } else if (newType === 'journaling_prompt') {
      defaultInstructions = 'Reflect deeply on the prompt below and write your uncensored thoughts.';
      defaultFields = [
        { id: 'f1', label: 'What emotions were most present for you today?', type: 'textarea', placeholder: 'Express freely...' },
        { id: 'f2', label: 'Three things you are grateful for today', type: 'textarea', placeholder: '1...\n2...\n3...' }
      ];
    } else if (newType === 'exposure_hierarchy') {
      defaultInstructions = 'Rank feared situations from lowest to highest SUDS anxiety score (0-100). Practice gradually.';
      defaultFields = [
        { id: 'f1', label: 'Level 1 Exposure (SUDS 20-30)', type: 'text', placeholder: 'Mild anxiety trigger' },
        { id: 'f2', label: 'Level 2 Exposure (SUDS 40-60)', type: 'text', placeholder: 'Moderate anxiety trigger' },
        { id: 'f3', label: 'Level 3 Exposure (SUDS 70-90)', type: 'text', placeholder: 'High anxiety trigger' }
      ];
    } else if (newType === 'behavioral_activation') {
      defaultInstructions = 'Track daily activities and rate your sense of Pleasure (1-10) and Mastery (1-10).';
      defaultFields = [
        { id: 'f1', label: 'Activity Completed', type: 'text', placeholder: 'e.g. 30-min morning walk' },
        { id: 'f2', label: 'Pleasure Rating (1-10)', type: 'slider' },
        { id: 'f3', label: 'Mastery Rating (1-10)', type: 'slider' }
      ];
    } else if (newType === 'custom_html') {
      defaultInstructions = 'Render custom developer HTML / React component code.';
    }

    setFormData((prev) => ({
      ...prev,
      config: {
        ...config,
        templateType: newType,
        instructions: defaultInstructions,
        fields: defaultFields,
        developerNotes: `Developer Note: Custom configuration schema for templateType="${newType}".`
      }
    }));
  };

  const handleAddField = () => {
    const nextId = `f_${Date.now().toString().slice(-4)}`;
    const newField: ActivityField = {
      id: nextId,
      label: 'New Question / Field',
      type: 'textarea',
      placeholder: 'Enter response here...'
    };
    setFormData((prev) => ({
      ...prev,
      config: {
        ...config,
        fields: [...(config.fields || []), newField]
      }
    }));
  };

  const handleUpdateField = (index: number, updatedField: ActivityField) => {
    const updated = [...(config.fields || [])];
    updated[index] = updatedField;
    setFormData((prev) => ({
      ...prev,
      config: { ...config, fields: updated }
    }));
  };

  const handleRemoveField = (index: number) => {
    const updated = (config.fields || []).filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      config: { ...config, fields: updated }
    }));
  };

  const handleSaveAll = () => {
    onSave(formData);
    onShowToast(`Activity "${formData.name}" design & config saved!`, 'success');
  };

  const handleCopyJsonSchema = () => {
    const payload = JSON.stringify(formData.config || {}, null, 2);
    navigator.clipboard.writeText(payload);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
    onShowToast('Developer JSON Schema copied to clipboard!', 'success');
  };

  const codedRegItem = getCodedActivityComponent(formData.id);

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-['Plus_Jakarta_Sans']">
      {/* Top Header & Navigation Control Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-4 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-extrabold text-xs flex items-center gap-1.5 transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Activity Library</span>
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold text-[#5e2be2] uppercase tracking-wider font-mono">
                Activity Designer Studio · {formData.id}
              </span>
              <span className="px-2 py-0.5 bg-purple-50 text-[#5e2be2] font-bold text-[10px] rounded-md border border-purple-200/60">
                {formData.category}
              </span>
              {codedRegItem && (
                <span className="px-2 py-0.5 bg-slate-900 text-emerald-400 font-mono text-[10px] font-bold rounded-md flex items-center gap-1">
                  <Code className="w-3 h-3 text-emerald-400" />
                  {codedRegItem.filePath}
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 leading-tight">{formData.name}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyJsonSchema}
            className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-[#5e2be2] rounded-xl font-extrabold text-xs border border-purple-200/80 transition-all flex items-center gap-1.5 shadow-2xs"
          >
            {copiedSchema ? <Check className="w-4 h-4 text-emerald-600" /> : <Code className="w-4 h-4" />}
            <span>{copiedSchema ? 'Schema Copied!' : 'Copy JSON Schema'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="px-6 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white rounded-xl font-extrabold text-xs shadow-md shadow-[#5e2be2]/25 transition-all active:scale-95 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Activity Design</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Left (Controls & Builder) | Right (Live Sandbox Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 7 Cols (Builder & Configurator) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Sub-Tab Navigation Bar */}
          <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 border border-slate-200/80 shadow-xs gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('builder')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'builder'
                  ? 'bg-[#5e2be2] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>1. Component & Template Builder</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('metadata')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'metadata'
                  ? 'bg-[#5e2be2] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>2. Basic Activity Info</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('json')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'json'
                  ? 'bg-[#5e2be2] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>3. Developer JSON Schema</span>
            </button>
          </div>

          {/* TAB 1: COMPONENT BUILDER & TEMPLATE DESIGNER */}
          {activeTab === 'builder' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Design Activity Template & Fields</h3>
                  <p className="text-[11px] text-slate-400">Select template renderer type and customize input fields for other developers.</p>
                </div>
                <span className="px-2.5 py-1 bg-purple-50 text-[#5e2be2] font-mono font-extrabold text-xs rounded-lg border border-purple-100">
                  {config.templateType}
                </span>
              </div>

              {/* Template Component Selector */}
              <div className="space-y-2">
                <label className="font-extrabold text-slate-700 text-xs block">Select Interactive Template Component *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'cbt_thought_record', label: 'CBT Thought Record', desc: '5-Column Beck CBT Table' },
                    { id: 'mindfulness_audio', label: 'Mindfulness Audio Guide', desc: 'Media player & breathing ring' },
                    { id: 'journaling_prompt', label: 'Journaling & Reflection', desc: 'Guided prompt & mood tags' },
                    { id: 'exposure_hierarchy', label: 'Exposure Ladder', desc: 'SUDS 0-100 fear hierarchy' },
                    { id: 'behavioral_activation', label: 'Behavioral Activation', desc: 'Pleasure & mastery tracker' },
                    { id: 'custom_html', label: 'Custom HTML / React', desc: 'Raw developer HTML snippet' }
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleTemplateChange(tpl.id as any)}
                      className={`p-3 rounded-2xl text-left border transition-all ${
                        config.templateType === tpl.id
                          ? 'bg-purple-50 border-[#5e2be2] ring-2 ring-[#5e2be2]/20'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <p className={`font-extrabold text-xs ${config.templateType === tpl.id ? 'text-[#5e2be2]' : 'text-slate-800'}`}>
                        {tpl.label}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">{tpl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* General Instructions & Audio URL */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 text-xs block">Client Exercise Instructions</label>
                  <textarea
                    rows={2}
                    value={config.instructions || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: { ...config, instructions: e.target.value }
                    })}
                    placeholder="Provide clear step-by-step guidance for the client..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-xs text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                  />
                </div>

                {config.templateType === 'mindfulness_audio' && (
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700 text-xs block">Mindfulness Audio / Video Guide URL</label>
                    <input
                      type="text"
                      value={config.mediaUrl || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: { ...config, mediaUrl: e.target.value }
                      })}
                      placeholder="https://cdn.example.com/audio/mindful-breathing.mp3"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-xs text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                    />
                  </div>
                )}
              </div>

              {/* Dynamic Field Builder Section */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs">Custom Exercise Fields ({config.fields?.length || 0})</h4>
                    <p className="text-[10px] text-slate-400">Configure questions, inputs, and sliders for this activity.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="px-3 py-1.5 bg-purple-50 text-[#5e2be2] hover:bg-purple-100 font-extrabold text-xs rounded-xl border border-purple-200/80 transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Field</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {(config.fields || []).map((field, idx) => (
                    <div key={field.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 relative group">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Field #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveField(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                          title="Remove Field"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">Field Label / Prompt</label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => handleUpdateField(idx, { ...field, label: e.target.value })}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-semibold text-xs text-slate-800"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">Input Control Type</label>
                          <select
                            value={field.type}
                            onChange={(e) => handleUpdateField(idx, { ...field, type: e.target.value as any })}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-semibold text-xs text-slate-800"
                          >
                            <option value="text">Single Line Text Input</option>
                            <option value="textarea">Multi-Line Text Area</option>
                            <option value="slider">Intensity Rating Slider (1-100 or 1-10)</option>
                            <option value="select">Dropdown Options Select</option>
                            <option value="number">Numeric Input</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">Placeholder / Helper Text</label>
                        <input
                          type="text"
                          value={field.placeholder || ''}
                          onChange={(e) => handleUpdateField(idx, { ...field, placeholder: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-medium text-xs text-slate-700"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Developer Implementation Notes */}
              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                <label className="font-extrabold text-slate-700 text-xs block">Developer Integration Notes</label>
                <textarea
                  rows={2}
                  value={config.developerNotes || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: { ...config, developerNotes: e.target.value }
                  })}
                  placeholder="Notes for frontend developers regarding component behavior, API hooks, or validation logic..."
                  className="w-full p-3 bg-slate-900 text-purple-200 border border-slate-800 rounded-xl outline-none font-mono text-xs leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TAB 2: BASIC ACTIVITY INFO */}
          {activeTab === 'metadata' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-sm">Basic Activity Details</h3>
                <p className="text-[11px] text-slate-400">Configure name, category, difficulty, duration, and status.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Activity Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-extrabold text-slate-700 block">Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                    >
                      <option value="CBT">CBT</option>
                      <option value="Mindfulness">Mindfulness</option>
                      <option value="Journaling">Journaling</option>
                      <option value="Exposure">Exposure</option>
                      <option value="Behavioral">Behavioral</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-extrabold text-slate-700 block">Difficulty Level</label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                    >
                      <option value="Easy">Easy (Beginner Friendly)</option>
                      <option value="Medium">Medium (Guided Practice)</option>
                      <option value="Advanced">Advanced (Deep Work)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-extrabold text-slate-700 block">Estimated Duration (Minutes)</label>
                    <input
                      type="number"
                      value={formData.estimatedMinutes}
                      onChange={(e) => setFormData({ ...formData, estimatedMinutes: Number(e.target.value) })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-extrabold text-slate-700 block">Publication Status</label>
                    <select
                      value={formData.status || 'Active'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                    >
                      <option value="Active">Active (Available for Therapists & Clients)</option>
                      <option value="Draft">Draft (Developer Studio Mode)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Exercise Summary / Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-800 focus:bg-white focus:border-[#5e2be2] leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DEVELOPER JSON SCHEMA */}
          {activeTab === 'json' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Developer Configuration JSON Payload</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Use this JSON schema to register custom developer components or API payloads.</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyJsonSchema}
                  className="px-3.5 py-1.5 bg-slate-900 text-purple-200 hover:bg-slate-800 font-extrabold text-xs rounded-xl flex items-center gap-1.5"
                >
                  {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Payload</span>
                </button>
              </div>

              <textarea
                rows={16}
                readOnly
                value={JSON.stringify(formData.config || {}, null, 2)}
                className="w-full p-4 bg-slate-900 text-emerald-400 border border-slate-800 rounded-2xl font-mono text-xs leading-relaxed outline-none"
              />
            </div>
          )}
        </div>

        {/* Right Column: 5 Cols (Live Client Interactive Sandbox Preview) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5e2be2]" />
                <span className="font-extrabold text-slate-900 text-xs">Live Interactive Sandbox Preview</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                Client View Mode
              </span>
            </div>

            {/* Render Preview according to templateType */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 bg-purple-100 text-[#5e2be2] font-bold text-[10px] rounded-full">
                  {formData.category}
                </span>
                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {formData.estimatedMinutes} mins
                </span>
              </div>

              {/* Check if a registered TSX code file exists for this activity */}
              {codedRegItem ? (
                <div className="space-y-2">
                  <div className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-[11px] font-bold rounded-xl flex items-center justify-between">
                    <span>Loaded TSX Code File:</span>
                    <code className="text-white bg-white/10 px-2 py-0.5 rounded">{codedRegItem.filePath}</code>
                  </div>
                  <codedRegItem.component activityId={formData.id} activityName={formData.name} config={formData.config} />
                </div>
              ) : (
                <>
                  {/* RENDER TEMPLATE 1: CBT THOUGHT RECORD */}
                  {config.templateType === 'cbt_thought_record' && (
                <div className="space-y-3 bg-white p-4 rounded-xl border border-purple-100 shadow-2xs">
                  <span className="text-[10px] font-extrabold text-purple-900 uppercase font-mono block">CBT Thought Log Worksheet</span>
                  {(config.fields || []).map((f) => (
                    <div key={f.id} className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">{f.label}</label>
                      {f.type === 'textarea' ? (
                        <textarea rows={2} placeholder={f.placeholder} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none" />
                      ) : f.type === 'select' ? (
                        <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none font-medium">
                          {(f.options || ['Catastrophizing']).map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      ) : f.type === 'slider' ? (
                        <input type="range" min="1" max="100" className="w-full accent-[#5e2be2]" />
                      ) : (
                        <input type="text" placeholder={f.placeholder} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none" />
                      )}
                    </div>
                  ))}
                  <button type="button" className="w-full py-2.5 bg-[#5e2be2] text-white font-extrabold text-xs rounded-xl shadow-xs">
                    Save CBT Thought Log Entry
                  </button>
                </div>
              )}

              {/* RENDER TEMPLATE 2: MINDFULNESS AUDIO */}
              {config.templateType === 'mindfulness_audio' && (
                <div className="space-y-4 bg-gradient-to-br from-purple-900 to-indigo-900 text-white p-5 rounded-2xl shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-purple-200 uppercase tracking-wider">Guided Audio Session</span>
                    <Volume2 className="w-4 h-4 text-purple-300" />
                  </div>
                  <div className="text-center py-4 space-y-2">
                    <div className="w-16 h-16 rounded-full bg-white/10 mx-auto flex items-center justify-center ring-4 ring-white/20 animate-pulse">
                      <Play className="w-6 h-6 text-white ml-0.5" />
                    </div>
                    <p className="text-xs text-purple-100 font-medium">Click Play to start 5-min mindful breathing exercise</p>
                  </div>
                  {(config.fields || []).map((f) => (
                    <div key={f.id} className="space-y-1">
                      <label className="text-[11px] font-semibold text-purple-100 block">{f.label}</label>
                      <input type="text" placeholder={f.placeholder} className="w-full p-2 bg-white/10 border border-white/20 text-white placeholder:text-purple-200/60 rounded-lg text-xs outline-none" />
                    </div>
                  ))}
                </div>
              )}

              {/* RENDER TEMPLATE 3: JOURNALING PROMPT */}
              {config.templateType === 'journaling_prompt' && (
                <div className="space-y-3 bg-amber-50/70 p-4 rounded-xl border border-amber-200 text-amber-950">
                  <span className="text-[10px] font-extrabold uppercase font-mono text-amber-800">Guided Reflection Journal</span>
                  <div className="flex gap-2">
                    {['Calm', 'Reflective', 'Grateful', 'Anxious'].map((mood) => (
                      <button
                        key={mood}
                        type="button"
                        onClick={() => setSampleMood(mood)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          sampleMood === mood ? 'bg-amber-800 text-white' : 'bg-white text-amber-900 border border-amber-200'
                        }`}
                      >
                        {mood}
                      </button>
                    ))}
                  </div>
                  {(config.fields || []).map((f) => (
                    <div key={f.id} className="space-y-1">
                      <label className="text-[11px] font-extrabold text-amber-900 block">{f.label}</label>
                      <textarea rows={2} placeholder={f.placeholder} className="w-full p-2 bg-white border border-amber-200 rounded-lg text-xs outline-none" />
                    </div>
                  ))}
                </div>
              )}

              {/* RENDER TEMPLATE 4: EXPOSURE HIERARCHY LADDER */}
              {config.templateType === 'exposure_hierarchy' && (
                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-extrabold uppercase font-mono text-slate-500">SUDS Anxiety Exposure Ladder</span>
                  {(config.fields || []).map((f, i) => (
                    <div key={f.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>Step {i + 1}</span>
                        <span className="text-purple-700 font-mono text-[10px]">SUDS Level {(i + 1) * 30}/100</span>
                      </div>
                      <input type="text" placeholder={f.placeholder} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none" />
                    </div>
                  ))}
                </div>
              )}

              {/* RENDER TEMPLATE 5: BEHAVIORAL ACTIVATION */}
              {config.templateType === 'behavioral_activation' && (
                <div className="space-y-3 bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 text-emerald-950">
                  <span className="text-[10px] font-extrabold uppercase font-mono text-emerald-800">Behavioral Activation Tracker</span>
                  {(config.fields || []).map((f) => (
                    <div key={f.id} className="space-y-1">
                      <label className="text-[11px] font-bold text-emerald-900 block">{f.label}</label>
                      {f.type === 'slider' ? (
                        <input type="range" min="1" max="10" className="w-full accent-emerald-600" />
                      ) : (
                        <input type="text" placeholder={f.placeholder} className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-xs outline-none" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityDesignerStudio;
