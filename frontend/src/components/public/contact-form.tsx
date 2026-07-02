'use client';

import { CheckCircle2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import type { PublicLocale } from '@progym/shared';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { publicCopy } from '@/lib/public/content';

export function ContactForm({ locale }: { locale: PublicLocale }) {
  const copy = publicCopy[locale].contact.form;
  const [success, setSuccess] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess(true);
    event.currentTarget.reset();
  }

  return (
    <form className="glass-panel rounded-lg p-4 md:p-6" onSubmit={submit}>
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-green-700 dark:text-brand-accent">
          Pro Gym
        </p>
        <h2 className="mt-2 text-2xl font-black text-foreground">{copy.submit}</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input name="name" placeholder={copy.name} required />
        <Input name="phone" placeholder={copy.phone} required />
        <Input className="md:col-span-2" name="goal" placeholder={copy.goal} required />
        <textarea
          className="min-h-32 rounded-lg border border-input bg-white/58 px-4 py-3 text-sm text-foreground shadow-inner outline-none transition placeholder:text-muted-foreground focus:border-brand-accent focus:ring-2 focus:ring-ring dark:bg-white/5 md:col-span-2"
          name="message"
          placeholder={copy.message}
          required
        />
      </div>
      {success ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-brand-accent/40 bg-brand-accent/10 p-3 text-sm font-semibold text-green-700 dark:text-brand-accent">
          <CheckCircle2 className="h-5 w-5" />
          {copy.success}
        </div>
      ) : null}
      <Button className="mt-5 w-full rounded-full" type="submit">
        {copy.submit}
      </Button>
    </form>
  );
}
