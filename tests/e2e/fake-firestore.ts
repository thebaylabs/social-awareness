import type { Page } from '@playwright/test'

/**
 * A stand-in for the Firestore REST API, which firebase/firestore/lite calls.
 * It answers every request to firestore.googleapis.com from memory, so the
 * streak leaderboard can be tested end to end with nothing leaving the test.
 * It knows only what the site uses: reading documents, committing writes
 * (including the transaction's "verify" step) and running a simple query.
 * It does not apply firestore.rules.
 */

type Value = {
  stringValue?: string
  integerValue?: string
  doubleValue?: number
  booleanValue?: boolean
  timestampValue?: string
  nullValue?: null
}
type Fields = Record<string, Value>
type Filter = {
  compositeFilter?: { op: 'AND' | 'OR'; filters: Filter[] }
  fieldFilter?: {
    field: { fieldPath: string }
    op: string
    value: Value & { arrayValue?: { values?: Value[] } }
  }
}
interface StructuredQuery {
  from: { collectionId: string }[]
  where?: Filter
  orderBy?: { field: { fieldPath: string }; direction?: 'ASCENDING' | 'DESCENDING' }[]
  limit?: number | { value: number }
}
interface StoredDoc {
  fields: Fields
  createTime: string
  updateTime: string
}

export interface StreakDoc {
  id: string
  name: string
  streak: number
  lastDay: number
}

function decode(value: Value | undefined): unknown {
  if (!value) return undefined
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('stringValue' in value) return value.stringValue
  if ('booleanValue' in value) return value.booleanValue
  if ('timestampValue' in value) return value.timestampValue
  if ('nullValue' in value) return null
  throw new Error(`fake Firestore: unsupported value ${JSON.stringify(value)}`)
}

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}

function matches(filter: Filter, key: string, fields: Fields): boolean {
  if (filter.compositeFilter) {
    const results = filter.compositeFilter.filters.map((f) => matches(f, key, fields))
    return filter.compositeFilter.op === 'OR' ? results.some(Boolean) : results.every(Boolean)
  }
  const f = filter.fieldFilter
  if (!f) throw new Error(`fake Firestore: unsupported filter ${JSON.stringify(filter)}`)
  const actual = f.field.fieldPath === '__name__' ? key : decode(fields[f.field.fieldPath])
  switch (f.op) {
    case 'EQUAL':
      return actual === decode(f.value)
    case 'IN':
      return (f.value.arrayValue?.values ?? []).map(decode).includes(actual)
    case 'GREATER_THAN':
      return compare(actual, decode(f.value)) > 0
    case 'GREATER_THAN_OR_EQUAL':
      return compare(actual, decode(f.value)) >= 0
    case 'LESS_THAN':
      return compare(actual, decode(f.value)) < 0
    case 'LESS_THAN_OR_EQUAL':
      return compare(actual, decode(f.value)) <= 0
    default:
      throw new Error(`fake Firestore: unsupported operator ${f.op}`)
  }
}

export async function fakeFirestore(page: Page, seed: StreakDoc[] = []) {
  /** Documents by path inside the database, such as "wordStreaks/<id>". */
  const docs = new Map<string, StoredDoc>()
  /** Every document write, as plain values without the server timestamp. */
  const writes: Record<string, unknown>[] = []

  const seeded = new Date(0).toISOString()
  for (const { id, name, streak, lastDay } of seed) {
    docs.set(`wordStreaks/${id}`, {
      fields: {
        name: { stringValue: name },
        streak: { integerValue: String(streak) },
        lastDay: { integerValue: String(lastDay) },
        updatedAt: { timestampValue: seeded },
      },
      createTime: seeded,
      updateTime: seeded,
    })
  }

  const plain = (fields: Fields) =>
    Object.fromEntries(
      Object.entries(fields)
        .filter(([field]) => field !== 'updatedAt')
        .map(([field, value]) => [field, decode(value)]),
    )

  function runQuery(root: string, query: StructuredQuery, now: string) {
    const collection = `${query.from[0]!.collectionId}/`
    let rows = [...docs]
      .filter(([key]) => key.startsWith(collection) && !key.slice(collection.length).includes('/'))
      .filter(([key, doc]) => !query.where || matches(query.where, key, doc.fields))
    rows.sort(([keyA, a], [keyB, b]) => {
      for (const order of query.orderBy ?? []) {
        const path = order.field.fieldPath
        const sign = order.direction === 'DESCENDING' ? -1 : 1
        const diff =
          path === '__name__'
            ? compare(keyA, keyB)
            : compare(decode(a.fields[path]), decode(b.fields[path]))
        if (diff !== 0) return sign * diff
      }
      return 0
    })
    const limit = typeof query.limit === 'object' ? query.limit.value : query.limit
    if (limit !== undefined) rows = rows.slice(0, limit)
    if (rows.length === 0) return [{ readTime: now }]
    return rows.map(([key, doc]) => ({
      document: { name: `${root}/${key}`, ...doc },
      readTime: now,
    }))
  }

  await page.route(/^https:\/\/firestore\.googleapis\.com\//, async (route) => {
    const request = route.request()
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
    }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })

    // /v1/projects/<project>/databases/(default)/documents:<method>
    const [, root = '', method] =
      /^\/v1\/(.+):(\w+)$/.exec(decodeURIComponent(new URL(request.url()).pathname)) ?? []
    const keyOf = (name: string) => name.slice(root.length + 1)
    const body = request.postDataJSON()
    const now = new Date().toISOString()
    let result: unknown

    if (method === 'batchGet') {
      result = (body.documents as string[]).map((name) => {
        const doc = docs.get(keyOf(name))
        return doc ? { found: { name, ...doc }, readTime: now } : { missing: name, readTime: now }
      })
    } else if (method === 'commit') {
      for (const write of body.writes as Record<string, never>[]) {
        if ('verify' in write) continue
        const update = write.update as { name: string; fields: Fields } | undefined
        if (!update) throw new Error(`fake Firestore: unsupported write ${JSON.stringify(write)}`)
        const fields = { ...update.fields }
        for (const t of (write.updateTransforms ?? []) as { fieldPath: string }[]) {
          fields[t.fieldPath] = { timestampValue: now }
        }
        const key = keyOf(update.name)
        docs.set(key, { fields, createTime: docs.get(key)?.createTime ?? now, updateTime: now })
        writes.push(plain(fields))
      }
      result = {
        writeResults: (body.writes as unknown[]).map(() => ({ updateTime: now })),
        commitTime: now,
      }
    } else if (method === 'runQuery') {
      result = runQuery(root, body.structuredQuery as StructuredQuery, now)
    } else {
      return route.fulfill({ status: 501, headers: cors, body: `fake Firestore: no ${method}` })
    }
    return route.fulfill({
      status: 200,
      headers: { ...cors, 'content-type': 'application/json' },
      body: JSON.stringify(result),
    })
  })

  return {
    /** Every document write so far (name, streak, lastDay), oldest first. */
    writes,
    /** The stored streak documents. */
    entries(): StreakDoc[] {
      return [...docs]
        .filter(([key]) => key.startsWith('wordStreaks/'))
        .map(
          ([key, doc]) =>
            ({ id: key.slice('wordStreaks/'.length), ...plain(doc.fields) }) as StreakDoc,
        )
    },
  }
}
