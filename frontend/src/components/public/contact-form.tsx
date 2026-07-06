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
    <form className="border border-white/12 bg-white/[0.035] p-5 backdrop-blur-md md:p-9" onSubmit={submit}>
      <div className="mb-8 border-b border-white/10 pb-6">
        <p className="text-[0.58rem] font-black uppercase tracking-[0.2em] text-[#39ff14]">
          Pro Gym
        </p>
        <h2 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em] text-white">{copy.submit}</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input className="h-14 rounded-none border-white/12 bg-white/[0.045] text-white placeholder:text-white/32 focus-visible:border-[#39ff14]" name="name" placeholder={copy.name} required />
        <Input className="h-14 rounded-none border-white/12 bg-white/[0.045] text-white placeholder:text-white/32 focus-visible:border-[#39ff14]" name="phone" placeholder={copy.phone} required />
        <Input className="h-14 rounded-none border-white/12 bg-white/[0.045] text-white placeholder:text-white/32 focus-visible:border-[#39ff14] md:col-span-2" name="goal" placeholder={copy.goal} required />
        <textarea
          className="min-h-40 border border-white/12 bg-white/[0.045] px-4 py-4 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-[#39ff14] focus:ring-1 focus:ring-[#39ff14] md:col-span-2"
          name="message"
          placeholder={copy.message}
          required
        />
      </div>
      {success ? (
        <div className="mt-4 flex items-center gap-2 border border-[#39ff14]/40 bg-[#39ff14]/10 p-3 text-sm font-semibold text-[#39ff14]">
          <CheckCircle2 className="h-5 w-5" />
          {copy.success}
        </div>
      ) : null}
      <Button className="mt-5 h-14 w-full rounded-none bg-[#39ff14] text-xs font-black uppercase tracking-[0.12em] text-black hover:bg-white" type="submit">
        {copy.submit}
      </Button>
    </form>
  );
}
