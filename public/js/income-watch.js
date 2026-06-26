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

  const normalizeText = (value) => String(value || "").toLowerCase()

  const buildTx = ({ amount, date, note, status }) => ({
    id: `tx_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    date,
    type: "in",
    amount,
    categoryKey: "salary",
    memberId: "wu",
    note,
    status,
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

  const handlePayload = ({ amount, date, keyword = "", source }) => {
    const num = Number(amount)
    if (!date || !Number.isFinite(num) || num <= 0) return
    const key = `${date}|${num}`
    const seen = readJSON(STORAGE_KEY, {})
    if (seen[key]) return

    const text = normalizeText(keyword)
    if (text && !KEYWORDS.some((k) => text.includes(k))) return

    const today = new Date().toISOString().slice(0, 10)
    const status = date === today ? "confirmed" : "pending"
    const note = status === "pending" ? "待确认" : "工资入账"
    const tx = buildTx({ amount: num, date, note, status })
    if (!syncToLedger(tx)) return
    seen[key] = true
    writeJSON(STORAGE_KEY, seen)
  }

  const params = new URLSearchParams(location.search)
  if (params.get("action") === "autoIncome") {
    handlePayload({
      amount: params.get("amount"),
      date: params.get("date") || new Date().toISOString().slice(0, 10),
      keyword: [params.get("keyword"), params.get("desc"), params.get("note")].filter(Boolean).join(" "),
      source: "query",
    })
  }

  window.addEventListener("message", (event) => {
    const data = event.data || {}
    if (data.type === "AUTO_INCOME") {
      handlePayload({ amount: data.amount, date: data.date, keyword: data.keyword, source: "postMessage" })
    }
  })
})()
