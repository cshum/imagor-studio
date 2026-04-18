import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { Cloud, Lock } from 'lucide-react'
import { toast } from 'sonner'
import * as z from 'zod'

import { updateSpace } from '@/cloud/org-api'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SettingRow } from '@/components/ui/setting-row'
import { SettingsSection } from '@/components/ui/settings-section'
import { SecretField, type SpaceSettingsData } from '@/cloud/space-settings/shared'

const credentialsSchema = z.object({
	prefix: z.string().optional(),
	endpoint: z.string().optional(),
	accessKeyId: z.string().optional(),
	secretKey: z.string().optional(),
})
type CredentialsFormData = z.infer<typeof credentialsSchema>

interface StorageSectionProps {
	space: SpaceSettingsData
}

export function StorageSection({ space }: StorageSectionProps) {
	const { t } = useTranslation()
	const router = useRouter()
	const [isSaving, setIsSaving] = useState(false)
	const [showSecretKey, setShowSecretKey] = useState(false)

	if (space.storageType !== 's3') {
		return (
			<div className='rounded-lg border p-6'>
				<div className='flex items-start gap-4'>
					<Cloud className='text-muted-foreground mt-0.5 h-8 w-8 shrink-0' />
					<div>
						<h3 className='font-semibold'>{t('pages.spaceSettings.storage.managedTitle')}</h3>
						<p className='text-muted-foreground mt-1 text-sm'>
							{t('pages.spaceSettings.storage.managedDescription')}
						</p>
					</div>
				</div>
			</div>
		)
	}

	const form = useForm<CredentialsFormData>({
		resolver: zodResolver(credentialsSchema),
		defaultValues: {
			prefix: space.prefix ?? '',
			endpoint: space.endpoint ?? '',
			accessKeyId: '',
			secretKey: '',
		},
	})

	const handleSave = async (values: CredentialsFormData) => {
		setIsSaving(true)
		try {
			await updateSpace({
				key: space.key,
				input: {
					key: space.key,
					name: space.name,
					storageType: null,
					bucket: null,
					region: null,
					endpoint: values.endpoint ?? null,
					prefix: values.prefix ?? null,
					accessKeyId: values.accessKeyId ?? null,
					secretKey: values.secretKey || null,
					usePathStyle: null,
					customDomain: null,
					isShared: null,
					signerAlgorithm: null,
					signerTruncate: null,
					imagorSecret: null,
				},
			})
			toast.success(t('pages.spaceSettings.storage.saved'))
			form.setValue('accessKeyId', '')
			form.setValue('secretKey', '')
			setShowSecretKey(false)
			await router.invalidate()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : String(err))
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<SettingsSection>
			<div className='bg-muted/40 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md px-3 py-2 text-sm'>
				<span>
					<span className='text-muted-foreground'>{t('pages.spaceSettings.storage.bucket')}: </span>
					<code className='font-mono font-medium'>{space.bucket}</code>
				</span>
				{space.region && (
					<span>
						<span className='text-muted-foreground'>
							{t('pages.spaceSettings.storage.region')}: 
						</span>
						<code className='font-mono font-medium'>{space.region}</code>
					</span>
				)}
				<span className='text-muted-foreground text-xs'>
					{t('pages.spaceSettings.storage.bucketLocked')}
				</span>
			</div>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(handleSave)}>
					<FormField
						control={form.control}
						name='prefix'
						render={({ field }) => (
							<FormItem>
								<SettingRow
									label={t('pages.spaceSettings.storage.prefix')}
									description={t('pages.spaceSettings.storage.prefixDescription')}
								>
									<FormControl>
										<Input placeholder='media/' {...field} disabled={isSaving} />
									</FormControl>
									<FormMessage className='mt-1.5' />
								</SettingRow>
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='endpoint'
						render={({ field }) => (
							<FormItem>
								<SettingRow
									label={t('pages.spaceSettings.storage.endpoint')}
									description={t('pages.spaceSettings.storage.endpointDescription')}
								>
									<FormControl>
										<Input placeholder='https://s3.amazonaws.com' {...field} disabled={isSaving} />
									</FormControl>
									<FormMessage className='mt-1.5' />
								</SettingRow>
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='accessKeyId'
						render={({ field }) => (
							<FormItem>
								<SettingRow
									label={t('pages.spaceSettings.storage.accessKeyId')}
									description={t('pages.spaceSettings.storage.accessKeyIdDescription')}
								>
									<FormControl>
										<Input
											placeholder={t('pages.spaceSettings.placeholders.unchanged')}
											{...field}
											disabled={isSaving}
										/>
									</FormControl>
									<FormMessage className='mt-1.5' />
								</SettingRow>
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='secretKey'
						render={({ field }) => (
							<FormItem>
								<SettingRow
									label={t('pages.spaceSettings.storage.secretKey')}
									description={t('pages.spaceSettings.storage.secretKeyDescription')}
								>
									<SecretField
										show={showSecretKey}
										onShow={() => setShowSecretKey(true)}
										onHide={() => {
											setShowSecretKey(false)
											field.onChange('')
										}}
										updateLabel={t('common.buttons.update')}
										cancelLabel={t('common.buttons.cancel')}
										disabled={isSaving}
										renderInput={() => (
											<Input type='password' autoFocus {...field} disabled={isSaving} />
										)}
									/>
									<FormMessage className='mt-1.5' />
								</SettingRow>
							</FormItem>
						)}
					/>

					<div className='bg-muted/50 text-muted-foreground mx-4 mb-2 flex items-start gap-2 rounded-md px-3 py-2.5 text-xs'>
						<Lock className='mt-0.5 h-3.5 w-3.5 shrink-0' />
						<span>{t('pages.spaces.credentialsEncrypted')}</span>
					</div>

					<div className='mt-2 flex justify-end pt-2'>
						<ButtonWithLoading type='submit' isLoading={isSaving}>
							{t('common.buttons.save')}
						</ButtonWithLoading>
					</div>
				</form>
			</Form>
		</SettingsSection>
	)
}
