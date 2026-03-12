//@ts-check

const { composePlugins, withNx } = require('@nx/next');
const path = require('path');

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
};

const plugins = [withNx];

module.exports = composePlugins(...plugins)(nextConfig);

