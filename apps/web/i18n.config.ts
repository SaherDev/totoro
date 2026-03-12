import { getRequestConfig } from 'next-intl/server';
import en from './messages/en.json';
import he from './messages/he.json';

export const locales = ['en', 'he'] as const;
export const defaultLocale = 'en' as const;

const messages: Record<string, any> = { en, he };

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale ?? defaultLocale;
  return {
    locale,
    messages: messages[locale],
    timeZone: 'UTC',
  };
});
