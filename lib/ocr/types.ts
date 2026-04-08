export type BoundingBox = {
  x: number
  y: number
  width: number
  height: number
}

export type OcrLine = {
  tempId: string
  rawText: string
  boundingBox?: BoundingBox
  confidence: number
}

export type ReviewStatus = 'auto-approved' | 'needs-review' | 'manually-approved' | 'rejected'

export type ParsedDirectoryRow = {
  tempId: string
  rawText: string
  rawName: string
  rawPhs: string
  normalizedName: string
  normalizedPhs: string
  confidence: number
  warnings: string[]
  approved: boolean
  autoApproved: boolean
  reviewStatus: ReviewStatus
  boundingBox?: BoundingBox
  manualDecision?: 'approved' | 'rejected' | null
  manualEdited?: boolean
}

export type OcrProgress = {
  status: string
  progress: number
}
