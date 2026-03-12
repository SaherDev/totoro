import { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { Providers } from '@/app/providers';
import { LocaleHtmlAttrs } from '@/components/locale-html-attrs';
import en from '../../../messages/en.json';
import he from '../../../messages/he.json';

const messages: Record<string, any> = { en, he };

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const dir = locale === 'he' ? 'rtl' : 'ltr';

  return (
    <Providers>
      <NextIntlClientProvider locale={locale} messages={messages[locale]}>
        <LocaleHtmlAttrs locale={locale} dir={dir} />
        {children}
      </NextIntlClientProvider>
    </Providers>
  );
}
