import React from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronDown, ChevronRight } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { BreadcrumbItem } from '@/hooks/use-breadcrumb'

interface MobileBreadcrumbProps {
  breadcrumbs: BreadcrumbItem[]
  className?: string
}

export const MobileBreadcrumb: React.FC<MobileBreadcrumbProps> = ({
  breadcrumbs,
  className = '',
}) => {
  // Get the current page (last breadcrumb item)
  const currentPage = breadcrumbs[breadcrumbs.length - 1]
  
  // Don't render if no breadcrumbs
  if (!breadcrumbs.length) {
    return null
  }

  // If only one breadcrumb, just show it without dropdown
  if (breadcrumbs.length === 1) {
    return (
      <div className={`flex items-center ${className}`}>
        <span className="font-medium text-sm truncate max-w-[200px]">
          {currentPage.label}
        </span>
      </div>
    )
  }

  return (
    <div className={`flex items-center ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 font-medium text-sm hover:bg-accent/50"
          >
            <span className="truncate max-w-[160px]">
              {currentPage?.label || 'Gallery'}
            </span>
            <ChevronDown className="ml-1 h-3 w-3 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {breadcrumbs.map((breadcrumb, index) => {
            const isLast = index === breadcrumbs.length - 1
            const isClickable = breadcrumb.href && !breadcrumb.isActive

            return (
              <DropdownMenuItem
                key={index}
                className={`flex items-center ${isLast ? 'bg-accent/50' : ''} ${
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                }`}
                asChild={isClickable ? true : undefined}
              >
                {isClickable ? (
                  <Link to={breadcrumb.href!} className="flex items-center w-full">
                    <div 
                      className="flex items-center w-full"
                      style={{ paddingLeft: `${index * 16}px` }}
                    >
                      {index > 0 && (
                        <ChevronRight className="h-3 w-3 mr-2 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={`truncate ${isLast ? 'font-medium' : ''}`}>
                        {breadcrumb.label}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center w-full">
                    <div 
                      className="flex items-center w-full"
                      style={{ paddingLeft: `${index * 16}px` }}
                    >
                      {index > 0 && (
                        <ChevronRight className="h-3 w-3 mr-2 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={`truncate ${isLast ? 'font-medium' : ''}`}>
                        {breadcrumb.label}
                      </span>
                    </div>
                  </div>
                )}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
