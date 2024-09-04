import { PropsWithChildren } from 'react';
import { Navbar } from '@/components/admin-panel/navbar';

interface ContentLayoutProps {
  title: string;
}

export function ContentLayout({ title, children }: PropsWithChildren<ContentLayoutProps>) {
  return (
    <div>
      <Navbar title={title} />
      <div className="container pt-8 pb-8 px-4 sm:px-8">{children}</div>
    </div>
  );
}
