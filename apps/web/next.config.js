//@ts-check

const { composePlugins, withNx } = require('@nx/next');
const path = require('path');

const API_BASE_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  nx: {},
  turbopack: {
    resolveAlias: {
      'next-intl/config': './i18n.config.ts',
    },
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_BASE_URL}/:path*`,
      },
    ];
  },
};

const plugins = [withNx];

module.exports = composePlugins(...plugins)(nextConfig);

