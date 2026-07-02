'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Plus, Save, Trash2, Utensils } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogCancelButton, DialogForm } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { apiRequest, jsonBody } from '@/lib/api/client';
import {
  calculateNutritionTargets,
  type MemberMetrics,
  type NutritionTarget,
} from '@/features/coach/nutrition-calculator';

export type WorkoutPlanData = {
  id: string;
  notes: string | null;
  seriesId: string;
  status: string;
  title: string;
  updatedAt: string;
  version: number;
  items: Array<{
    dayIndex: number;
    dayTitle: string | null;
    exercise?: { nameAr: string } | null;
    exerciseName: string | null;
    id: string;
    notes: string | null;
    reps: string | null;
    sets: number | null;
    videoUrl: string | null;
  }>;
};

export type NutritionPlanData = {
  id: string;
  notes: string | null;
  seriesId: string;
  status: string;
  targetCalories: number | null;
  targetCarbsG: string | number | null;
  targetFatG: string | number | null;
  targetMode: string | null;
  targetProteinG: string | number | null;
  title: string;
  updatedAt: string;
  version: number;
  meals: Array<{
    id: string;
    name: string;
    notes: string | null;
    timing: string | null;
    items: Array<{
      calories: number | null;
      carbsG: string | number | null;
      fatG: string | number | null;
      id: string;
      name: string;
      proteinG: string | number | null;
      quantity: string | null;
    }>;
  }>;
};

type WorkoutDraft = {
  dayIndex: number;
  dayTitle: string;
  exerciseName: string;
  id: string;
  notes: string;
  reps: string;
  sets: number;
  videoUrl: string;
};

type FoodDraft = {
  calories: number;
  carbsG: number;
  fatG: number;
  id: string;
  name: string;
  proteinG: number;
  quantity: string;
};

type MealDraft = {
  id: string;
  items: FoodDraft[];
  name: string;
  notes: string;
  timing: string;
};

function workoutDraft(plan?: WorkoutPlanData | null): WorkoutDraft[] {
  if (plan?.items.length) {
    return plan.items.map((item) => ({
      dayIndex: item.dayIndex,
      dayTitle: item.dayTitle ?? '',
      exerciseName: item.exerciseName ?? item.exercise?.nameAr ?? '',
      id: item.id,
      notes: item.notes ?? '',
      reps: item.reps ?? '',
      sets: item.sets ?? 3,
      videoUrl: item.videoUrl ?? '',
    }));
  }
  return [
    {
      dayIndex: 0,
      dayTitle: '',
      exerciseName: '',
      id: crypto.randomUUID(),
      notes: '',
      reps: '',
      sets: 3,
      videoUrl: '',
    },
  ];
}

function foodDraft(): FoodDraft {
  return {
    calories: 0,
    carbsG: 0,
    fatG: 0,
    id: crypto.randomUUID(),
    name: '',
    proteinG: 0,
    quantity: '',
  };
}

function mealDraft(plan?: NutritionPlanData | null): MealDraft[] {
  if (plan?.meals.length) {
    return plan.meals.map((meal) => ({
      id: meal.id,
      name: meal.name,
      notes: meal.notes ?? '',
      timing: meal.timing ?? '',
      items: meal.items.map((item) => ({
        calories: item.calories ?? 0,
        carbsG: Number(item.carbsG ?? 0),
        fatG: Number(item.fatG ?? 0),
        id: item.id,
        name: item.name,
        proteinG: Number(item.proteinG ?? 0),
        quantity: item.quantity ?? '',
      })),
    }));
  }
  return [
    {
      id: crypto.randomUUID(),
      items: [foodDraft()],
      name: '',
      notes: '',
      timing: '',
    },
  ];
}

