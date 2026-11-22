import React from 'react';

// Same shape as the client and admin apps' ActivityConfig (kept local: this app has no shared types module)
export type ActivityTemplateType =
  | 'cbt_thought_record'
  | 'mindfulness_audio'
  | 'journaling_prompt'
  | 'exposure_hierarchy'
  | 'behavioral_activation'
  | 'custom_html';

export interface ActivityField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'number' | 'slider' | 'media';
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

export interface ActivityConfig {
  templateType: ActivityTemplateType;
  instructions?: string;
  mediaUrl?: string;
  fields?: ActivityField[];
  customHtmlChunk?: string;
  developerNotes?: string;
  jsonSchema?: string;
}

export interface BaseActivityComponentProps {
  activityId?: string;
  activityName?: string;
  config?: ActivityConfig;
  initialData?: Record<string, any>;
  onComplete?: (submissionData: Record<string, any>) => void;
  isReadOnly?: boolean;
}

export interface ActivityCodeRegistryItem {
  id: string;
  name: string;
  filePath: string;
  component: React.FC<BaseActivityComponentProps>;
  description: string;
  isVisible?: boolean;
}
