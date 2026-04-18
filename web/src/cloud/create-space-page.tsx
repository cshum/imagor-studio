import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { CheckCircle2, Cloud, Database, Lock } from 'lucide-react'
import { toast } from 'sonner'
import * as z from 'zod'

import { checkSpaceKey, createSpace } from '@/cloud/org-api'
import { AppHeader } from '@/components/app-header'
import { Button } from '@shared/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@shared/components/ui/form'
import { Input } from '@shared/components/ui/input'
import {
	MultiStepForm,
	type MultiStepFormNavigationProps,
	type MultiStepFormStep,
} from '@/components/ui/multi-step-form'
import { Separator } from '@shared/components/ui/separator'
import { useBrand } from '@/hooks/use-brand'
import { extractErrorInfo } from '@/lib/error-utils'
import { useAuth } from '@/stores/auth-store'

function makeCreateSchema(t: (key: string) => string) {
	return z
		.object({
			key: z
				.string()
				.min(1, t('forms.validation.required'))
				.max(64)
				.regex(/^[a-z0-9-]+$/, t('pages.spaces.validation.keyFormat')),
			name: z.string().min(1, t('forms.validation.required')).max(255),
			storageType: z.enum(['managed', 's3']),
			bucket: z.string().optional(),
			region: z.string().optional(),
			endpoint: z.string().optional(),
			prefix: z.string().optional(),
			accessKeyId: z.string().optional(),
			secretKey: z.string().optional(),
		})
		.superRefine((data, ctx) => {
			if (data.storageType === 's3') {
				if (!data.bucket?.trim()) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: t('forms.validation.required'),
						path: ['bucket'],
					})
				}
				if (!data.region?.trim()) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: t('forms.validation.required'),
						path: ['region'],
					})
				}
			}
		})
}

const _schemaShape = makeCreateSchema((k) => k)
type CreateFormData = z.infer<typeof _schemaShape>

function slugify(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 64)
}

interface IdentityStepProps extends MultiStepFormNavigationProps {
	form: ReturnType<typeof useForm<CreateFormData>>
	onNext: () => Promise<boolean>
}

