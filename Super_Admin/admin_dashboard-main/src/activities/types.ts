import React from 'react';
import type { ActivityConfig } from '../types';

export interface BaseActivityComponentProps {
  activityId: string;
  activityName: string;
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
