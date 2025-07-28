import React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { Forward, MoreVertical, PanelLeft, PanelLeftClose } from 'lucide-react'

import { ModeToggle } from '@/components/mode-toggle.tsx'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface FixedHeaderBarProps {
  isScrolled: boolean
  onTreeToggle?: () => void // New prop for tree sidebar toggle
  isTreeOpen?: boolean // New prop for tree sidebar state
}

export const FixedHeaderBar: React.FC<FixedHeaderBarProps> = ({
  isScrolled: isScrolledDown,
  onTreeToggle,
  isTreeOpen = false,
}) => {
  // Get current route parameters
  const params = useParams({ strict: false })
  const galleryKey = params.galleryKey || 'default'

  const getGalleryDisplayName = (key: string) => {
    switch (key) {
      case 'favorites':
        return 'Favorites'
      case 'recent':
        return 'Recent'
      case 'default':
        return 'Gallery'
      default:
        return key.charAt(0).toUpperCase() + key.slice(1)
    }
  }

  return (
    <TooltipProvider>
      <header
        className={`sticky top-0 z-10 w-full px-2 ${isScrolledDown ? 'bg-card/75 dark:shadow-secondary shadow backdrop-blur md:-mx-6 md:w-[calc(100%+48px)]' : ''}`}
      >
        <div className='mx-auto'>
          <div
            className={`flex items-center justify-between px-2 py-1 ${isScrolledDown ? 'md:mx-6' : ''}`}
          >
            <div className='flex items-center space-x-2'>
              {/* Tree Sidebar Toggle Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={onTreeToggle}
                    className={`h-8 w-8 ${isTreeOpen ? 'bg-accent' : ''}`}
                  >
                    {isTreeOpen ? (
                      <PanelLeftClose className='h-4 w-4' />
                    ) : (
                      <PanelLeft className='h-4 w-4' />
                    )}
                    <span className='sr-only'>Toggle Tree Sidebar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isTreeOpen ? 'Hide Tree' : 'Show Tree'}</TooltipContent>
              </Tooltip>

              {/* Mobile: Show current page title only */}
              {isScrolledDown && (
                <div className='block sm:hidden'>
                  <span className='max-w-[140px] truncate font-medium'>
                    {getGalleryDisplayName(galleryKey)}
                  </span>
                </div>
              )}

              {/* Desktop: Full breadcrumb */}
              <Breadcrumb className='hidden sm:block'>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to='/'>Home</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to='/gallery/$galleryKey' params={{ galleryKey }}>
                        {getGalleryDisplayName(galleryKey)}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className='flex items-center space-x-1'>
              <ModeToggle />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant='ghost' size='icon'>
                    <Forward className='h-4 w-4' />
                    <span className='sr-only'>Forward</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Forward</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' size='icon'>
                    <MoreVertical className='h-4 w-4' />
                    <span className='sr-only'>More</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem>
                    <Link to='/gallery/$galleryKey' params={{ galleryKey: 'favourites' }}>
                      View Favorites
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to='/gallery/$galleryKey' params={{ galleryKey: 'recent' }}>
                      View Recent
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link to='/gallery/$galleryKey' params={{ galleryKey: 'default' }}>
                      View All
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>Mark as unread</DropdownMenuItem>
                  <DropdownMenuItem>Star thread</DropdownMenuItem>
                  <DropdownMenuItem>Add label</DropdownMenuItem>
                  <DropdownMenuItem>Mute thread</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
    </TooltipProvider>
  )
}