function IdentityStep({ form, onNext, next }: IdentityStepProps) {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const [isLoading, setIsLoading] = useState(false)

	const handleNext = async () => {
		setIsLoading(true)
		try {
			const ok = await onNext()
			if (ok) await next()
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className='space-y-6'>
			<FormField
				control={form.control}
				name='name'
				render={({ field }) => (
					<FormItem>
						<FormLabel>{t('pages.spaces.formLabels.name')}</FormLabel>
						<FormControl>
							<Input
								placeholder={t('pages.spaces.placeholders.name')}
								{...field}
								autoFocus
								onChange={(e) => {
									field.onChange(e)
									const keyValue = form.getValues('key')
									if (!keyValue || keyValue === slugify(field.value)) {
										form.setValue('key', slugify(e.target.value), { shouldValidate: true })
									}
								}}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name='key'
				render={({ field }) => (
					<FormItem>
						<FormLabel>{t('pages.spaces.formLabels.key')}</FormLabel>
						<FormControl>
							<Input placeholder='my-space' {...field} className='font-mono' />
						</FormControl>
						<FormDescription>{t('pages.spaces.keyDescription')}</FormDescription>
						<FormMessage />
					</FormItem>
				)}
			/>
			<div className='mt-6 flex items-center justify-between border-t pt-6'>
				<Button type='button' variant='outline' onClick={() => navigate({ to: '/' })}>
					{t('common.buttons.cancel')}
				</Button>
				<ButtonWithLoading type='button' onClick={handleNext} isLoading={isLoading}>
					{t('pages.spaces.wizard.next')}
				</ButtonWithLoading>
			</div>
		</div>
	)
}

interface StorageStepProps extends MultiStepFormNavigationProps {
	form: ReturnType<typeof useForm<CreateFormData>>
	isSaving: boolean
	onSubmit: () => Promise<void>
}

function StorageStep({ form, isSaving, onSubmit, back }: StorageStepProps) {
	const { t } = useTranslation()
	const selectedStorageType = useWatch({ control: form.control, name: 'storageType' })
	const isByob = selectedStorageType === 's3'

	return (
		<div className='space-y-6'>
			<FormField
				control={form.control}
				name='storageType'
				render={({ field }) => (
					<FormItem>
						<FormLabel>{t('pages.spaces.storageTypeLabel')}</FormLabel>
						<div className='grid grid-cols-2 gap-3'>
							{(['managed', 's3'] as const).map((type) => {
								const isSelected = field.value === type
								return (
									<button
										key={type}
										type='button'
										disabled={isSaving}
										onClick={() => field.onChange(type)}
										className={[
											'relative rounded-lg border p-4 text-left',
											isSelected
												? 'border-primary bg-primary/5 ring-primary ring-1'
												: 'border-border hover:bg-muted/50',
										].join(' ')}
									>
										{isSelected && (
											<CheckCircle2 className='text-primary absolute top-2 right-2 h-4 w-4' />
										)}
										<div className='mb-2'>
											{type === 'managed' ? (
												<Cloud className='text-primary h-5 w-5' />
											) : (
												<Database className='h-5 w-5 text-amber-500' />
											)}
										</div>
										<p className='text-sm font-medium'>{t(`pages.spaces.storageType.${type}`)}</p>
										<p className='text-muted-foreground mt-1 text-xs'>
											{t(`pages.spaces.storageTypeDesc.${type}`)}
										</p>
									</button>
								)
							})}
						</div>
						<FormMessage />
					</FormItem>
				)}
			/>

			{isByob && (
				<>
					<Separator />
					<div className='grid grid-cols-2 gap-4'>
						<FormField
							control={form.control}
							name='bucket'
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t('pages.spaceSettings.storage.bucket')} *</FormLabel>
									<FormControl>
										<Input placeholder='my-bucket' {...field} disabled={isSaving} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name='region'
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t('pages.spaceSettings.storage.region')} *</FormLabel>
									<FormControl>
										<Input placeholder='us-east-1' {...field} disabled={isSaving} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
					<FormField
						control={form.control}
						name='endpoint'
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t('pages.spaceSettings.storage.endpoint')}</FormLabel>
								<FormControl>
									<Input placeholder='https://s3.amazonaws.com' {...field} disabled={isSaving} />
								</FormControl>
								<FormDescription>
									{t('pages.spaceSettings.storage.endpointDescription')}
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='prefix'
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t('pages.spaceSettings.storage.prefix')}</FormLabel>
								<FormControl>
									<Input placeholder='media/' {...field} disabled={isSaving} />
								</FormControl>
								<FormDescription>
									{t('pages.spaceSettings.storage.prefixDescription')}
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
					<div className='grid grid-cols-2 gap-4'>
						<FormField
							control={form.control}
							name='accessKeyId'
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t('pages.spaceSettings.storage.accessKeyId')}</FormLabel>
									<FormControl>
										<Input {...field} disabled={isSaving} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name='secretKey'
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t('pages.spaceSettings.storage.secretKey')}</FormLabel>
									<FormControl>
										<Input type='password' {...field} disabled={isSaving} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
					<div className='bg-muted/50 text-muted-foreground flex items-start gap-2 rounded-md px-3 py-2.5 text-xs'>
						<Lock className='mt-0.5 h-3.5 w-3.5 shrink-0' />
						<span>{t('pages.spaces.credentialsEncrypted')}</span>
					</div>
				</>
			)}

			<div className='mt-6 flex items-center justify-between border-t pt-6'>
				<Button type='button' variant='outline' onClick={back} disabled={isSaving}>
					{t('pages.spaces.wizard.back')}
				</Button>
				<ButtonWithLoading type='button' onClick={onSubmit} isLoading={isSaving}>
					{t('pages.spaces.createSpaceButton')}
				</ButtonWithLoading>
			</div>
		</div>
	)
}

