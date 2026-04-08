import { ParsedDirectoryRow } from '@/lib/ocr/types'
import { DirectoryEntry, DirectoryImportStats } from '@/lib/types'
import { buildDirectoryFingerprint, normalizeName, normalizePhs } from '@/lib/normalize'

export type MergeChange = {
  tempId: string
  type: 'added' | 'updated' | 'needs-review'
  name: string
  nextPhs: string
  previousPhs?: string
  warnings: string[]
  reviewStatus: ParsedDirectoryRow['reviewStatus']
}

export type MergePreview = {
  additions: MergeChange[]
  updates: MergeChange[]
  reviewRequired: MergeChange[]
  summary: DirectoryImportStats & {
    total: number
    approved: number
    unchanged: number
  }
}

function rowsByName(rows: ParsedDirectoryRow[]) {
  const approvedByName = new Map<string, ParsedDirectoryRow>()

  for (const row of rows) {
    if (!row.approved || !row.normalizedName || !row.normalizedPhs) {
      continue
    }

    approvedByName.set(normalizeName(row.normalizedName), row)
  }

  return Array.from(approvedByName.values())
}

export function buildMergePreview(current: DirectoryEntry[], incoming: ParsedDirectoryRow[]): MergePreview {
  const currentByName = new Map(current.map((item) => [normalizeName(item.name), item]))
  const approvedRows = rowsByName(incoming)
  const additions: MergeChange[] = []
  const updates: MergeChange[] = []
  const reviewRequired = incoming
    .filter((row) => !row.approved)
    .map<MergeChange>((row) => ({
      tempId: row.tempId,
      type: 'needs-review',
      name: row.normalizedName || row.rawName || '未確定',
      nextPhs: row.normalizedPhs || row.rawPhs || '未確定',
      warnings: row.warnings,
      reviewStatus: row.reviewStatus,
    }))

  let unchanged = 0

  for (const row of approvedRows) {
    const existing = currentByName.get(normalizeName(row.normalizedName))

    if (!existing) {
      additions.push({
        tempId: row.tempId,
        type: 'added',
        name: row.normalizedName,
        nextPhs: row.normalizedPhs,
        warnings: row.warnings,
        reviewStatus: row.reviewStatus,
      })
      continue
    }

    if (normalizePhs(existing.phs) !== normalizePhs(row.normalizedPhs)) {
      updates.push({
        tempId: row.tempId,
        type: 'updated',
        name: row.normalizedName,
        nextPhs: row.normalizedPhs,
        previousPhs: existing.phs,
        warnings: row.warnings,
        reviewStatus: row.reviewStatus,
      })
      continue
    }

    unchanged += 1
  }

  return {
    additions,
    updates,
    reviewRequired,
    summary: {
      total: incoming.length,
      added: additions.length,
      updated: updates.length,
      removed: 0,
      approvedApplied: approvedRows.length,
      autoApproved: incoming.filter((row) => row.autoApproved).length,
      reviewRequired: incoming.filter((row) => row.reviewStatus === 'needs-review').length,
      approved: incoming.filter((row) => row.approved).length,
      unchanged,
    },
  }
}

export function mergeApprovedEntries(
  current: DirectoryEntry[],
  incoming: ParsedDirectoryRow[],
  sourceVersion: string,
) {
  const map = new Map(current.map((item) => [normalizeName(item.name), item]))
  const preview = buildMergePreview(current, incoming)
  const now = new Date().toISOString()

  for (const change of [...preview.additions, ...preview.updates]) {
    if (change.type === 'added') {
      map.set(normalizeName(change.name), {
        id: crypto.randomUUID(),
        name: change.name,
        phs: change.nextPhs,
        fingerprint: buildDirectoryFingerprint(change.name, change.nextPhs),
        updatedAt: now,
        sourceVersion,
        status: 'active',
      })
      continue
    }

    const existing = map.get(normalizeName(change.name))

    if (existing) {
      map.set(normalizeName(change.name), {
        ...existing,
        phs: change.nextPhs,
        fingerprint: buildDirectoryFingerprint(existing.name, change.nextPhs, existing.department),
        updatedAt: now,
        sourceVersion,
      })
    }
  }

  return {
    entries: Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ja')),
    added: preview.summary.added,
    updated: preview.summary.updated,
    removed: 0,
    changes: [...preview.additions, ...preview.updates],
    summary: preview.summary,
  }
}
