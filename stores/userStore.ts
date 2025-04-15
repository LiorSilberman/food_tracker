import { create } from 'zustand';

type UserState = {
  dailyCalories: number;
  setDailyCalories: (calories: number) => void;
};

export const useUserStore = create<UserState>((set) => ({
  dailyCalories: 0,
  setDailyCalories: (calories) => set({ dailyCalories: calories }),
}));
