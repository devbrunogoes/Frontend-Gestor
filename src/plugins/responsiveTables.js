// Auto-annotate data-label attributes on .data-table cells based on thead headers
export function enhanceResponsiveTables(root = document) {
  try {
    const tables = Array.from(root.querySelectorAll('table.data-table'))
    tables.forEach((table) => {
      const headRow = table.tHead && table.tHead.rows && table.tHead.rows[0]
      if (!headRow) return
      const headers = Array.from(headRow.cells).map((th) => (th.textContent || '').trim())
      const bodyRows = table.tBodies ? Array.from(table.tBodies).flatMap(tb => Array.from(tb.rows)) : []
      bodyRows.forEach((tr) => {
        const cells = Array.from(tr.cells)
        cells.forEach((td, idx) => {
          if (!td.getAttribute('data-label')) {
            const label = headers[idx] || ''
            if (label) td.setAttribute('data-label', label)
          }
        })
      })
    })
  } catch (e) {
    // no-op
  }
}

export function installResponsiveTables(router) {
  if (!router) return
  const run = () => enhanceResponsiveTables(document)
  // First load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true })
  } else {
    run()
  }
  // After each navigation
  try {
    router.afterEach(() => {
      // Slight delay to allow views to render
      setTimeout(run, 0)
    })
  } catch {}
}
