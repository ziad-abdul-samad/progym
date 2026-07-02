export type NutritionMode = 'CUSTOM' | 'CUT' | 'GAIN' | 'MAINTAIN';

export type NutritionTarget = {
  calories: number;
  carbsG: number;
  fatG: number;
  mode: NutritionMode;
  proteinG: number;
};

export type MemberMetrics = {
  age: number;
  gender: string;
  heightCm: number;
  weightKg: number;
};

function targetForCalories(
  calories: number,
  mode: NutritionMode,
  weightKg: number,
): NutritionTarget {
  const proteinG = Math.round(weightKg * 2);
  const fatG = Math.round((calories * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));

  return { calories, carbsG, fatG, mode, proteinG };
}

export function calculateNutritionTargets(metrics: MemberMetrics): NutritionTarget[] {
  const genderOffset = metrics.gender === 'MALE' ? 5 : metrics.gender === 'FEMALE' ? -161 : -78;
  const bmr = 10 * metrics.weightKg + 6.25 * metrics.heightCm - 5 * metrics.age + genderOffset;
  const maintenance = Math.max(1200, Math.round(bmr * 1.55));

  return [
    targetForCalories(Math.max(1200, maintenance - 400), 'CUT', metrics.weightKg),
    targetForCalories(maintenance, 'MAINTAIN', metrics.weightKg),
    targetForCalories(maintenance + 300, 'GAIN', metrics.weightKg),
  ];
}
