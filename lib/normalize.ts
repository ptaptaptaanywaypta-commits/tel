const FULLWIDTH_NUMS = '０１２３４５６７８９'
const HALFWIDTH_NUMS = '0123456789'
const OCR_CONFUSION_CHARS = /[OＯoIl|｜BSｂｓ]/u
const NAME_SYMBOL_PATTERN = /[^\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}A-Za-z\s・ー\-]/gu
const PHONE_ALPHA_PATTERN = /[A-Z]/u

export function normalizeDigits(input: string) {
  return input
    .split('')
    .map((char) => {
      const index = FULLWIDTH_NUMS.indexOf(char)
      return index >= 0 ? HALFWIDTH_NUMS[index] : char
    })
    .join('')
}

export function normalizeSpaces(input: string) {
  return input.replace(/[\s\u3000]+/g, ' ').trim()
}

export function normalizeName(input: string) {
  return normalizeSpaces(
    normalizeDigits(input)
      .replace(/[：:]/g, ' ')
      .replace(/[()（）【】\[\]]/g, ' ')
      .replace(/[､、,]/g, ' ')
      .replace(/[　]/g, ' '),
  )
}

export function normalizePhs(input: string) {
  return normalizeSpaces(
    normalizeDigits(input)
      .toUpperCase()
      .replace(/[ー－―‐ｰ]/g, '-')
      .replace(/\s+/g, '')
      .replace(/[^0-9A-Z-]/g, ''),
  )
}

export function isLikelyValidPhs(input: string) {
  const digits = input.replace(/\D/g, '')
  return digits.length >= 3 && digits.length <= 6
}

export function hasAlphabeticCharacters(input: string) {
  return PHONE_ALPHA_PATTERN.test(input)
}

export function containsLikelyOcrConfusion(input: string) {
  return OCR_CONFUSION_CHARS.test(input)
}

export function hasExcessiveNameSymbols(input: string) {
  const matches = input.match(NAME_SYMBOL_PATTERN) ?? []
  return matches.length >= 2
}

export function hasDigitsInName(input: string) {
  return /\d/u.test(input)
}

export function buildDirectoryFingerprint(name: string, phs: string, department?: string) {
  const normalizedDepartment = normalizeSpaces(department ?? '')
  return [normalizeName(name), normalizePhs(phs), normalizedDepartment].join('::')
}
