import { afterEach, describe, expect, it } from 'vitest'

import { getUiOptionsFromLocation } from './editor-state-url'

describe('getUiOptionsFromLocation', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('defaults all editor chrome flags to visible', () => {
    window.history.replaceState(null, '', '/editor')

    expect(getUiOptionsFromLocation()).toEqual({
      showHeader: true,
      showStatusBar: true,
      showZoomControl: true,
      showControls: true,
      postMessageUrl: false,
    })
  })

  it('parses explicit false-like UI flags from the query string', () => {
    window.history.replaceState(
      null,
      '',
      '/editor?header=0&statusBar=hidden&zoom=false&controls=off&embedSyncUrl=no',
    )

    expect(getUiOptionsFromLocation()).toEqual({
      showHeader: false,
      showStatusBar: false,
      showZoomControl: false,
      showControls: false,
      postMessageUrl: false,
    })
  })

  it('parses explicit true-like UI flags from the query string', () => {
    window.history.replaceState(
      null,
      '',
      '/editor?header=yes&statusBar=visible&zoom=visible&controls=1&embedSyncUrl=on',
    )

    expect(getUiOptionsFromLocation()).toEqual({
      showHeader: true,
      showStatusBar: true,
      showZoomControl: true,
      showControls: true,
      postMessageUrl: true,
    })
  })
})
