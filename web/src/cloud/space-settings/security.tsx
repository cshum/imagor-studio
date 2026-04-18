import { useTranslation } from 'react-i18next'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { updateSpace } from '@/cloud/org-api'
import { ImagorConfigForm, type ImagorConfigValues } from '@/components/imagor/imagor-config-form'

import type { SpaceSettingsData } from '@/cloud/space-settings/shared'

interface SecuritySectionProps {
	space: SpaceSettingsData
}

export function SecuritySection({ space }: SecuritySectionProps) {
	const { t } = useTranslation()
	const router = useRouter()

	const handleSave = async (values: ImagorConfigValues) => {
		await updateSpace({
			key: space.key,
			input: {
				key: space.key,
				name: space.name,
				storageType: null,
				bucket: null,
				region: null,
				endpoint: null,
				prefix: null,
				accessKeyId: null,
				secretKey: null,
				usePathStyle: null,
				customDomain: null,
				isShared: null,
				signerAlgorithm: values.signerType.toLowerCase() ?? null,
				signerTruncate: values.signerTruncate ?? null,
				imagorSecret: values.secret || null,
			},
		})
		toast.success(t('pages.spaceSettings.imagor.saved'))
		await router.invalidate()
	}

	return (
		<>
			<div className='mb-4'>
				<h3 className='text-base font-semibold'>{t('pages.spaceSettings.imagor.urlSigning')}</h3>
				<p className='text-muted-foreground mt-1 text-sm'>
					{t('pages.spaceSettings.imagor.urlSigningDescription')}
				</p>
			</div>

			<ImagorConfigForm
				initialValues={{
					hasSecret: false,
					signerType: space.signerAlgorithm,
					signerTruncate: space.signerTruncate,
				}}
				onSave={handleSave}
			/>
		</>
	)
}
