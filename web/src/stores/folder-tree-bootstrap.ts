import { loadHomeTitle, loadRootFolders } from '@/stores/folder-tree-store'

export async function bootstrapSelfHostedFolderTree() {
	await Promise.all([loadRootFolders(), loadHomeTitle()])
}

export async function bootstrapCloudFolderTree() {
	await loadHomeTitle()
}