export function CreateSpacePage() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { authState, logout } = useAuth()
	const { title: appTitle } = useBrand()
	const [currentStep, setCurrentStep] = useState(1)
	const [isSaving, setIsSaving] = useState(false)

	const getUserDisplayName = () =>
		authState.profile?.displayName || authState.profile?.username || t('common.status.user')

	const handleLogout = async () => {
		await logout()
		navigate({ to: '/login' })
	}

	const schema = useMemo(() => makeCreateSchema(t), [t])

	const form = useForm<CreateFormData>({
		resolver: zodResolver(schema),
		defaultValues: { key: '', name: '', storageType: 'managed' },
	})

	const handleIdentityNext = async (): Promise<boolean> => {
		const valid = await form.trigger(['name', 'key'])
		if (!valid) return false
		const key = form.getValues('key')
		try {
			const exists = await checkSpaceKey(key)
			if (exists) {
				form.setError('key', { message: t('pages.spaces.messages.keyAlreadyTaken') })
				return false
			}
		} catch {
			// Allow proceeding; create mutation will catch duplicates.
		}
		return true
	}

	const handleCreateSpace = async () => {
		const valid = await form.trigger()
		if (!valid) return

		const values = form.getValues()
		const isS3 = values.storageType === 's3'
		setIsSaving(true)
		try {
			await createSpace({
				input: {
					key: values.key,
					name: values.name,
					storageType: values.storageType,
					bucket: isS3 ? (values.bucket ?? null) : null,
					region: isS3 ? (values.region ?? null) : null,
					endpoint: isS3 ? (values.endpoint ?? null) : null,
					prefix: isS3 ? (values.prefix ?? null) : null,
					accessKeyId: isS3 ? (values.accessKeyId ?? null) : null,
					secretKey: isS3 ? (values.secretKey ?? null) : null,
					usePathStyle: null,
					customDomain: null,
					isShared: null,
					signerAlgorithm: null,
					signerTruncate: null,
					imagorSecret: null,
				},
			})
			toast.success(t('pages.spaces.messages.spaceCreatedSuccess'))
			await navigate({ to: '/spaces/$spaceKey/settings', params: { spaceKey: values.key } })
		} catch (err) {
			const errorInfo = extractErrorInfo(err)
			if (errorInfo.field === 'key') {
				form.setError('key', { message: t('pages.spaces.messages.keyAlreadyTaken') })
				setCurrentStep(1)
			} else {
				toast.error(`${t('pages.spaces.messages.createSpaceFailed')}: ${errorInfo.message}`)
			}
		} finally {
			setIsSaving(false)
		}
	}

	const steps: MultiStepFormStep[] = [
		{
			id: 'identity',
			title: t('pages.spaces.wizard.stepIdentity'),
			content: (nav: MultiStepFormNavigationProps) => (
				<IdentityStep form={form} onNext={handleIdentityNext} {...nav} />
			),
		},
		{
			id: 'storage',
			title: t('pages.spaces.wizard.stepStorage'),
			content: (nav: MultiStepFormNavigationProps) => (
				<StorageStep form={form} isSaving={isSaving} onSubmit={handleCreateSpace} {...nav} />
			),
		},
	]

	return (
		<div className='min-h-screen-safe flex flex-col'>
			<AppHeader
				profileLabel={getUserDisplayName()}
				roleLabel={authState.profile?.role}
				avatarUrl={authState.profile?.avatarUrl}
				onLogout={handleLogout}
				appTitle={appTitle}
				breadcrumbs={[
					{ label: t('navigation.breadcrumbs.spaces'), href: '/' },
					{ label: t('pages.spaces.createNewSpace') },
				]}
			/>

			<div className='bg-background flex flex-1 items-start justify-center px-4 py-6 pt-20 sm:px-6 md:items-center'>
				<Form {...form}>
					<MultiStepForm
						steps={steps}
						currentStep={currentStep}
						onStepChange={setCurrentStep}
						onComplete={() => navigate({ to: '/' })}
						title={t('pages.spaces.createNewSpace')}
						description={t('pages.spaces.createSpaceDescription')}
						className='w-full max-w-2xl'
					/>
				</Form>
			</div>
		</div>
	)
}
