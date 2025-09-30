import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Imagor Studio',
  tagline: 'Self-hosted image gallery and live editing web application for creators',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://docs.studio.imagor.net',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/',

  // GitHub pages deployment config.
  organizationName: 'cshum',
  projectName: 'imagor-studio',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/cshum/imagor-studio/tree/main/docs/',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  themeConfig: {
    image: 'img/social-card.jpg',
    navbar: {
      title: 'Imagor Studio',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://github.com/cshum/imagor-studio',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://imagor.net/buy/early-bird/',
          label: 'Early Bird $39',
          position: 'right',
          className: 'navbar-buy-button',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/',
            },
            {
              label: 'Configuration',
              to: '/configuration/overview',
            },
          ],
        },
        {
          title: 'Ecosystem',
          items: [
            {
              label: 'imagor',
              href: 'https://github.com/cshum/imagor',
            },
            {
              label: 'vipsgen',
              href: 'https://github.com/cshum/vipsgen',
            },
            {
              label: 'imagorvideo',
              href: 'https://github.com/cshum/imagorvideo',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/cshum/imagor-studio',
            },
            {
              label: 'Docker Hub',
              href: 'https://hub.docker.com/r/shumc/imagor-studio',
            },
          ],
        },
      ],
      copyright: `Built with ❤️ for creators. Copyright © ${new Date().getFullYear()} Adrian Shum.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'docker', 'go'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
