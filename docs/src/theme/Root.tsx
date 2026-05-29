import {JSX, PropsWithChildren} from 'react';
import Head from '@docusaurus/Head';
import {useLocation} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function Root({children}: PropsWithChildren): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  const {pathname} = useLocation();
  const normalizedPath = pathname !== '/' && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname;

  const routeMetadata: Record<string, {title: string; description: string}> = {
    '/': {
      title: 'Imagor Studio | self-hosted gallery built on imagor | docs',
      description:
        'Self-hosted image gallery and live editor powered by imagor, with upstream imagor docs for image processing, URL syntax, storage, and benchmarks.',
    },
    '/architecture': {
      title: 'Imagor Studio architecture | imagor-powered image pipeline | docs',
      description:
        'Understand the Imagor Studio architecture, including the imagor image-processing engine, storage backends, and deployment model.',
    },
    '/configuration/imagor': {
      title: 'Imagor Studio imagor configuration | upstream imagor docs | docs',
      description:
        'Configure imagor inside Imagor Studio, including signing, caching, processing limits, and links to the upstream imagor docs and benchmarks.',
    },
    '/ecosystem': {
      title: 'Imagor Studio ecosystem | imagor, vipsgen, imagorvideo | docs',
      description:
        'Explore the Imagor Studio ecosystem, including imagor, vipsgen, imagorvideo, and links to upstream imagor documentation and benchmarks.',
    },
    '/getting-started/quick-start': {
      title: 'Imagor Studio quick start | Docker setup and imagor docs | docs',
      description:
        'Get Imagor Studio running with Docker and follow upstream imagor docs for image processing, storage, security, and benchmarks.',
    },
  };
  const pageMetadata = routeMetadata[normalizedPath];

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Imagor Studio',
    url: siteConfig.url,
    logo: `${siteConfig.url}/img/social-card.jpg`,
    sameAs: [
      'https://github.com/cshum/imagor-studio',
      'https://imagor.net',
      'https://docs.imagor.net/',
      'https://github.com/cshum/imagor',
    ],
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.title,
    url: siteConfig.url,
    about: [
      'Imagor Studio',
      'imagor',
      'self-hosted image gallery',
      'image processing',
    ],
    publisher: {
      '@type': 'Organization',
      name: 'Imagor Studio',
    },
  };

  return (
    <>
      <Head>
        <meta property="og:type" content="website" />
        {pageMetadata && <title>{pageMetadata.title}</title>}
        {pageMetadata && (
          <meta property="og:title" content={pageMetadata.title} />
        )}
        {pageMetadata && (
          <meta name="twitter:title" content={pageMetadata.title} />
        )}
        {pageMetadata && (
          <meta property="og:description" content={pageMetadata.description} />
        )}
        {pageMetadata && (
          <meta name="twitter:description" content={pageMetadata.description} />
        )}
        <script type="application/ld+json">
          {JSON.stringify(organizationSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(websiteSchema)}
        </script>
      </Head>
      {children}
    </>
  );
}