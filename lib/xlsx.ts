type XlsxModule = typeof import("@e965/xlsx")

let xlsxPromise: Promise<XlsxModule> | null = null

/** 按需加载 xlsx，避免首屏拉取大 chunk 导致 ChunkLoadError */
export function loadXlsx(): Promise<XlsxModule> {
  if (!xlsxPromise) {
    xlsxPromise = import("@e965/xlsx").catch((err) => {
      xlsxPromise = null
      throw err
    })
  }
  return xlsxPromise
}
