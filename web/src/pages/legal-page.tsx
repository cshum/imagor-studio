import { Link } from '@tanstack/react-router'

import { BrandBar } from '@/components/brand-bar'
import { LanguageSelector } from '@/components/language-selector'
import { ModeToggle } from '@/components/mode-toggle'

type LegalSection = {
  title: string
  paragraphs: string[]
}

type LegalPageProps = {
  eyebrow: string
  title: string
  updatedAt: string
  intro: string
  sections: LegalSection[]
}

function LegalPageLayout({ eyebrow, title, updatedAt, intro, sections }: LegalPageProps) {
  return (
    <div className='bg-background min-h-screen-safe flex flex-col'>
      <BrandBar
        rightSlot={
          <div className='flex items-center gap-1.5 sm:gap-2'>
            <LanguageSelector />
            <ModeToggle />
          </div>
        }
      />

      <main className='flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8'>
        <div className='mx-auto flex w-full max-w-4xl flex-col gap-8'>
          <header className='border-border/60 border-b px-1 pb-8'>
            <p className='text-muted-foreground text-sm font-medium tracking-[0.08em]'>{eyebrow}</p>
            <h1 className='mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl'>
              {title}
            </h1>
            <p className='text-muted-foreground mt-4 text-sm'>Last updated: {updatedAt}</p>
            <p className='text-foreground/90 mt-4 max-w-3xl text-base leading-7'>{intro}</p>

            <div className='mt-6 flex flex-wrap gap-3 text-sm'>
              <Link
                to='/privacy'
                className='text-muted-foreground hover:text-foreground underline underline-offset-4'
              >
                Privacy Policy
              </Link>
              <Link
                to='/terms'
                className='text-muted-foreground hover:text-foreground underline underline-offset-4'
              >
                Terms of Service
              </Link>
            </div>
          </header>

          <div className='space-y-8'>
            {sections.map((section) => (
              <section
                key={section.title}
                className='border-border/50 border-b px-1 pb-8 last:border-b-0'
              >
                <h2 className='text-xl font-semibold tracking-tight'>{section.title}</h2>
                <div className='text-foreground/85 mt-4 space-y-4 text-sm leading-7 sm:text-base'>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export function PrivacyPage() {
  return (
    <LegalPageLayout
      eyebrow='Imagor Studio'
      title='Privacy Policy'
      updatedAt='29 April 2026'
      intro='This Privacy Policy explains how Imagor Studio collects, uses, discloses, and protects information when you use the cloud service, including when you sign in with Google, join an organization by invitation, manage spaces, upload images, or use hosted collaboration and delivery features.'
      sections={[
        {
          title: 'Scope of this policy',
          paragraphs: [
            'This Privacy Policy applies to the hosted Imagor Studio service, including account access, organization and space collaboration, image management, editing workflows, hosted storage features, invite and verification flows, and related support, billing, and security operations.',
            'It does not automatically apply to self-hosted deployments of the open-source software operated entirely by third parties, where the deployer acts as the controller or operator of that environment.',
          ],
        },
        {
          title: 'Information we collect',
          paragraphs: [
            'We collect account and identity data such as your name, email address, avatar or profile image, organization membership, role, authentication provider details, and sign-in state when you create an account, sign in with Google, or accept an invitation.',
            'We collect workspace and content data that you or your organization choose to store or manage through the service, including images, folders, templates, metadata, editing configurations, storage settings, sharing settings, organization records, and space membership data.',
            'We collect transaction and operational data such as IP addresses, browser and device details, request logs, session identifiers, invite or verification events, upload and processing activity, quota and usage measurements, and support or billing records needed to run, secure, and improve the service.',
          ],
        },
        {
          title: 'Information from Google and other providers',
          paragraphs: [
            'If you sign in with Google, we receive information made available by Google for authentication and account setup, which may include your name, email address, profile image, and provider-specific account identifiers. We use this information to authenticate you, provision your account, associate you with invitations or organizations, and maintain account security.',
            'We do not use Google user data for unrelated advertising purposes, and we do not sell Google user data. We use Google-provided account information only for the operation, security, and improvement of the service and related support, billing, and compliance workflows.',
          ],
        },
        {
          title: 'How we use information',
          paragraphs: [
            'We use information to provide and operate the service, authenticate users, create and manage organizations and spaces, process uploads, render previews, deliver transformed images, enable collaboration, enforce permissions, and support hosted storage and bring-your-own-bucket workflows.',
            'We also use information to send service-related communications such as verification emails, invite emails, security notices, usage and billing communications, and support responses. We may use operational data to monitor reliability, prevent abuse, investigate misuse, enforce quotas and plan entitlements, and improve performance and user experience.',
          ],
        },
        {
          title: 'How information is shared',
          paragraphs: [
            'We do not sell personal information. We may share information with service providers and infrastructure partners that help us operate Imagor Studio, such as cloud hosting, storage, authentication, email delivery, payment processing, analytics, observability, security, and support providers, but only as needed to provide and operate the service.',
            'Information may also be shared within your organization according to the permissions and administration model of the service. Organization owners and administrators may be able to view and manage account, membership, workspace, billing, and content-related information associated with their organization.',
            'We may disclose information if required by law, regulation, legal process, or governmental request, or when reasonably necessary to protect the rights, safety, security, integrity, or operations of the service, our users, or the public, including in connection with fraud prevention, abuse response, or a merger, acquisition, or business transfer.',
          ],
        },
        {
          title: 'Cookies, sessions, and similar technologies',
          paragraphs: [
            'Imagor Studio may use cookies, local storage, session storage, and similar technologies to maintain sign-in state, complete OAuth and invite flows, remember interface preferences such as theme or language, protect the service, and support normal product functionality.',
            'These technologies may also be used for reliability, diagnostics, abuse prevention, and analytics or operational measurement. We use analytics tools such as Google Analytics, which may collect usage and device information through cookies or similar technologies to help us understand product usage and improve the service. You can control some browser storage behavior through your browser settings, but disabling it may affect service functionality.',
          ],
        },
        {
          title: 'Data retention and security',
          paragraphs: [
            'We retain information for as long as needed to provide the service, maintain account and workspace continuity, enforce our agreements, comply with legal obligations, resolve disputes, support billing and audit requirements, and protect the security and integrity of the platform. Retention periods may vary by data type, account state, and operational need.',
            'We use reasonable administrative, technical, and organizational measures to protect information, including access controls, authentication safeguards, logging, and infrastructure protections. However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security.',
          ],
        },
        {
          title: 'Your choices and requests',
          paragraphs: [
            'You may update some account information from within the service. Depending on your role and the organization settings, you may also manage workspace members, invites, storage settings, and content. If your account is managed by an organization, some requests may need to be routed through that organization or its administrators.',
            'You may request access, correction, or deletion of certain personal data, subject to legal, billing, security, fraud-prevention, and operational retention requirements. For privacy questions or requests, use the public contact information published on imagor.net.',
          ],
        },
      ]}
    />
  )
}

export function TermsPage() {
  return (
    <LegalPageLayout
      eyebrow='Imagor Studio'
      title='Terms of Service'
      updatedAt='29 April 2026'
      intro='These Terms of Service govern your access to and use of the hosted Imagor Studio service. By accessing or using the service, you agree to these terms.'
      sections={[
        {
          title: 'Eligibility and account use',
          paragraphs: [
            'You may use Imagor Studio only in compliance with these Terms and applicable law. You are responsible for activity under your account, for safeguarding your credentials, and for ensuring that information associated with your account is accurate and current.',
            'Access to some features may require an account, an invitation, or membership in an organization. If you sign in through Google or another provider, you must be authorized to use that authentication method and the account connected to it.',
          ],
        },
        {
          title: 'Organizations, spaces, and administration',
          paragraphs: [
            'Imagor Studio is organized around organizations and spaces. Organization owners and administrators may control membership, roles, billing settings, storage configuration, sharing settings, and access to content or collaboration features within their organization.',
            'If you use the service as part of an organization, your use may also be subject to that organization’s internal policies, instructions, or administrator decisions. We are not responsible for disputes between organization administrators and end users regarding internal access, content ownership, or workspace management.',
          ],
        },
        {
          title: 'Subscriptions, trials, and billing',
          paragraphs: [
            'Some parts of the service may be offered on a paid or trial basis. If you purchase a subscription, you agree to pay applicable fees, taxes, and charges and to provide a valid payment method. Billing may be organization-based, and plan entitlements may include limits relating to spaces, hosted storage, image processing usage, or premium features.',
            'We may change pricing, packaging, or plan features from time to time. If a trial or subscription ends, we may limit, suspend, or downgrade access according to the applicable plan, billing status, or trial policy. Additional commercial terms or order-specific terms may apply to paid services.',
          ],
        },
        {
          title: 'Customer content and rights',
          paragraphs: [
            'You retain responsibility for the images, templates, metadata, and other content you upload, create, configure, or manage through the service. You represent and warrant that you have all rights, permissions, and legal bases needed to use that content with the service.',
            'You grant us a limited right to host, store, copy, process, transmit, transform, and display customer content solely as necessary to provide, secure, and support the service, including uploads, hosted storage, previews, editing workflows, image delivery, collaboration, backup, and reliability operations.',
          ],
        },
        {
          title: 'Acceptable use',
          paragraphs: [
            'You may not use the service to violate the law, infringe intellectual property or privacy rights, transmit unlawful or abusive material, bypass authentication or authorization controls, interfere with the service, introduce malware, scrape or overload shared infrastructure, or attempt to access data or workspaces you are not authorized to access.',
            'You may not use the service in a way that materially harms other users, the platform, or our providers, including through abusive automation, credential sharing intended to defeat account controls, fraudulent billing behavior, or repeated attempts to circumvent quotas, rate limits, or security protections.',
          ],
        },
        {
          title: 'Availability, changes, and support',
          paragraphs: [
            'We may update, improve, modify, suspend, or discontinue parts of the service from time to time. We do not guarantee uninterrupted availability, and maintenance, third-party failures, security work, provider issues, or force majeure events may affect access or performance.',
            'We may provide support, documentation, previews, or beta-style features at our discretion. Unless expressly stated otherwise, those items are provided as part of the service on an as-available basis and may change without notice.',
          ],
        },
        {
          title: 'Suspension, termination, disclaimers, and liability',
          paragraphs: [
            'We may suspend or terminate access if these Terms are violated, if use creates legal, security, fraud, payment, or operational risk, if required by law, or if necessary to protect the service, our users, or our infrastructure and providers. You may stop using the service at any time.',
            'To the maximum extent permitted by law, the service is provided on an as-is and as-available basis, and we disclaim warranties not expressly stated, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement. To the maximum extent permitted by law, we are not liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of profits, revenue, goodwill, data, or business opportunities.',
            'Nothing in these Terms limits liability where such limitation is prohibited by applicable law. If any provision of these Terms is unenforceable, the remaining provisions will remain in effect.',
          ],
        },
      ]}
    />
  )
}
