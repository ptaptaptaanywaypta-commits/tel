import { TesseractOcrService, TesseractOcrServiceOptions } from '@/lib/ocr/tesseractAdapter'

export function createOcrService(options?: TesseractOcrServiceOptions) {
  return new TesseractOcrService(options)
}

export { TesseractOcrService }
export type { OcrService } from '@/lib/ocr/interface'
export type { BoundingBox, OcrLine, OcrProgress, ParsedDirectoryRow, ReviewStatus } from '@/lib/ocr/types'
