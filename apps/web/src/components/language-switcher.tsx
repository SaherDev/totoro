'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale !== locale) {
      // Remove locale prefix from pathname and navigate to the new locale
      const pathWithoutLocale = pathname.replace(new RegExp(`^/${locale}`), '');
      router.push(`/${newLocale}${pathWithoutLocale || ''}`);
    }
  };

  const locales = [
    { code: 'en', label: 'English' },
    { code: 'he', label: 'עברית' },
  ];

  return (
    <div className={className}>
      {locales.map((loc) => (
        <button
          key={loc.code}
          onClick={() => handleLocaleChange(loc.code)}
          className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
            locale === loc.code
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {loc.label}
        </button>
      ))}
    </div>
  );
}
