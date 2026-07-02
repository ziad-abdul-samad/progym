import { describe, expect, it } from 'vitest';

import { calculateNutritionTargets } from './nutrition-calculator';

describe('calculateNutritionTargets', () => {
  it('returns cut, maintenance, and gain targets in ascending calories', () => {
    const targets = calculateNutritionTargets({
      age: 28,
      gender: 'MALE',
      heightCm: 180,
      weightKg: 82,
    });

    expect(targets.map((target) => target.mode)).toEqual(['CUT', 'MAINTAIN', 'GAIN']);
    expect(targets[0]!.calories).toBeLessThan(targets[1]!.calories);
    expect(targets[1]!.calories).toBeLessThan(targets[2]!.calories);
    expect(targets.every((target) => target.proteinG > 0 && target.carbsG >= 0)).toBe(true);
  });
});
