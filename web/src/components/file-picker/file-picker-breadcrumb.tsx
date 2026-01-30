import React from 'react'
import { useTranslation } from 'react-i18next'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export interface FilePickerBreadcrumbProps {
  currentPath: string
  homeTitle?: string
  onNavigate: (path: string) => void
}

export const FilePickerBreadcrumb: React.FC<FilePickerBreadcrumbProps> = ({
  currentPath,
  homeTitle,
  onNavigate,
}) => {
  const { t } = useTranslation()

  // Split path into segments
  const segments = currentPath ? currentPath.split('/').filter(Boolean) : []

  // Build breadcrumb items
  const breadcrumbItems: Array<{ name: string; path: string }> = [
    { name: homeTitle || t('components.folderTree.home'), path: '' },
  ]

  let accumulatedPath = ''
  segments.forEach((segment) => {
    accumulatedPath = accumulatedPath ? `${accumulatedPath}/${segment}` : segment
    breadcrumbItems.push({ name: segment, path: accumulatedPath })
  })

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1

          return (
            <React.Fragment key={item.path || 'root'}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{item.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink onClick={() => onNavigate(item.path)} className='cursor-pointer'>
                    {item.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
