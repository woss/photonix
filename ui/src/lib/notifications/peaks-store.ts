import { create } from 'zustand'

interface TaskPeaksState {
  // Highest "remaining" count seen per task type during the current run. Used
  // as the effective total so progress can be shown as a real percentage
  // (the backend only reports the current remaining count).
  peaks: Record<string, number>
  record: (key: string, remaining: number) => void
}

export const useTaskPeaksStore = create<TaskPeaksState>()((set) => ({
  peaks: {},
  record: (key, remaining) =>
    set((state) => {
      const current = state.peaks[key] ?? 0
      // Reset once a task drains so the next run starts a fresh 0→100% fill.
      const next = remaining === 0 ? 0 : Math.max(current, remaining)
      if (next === current) return state
      return { peaks: { ...state.peaks, [key]: next } }
    }),
}))
