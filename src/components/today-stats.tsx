"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Target, TrendingUp, BarChart3, ChevronRight } from "lucide-react";

type Stats = {
  todayAnswered: number;
  todayCorrect: number;
  streak: number;
};

export function TodayStats() {
  const [stats, setStats] = useState<Stats>({
    todayAnswered: 0,
    todayCorrect: 0,
    streak: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const supabase = createSupabaseBrowserClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // 今日（JST）の開始時刻を取得
      const now = new Date();
      const jstOffset = 9 * 60 * 60 * 1000;
      const todayJST = new Date(
        Math.floor((now.getTime() + jstOffset) / (24 * 60 * 60 * 1000)) *
          (24 * 60 * 60 * 1000) -
          jstOffset
      );

      const { data: todayData } = await supabase
        .from("user_progress")
        .select("is_correct, answered_at")
        .eq("user_id", user.id)
        .gte("answered_at", todayJST.toISOString());

      const todayAnswered = todayData?.length ?? 0;
      const todayCorrect = todayData?.filter((r) => r.is_correct).length ?? 0;

      // 連続日数の計算
      const { data: allData } = await supabase
        .from("user_progress")
        .select("answered_at")
        .eq("user_id", user.id)
        .order("answered_at", { ascending: false });

      let streak = 0;
      if (allData && allData.length > 0) {
        const answeredDays = new Set(
          allData.map((r) => {
            const d = new Date(new Date(r.answered_at).getTime() + jstOffset);
            return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
          })
        );

        const checkDate = new Date(now.getTime() + jstOffset);
        // 今日解いていない場合は昨日から遡る
        const todayKey = `${checkDate.getUTCFullYear()}-${checkDate.getUTCMonth()}-${checkDate.getUTCDate()}`;
        if (!answeredDays.has(todayKey)) {
          checkDate.setUTCDate(checkDate.getUTCDate() - 1);
        }

        while (true) {
          const key = `${checkDate.getUTCFullYear()}-${checkDate.getUTCMonth()}-${checkDate.getUTCDate()}`;
          if (answeredDays.has(key)) {
            streak++;
            checkDate.setUTCDate(checkDate.getUTCDate() - 1);
          } else {
            break;
          }
        }
      }

      setStats({ todayAnswered, todayCorrect, streak });
      setLoading(false);
    }

    fetchStats();
  }, []);

  const todayAccuracy =
    stats.todayAnswered > 0
      ? Math.round((stats.todayCorrect / stats.todayAnswered) * 100)
      : 0;

  const statItems = [
    { icon: BookOpen, color: "text-indigo-500", value: loading ? "-" : stats.todayAnswered, label: "解答数" },
    { icon: Target, color: "text-green-500", value: loading ? "-" : `${todayAccuracy}%`, label: "正解率" },
    { icon: TrendingUp, color: "text-orange-500", value: loading ? "-" : stats.streak, label: "連続日数" },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3 items-stretch">
      {/* 左：進捗ステータス（コンパクト）＋今日の目標 */}
      <div className="md:col-span-2 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          {statItems.map((s) => (
            <Card key={s.label} className="border border-white/60 bg-white/80 backdrop-blur-sm rounded-2xl shadow-rich">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center mb-0.5">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div className="text-2xl font-bold text-gray-900 leading-tight">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 今日の目標進捗バー */}
        <Card className="border border-white/60 bg-white/80 backdrop-blur-sm rounded-2xl shadow-rich">
          <CardContent className="p-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-medium text-gray-700">今日の目標</span>
              <span className="text-sm text-gray-500">
                {loading ? "-" : stats.todayAnswered} / 10問
              </span>
            </div>
            <Progress
              value={loading ? 0 : (stats.todayAnswered / 10) * 100}
              className="h-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* 右：学習分析・弱点ダッシュボード（縦長） */}
      <Link href="/analysis" className="block md:col-span-1">
        <Card className="h-full border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl shadow-rich hover:shadow-rich-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
          <CardContent className="p-4 flex md:flex-col items-center md:text-center gap-3 h-full md:justify-center">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl p-2.5 flex-shrink-0 shadow-md shadow-indigo-500/30">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 md:flex-none">
              <div className="font-bold text-gray-900">学習分析・弱点ダッシュボード</div>
              <div className="text-sm text-gray-500 mt-0.5">区分横断で進捗と苦手分野をチェック</div>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0 md:hidden" />
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
