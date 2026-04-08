export type DirectoryEntry = {
  id: string
  name: string
  phs: string
  department?: string
  updatedAt: string
  sourceVersion: string
  status: 'active' | 'inactive'
  fingerprint: string
}

export type DirectoryImportKind = 'import' | 'seed'

export type DirectoryImportStats = {
  added: number
  updated: number
  removed: number
  approvedApplied: number
  autoApproved: number
  reviewRequired: number
}

export type UpdateHistory = DirectoryImportStats & {
  id: string
  kind: DirectoryImportKind
  appliedAt: string
  sourceVersion: string
}
