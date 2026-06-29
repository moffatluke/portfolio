// Minimal in-memory stand-in for the Supabase JS client, covering just the
// query surface our handlers use:
//   from(table).select(...).eq(col, v).gte(col, v)   -> awaitable, { count }
//   from(table).insert(row)                          -> awaitable, { error }
// Rows live in `.tables[name]` so tests can assert what was written.
//
// `failInsert` makes insert() into the named tables return an error, so the
// db-failure branches can be exercised.
export function fakeSupabase({ failInsert = [] } = {}) {
  const tables = {}
  const rowsOf = (t) => (tables[t] ||= [])

  return {
    tables,
    from(table) {
      const rows = rowsOf(table)
      const filters = []
      const builder = {
        select() {
          return builder
        },
        eq(col, val) {
          filters.push((r) => r[col] === val)
          return builder
        },
        gte(col, val) {
          filters.push((r) => r[col] >= val)
          return builder
        },
        insert(row) {
          if (failInsert.includes(table)) {
            return Promise.resolve({ error: { message: `insert into ${table} failed` }, data: null })
          }
          const list = Array.isArray(row) ? row : [row]
          for (const x of list) rows.push({ created_at: new Date().toISOString(), ...x })
          return Promise.resolve({ error: null, data: list })
        },
        // Make the builder awaitable: resolves a count query, matching the
        // chained .select(..., { count, head }).eq().gte() the handlers use.
        then(resolve, reject) {
          const matched = rows.filter((r) => filters.every((f) => f(r)))
          return Promise.resolve({ count: matched.length, data: matched, error: null }).then(resolve, reject)
        },
      }
      return builder
    },
  }
}
