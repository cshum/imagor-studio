import { PropsWithChildren } from 'react';
import AdminPanelLayout from '@/components/admin-panel/admin-panel-layout';

export default function DemoLayout({ children }: PropsWithChildren) {
  return <AdminPanelLayout>{children}</AdminPanelLayout>;
}
