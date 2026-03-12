'use client';

import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { TotoroSplash } from './illustrations/totoro-illustrations';

export function SplashScreen() {
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();
  const { isSignedIn } = useAuth();

  const handleClick = () => {
    if (isSignedIn) {
      router.push(`/${locale}/home`);
    } else {
      router.push(`/${locale}/login`);
    }
  };

  return (
    <motion.div
      className="flex min-h-screen flex-col items-center justify-center bg-background px-4 cursor-pointer"
      onClick={handleClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <motion.div
        className="w-[240px] h-[240px] md:w-[320px] md:h-[320px] lg:w-[400px] lg:h-[400px] anim-breathe mb-8"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
      >
        <TotoroSplash />
      </motion.div>

      <motion.div
        className="flex flex-col items-center gap-3 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <h1 className="font-display text-4xl text-foreground md:text-5xl lg:text-6xl">
          {t('splash.title')}
        </h1>
        <p className="font-body text-base text-muted-foreground max-w-xs leading-relaxed md:text-lg">
          {t('splash.subtitle')}
        </p>
      </motion.div>

      <motion.p
        className="absolute bottom-8 font-body text-xs text-muted-foreground/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        {t('splash.tapToContinue')}
      </motion.p>
    </motion.div>
  );
}
