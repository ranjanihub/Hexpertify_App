import type { ActivityCodeRegistryItem } from './types';
import MoodLiftBreathingPlayer from './templates/MoodLiftBreathingPlayer';
import MoodLiftMindfulnessGrounding from './templates/MoodLiftMindfulnessGrounding';
import MoodLiftSomaticPlayer from './templates/MoodLiftSomaticPlayer';
import MoodLiftCbtPlayer from './templates/MoodLiftCbtPlayer';
import MoodLiftAffirmationPlayer from './templates/MoodLiftAffirmationPlayer';

export * from './types';

export const activityCodeRegistry: Record<string, ActivityCodeRegistryItem> = {
  'ACT-01': {
    id: 'ACT-01',
    name: 'Diaphragmatic Breathing',
    filePath: 'src/activities/templates/MoodLiftBreathingPlayer.tsx',
    component: MoodLiftBreathingPlayer,
    description: 'Deep belly breathing technique with biofeedback orb and vagus nerve stimulation.',
    isVisible: true
  },
  'ACT-02': {
    id: 'ACT-02',
    name: 'Box Breathing',
    filePath: 'src/activities/templates/MoodLiftBreathingPlayer.tsx',
    component: MoodLiftBreathingPlayer,
    description: 'Navy SEAL 4-4-4-4 tactical focus and nervous system balance.',
    isVisible: true
  },
  'ACT-03': {
    id: 'ACT-03',
    name: '4-7-8 Breathing',
    filePath: 'src/activities/templates/MoodLiftBreathingPlayer.tsx',
    component: MoodLiftBreathingPlayer,
    description: 'Parasympathetic reset with 4s inhale, 7s hold, and 8s extended exhale.',
    isVisible: true
  },
  'ACT-04': {
    id: 'ACT-04',
    name: 'Alternate Nostril Breathing',
    filePath: 'src/activities/templates/MoodLiftBreathingPlayer.tsx',
    component: MoodLiftBreathingPlayer,
    description: 'Nadi Shodhana hemispheric synchronization breathing exercise.',
    isVisible: true
  },
  'ACT-05': {
    id: 'ACT-05',
    name: 'Describe Your Room',
    filePath: 'src/activities/templates/MoodLiftMindfulnessGrounding.tsx',
    component: MoodLiftMindfulnessGrounding,
    description: 'Sensory grounding exercise through objective environmental cataloging.',
    isVisible: true
  },
  'ACT-06': {
    id: 'ACT-06',
    name: 'Name the Moment',
    filePath: 'src/activities/templates/MoodLiftMindfulnessGrounding.tsx',
    component: MoodLiftMindfulnessGrounding,
    description: 'Emotional labeling and self-compassion protocol ("name it to tame it").',
    isVisible: true
  },
  'ACT-07': {
    id: 'ACT-07',
    name: 'Physical Grounding',
    filePath: 'src/activities/templates/MoodLiftMindfulnessGrounding.tsx',
    component: MoodLiftMindfulnessGrounding,
    description: '5-Sense somatic grounding technique to exit acute fight-or-flight.',
    isVisible: true
  },
  'ACT-08': {
    id: 'ACT-08',
    name: 'Posture Reset',
    filePath: 'src/activities/templates/MoodLiftSomaticPlayer.tsx',
    component: MoodLiftSomaticPlayer,
    description: 'Biomechanical alignment sequence to decompress spine and open chest.',
    isVisible: true
  },
  'ACT-09': {
    id: 'ACT-09',
    name: 'Self-Soothing',
    filePath: 'src/activities/templates/MoodLiftSomaticPlayer.tsx',
    component: MoodLiftSomaticPlayer,
    description: 'DBT multi-sensory distress tolerance and comfort toolkit.',
    isVisible: true
  },
  'ACT-10': {
    id: 'ACT-10',
    name: 'CBT Thought-Challenger',
    filePath: 'src/activities/templates/MoodLiftCbtPlayer.tsx',
    component: MoodLiftCbtPlayer,
    description: 'Beck cognitive restructuring protocol with distortion analysis and balanced reframes.',
    isVisible: true
  },
  'ACT-11': {
    id: 'ACT-11',
    name: 'Affirmation Mirror',
    filePath: 'src/activities/templates/MoodLiftAffirmationPlayer.tsx',
    component: MoodLiftAffirmationPlayer,
    description: 'Neuroplasticity mirror work reinforcing positive self-worth pathways.',
    isVisible: true
  },
  'ACT-12': {
    id: 'ACT-12',
    name: 'Worry Box',
    filePath: 'src/activities/templates/MoodLiftCbtPlayer.tsx',
    component: MoodLiftCbtPlayer,
    description: 'Externalization vault for worry postponement and mental disengagement.',
    isVisible: true
  },
  'ACT-13': {
    id: 'ACT-13',
    name: 'Cognitive Grounding',
    filePath: 'src/activities/templates/MoodLiftMindfulnessGrounding.tsx',
    component: MoodLiftMindfulnessGrounding,
    description: 'Mental puzzles, reverse countdowns, and category blitz challenges.',
    isVisible: true
  }
};

export const getCodedActivityComponent = (activityId: string): ActivityCodeRegistryItem | undefined => {
  return activityCodeRegistry[activityId];
};
