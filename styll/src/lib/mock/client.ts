// Mock Supabase client for demo mode — implements the builder pattern
import { mockStore, PROFILE_MARCO_ID, PROFILE_ADMIN_ID } from './data'

// ── Auth state ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentSession: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let authCallbacks: Array<(event: string, session: any) => void> = []

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

// ── Query builder ───────────────────────────────────────────────────────────
interface Filter {
  col: string
  op: 'eq' | 'is' | 'in' | 'gte' | 'lt' | 'lte' | 'ilike'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  val: any
}

class MockQueryBuilder {
  private table: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private store: Record<string, any[]>
  private mode: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private filters: Filter[] = []
  private orFilter: string | null = null
  private sortCol: string | null = null
  private sortAsc = true
  private limitN: number | null = null
  private singleMode = false
  private headMode = false
  private countMode = false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private payload: any = null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(table: string, store: Record<string, any[]>) {
    this.table = table
    this.store = store
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select(_cols?: string, opts?: { count?: string; head?: boolean }): any {
    this.mode = 'select'
    if (opts?.head) this.headMode = true
    if (opts?.count === 'exact') this.countMode = true
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert(data: any): any {
    this.mode = 'insert'
    this.payload = data
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(data: any): any {
    this.mode = 'update'
    this.payload = data
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete(): any {
    this.mode = 'delete'
    return this
  }

  // ── Filters ─────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eq(col: string, val: any): any {
    this.filters.push({ col, op: 'eq', val })
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  is(col: string, val: any): any {
    this.filters.push({ col, op: 'is', val })
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  in(col: string, vals: any[]): any {
    this.filters.push({ col, op: 'in', val: vals })
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gte(col: string, val: any): any {
    this.filters.push({ col, op: 'gte', val })
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lt(col: string, val: any): any {
    this.filters.push({ col, op: 'lt', val })
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lte(col: string, val: any): any {
    this.filters.push({ col, op: 'lte', val })
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ilike(col: string, pattern: string): any {
    this.filters.push({ col, op: 'ilike', val: pattern })
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  or(filterStr: string): any {
    this.orFilter = filterStr
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order(col: string, opts?: { ascending?: boolean }): any {
    this.sortCol = col
    this.sortAsc = opts?.ascending ?? true
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  limit(n: number): any {
    this.limitN = n
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  single(): any {
    this.singleMode = true
    return this
  }

  // ── Value resolution for dot-notation columns ───────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolve(row: any, col: string): any {
    if (col.includes('.')) {
      const parts = col.split('.')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let v: any = row
      for (const p of parts) {
        if (v == null) return undefined
        v = v[p]
      }
      return v
    }
    return row[col]
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private matchFilter(row: any, f: Filter): boolean {
    const val = this.resolve(row, f.col)
    switch (f.op) {
      case 'eq':
        return val === f.val
      case 'is':
        return val === f.val
      case 'in':
        return Array.isArray(f.val) && f.val.includes(val)
      case 'gte':
        return val >= f.val
      case 'lt':
        return val < f.val
      case 'lte':
        return val <= f.val
      case 'ilike': {
        if (typeof val !== 'string') return false
        const pattern = (f.val as string).replace(/%/g, '.*')
        return new RegExp(pattern, 'i').test(val)
      }
      default:
        return true
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private matchOr(row: any): boolean {
    if (!this.orFilter) return true
    const parts = this.orFilter.split(',')
    return parts.some(part => {
      const segments = part.split('.')
      if (segments.length < 3) return true
      const col = segments[0]
      const op = segments[1]
      const rawVal = segments.slice(2).join('.')
      const rowVal = this.resolve(row, col)

      if (op === 'eq') return String(rowVal) === rawVal
      if (op === 'is' && rawVal === 'null') return rowVal === null || rowVal === undefined
      return true
    })
  }

  // ── Execute ─────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private execute(): { data: any; error: any; count?: number } {
    const rows = this.store[this.table] ?? []

    if (this.mode === 'insert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload]
      const inserted = items.map(item => {
        const record = {
          id: generateId(),
          created_at: new Date().toISOString(),
          ...item,
        }
        rows.push(record)
        return record
      })
      if (this.singleMode) {
        return { data: inserted[0], error: null }
      }
      return { data: inserted, error: null }
    }

    if (this.mode === 'update') {
      let filtered = [...rows]
      for (const f of this.filters) {
        filtered = filtered.filter(r => this.matchFilter(r, f))
      }
      filtered = filtered.filter(r => this.matchOr(r))

      for (const row of filtered) {
        Object.assign(row, this.payload)
      }
      return { data: null, error: null }
    }

    if (this.mode === 'delete') {
      let filtered = [...rows]
      for (const f of this.filters) {
        filtered = filtered.filter(r => this.matchFilter(r, f))
      }
      const ids = new Set(filtered.map(r => r.id))
      this.store[this.table] = rows.filter(r => !ids.has(r.id))
      return { data: null, error: null }
    }

    // SELECT mode
    let result = [...rows]

    for (const f of this.filters) {
      result = result.filter(r => this.matchFilter(r, f))
    }

    result = result.filter(r => this.matchOr(r))

    if (this.headMode && this.countMode) {
      return { data: null, error: null, count: result.length }
    }

    if (this.sortCol) {
      const col = this.sortCol
      const nestedMatch = col.match(/^(\w+)\((\w+)\)$/)
      if (nestedMatch) {
        const [, relation, field] = nestedMatch
        result.sort((a, b) => {
          const aVal = a[relation]?.[field] ?? 0
          const bVal = b[relation]?.[field] ?? 0
          return this.sortAsc ? aVal - bVal : bVal - aVal
        })
      } else {
        result.sort((a, b) => {
          const aVal = a[col] ?? ''
          const bVal = b[col] ?? ''
          if (aVal < bVal) return this.sortAsc ? -1 : 1
          if (aVal > bVal) return this.sortAsc ? 1 : -1
          return 0
        })
      }
    }

    if (this.limitN != null) {
      result = result.slice(0, this.limitN)
    }

    if (this.singleMode) {
      return { data: result[0] ?? null, error: null }
    }

    return { data: result, error: null, count: this.countMode ? result.length : undefined }
  }

  // ── Thenable (makes await work) ─────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  then(resolve: (value: any) => any, reject?: (reason: any) => any): Promise<any> {
    return new Promise<void>(r => setTimeout(r, 10))
      .then(() => this.execute())
      .then(resolve, reject)
  }
}

// ── Auth mock ───────────────────────────────────────────────────────────────
const mockAuth = {
  getSession: async () => {
    try {
      const stored = localStorage.getItem('demo-session')
      if (stored) {
        currentSession = JSON.parse(stored)
        return { data: { session: currentSession }, error: null }
      }
    } catch {
      // ignore parse errors
    }
    return { data: { session: null }, error: null }
  },

  signInWithPassword: async ({ email }: { email: string; password: string }) => {
    const isAdmin = email.toLowerCase().includes('admin')
    const userId = isAdmin ? PROFILE_ADMIN_ID : PROFILE_MARCO_ID
    const session = {
      access_token: 'demo-token',
      refresh_token: 'demo-refresh',
      user: {
        id: userId,
        email,
        phone: null,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2026-01-15T10:00:00Z',
      },
    }
    currentSession = session
    localStorage.setItem('demo-session', JSON.stringify(session))
    authCallbacks.forEach(cb => cb('SIGNED_IN', session))
    return { data: { session, user: session.user }, error: null }
  },

  signUp: async ({ email, password }: { email: string; password: string }) => {
    return mockAuth.signInWithPassword({ email, password })
  },

  signOut: async () => {
    currentSession = null
    localStorage.removeItem('demo-session')
    authCallbacks.forEach(cb => cb('SIGNED_OUT', null))
    return { error: null }
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    authCallbacks.push(callback)
    if (currentSession) {
      setTimeout(() => callback('INITIAL_SESSION', currentSession), 0)
    }
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authCallbacks = authCallbacks.filter(cb => cb !== callback)
          },
        },
      },
    }
  },
}

// ── Realtime mock ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockChannel = (name: string): any => ({
  on: () => mockChannel(name),
  subscribe: () => mockChannel(name),
  unsubscribe: () => {},
})

// ── Deep-clone helper ───────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepClone(obj: any): any {
  return JSON.parse(JSON.stringify(obj))
}

// ── Factory ─────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createMockSupabase(): any {
  const store = deepClone(mockStore)

  return {
    from: (table: string) => new MockQueryBuilder(table, store),
    auth: mockAuth,
    channel: (name: string) => mockChannel(name),
    removeChannel: () => {},
  }
}
