import { BeatSchema } from '@ovida/schemas';

export const generateDemoBeat = async (index: number) => {
  const beat = BeatSchema.parse({
    index,
    narration: index === 0
      ? 'You arrive at the haunted shore, waves whispering secrets.'
      : `Beat ${index + 1}: the tale continues with choice-driven suspense.`,
    choices: [
      { id: 'continue', text: 'Continue the journey' },
      { id: 'reflect', text: 'Reflect on the last choice' },
    ],
  });

  return beat;
};
