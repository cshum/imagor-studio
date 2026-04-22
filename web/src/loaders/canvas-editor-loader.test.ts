import { beforeEach, describe, expect, it, vi } from 'vitest'

import { canvasEditorLoader } from '@/loaders/canvas-editor-loader'

vi.mock('@/api/imagor-api', () => ({
  generateImagorUrl: vi.fn().mockResolvedValue('http://localhost:8000/mocked-url'),
  generateImagorUrlFromTemplate: vi.fn().mockResolvedValue('http://localhost:8000/mocked-url'),
}))

vi.mock('@/stores/auth-store', () => ({
  getAuth: vi.fn(() => ({
    state: 'authenticated',
    accessToken: 'token',
    profile: null,
    isFirstRun: false,
    multiTenant: true,
    error: null,
    isEmbedded: true,
    pathPrefix: '',
  })),
}))

describe('canvasEditorLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes the tenant spaceKey into generated imagor URLs for color canvases', async () => {
    const { generateImagorUrlFromTemplate } = await import('@/api/imagor-api')

    const result = await canvasEditorLoader({
      search: '?color=ffffff&w=1080&h=1080',
      spaceKey: 'demo',
    })

    await result.imageEditor.generateCopyUrl()

    expect(generateImagorUrlFromTemplate).toHaveBeenCalledWith({
      templateJson: expect.any(String),
      spaceKey: 'demo',
      contextPath: null,
      forPreview: false,
    })
  })
})
