import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.totoro.app',
  appName: 'Totoro',
  webDir: 'public',
  server: {
    url: 'https://totoro-ten-phi.vercel.app',
    cleartext: false,
    allowNavigation: [
      'totoro-ten-phi.vercel.app',
      '*.clerk.accounts.dev',
      '*.clerk.com',
      'accounts.google.com',
      'oauth2.googleapis.com',
      'ssl.gstatic.com',
    ],
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
