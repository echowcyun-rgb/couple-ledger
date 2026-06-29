import { Mutex } from "async-mutex"

const roomMutexes = new Map<string, Mutex>()

function getRoomMutex(roomId: string): Mutex {
  let mutex = roomMutexes.get(roomId)
  if (!mutex) {
    mutex = new Mutex()
    roomMutexes.set(roomId, mutex)
  }
  return mutex
}

/** 按 roomId 串行化 pull / push，异常路径也必须 release */
export async function withRoomLock<T>(roomId: string, fn: () => Promise<T>): Promise<T> {
  if (!roomId) {
    return fn()
  }
  const mutex = getRoomMutex(roomId)
  const release = await mutex.acquire()
  try {
    return await fn()
  } finally {
    release()
  }
}
