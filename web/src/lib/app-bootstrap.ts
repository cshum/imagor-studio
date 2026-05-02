type AppBootstrap = {
  authProviders?: string[]
}

type BootstrapWindow = Window & {
  __IMAGOR_STUDIO_BOOTSTRAP__?: AppBootstrap
}

function getBootstrap(): AppBootstrap | null {
  if (typeof window === 'undefined') {
    return null
  }

  const bootstrap = (window as BootstrapWindow).__IMAGOR_STUDIO_BOOTSTRAP__
  if (!bootstrap || typeof bootstrap !== 'object') {
    return null
  }

  return bootstrap
}

export function getBootstrappedAuthProviders(): string[] | null {
  const providers = getBootstrap()?.authProviders
  return Array.isArray(providers) ? providers : null
}
