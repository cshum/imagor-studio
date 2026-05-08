import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useImageContextMenu } from './use-image-context-menu'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

function TestMenu(props: Parameters<typeof useImageContextMenu>[0]) {
  const { renderMenuItems } = useImageContextMenu({
    ...props,
    useDropdownItems: true,
  })

  return (
    <DropdownMenu open>
      <DropdownMenuTrigger asChild>
        <button type='button'>Open</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {renderMenuItems({
          imageKey: 'hero.jpg',
          imageName: 'hero.jpg',
          isVideo: false,
          isTemplate: false,
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

describe('useImageContextMenu', () => {
  const noop = vi.fn()

  it('shows demo-safe preview actions without management actions', () => {
    render(
      <TestMenu
        canEdit={true}
        canCopyUrl={true}
        canDownload={true}
        canManage={false}
        onOpen={noop}
        onEdit={noop}
        onCopyUrl={noop}
        onDownload={noop}
        onRename={noop}
        onMove={noop}
        onDelete={noop}
      />,
    )

    expect(screen.getByText('pages.gallery.contextMenu.open')).not.toBeNull()
    expect(screen.getByText('pages.gallery.contextMenu.edit')).not.toBeNull()
    expect(screen.getByText('pages.gallery.contextMenu.copyUrl')).not.toBeNull()
    expect(screen.getByText('pages.gallery.contextMenu.download')).not.toBeNull()
    expect(screen.queryByText('pages.gallery.contextMenu.rename')).toBeNull()
    expect(screen.queryByText('pages.gallery.contextMenu.move')).toBeNull()
    expect(screen.queryByText('pages.gallery.contextMenu.delete')).toBeNull()
  })
})
