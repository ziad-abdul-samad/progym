import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NutritionAiService } from './nutrition-ai.service';

const context = {
  age: 28,
  fitnessGoal: 'بناء عضل',
  gender: 'MALE',
  heightCm: 180,
  weightKg: 82,
};

describe('NutritionAiService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requires a real AI provider instead of silently using a local food list', async () => {
    const config = { get: () => undefined } as unknown as ConfigService;
    const service = new NutritionAiService(config);

    await expect(service.analyze('200 غرام دجاج', context)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns a structured, personalized Gemini response', async () => {
    const config = {
      get: (key: string) => (key === 'GEMINI_API_KEY' ? 'test-key' : undefined),
    } as unknown as ConfigService;
    const fetchMock = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      confidence: 'HIGH',
                      items: [
                        {
                          calories: 330,
                          carbsG: 0,
                          fatG: 7.2,
                          name: 'صدر دجاج',
                          proteinG: 62,
                          quantity: '200 غرام',
                        },
                      ],
                      replyAr: 'هذه الوجبة غنية بالبروتين ومناسبة لهدف بناء العضل.',
                      responseType: 'FOOD_ANALYSIS',
                      totals: { calories: 330, carbsG: 0, fatG: 7.2, proteinG: 62 },
                    }),
                  },
                ],
              },
            },
          ],
        }),
      ok: true,
    });
    vi.stubGlobal('fetch', fetchMock);
    const service = new NutritionAiService(config);

    const result = await service.analyze('احسب 200 غرام دجاج', context, [
      { content: 'أريد وجبة بعد التمرين', role: 'user' },
    ]);

    expect(result.source).toBe('GEMINI');
    expect(result.personalizedFor.weightKg).toBe(82);
    expect(result.items[0]?.proteinG).toBe(62);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
