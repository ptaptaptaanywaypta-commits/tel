import { normalizeDigits, normalizeName, normalizePhs, normalizeSpaces } from '@/lib/normalize'
import { OcrService } from '@/lib/ocr/interface'
import { BoundingBox, OcrLine, OcrProgress, ParsedDirectoryRow } from '@/lib/ocr/types'

const PHONE_TOKEN_PATTERN = /[0-9A-Za-zＯｏOIl|｜BSｂｓー－―‐ｰ-]{3,10}/gu
const LINE_NOISE_PATTERN = /^[\s\-_=~.]+$/u
const HEADER_PATTERN = /(氏名|名前|番号|PHS|内線|部署)/iu

function nextTempId(prefix: string, index: number) {
  return `${prefix}-${index}-${crypto.randomUUID()}`
}

function toBoundingBox(bbox?: { x0: number; y0: number; x1: number; y1: number }): BoundingBox | undefined {
  if (!bbox) {
    return undefined
  }

  return {
    x: bbox.x0,
    y: bbox.y0,
    width: Math.max(0, bbox.x1 - bbox.x0),
    height: Math.max(0, bbox.y1 - bbox.y0),
  }
}

function countDigitLikeCharacters(value: string) {
  return Array.from(value).filter((char) => /[0-9８８ＯOｏoIｌl|｜BＳSｓｂ]/u.test(char)).length
}

function extractPhoneToken(rawText: string) {
  const matches = rawText.match(PHONE_TOKEN_PATTERN) ?? []
  const candidates = matches.filter((token) => countDigitLikeCharacters(token) >= 3)
  return candidates.at(-1) ?? ''
}

function stripToken(rawText: string, token: string) {
  if (!token) {
    return rawText
  }

  const index = rawText.lastIndexOf(token)

  if (index < 0) {
    return rawText
  }

  return `${rawText.slice(0, index)} ${rawText.slice(index + token.length)}`.trim()
}

function shouldKeepLine(rawText: string) {
  const normalized = normalizeSpaces(rawText)

  if (!normalized || normalized.length < 2) {
    return false
  }

  if (LINE_NOISE_PATTERN.test(normalized)) {
    return false
  }

  if (HEADER_PATTERN.test(normalized) && !extractPhoneToken(normalized)) {
    return false
  }

  return /[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}A-Za-z0-9]/u.test(normalized)
}

function toParsedRow(line: OcrLine): ParsedDirectoryRow {
  const rawText = normalizeSpaces(line.rawText)
  const rawPhs = extractPhoneToken(rawText)
  const rawName = stripToken(rawText, rawPhs)

  return {
    tempId: line.tempId,
    rawText,
    rawName,
    rawPhs,
    normalizedName: normalizeName(rawName),
    normalizedPhs: normalizePhs(rawPhs),
    confidence: line.confidence,
    warnings: [],
    approved: false,
    autoApproved: false,
    reviewStatus: 'needs-review',
    boundingBox: line.boundingBox,
    manualDecision: null,
    manualEdited: false,
  }
}

export type TesseractOcrServiceOptions = {
  onProgress?: (progress: OcrProgress) => void
  langPath?: string
}

export class TesseractOcrService implements OcrService {
  private workerPromise: Promise<import('tesseract.js').Worker> | null = null
  private readonly onProgress?: (progress: OcrProgress) => void
  private readonly langPath?: string

  constructor(options: TesseractOcrServiceOptions = {}) {
    this.onProgress = options.onProgress
    this.langPath = options.langPath ?? process.env.NEXT_PUBLIC_TESSERACT_LANG_PATH ?? '/tessdata'
  }

  private async getWorker() {
    if (!this.workerPromise) {
      this.workerPromise = this.createWorker()
    }

    return this.workerPromise
  }

  private async createWorker() {
    const Tesseract = await import('tesseract.js')
    const worker = await Tesseract.createWorker('jpn+eng', Tesseract.OEM.LSTM_ONLY, {
      logger: (message) => {
        this.onProgress?.({
          status: message.status,
          progress: message.progress,
        })
      },
      ...(this.langPath ? { langPath: this.langPath } : {}),
    })

    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
      preserve_interword_spaces: '1',
    })

    return worker
  }

  async extractLines(file: File) {
    const worker = await this.getWorker()
    const recognized = await worker.recognize(
      file,
      {
        rotateAuto: true,
      },
      {
        text: true,
        blocks: true,
      },
    )

    const prefix = file.name.replace(/\.[^.]+$/, '') || 'ocr'
    const blocks = recognized.data.blocks ?? []
    const lines = blocks
      .flatMap((block) => block.paragraphs)
      .flatMap((paragraph) => paragraph.lines)
      .map<OcrLine>((line, index) => ({
        tempId: nextTempId(prefix, index),
        rawText: normalizeSpaces(normalizeDigits(line.text)),
        confidence: line.confidence / 100,
        boundingBox: toBoundingBox(line.bbox),
      }))
      .filter((line) => shouldKeepLine(line.rawText))

    if (lines.length > 0) {
      return lines
    }

    return recognized.data.text
      .split(/\r?\n/)
      .map((rawText, index) => ({
        tempId: nextTempId(prefix, index),
        rawText: normalizeSpaces(normalizeDigits(rawText)),
        confidence: recognized.data.confidence / 100,
      }))
      .filter((line) => shouldKeepLine(line.rawText))
  }

  async parseDirectoryRows(lines: OcrLine[]) {
    return lines.map(toParsedRow).filter((row) => row.rawName || row.rawPhs)
  }

  async dispose() {
    if (!this.workerPromise) {
      return
    }

    const worker = await this.workerPromise
    await worker.terminate()
    this.workerPromise = null
  }
}
