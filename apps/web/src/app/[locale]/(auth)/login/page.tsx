'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Illustration } from '@/components/illustrations/Illustration';
import { useSignIn, useAuth } from '@clerk/nextjs';

type SignInStep = 'email' | 'code';

export default function LoginPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signIn, setActive, isLoaded } = useSignIn();

  // Both Google and Apple OAuth providers block WKWebView user agents
  // (Apple: "unsafe browser"; Google: Error 403 disallowed_useragent).
  // On iOS we leave the OAuth buttons visible but disabled, and direct
  // users to the email-code form below — which runs entirely inside
  // WKWebView. Web users see all three options enabled.
  // Defer the native check to after mount to avoid SSR hydration mismatch.
  const [isNativePlatform, setIsNativePlatform] = useState(false);
  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    // Dev-only override: visit `?native=1` in a desktop browser to preview
    // the iOS disabled-OAuth state. NODE_ENV gate means Next.js drops this
    // whole branch from the production bundle.
    const devForceNative =
      process.env.NODE_ENV !== 'production' &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('native') === '1';
    setIsNativePlatform(isNative || devForceNative);
  }, []);

  const [step, setStep] = useState<SignInStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signInLoading, setSignInLoading] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      router.replace(`/${locale}`);
    }
  }, [isSignedIn, locale, router]);

  if (isSignedIn) {
    return null;
  }

  const signInWith = async (strategy: 'oauth_google' | 'oauth_apple') => {
    if (!isLoaded || isNativePlatform) return;
    await signIn.authenticateWithRedirect({
      strategy,
      redirectUrl: `/${locale}/sso-callback`,
      redirectUrlComplete: `/${locale}`,
    });
  };

  const handleSendCode = async () => {
    if (!isLoaded || !signIn || signInLoading) return;
    setSignInError(null);
    setSignInLoading(true);
    try {
      const attempt = await signIn.create({ identifier: email.trim() });
      const emailFactor = attempt.supportedFirstFactors?.find(
        (factor): factor is typeof factor & { strategy: 'email_code'; emailAddressId: string } =>
          factor.strategy === 'email_code',
      );
      if (!emailFactor) {
        setSignInError(t('auth.errors.emailCodeUnavailable'));
        return;
      }
      await signIn.prepareFirstFactor({
        strategy: 'email_code',
        emailAddressId: emailFactor.emailAddressId,
      });
      setStep('code');
    } catch (err: unknown) {
      setSignInError(extractClerkError(err) ?? t('auth.errors.generic'));
    } finally {
      setSignInLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!isLoaded || !signIn || signInLoading) return;
    setSignInError(null);
    setSignInLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code: code.trim(),
      });
      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace(`/${locale}`);
        return;
      }
      setSignInError(t('auth.errors.generic'));
    } catch (err: unknown) {
      setSignInError(extractClerkError(err) ?? t('auth.errors.invalidCode'));
    } finally {
      setSignInLoading(false);
    }
  };

  const oauthDisabled = !isLoaded || isNativePlatform || signInLoading;

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-background px-6 pb-[max(3rem,calc(env(safe-area-inset-bottom)+1.5rem))]">
      {/* Hero — illustration + branding, vertically centered */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm md:max-w-md text-center gap-0">
        <motion.div
          className="w-[160px] h-[160px] md:w-[200px] md:h-[200px] anim-breathe"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Illustration id="auth" />
        </motion.div>

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
        className="w-full max-w-sm md:max-w-md"
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

        {step === 'email' ? (
          <div className="flex flex-col gap-3">
            <button
              suppressHydrationWarning
              onClick={() => signInWith('oauth_google')}
              disabled={oauthDisabled}
              aria-disabled={oauthDisabled}
              className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl border border-border bg-card font-body text-base font-medium text-foreground transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-card disabled:active:scale-100"
            >
              <Image src="/icons/google-icon.svg" alt="Google" width={20} height={20} />
              {t('auth.continueGoogle')}
            </button>

            <button
              suppressHydrationWarning
              onClick={() => signInWith('oauth_apple')}
              disabled={oauthDisabled}
              aria-disabled={oauthDisabled}
              className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl bg-[hsl(0,0%,0%)] font-body text-base font-medium text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40 disabled:active:scale-100"
            >
              <Image src="/icons/apple-icon.svg" alt="Apple" width={20} height={20} className="invert" />
              {t('auth.continueApple')}
            </button>

            {isNativePlatform && (
              <p className="text-xs text-muted-foreground text-center leading-relaxed pt-1">
                {t('auth.iosOauthDisabledHint')}
              </p>
            )}

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('auth.or')}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              className="w-full h-14 rounded-2xl border border-border bg-card px-5 font-body text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
            <button
              suppressHydrationWarning
              onClick={handleSendCode}
              disabled={!isLoaded || signInLoading || !email.trim()}
              className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl bg-primary font-body text-base font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signInLoading ? t('auth.sendingCode') : t('auth.sendCode')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              {t('auth.codeSentTo', { email })}
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder={t('auth.codePlaceholder')}
              className="w-full h-14 rounded-2xl border border-border bg-card px-5 font-body text-base text-center tracking-[0.5em] text-foreground placeholder:text-muted-foreground placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
            <button
              suppressHydrationWarning
              onClick={handleVerifyCode}
              disabled={!isLoaded || signInLoading || code.length < 6}
              className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl bg-primary font-body text-base font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signInLoading ? t('auth.verifying') : t('auth.verify')}
            </button>
            <button
              suppressHydrationWarning
              onClick={() => {
                setStep('email');
                setCode('');
                setSignInError(null);
              }}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              {t('auth.useAnotherEmail')}
            </button>
          </div>
        )}

        {signInError && (
          <p role="alert" className="mt-3 text-sm text-destructive text-center">
            {signInError}
          </p>
        )}
      </motion.div>
    </div>
  );
}

// Clerk errors come through as objects with an `errors` array of
// { code, longMessage, message }. Pull the most user-friendly string
// available and fall back to null so the caller can supply a default.
function extractClerkError(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const errors = (err as { errors?: Array<{ longMessage?: string; message?: string }> }).errors;
  if (!Array.isArray(errors) || errors.length === 0) return null;
  return errors[0].longMessage ?? errors[0].message ?? null;
}
