type CloudLegalFooterProps = {
  appTitle: string
  className?: string
  containerClassName?: string
  contentClassName?: string
}

const DOCUMENTATION_URL = 'https://docs.imagor.net/'
const SUPPORT_URL = 'mailto:support@imagor.net'
const PRIVACY_POLICY_URL = 'https://imagor.net/privacy'
const TERMS_OF_SERVICE_URL = 'https://imagor.net/terms'

export function CloudLegalFooter({
  appTitle,
  className,
  containerClassName,
  contentClassName,
}: CloudLegalFooterProps) {
  return (
    <div
      className={[
        'mx-auto flex flex-col items-center gap-2 py-6 text-center sm:flex-row sm:justify-between sm:text-left',
        containerClassName || 'max-w-5xl',
        contentClassName || 'px-4 sm:px-6 lg:px-8',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <nav className='text-muted-foreground flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs sm:justify-start'>
        <a
          href={DOCUMENTATION_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='hover:text-foreground transition-colors'
        >
          Documentation
        </a>
        <a href={SUPPORT_URL} className='hover:text-foreground transition-colors'>
          Support
        </a>
        <a
          href={PRIVACY_POLICY_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='hover:text-foreground transition-colors'
        >
          Privacy Policy
        </a>
        <a
          href={TERMS_OF_SERVICE_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='hover:text-foreground transition-colors'
        >
          Terms of Service
        </a>
      </nav>
      <p className='text-muted-foreground text-xs'>
        © {new Date().getFullYear()} {appTitle}
      </p>
    </div>
  )
}
