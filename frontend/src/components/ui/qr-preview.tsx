'use client';

import { Copy, ExternalLink, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { formatCompactDateTime } from '@/lib/utils';

function resolveAbsoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const configured = process.env.NEXT_PUBLIC_APP_URL;
  const base =
    configured ??
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

  return new URL(pathOrUrl, base).toString();
}

export function QrPreviewCard({
  description,
  expiresAt,
  pathOrUrl,
  title,
}: {
  description: string;
  expiresAt?: string;
  pathOrUrl: string;
  title: string;
}) {
  const { push } = useToast();
  const absoluteUrl = useMemo(() => resolveAbsoluteUrl(pathOrUrl), [pathOrUrl]);
  const isLocalhost = absoluteUrl.includes('localhost') || absoluteUrl.includes('127.0.0.1');

  async function copyUrl() {
    await navigator.clipboard.writeText(absoluteUrl);
    push({ title: 'تم نسخ رابط QR', tone: 'success' });
  }

  return (
    <Card className="overflow-hidden border-brand-accent/25 bg-card p-0 shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[18rem_1fr]">
        <div className="flex items-center justify-center bg-foreground p-6 text-background">
          <div className="rounded-lg bg-white p-4 shadow-2xl">
            <QRCodeSVG
              bgColor="#ffffff"
              fgColor="#071006"
              level="M"
              size={220}
              value={absoluteUrl}
            />
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-accent text-black">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{title}</CardTitle>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-border bg-muted/50 p-3">
            <p className="break-all text-sm font-semibold text-foreground">{absoluteUrl}</p>
            {expiresAt ? (
              <p className="mt-2 text-xs font-bold text-muted-foreground">
                ينتهي في {formatCompactDateTime(expiresAt)}
              </p>
            ) : null}
          </div>

          {isLocalhost ? (
            <p className="mt-4 rounded-lg border border-amber-300/60 bg-amber-100/70 p-3 text-sm font-semibold leading-7 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
              عند تجربة QR من موبايل، لا تستخدم localhost. افتح الواجهة على عنوان الشبكة مثل
              http://YOUR-LAN-IP:3000 أو استخدم tunnel.
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button className="gap-2" onClick={copyUrl} type="button" variant="secondary">
              <Copy className="h-4 w-4" />
              نسخ الرابط
            </Button>
            <Button
              className="gap-2"
              onClick={() => window.open(absoluteUrl, '_blank', 'noopener,noreferrer')}
              type="button"
            >
              <ExternalLink className="h-4 w-4" />
              فتح
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
