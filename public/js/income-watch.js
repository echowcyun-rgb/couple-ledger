(() => {
  const STORAGE_KEY = "income-watch-dedup-v1"
  const KEYWORDS = ["工资", "代发", "转入"]

  const readJSON = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : fallback
    } catch {
      return fallback
    }
  }

  const writeJSON = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {}
  }

  const buildTx = ({ amount, date, note }) => ({
    id: `tx_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    date,
    type: "in",
    amount,
    categoryKey: "salary",
    memberId: "wu",
    note,
    createdAt: Date.now(),
  })

  const syncToLedger = (tx) => {
    try {
      const raw = localStorage.getItem("couple-ledger-v1")
      if (!raw) return false
      const state = JSON.parse(raw)
      state.transactions = [tx, ...(state.transactions || [])]
      localStorage.setItem("couple-ledger-v1", JSON.stringify(state))
      return true
    } catch {
      return false
    }
  }

  const handlePayload = ({ amount, date, source }) => {
    const num = Number(amount)
    if (!date || !Number.isFinite(num) || num <= 0) return
    const key = `${date}|${num}`
    const seen = readJSON(STORAGE_KEY, {})
    if (seen[key]) return

    const note = source === "autoIncome" ? "自动入账待确认" : "待确认"
    const tx = buildTx({ amount: num, date, note })
    if (!syncToLedger(tx)) return
    seen[key] = true
    writeJSON(STORAGE_KEY, seen)
  }

  const params = new URLSearchParams(location.search)
  if (params.get("action") === "autoIncome") {
    const amount = params.get("amount")
    const date = params.get("date") || new Date().toISOString().slice(0, 10)
    const text = [params.get("keyword"), params.get("desc"), params.get("note")].filter(Boolean).join(" ")
    const matched = !text || KEYWORDS.some((k) => text.includes(k))
    if (matched) handlePayload({ amount, date, source: "autoIncome" })
  }

  window.addEventListener("message", (event) => {
    const data = event.data || {}
    if (data.type === "AUTO_INCOME") handlePayload({ amount: data.amount, date: data.date, source: "postMessage" })
  })
})()
