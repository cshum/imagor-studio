import { Link } from 'react-router-dom'; // Replace next/link with react-router-dom
import { PanelsTopLeft } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Menu } from '@/components/admin-panel/menu';
import { SidebarToggle } from '@/components/admin-panel/sidebar-toggle';
import { useSidebarToggle } from '@/providers/sidebar-toggle-provider.tsx'

export function Sidebar() {
  const { isOpen, toggleSidebar } = useSidebarToggle(); // Use the new hook

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-20 h-screen -translate-x-full lg:translate-x-0 transition-[width] ease-in-out duration-300',
        isOpen === false ? 'w-[90px]' : 'w-72'
      )}
    >
      {/* Passing toggleSidebar to SidebarToggle */}
      <SidebarToggle isOpen={isOpen} setIsOpen={toggleSidebar} />
      <div className="relative h-full flex flex-col px-3 py-4 overflow-y-auto shadow-md dark:shadow-zinc-800">
        <Button
          className={cn(
            'transition-transform ease-in-out duration-300 mb-1',
            isOpen === false ? 'translate-x-1' : 'translate-x-0'
          )}
          variant="link"
          asChild
        >
          <Link to="/" className="flex items-center gap-2">
            <PanelsTopLeft className="w-6 h-6 mr-1" />
            <h1
              className={cn(
                'font-bold text-lg whitespace-nowrap transition-[transform,opacity,display] ease-in-out duration-300',
                isOpen === false
                  ? '-translate-x-96 opacity-0 hidden'
                  : 'translate-x-0 opacity-100'
              )}
            >
              Brand
            </h1>
          </Link>
        </Button>
        <Menu isOpen={isOpen} />
      </div>
    </aside>
  );
}
