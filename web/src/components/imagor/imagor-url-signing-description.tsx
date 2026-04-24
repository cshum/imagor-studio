import { useTranslation } from 'react-i18next'

const IMAGOR_URL_SIGNATURE_DOCS_URL = 'https://docs.imagor.net/security#url-signature'

export function ImagorUrlSigningDescription() {
  const { t } = useTranslation()

  return (
    <>
      {t('pages.spaceSettings.imagor.urlSigningDescription')}{' '}
      <a
        href={IMAGOR_URL_SIGNATURE_DOCS_URL}
        target='_blank'
        rel='noreferrer'
        className='underline underline-offset-2 hover:no-underline'
      >
        {t('pages.imagor.learnMore', { defaultValue: 'Official imagor docs' })}
      </a>
      .
    </>
  )
}