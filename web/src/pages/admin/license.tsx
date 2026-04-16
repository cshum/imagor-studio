import { LicenseManagementSection } from '@/components/license/license-management-section'
import type { LicenseStatus } from '@/api/license-api'

interface AdminLicenseSectionProps {
  licenseStatus: LicenseStatus | null
}

export function AdminLicenseSection({ licenseStatus }: AdminLicenseSectionProps) {
  return <LicenseManagementSection licenseStatus={licenseStatus} />
}
