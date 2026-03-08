"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BarChart3, Calendar } from "lucide-react";

const chartData = [
  { month: "Jan", value: 4000, growth: 12, color: "bg-blue-500" },
  { month: "Feb", value: 3000, growth: -8, color: "bg-rose-500" },
  { month: "Mar", value: 5000, growth: 25, color: "bg-emerald-500" },
  { month: "Apr", value: 4500, growth: 15, color: "bg-amber-500" },
  { month: "May", value: 6000, growth: 33, color: "bg-violet-500" },
  { month: "Jun", value: 5500, growth: 22, color: "bg-cyan-500" },
];

export const RevenueChart = memo(() => {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-[#14141d]/80 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            Revenue Analytics
          </h3>
          <p className="text-sm text-zinc-400">Monthly revenue performance</p>
        </div>
        <Button variant="outline" size="sm" className="border-zinc-700 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800">
          <Calendar className="mr-2 h-4 w-4" />
          Last 6 months
        </Button>
      </div>

      <div className="relative mb-4 h-64 rounded-lg border border-zinc-800/70 bg-zinc-950/40 p-4">
        <div className="flex h-full items-end justify-between gap-3">
          {chartData.map((item, index) => (
            <div key={item.month} className="group flex flex-1 flex-col items-center">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(item.value / 6000) * 180}px` }}
                transition={{ duration: 1, delay: index * 0.1 }}
                className={`relative min-h-[20px] w-full cursor-pointer rounded-t-lg ${item.color} transition-opacity hover:opacity-85`}
              >
                <div className="absolute -top-16 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                  <div className="font-medium text-zinc-100">${item.value.toLocaleString()}</div>
                  <div className={`text-xs ${item.growth > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {item.growth > 0 ? "+" : ""}
                    {item.growth}%
                  </div>
                </div>
              </motion.div>
              <div className="mt-2 text-center text-xs font-medium text-zinc-500">{item.month}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 border-t border-zinc-800/70 pt-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-400">$27K</div>
          <div className="text-xs text-zinc-500">Total Revenue</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">+18%</div>
          <div className="text-xs text-zinc-500">Growth Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-violet-400">$4.5K</div>
          <div className="text-xs text-zinc-500">Average</div>
        </div>
      </div>
    </div>
  );
});

RevenueChart.displayName = "RevenueChart";
