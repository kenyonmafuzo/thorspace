"use client";


import { ProgressProvider } from "../lib/ProgressContext";
import { UserStatsProvider } from "@/app/components/stats/UserStatsProvider";

export function Providers({ children }) {
  return (
    <ProgressProvider>
      <UserStatsProvider>
        {children}
      </UserStatsProvider>
    </ProgressProvider>
  );
}
