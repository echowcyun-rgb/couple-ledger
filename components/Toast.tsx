export function Toast({ show, msg }: { show: boolean; msg: string }) {
  return <div className={`toast ${show ? "show" : ""}`}>{msg}</div>
}
