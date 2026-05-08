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
      showZoomControl: true,
      showControls: true,
    })
  })

  it('parses explicit false-like UI flags from the query string', () => {
    window.history.replaceState(null, '', '/editor?uiHeader=0&uiZoom=false&uiControls=off')

    expect(getUiOptionsFromLocation()).toEqual({
      showHeader: false,
      showZoomControl: false,
      showControls: false,
    })
  })

  it('parses explicit true-like UI flags from the query string', () => {
    window.history.replaceState(null, '', '/editor?uiHeader=yes&uiZoom=visible&uiControls=1')

    expect(getUiOptionsFromLocation()).toEqual({
      showHeader: true,
      showZoomControl: true,
      showControls: true,
    })
  })
})
