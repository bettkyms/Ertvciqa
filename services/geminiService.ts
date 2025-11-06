// All AI functionality has been removed to eliminate API key requirements and costs.

/**
 * Generates a confirmation message for a class rep's weekly submission.
 * This is a non-AI fallback.
 * @returns A simple confirmation string.
 */
export const generateWeeklyScheduleSubmissionSummary = async (clsName: string, week: string): Promise<string> => {
  // The function is kept async to maintain the same signature, preventing breaking changes in calling components.
  return Promise.resolve(`Thank you. The weekly attendance log for ${clsName} for week ${week} has been successfully submitted.`);
};
