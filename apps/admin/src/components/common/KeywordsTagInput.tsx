import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface KeywordsTagInputProps {
  value?: string | string[]; // Comma-separated keywords string or array
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export const KeywordsTagInput: React.FC<KeywordsTagInputProps> = ({
  value,
  onChange,
  placeholder = 'Add keyword...',
  label = 'Keywords'
}) => {
  const [inputValue, setInputValue] = useState('');

  // Parse comma-separated string or array into array of tags
  const tags: string[] = Array.isArray(value)
    ? value.map((s) => String(s).trim()).filter((s) => s.length > 0)
    : typeof value === 'string' && value.trim().length > 0
    ? value
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  const addTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (!trimmed) return;
    // Don't add duplicate tags
    if (tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setInputValue('');
      return;
    }
    const updated = [...tags, trimmed];
    onChange(updated.join(', '));
    setInputValue('');
  };

  const removeTag = (indexToRemove: number) => {
    const updated = tags.filter((_, idx) => idx !== indexToRemove);
    onChange(updated.join(', '));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className="space-y-2.5 font-['Plus_Jakarta_Sans']">
      {label && <label className="font-extrabold text-slate-800 text-xs block">{label}</label>}

      {/* Tags Pill Container */}
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag, idx) => (
            <span
              key={`${tag}-${idx}`}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 border border-slate-200/90 rounded-full text-slate-800 text-xs font-semibold shadow-2xs group hover:bg-slate-100/80 transition-all"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(idx)}
                className="w-4 h-4 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none"
                aria-label={`Remove keyword ${tag}`}
              >
                <X className="w-3 h-3 stroke-[2.5]" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input Box */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputValue.trim()) {
              addTag(inputValue);
            }
          }}
          placeholder={placeholder}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-800 font-medium focus:bg-white focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 transition-all placeholder:text-slate-400"
        />
        {inputValue.trim() && (
          <button
            type="button"
            onClick={() => addTag(inputValue)}
            className="absolute right-2 px-2.5 py-1 bg-[#5e2be2] text-white rounded-lg font-bold text-[11px] flex items-center gap-1 hover:bg-[#4f28d9] transition-all"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        )}
      </div>
    </div>
  );
};

export default KeywordsTagInput;
