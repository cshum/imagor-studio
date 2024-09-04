import { PropsWithChildren } from 'react';
import AdminPanelLayout from '@/layouts/admin-panel-layout.tsx';

export default function DemoLayout({ children }: PropsWithChildren) {
  return <AdminPanelLayout>{children}</AdminPanelLayout>;
}
