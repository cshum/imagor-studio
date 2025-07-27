import { Card, CardContent } from '@/components/ui/card'
import { Folder } from 'lucide-react'

export interface FolderProps {
  galleryKey: string
  name: string
}

interface FolderGridProps {
  folders: FolderProps[]
  onFolderClick?: (folder: FolderProps) => void
  width: number
  maxFolderWidth: number
}

export const FolderGrid = ({ folders, onFolderClick, width, maxFolderWidth }: FolderGridProps) => {
  const columnCount = Math.max(2, Math.floor(width / maxFolderWidth))
  const folderWidth = width / columnCount

  return (
    <div
      className="grid gap-2 mb-4"
      style={{
        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
        width: `${width}px`
      }}
    >
      {folders.map((folder) => (
        <Card
          key={folder.galleryKey}
          className="cursor-pointer hover:bg-accent transition-colors"
          onClick={() => onFolderClick?.(folder)}
          style={{ width: `${folderWidth - 8}px` }} // Subtracting 8px to account for the gap
        >
          <CardContent className="flex items-center py-3 px-4">
            <Folder className="w-5 h-5 mr-2 text-primary flex-shrink-0" />
            <span className="text-sm font-medium truncate">{folder.name}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
