'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Illustration } from '@/components/illustrations/Illustration';
import { Mail } from 'lucide-react';
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
      {/* Spacer to push circle to middle */}
      <div className="flex-1 flex items-center justify-center">
        {/* Circle container */}
        <motion.div
          className="relative w-[320px] h-[320px] md:w-[400px] md:h-[400px] rounded-full bg-gradient-to-br from-muted/30 to-muted/10 border border-border flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="w-[220px] h-[220px] md:w-[260px] md:h-[260px] anim-breathe"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Illustration id="auth" />
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className="mt-auto pt-12 w-full max-w-sm md:max-w-md md:mt-10"
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

          <div className="flex items-center gap-4 my-1">
            <div className="flex-1 h-px bg-border" />
            <span className="font-body text-xs text-muted-foreground">{t('auth.or')}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            suppressHydrationWarning
            disabled
            className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl border border-border bg-background font-body text-base font-medium text-foreground transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-50"
          >
            <Mail className="w-5 h-5" />
            {t('auth.continueEmail')}
          </button>
        </div>

        <p className="font-body text-xs text-muted-foreground/50 text-center mt-5">
          {t('auth.cantLogin')}{' '}
          <span className="text-muted-foreground underline underline-offset-2 cursor-pointer">{t('auth.clickHere')}</span>
        </p>
      </motion.div>
    </div>
  );
}
