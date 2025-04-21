// stores/useMealRefreshStore.ts
import { create } from "zustand"

type MealRefreshState = {
  refreshKey: number
  triggerRefresh: () => void
}

export const useMealRefreshStore = create<MealRefreshState>((set) => ({
  refreshKey: 0,
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
}))
