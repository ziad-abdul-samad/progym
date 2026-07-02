export function ageFromDateOfBirth(dateOfBirth: Date, now = new Date()): number {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const birthdayPassed =
    now.getUTCMonth() > dateOfBirth.getUTCMonth() ||
    (now.getUTCMonth() === dateOfBirth.getUTCMonth() &&
      now.getUTCDate() >= dateOfBirth.getUTCDate());

  if (!birthdayPassed) age -= 1;
  return age;
}

export function dateOfBirthFromAge(age: number, now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear() - age, 0, 1));
}
