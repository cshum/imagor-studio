import { PropsWithChildren } from 'react';
import { Helmet } from 'react-helmet';
import { ThemeProvider } from '@/providers/theme-provider.tsx';  // Your custom ThemeProvider
import '../globals.css';

const RootLayout = ({ children }: PropsWithChildren) => {
  return (
    <>
      <Helmet>
        <html lang="en" />
        <title>shadcn/ui sidebar</title>
        <meta
          name="description"
          content="A stunning and functional retractable sidebar for Vite + React Router built on top of shadcn/ui with desktop and mobile responsiveness."
        />
        <meta property="og:title" content="shadcn/ui sidebar" />
        <meta
          property="og:description"
          content="A stunning and functional retractable sidebar for Vite + React Router built on top of shadcn/ui with desktop and mobile responsiveness."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="/" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="shadcn/ui sidebar" />
        <meta
          name="twitter:description"
          content="A stunning and functional retractable sidebar for Vite + React Router built on top of shadcn/ui with desktop and mobile responsiveness."
        />
      </Helmet>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
        {children}
      </ThemeProvider>
    </>
  );
};

export default RootLayout;
