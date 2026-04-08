import { DirectoryEntry } from '@/lib/types'

export const SEED_SOURCE_VERSION = 'seed-v1'

export const SEED_CONTACTS: Omit<DirectoryEntry, 'id' | 'updatedAt' | 'sourceVersion'>[] = [
  {
    name: '山田 太郎',
    phs: '1234',
    department: '外来',
    status: 'active',
    fingerprint: '',
  },
  {
    name: '佐藤 花子',
    phs: '2689',
    department: '薬剤部',
    status: 'active',
    fingerprint: '',
  },
  {
    name: '田中 一郎',
    phs: '4152',
    department: '総務',
    status: 'active',
    fingerprint: '',
  },
  {
    name: '鈴木 直子',
    phs: '5548',
    department: '検査科',
    status: 'active',
    fingerprint: '',
  },
]
