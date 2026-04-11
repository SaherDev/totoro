'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Illustration } from '@/components/illustrations/Illustration';
import { useSignIn, useAuth } from '@clerk/nextjs';

export default function LoginPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signIn, isLoaded } = useSignIn();

  useEffect(() => {
    if (isSignedIn) {
      router.replace(`/${locale}`);
    }
  }, [isSignedIn, locale, router]);

  if (isSignedIn) {
    return null;
  }

  const signInWith = async (strategy: 'oauth_google' | 'oauth_apple') => {
    if (!isLoaded) return;
    await signIn.authenticateWithRedirect({
      strategy,
      redirectUrl: `/${locale}/sso-callback`,
      redirectUrlComplete: `/${locale}`,
    });
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-background px-6 pb-8">
      {/* Hero — illustration + branding, vertically centered */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm md:max-w-md text-center gap-0">
        {/* Illustration — no circle */}
        <motion.div
          className="w-[160px] h-[160px] md:w-[200px] md:h-[200px] anim-breathe"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Illustration id="auth" />
        </motion.div>

        {/* Branding block */}
        <motion.div
          className="w-full text-center px-2 pt-5 pb-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
        <h1 className="font-display text-5xl font-bold text-foreground tracking-tight mb-4">
          {t('auth.brandHeadline')}
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          {t('auth.brandTagline1')}
        </p>
        <p className="text-base text-muted-foreground leading-relaxed mb-5">
          {t('auth.brandTagline2')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {(['auth.brandChip1', 'auth.brandChip2', 'auth.brandChip3'] as const).map((key) => (
            <span
              key={key}
              className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {t(key as Parameters<typeof t>[0])}
            </span>
          ))}
        </div>
        </motion.div>
      </div>

      <motion.div
        className="w-full max-w-sm md:max-w-md pb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <p className="font-body text-sm text-muted-foreground text-center leading-relaxed mb-5">
          {t('auth.terms')}{' '}
          <span className="text-foreground underline underline-offset-2 cursor-pointer">{t('auth.termsOfService')}</span>
          {' '}{t('auth.and')}{' '}
          <span className="text-foreground underline underline-offset-2 cursor-pointer">{t('auth.privacyPolicy')}</span>.
        </p>

        <div className="flex flex-col gap-3">
          <button
            suppressHydrationWarning
            onClick={() => signInWith('oauth_google')}
            disabled={!isLoaded}
            className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl border border-border bg-card font-body text-base font-medium text-foreground transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-50"
          >
            <Image src="/icons/google-icon.svg" alt="Google" width={20} height={20} />
            {t('auth.continueGoogle')}
          </button>

          <button
            suppressHydrationWarning
            onClick={() => signInWith('oauth_apple')}
            disabled={!isLoaded}
            className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl bg-[hsl(0,0%,0%)] font-body text-base font-medium text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            <Image src="/icons/apple-icon.svg" alt="Apple" width={20} height={20} className="invert" />
            {t('auth.continueApple')}
          </button>

        </div>
      </motion.div>
    </div>
  );
}
