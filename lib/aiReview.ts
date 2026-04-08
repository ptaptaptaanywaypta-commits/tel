import {
  containsLikelyOcrConfusion,
  hasAlphabeticCharacters,
  hasDigitsInName,
  hasExcessiveNameSymbols,
  isLikelyValidPhs,
  normalizeName,
  normalizePhs,
} from '@/lib/normalize'
import { ParsedDirectoryRow } from '@/lib/ocr/types'
import { DirectoryEntry } from '@/lib/types'

export const AUTO_APPROVE_CONFIDENCE_THRESHOLD = 0.92

function countBy<T>(values: T[]) {
  return values.reduce((map, value) => {
    if (!value) {
      return map
    }

    map.set(value, (map.get(value) ?? 0) + 1)
    return map
  }, new Map<T, number>())
}

function getExistingConflicts(row: ParsedDirectoryRow, existingEntries: DirectoryEntry[]) {
  const sameName = existingEntries.filter((entry) => normalizeName(entry.name) === row.normalizedName)
  const samePhs = existingEntries.filter((entry) => normalizePhs(entry.phs) === row.normalizedPhs)

  return { sameName, samePhs }
}

function hasSuspiciousNameSymbols(value: string) {
  return /[|｜]/u.test(value)
}

function hasSuspiciousPhoneCharacters(value: string) {
  return containsLikelyOcrConfusion(value) || /[A-Z]/u.test(value)
}

export function reviewImportedEntries(entries: ParsedDirectoryRow[], existingEntries: DirectoryEntry[] = []) {
  const importNameCounts = countBy(entries.map((entry) => entry.normalizedName))
  const importPhsCounts = countBy(entries.map((entry) => entry.normalizedPhs))

  return entries.map((entry) => {
    const warnings = new Set<string>()
    const { sameName, samePhs } = getExistingConflicts(entry, existingEntries)

    if (!entry.normalizedName) {
      warnings.add('氏名が空欄')
    }

    if (!entry.normalizedPhs) {
      warnings.add('番号が空欄')
    }

    if (hasDigitsInName(entry.normalizedName)) {
      warnings.add('氏名に数字が含まれる')
    }

    if (!isLikelyValidPhs(entry.normalizedPhs)) {
      warnings.add('PHS番号の桁数が不自然')
    }

    if (hasExcessiveNameSymbols(entry.normalizedName) || hasSuspiciousNameSymbols(entry.rawName)) {
      warnings.add('氏名に記号が多い')
    }

    if (hasAlphabeticCharacters(entry.normalizedPhs)) {
      warnings.add('PHS番号に英字が混じる')
    }

    if (entry.confidence < AUTO_APPROVE_CONFIDENCE_THRESHOLD) {
      warnings.add('OCR confidence が低い')
    }

    if ((importNameCounts.get(entry.normalizedName) ?? 0) > 1) {
      warnings.add('同じ氏名が重複している')
    }

    if ((importPhsCounts.get(entry.normalizedPhs) ?? 0) > 1) {
      warnings.add('同じ番号が複数人に割り当てられている')
    }

    if (sameName.some((existing) => normalizePhs(existing.phs) !== entry.normalizedPhs)) {
      warnings.add('既存データと比べて番号変更が発生している')
    }

    if (samePhs.some((existing) => normalizeName(existing.name) !== entry.normalizedName)) {
      warnings.add('同じ番号が既存データで別の氏名に割り当てられている')
    }

    if (
      containsLikelyOcrConfusion(entry.rawName) ||
      hasSuspiciousPhoneCharacters(entry.rawPhs) ||
      hasSuspiciousPhoneCharacters(entry.normalizedPhs)
    ) {
      warnings.add('OCR由来の誤認識候補が残っている')
    }

    const autoApproved =
      warnings.size === 0 &&
      entry.confidence >= AUTO_APPROVE_CONFIDENCE_THRESHOLD &&
      Boolean(entry.normalizedName) &&
      Boolean(entry.normalizedPhs)

    let approved = autoApproved
    let reviewStatus: ParsedDirectoryRow['reviewStatus'] = autoApproved ? 'auto-approved' : 'needs-review'

    if (entry.manualDecision === 'approved') {
      approved = true
      reviewStatus = 'manually-approved'
    }

    if (entry.manualDecision === 'rejected') {
      approved = false
      reviewStatus = 'rejected'
    }

    return {
      ...entry,
      warnings: Array.from(warnings),
      autoApproved,
      approved,
      reviewStatus,
    }
  })
}
