import { TABS } from "@/lib/constants"
import type { Tab } from "@/lib/types"

export function TabBar({
  tab,
  onSwitch,
  onRecord,
}: {
  tab: Tab
  onSwitch: (t: Tab) => void
  onRecord: () => void
}) {
  return (
    <nav className="tabbar">
      {TABS.map((tb) =>
        tb.key === "record" ? (
          <button key={tb.key} className="tab center" onClick={onRecord} aria-label="记一笔">
            <span className="tab-icon-row tab-icon-row-center">
              <span className="plus">
                <img className="t-img record-img" src={tb.img} alt="" aria-hidden="true" />
              </span>
            </span>
            <span className="tab-label">{tb.label}</span>
          </button>
        ) : (
          <button key={tb.key} className={`tab ${tab === tb.key ? "active" : ""}`} onClick={() => onSwitch(tb.key)}>
            <span className="tab-icon-row">
              <img className="t-img" src={tab === tb.key ? tb.imgActive : tb.img} alt="" aria-hidden="true" />
            </span>
            <span className="tab-label">{tb.label}</span>
          </button>
        )
      )}
    </nav>
  )
}
