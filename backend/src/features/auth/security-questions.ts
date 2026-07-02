export const SECURITY_QUESTIONS = [
  { key: 'first_school', textAr: 'ما اسم أول مدرسة التحقت بها؟' },
  { key: 'childhood_friend', textAr: 'ما اسم صديق الطفولة المفضل لديك؟' },
  { key: 'favorite_teacher', textAr: 'ما اسم معلمك المفضل؟' },
  { key: 'birth_city', textAr: 'في أي مدينة ولدت؟' },
  { key: 'first_pet', textAr: 'ما اسم أول حيوان أليف امتلكته؟' },
  { key: 'favorite_meal', textAr: 'ما وجبتك المفضلة؟' },
] as const;

export function getSecurityQuestionText(key: string): string | undefined {
  return SECURITY_QUESTIONS.find((question) => question.key === key)?.textAr;
}