export function WorkoutPlanEditor({
  memberId,
  onClose,
  plan,
}: {
  memberId: string;
  onClose: () => void;
  plan?: WorkoutPlanData | null;
}) {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [items, setItems] = useState(() => workoutDraft(plan));
  const days = useMemo(
    () => Array.from(new Set(items.map((item) => item.dayIndex))).sort((a, b) => a - b),
    [items],
  );
  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiRequest(plan ? `/coaches/workout-plans/${plan.id}` : '/coaches/workout-plans', {
        body: jsonBody(payload),
        method: plan ? 'PATCH' : 'POST',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['coach-client', memberId] });
      push({
        title: plan ? 'تم تحديث برنامج التدريب' : 'تم إنشاء برنامج التدريب',
        tone: 'success',
      });
      onClose();
    },
  });

  function addExercise(dayIndex: number) {
    setItems((current) => {
      const dayTitle = current.find((item) => item.dayIndex === dayIndex)?.dayTitle ?? '';
      return [
        ...current,
        {
          dayIndex,
          dayTitle,
          exerciseName: '',
          id: crypto.randomUUID(),
          notes: '',
          reps: '',
          sets: 3,
          videoUrl: '',
        },
      ];
    });
  }

  function updateItem(id: string, field: keyof WorkoutDraft, value: number | string) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function updateDayTitle(dayIndex: number, dayTitle: string) {
    setItems((current) =>
      current.map((item) => (item.dayIndex === dayIndex ? { ...item, dayTitle } : item)),
    );
  }

  return (
    <Dialog
      description="برنامج خاص بهذا اللاعب ولا يعتمد على مكتبة تمارين الإدارة."
      onClose={onClose}
      open
      title={plan ? `تعديل ${plan.title}` : 'برنامج تدريب مخصص'}
    >
      <DialogForm
        actions={
          <>
            <DialogCancelButton onClick={onClose} />
            <Button className="gap-2" isLoading={save.isPending} loadingText="جاري الحفظ">
              <Save className="h-4 w-4" />
              حفظ البرنامج
            </Button>
          </>
        }
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          save.mutate({
            items: items.map(
              ({ dayIndex, dayTitle, exerciseName, notes, reps, sets, videoUrl }) => ({
                dayIndex,
                dayTitle,
                exerciseName,
                notes,
                reps,
                sets,
                videoUrl: videoUrl.trim() || undefined,
              }),
            ),
            memberId,
            notes: String(form.get('notes') ?? ''),
            status: 'ACTIVE',
            title: String(form.get('title')),
          });
        }}
      >
        <Input
          defaultValue={plan?.title ?? ''}
          name="title"
          placeholder="اسم البرنامج، مثال: برنامج تضخيم 8 أسابيع"
          required
        />
        <div className="flex justify-end">
          <Button
            className="gap-2"
            onClick={() => addExercise(Math.max(...days, -1) + 1)}
            type="button"
            variant="secondary"
          >
            <CalendarDays className="h-4 w-4" />
            إضافة يوم
          </Button>
        </div>
        <div className="space-y-4">
          {days.map((dayIndex) => (
            <section className="overflow-hidden rounded-lg border border-border" key={dayIndex}>
              <div className="grid items-center gap-3 bg-black px-4 py-3 text-white sm:grid-cols-[auto_1fr_auto]">
                <p className="whitespace-nowrap font-black">اليوم {dayIndex + 1}</p>
                <Input
                  className="border-white/20 bg-white/10 text-white placeholder:text-white/45"
                  onChange={(event) => updateDayTitle(dayIndex, event.target.value)}
                  placeholder="اسم اليوم، مثال: يوم الصدر"
                  value={items.find((item) => item.dayIndex === dayIndex)?.dayTitle ?? ''}
                />
                <Button
                  className="min-h-9 gap-2 border-white/20 bg-white/10 px-3 py-1 text-white hover:bg-white/20"
                  onClick={() => addExercise(dayIndex)}
                  type="button"
                  variant="secondary"
                >
                  <Plus className="h-4 w-4" />
                  تمرين
                </Button>
              </div>
              <div className="grid gap-3 p-3">
                {items
                  .filter((item) => item.dayIndex === dayIndex)
                  .map((item, index) => (
                    <div
                      className="grid gap-3 rounded-lg bg-muted/35 p-3 lg:grid-cols-[1.2fr_0.35fr_0.45fr_1fr_auto]"
                      key={item.id}
                    >
                      <Input
                        onChange={(event) =>
                          updateItem(item.id, 'exerciseName', event.target.value)
                        }
                        placeholder={`اسم التمرين ${index + 1}`}
                        required
                        value={item.exerciseName}
                      />
                      <Input
                        min={1}
                        onChange={(event) =>
                          updateItem(item.id, 'sets', Number(event.target.value))
                        }
                        placeholder="Sets"
                        type="number"
                        value={item.sets}
                      />
                      <Input
                        onChange={(event) => updateItem(item.id, 'reps', event.target.value)}
                        placeholder="Reps"
                        value={item.reps}
                      />
                      <Input
                        onChange={(event) => updateItem(item.id, 'notes', event.target.value)}
                        placeholder="تعليمات أو ملاحظات"
                        value={item.notes}
                      />
                      <Input
                        className="lg:col-span-4"
                        onChange={(event) => updateItem(item.id, 'videoUrl', event.target.value)}
                        placeholder="رابط شرح YouTube (اختياري)"
                        type="url"
                        value={item.videoUrl}
                      />
                      <Button
                        aria-label="حذف التمرين"
                        className="px-3"
                        disabled={items.length === 1}
                        onClick={() =>
                          setItems((current) =>
                            current.filter((candidate) => candidate.id !== item.id),
                          )
                        }
                        type="button"
                        variant="danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </div>
        <Textarea
          defaultValue={plan?.notes ?? ''}
          name="notes"
          placeholder="ملاحظات عامة للبرنامج"
        />
      </DialogForm>
    </Dialog>
  );
}

export function NutritionPlanEditor({
  memberId,
  metrics,
  onClose,
  plan,
}: {
  memberId: string;
  metrics: MemberMetrics;
  onClose: () => void;
  plan?: NutritionPlanData | null;
}) {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [meals, setMeals] = useState(() => mealDraft(plan));
  const presets = useMemo(() => calculateNutritionTargets(metrics), [metrics]);
  const maintenance = presets.find((preset) => preset.mode === 'MAINTAIN') ?? presets[0]!;
  const [target, setTarget] = useState<NutritionTarget>(() => ({
    calories: plan?.targetCalories ?? maintenance.calories,
    carbsG: Number(plan?.targetCarbsG ?? maintenance.carbsG),
    fatG: Number(plan?.targetFatG ?? maintenance.fatG),
    mode: (plan?.targetMode as NutritionTarget['mode']) ?? maintenance.mode,
    proteinG: Number(plan?.targetProteinG ?? maintenance.proteinG),
  }));
  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiRequest(plan ? `/coaches/nutrition-plans/${plan.id}` : '/coaches/nutrition-plans', {
        body: jsonBody(payload),
        method: plan ? 'PATCH' : 'POST',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['coach-client', memberId] });
      push({ title: plan ? 'تم تحديث خطة الغذاء' : 'تم إنشاء خطة الغذاء', tone: 'success' });
      onClose();
    },
  });

  function updateMeal(id: string, field: 'name' | 'notes' | 'timing', value: string) {
    setMeals((current) =>
      current.map((meal) => (meal.id === id ? { ...meal, [field]: value } : meal)),
    );
  }

  function updateFood(
    mealId: string,
    foodId: string,
    field: keyof FoodDraft,
    value: number | string,
  ) {
    setMeals((current) =>
      current.map((meal) =>
        meal.id === mealId
          ? {
              ...meal,
              items: meal.items.map((food) =>
                food.id === foodId ? { ...food, [field]: value } : food,
              ),
            }
          : meal,
      ),
    );
  }

  return (
    <Dialog
      description="أضف التوقيت والسعرات والماكروز لكل صنف، مع ملاحظات مستقلة لكل وجبة."
      onClose={onClose}
      open
      title={plan ? `تعديل ${plan.title}` : 'خطة غذاء مخصصة'}
    >
      <DialogForm
        actions={
          <>
            <DialogCancelButton onClick={onClose} />
            <Button className="gap-2" isLoading={save.isPending} loadingText="جاري الحفظ">
              <Save className="h-4 w-4" />
              حفظ خطة الغذاء
            </Button>
          </>
        }
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          save.mutate({
            meals: meals.map(({ items, name, notes, timing }) => ({
              items: items.map(
                ({ calories, carbsG, fatG, name: foodName, proteinG, quantity }) => ({
                  calories,
                  carbsG,
                  fatG,
                  name: foodName,
                  proteinG,
                  quantity,
                }),
              ),
              name,
              notes,
              timing,
            })),
            memberId,
            notes: String(form.get('notes') ?? ''),
            status: 'ACTIVE',
            targetCalories: target.calories,
            targetCarbsG: target.carbsG,
            targetFatG: target.fatG,
            targetMode: target.mode,
            targetProteinG: target.proteinG,
            title: String(form.get('title')),
          });
        }}
      >
        <Input
          defaultValue={plan?.title ?? ''}
          name="title"
          placeholder="اسم الخطة الغذائية"
          required
        />
        <section className="rounded-lg border border-border bg-muted/20 p-4">
          <div>
            <p className="font-black">الحساب التلقائي للاعب</p>
            <p className="mt-1 text-xs font-bold text-muted-foreground">
              محسوب من العمر والطول والوزن والجنس بمعادلة Mifflin-St Jeor ونشاط متوسط.
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {presets.map((preset) => (
              <button
                className={
                  target.mode === preset.mode
                    ? 'rounded-lg border border-brand-accent bg-black p-3 text-start text-white shadow-lg'
                    : 'rounded-lg border border-border bg-card p-3 text-start transition hover:border-brand-accent/50'
                }
                key={preset.mode}
                onClick={() => setTarget(preset)}
                type="button"
              >
                <p className="text-xs font-black text-muted-foreground">
                  {nutritionModeLabel(preset.mode)}
                </p>
                <p className="mt-1 text-2xl font-black">{preset.calories}</p>
                <p className="mt-2 text-xs font-bold opacity-70">
                  P {preset.proteinG} · C {preset.carbsG} · F {preset.fatG}
                </p>
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <LabeledNumberInput
              label="السعرات اليومية"
              onChange={(value) =>
                setTarget((current) => ({ ...current, calories: value, mode: 'CUSTOM' }))
              }
              step={1}
              value={target.calories}
            />
            <LabeledNumberInput
              label="البروتين (غ)"
              onChange={(value) =>
                setTarget((current) => ({ ...current, proteinG: value, mode: 'CUSTOM' }))
              }
              value={target.proteinG}
            />
            <LabeledNumberInput
              label="الكربوهيدرات (غ)"
              onChange={(value) =>
                setTarget((current) => ({ ...current, carbsG: value, mode: 'CUSTOM' }))
              }
              value={target.carbsG}
            />
            <LabeledNumberInput
              label="الدهون (غ)"
              onChange={(value) =>
                setTarget((current) => ({ ...current, fatG: value, mode: 'CUSTOM' }))
              }
              value={target.fatG}
            />
          </div>
        </section>
        <div className="flex justify-end">
          <Button
            className="gap-2"
            onClick={() =>
              setMeals((current) => [
                ...current,
                {
                  id: crypto.randomUUID(),
                  items: [foodDraft()],
                  name: '',
                  notes: '',
                  timing: '',
                },
              ])
            }
            type="button"
            variant="secondary"
          >
            <Utensils className="h-4 w-4" />
            إضافة وجبة
          </Button>
        </div>
        <div className="space-y-4">
          {meals.map((meal, mealIndex) => (
            <section className="overflow-hidden rounded-lg border border-border" key={meal.id}>
              <div className="grid gap-3 bg-black p-4 sm:grid-cols-2">
                <Input
                  className="border-white/20 bg-white/10 text-white placeholder:text-white/45"
                  onChange={(event) => updateMeal(meal.id, 'name', event.target.value)}
                  placeholder={`اسم الوجبة ${mealIndex + 1}`}
                  required
                  value={meal.name}
                />
                <Input
                  className="border-white/20 bg-white/10 text-white placeholder:text-white/45"
                  onChange={(event) => updateMeal(meal.id, 'timing', event.target.value)}
                  placeholder="التوقيت، مثال: 08:00 صباحاً"
                  value={meal.timing}
                />
              </div>
              <div className="grid gap-3 p-3">
                {meal.items.map((food) => (
                  <div
                    className="grid gap-2 rounded-lg bg-muted/35 p-3 md:grid-cols-2 xl:grid-cols-7"
                    key={food.id}
                  >
                    <Input
                      onChange={(event) => updateFood(meal.id, food.id, 'name', event.target.value)}
                      placeholder="الصنف"
                      required
                      value={food.name}
                    />
                    <Input
                      onChange={(event) =>
                        updateFood(meal.id, food.id, 'quantity', event.target.value)
                      }
                      placeholder="الكمية"
                      value={food.quantity}
                    />
                    {[
                      ['calories', 'السعرات'],
                      ['proteinG', 'البروتين (غ)'],
                      ['carbsG', 'الكربوهيدرات (غ)'],
                      ['fatG', 'الدهون (غ)'],
                    ].map(([field, label]) => (
                      <label className="grid gap-1" key={field}>
                        <span className="text-xs font-black text-muted-foreground">{label}</span>
                        <Input
                          min={0}
                          onChange={(event) =>
                            updateFood(
                              meal.id,
                              food.id,
                              field as keyof FoodDraft,
                              Number(event.target.value),
                            )
                          }
                          placeholder="0"
                          step={field === 'calories' ? 1 : 0.1}
                          type="number"
                          value={String(food[field as keyof FoodDraft])}
                        />
                      </label>
                    ))}
                    <Button
                      aria-label="حذف الصنف"
                      className="px-3"
                      disabled={meal.items.length === 1}
                      onClick={() =>
                        setMeals((current) =>
                          current.map((candidate) =>
                            candidate.id === meal.id
                              ? {
                                  ...candidate,
                                  items: candidate.items.filter((item) => item.id !== food.id),
                                }
                              : candidate,
                          ),
                        )
                      }
                      type="button"
                      variant="danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="gap-2"
                    onClick={() =>
                      setMeals((current) =>
                        current.map((candidate) =>
                          candidate.id === meal.id
                            ? { ...candidate, items: [...candidate.items, foodDraft()] }
                            : candidate,
                        ),
                      )
                    }
                    type="button"
                    variant="secondary"
                  >
                    <Plus className="h-4 w-4" />
                    صنف
                  </Button>
                  <Button
                    disabled={meals.length === 1}
                    onClick={() =>
                      setMeals((current) => current.filter((candidate) => candidate.id !== meal.id))
                    }
                    type="button"
                    variant="danger"
                  >
                    حذف الوجبة
                  </Button>
                </div>
                <Textarea
                  onChange={(event) => updateMeal(meal.id, 'notes', event.target.value)}
                  placeholder="ملاحظات الوجبة"
                  value={meal.notes}
                />
              </div>
            </section>
          ))}
        </div>
        <Textarea
          defaultValue={plan?.notes ?? ''}
          name="notes"
          placeholder="ملاحظات عامة للخطة الغذائية"
        />
      </DialogForm>
    </Dialog>
  );
}

function LabeledNumberInput({
  label,
  onChange,
  step = 0.1,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  step?: number;
  value: number;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-black text-muted-foreground">{label}</span>
      <Input
        min={0}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}

function nutritionModeLabel(mode: NutritionTarget['mode']) {
  return {
    CUSTOM: 'مخصص',
    CUT: 'تنشيف',
    GAIN: 'زيادة وزن',
    MAINTAIN: 'ثبات الوزن',
  }[mode];
}
