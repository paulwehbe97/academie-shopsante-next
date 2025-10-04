export const RULES = {
  passMark: 90,
  maxAttempts: 2,
  n1FixedQuestions: 10,
  shuffleQuestions: true,
  shuffleChoices: true,
  feedbackPolicy: {
    showAnswersOnPass: true,
    showOnlyMissedOnFailAttempt1: true,
  },
} as const;
