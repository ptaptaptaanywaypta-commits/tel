import type { DBSchema, IDBPDatabase } from 'idb'
import { buildDirectoryFingerprint } from '@/lib/normalize'
import { SEED_CONTACTS, SEED_SOURCE_VERSION } from '@/lib/seed'
import { DirectoryEntry, UpdateHistory } from '@/lib/types'

const DB_NAME = 'hospital-directory-pwa'
const DB_VERSION = 2

type MetaRecord = {
  key: string
  value: string
}

interface DirectoryDatabase extends DBSchema {
  contacts: {
    key: string
    value: DirectoryEntry
    indexes: {
      'by-name': string
      'by-phs': string
      'by-updatedAt': string
    }
  }
  history: {
    key: string
    value: UpdateHistory
    indexes: {
      'by-appliedAt': string
    }
  }
  meta: {
    key: string
    value: MetaRecord
  }
}

let dbPromise: Promise<IDBPDatabase<DirectoryDatabase>> | null = null

async function createDatabase() {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is unavailable in the current environment')
  }

  const { openDB } = await import('idb')

  return openDB<DirectoryDatabase>(DB_NAME, DB_VERSION, {
    upgrade(db, _oldVersion, _newVersion, transaction) {
      const contacts = db.objectStoreNames.contains('contacts')
        ? transaction.objectStore('contacts')
        : db.createObjectStore('contacts', { keyPath: 'id' })

      if (!contacts.indexNames.contains('by-name')) {
        contacts.createIndex('by-name', 'name', { unique: false })
      }

      if (!contacts.indexNames.contains('by-phs')) {
        contacts.createIndex('by-phs', 'phs', { unique: false })
      }

      if (!contacts.indexNames.contains('by-updatedAt')) {
        contacts.createIndex('by-updatedAt', 'updatedAt', { unique: false })
      }

      const history = db.objectStoreNames.contains('history')
        ? transaction.objectStore('history')
        : db.createObjectStore('history', { keyPath: 'id' })

      if (!history.indexNames.contains('by-appliedAt')) {
        history.createIndex('by-appliedAt', 'appliedAt', { unique: false })
      }

      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' })
      }
    },
  })
}

async function getDatabase() {
  if (!dbPromise) {
    dbPromise = createDatabase()
  }

  return dbPromise
}

export async function getContacts() {
  const db = await getDatabase()
  const entries = await db.getAll('contacts')
  return entries
    .map((entry) => ({
      ...entry,
      fingerprint: entry.fingerprint || buildDirectoryFingerprint(entry.name, entry.phs, entry.department),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
}

export async function replaceContacts(entries: DirectoryEntry[]) {
  const db = await getDatabase()
  const tx = db.transaction('contacts', 'readwrite')
  await tx.store.clear()

  for (const entry of entries) {
    await tx.store.put(entry)
  }

  await tx.done
}

export async function addHistory(row: UpdateHistory) {
  const db = await getDatabase()
  await db.put('history', row)
}

export async function getHistory() {
  const db = await getDatabase()
  const history = await db.getAll('history')
  return history.sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
}

export async function seedContacts(force = false) {
  const existingContacts = await getContacts()

  if (existingContacts.length > 0 && !force) {
    return { seeded: false, count: existingContacts.length }
  }

  const now = new Date().toISOString()
  const entries: DirectoryEntry[] = SEED_CONTACTS.map((entry) => ({
    ...entry,
    id: crypto.randomUUID(),
    fingerprint: buildDirectoryFingerprint(entry.name, entry.phs, entry.department),
    updatedAt: now,
    sourceVersion: SEED_SOURCE_VERSION,
  }))

  await replaceContacts(entries)
  await addHistory({
    id: crypto.randomUUID(),
    kind: 'seed',
    appliedAt: now,
    sourceVersion: SEED_SOURCE_VERSION,
    added: entries.length,
    updated: 0,
    removed: 0,
    approvedApplied: entries.length,
    autoApproved: entries.length,
    reviewRequired: 0,
  })

  return { seeded: true, count: entries.length }
}

export async function markSeedUsed() {
  const db = await getDatabase()
  await db.put('meta', {
    key: 'seed-used',
    value: new Date().toISOString(),
  })
}

export async function hasUsedSeed() {
  const db = await getDatabase()
  const record = await db.get('meta', 'seed-used')
  return Boolean(record?.value)
}
