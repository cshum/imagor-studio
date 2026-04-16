import type { LicenseStatus } from '@/api/license-api'
import { LicenseManagementSection } from '@/components/license/license-management-section'

interface AdminLicenseSectionProps {
  licenseStatus: LicenseStatus | null
}

export function AdminLicenseSection({ licenseStatus }: AdminLicenseSectionProps) {
  return <LicenseManagementSection licenseStatus={licenseStatus} />
}
