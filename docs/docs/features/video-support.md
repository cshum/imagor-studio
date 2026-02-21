---
sidebar_position: 8
---

# Video Support

Basic video file support with thumbnail generation and playback.

## Supported Formats

Default video formats:

- MP4 (`.mp4`)
- WebM (`.webm`)
- AVI (`.avi`)
- MOV (`.mov`)
- MKV (`.mkv`)
- M4V (`.m4v`)
- 3GP (`.3gp`)
- FLV (`.flv`)
- WMV (`.wmv`)
- MPG/MPEG (`.mpg`, `.mpeg`)

Video formats are configurable via `APP_VIDEO_EXTENSIONS` environment variable.

## Video Thumbnails

Thumbnails are generated automatically using FFmpeg:

### Thumbnail Position

Configure where in the video to capture the thumbnail:

- `first_frame` - First frame of video (default, but may be black)
- `seek_1s` - 1 second into video
- `seek_3s` - 3 seconds into video
- `seek_5s` - 5 seconds into video
- `seek_10pct` - 10% through video duration
- `seek_25pct` - 25% through video duration

Set via `APP_VIDEO_THUMBNAIL_POSITION` environment variable.

**Recommendation:** Use `seek_1s` or `seek_3s` to avoid black frames common at video start.

## Video Playback

- **Gallery viewer** - Click video to open in viewer
- **Basic controls** - Play, pause, seek, volume
- **Browser-native** - Uses HTML5 video player
- **Format support** - Depends on browser capabilities

## Video in Gallery

Videos appear in the gallery alongside images:

- Thumbnail preview
- Video icon indicator
- Same file operations (rename, move, delete, download)
- Context menu access

## Technical Details

### Thumbnail Generation

- Powered by FFmpeg
- Generated on first request
- Cached for subsequent requests
- Configurable position to avoid black frames

### Playback

- No server-side transcoding
- Videos served as-is from storage
- Browser must support the video format
- No adaptive bitrate streaming
