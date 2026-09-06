import type { ActivityCodeRegistryItem } from './types';
import GroundingTechnique54321 from './templates/GroundingTechnique54321';
import CBTThoughtRecord from './templates/CBTThoughtRecord';
import ProgressiveMuscleRelaxation from './templates/ProgressiveMuscleRelaxation';
import ExposureHierarchyLadder from './templates/ExposureHierarchyLadder';
import BehavioralActivationTracker from './templates/BehavioralActivationTracker';

export * from './types';

export const activityCodeRegistry: Record<string, ActivityCodeRegistryItem> = {
  'ACT-01': {
    id: 'ACT-01',
    name: '5-4-3-2-1 Grounding Technique',
    filePath: 'src/activities/templates/GroundingTechnique54321.tsx',
    component: GroundingTechnique54321,
    description: 'Coded sensory grounding interactive component.',
    isVisible: true
  },
  'ACT-02': {
    id: 'ACT-02',
    name: 'CBT Automatic Thought Record',
    filePath: 'src/activities/templates/CBTThoughtRecord.tsx',
    component: CBTThoughtRecord,
    description: 'Coded Beck 5-column CBT thought record log.',
    isVisible: true
  },
  'ACT-03': {
    id: 'ACT-03',
    name: 'Progressive Muscle Relaxation (PMR)',
    filePath: 'src/activities/templates/ProgressiveMuscleRelaxation.tsx',
    component: ProgressiveMuscleRelaxation,
    description: 'Coded guided audio session with pre/post somatic tension sliders.',
    isVisible: true
  },
  'ACT-04': {
    id: 'ACT-04',
    name: 'Fear Hierarchy & Exposure Ladder',
    filePath: 'src/activities/templates/ExposureHierarchyLadder.tsx',
    component: ExposureHierarchyLadder,
    description: 'Coded SUDS 0-100 graded exposure hierarchy ladder.',
    isVisible: true
  },
  'ACT-05': {
    id: 'ACT-05',
    name: 'Behavioral Activation Tracker',
    filePath: 'src/activities/templates/BehavioralActivationTracker.tsx',
    component: BehavioralActivationTracker,
    description: 'Coded Pleasure & Mastery activity tracker.',
    isVisible: true
  }
};

export const getCodedActivityComponent = (activityId: string): ActivityCodeRegistryItem | undefined => {
  return activityCodeRegistry[activityId];
};
