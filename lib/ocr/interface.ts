import { OcrLine, ParsedDirectoryRow } from '@/lib/ocr/types'

export interface OcrService {
  extractLines(file: File): Promise<OcrLine[]>
  parseDirectoryRows(lines: OcrLine[]): Promise<ParsedDirectoryRow[]>
}

