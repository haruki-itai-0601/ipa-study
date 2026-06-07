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

  return (
    <>
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-1">
              <BookOpen className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {loading ? "-" : stats.todayAnswered}
            </div>
            <div className="text-sm text-gray-500 mt-1">解答数</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-1">
              <Target className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {loading ? "-" : `${todayAccuracy}%`}
            </div>
            <div className="text-sm text-gray-500 mt-1">正解率</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {loading ? "-" : stats.streak}
            </div>
            <div className="text-sm text-gray-500 mt-1">連続日数</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 mt-3 items-stretch">
        {/* 今日の目標進捗バー */}
        <Card className="border-0 shadow-sm h-full">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="flex justify-between items-center mb-2">
              <span className="text-base font-medium text-gray-700">今日の目標</span>
              <span className="text-base text-gray-500">
                {loading ? "-" : stats.todayAnswered} / 10問
              </span>
            </div>
            <Progress
              value={loading ? 0 : (stats.todayAnswered / 10) * 100}
              className="h-2.5"
            />
            {!loading && stats.todayAnswered === 0 && (
              <p className="text-sm text-gray-400 mt-2">
                今日はまだ解いていません。1問から始めましょう！
              </p>
            )}
          </CardContent>
        </Card>

        {/* 学習分析・弱点ダッシュボード */}
        <Link href="/analysis" className="block h-full">
          <Card className="h-full border-2 border-indigo-200 bg-indigo-50 hover:border-indigo-400 hover:shadow-md transition-all duration-200 cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3 h-full">
              <div className="bg-indigo-600 rounded-xl p-2.5 flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-gray-900">学習分析・弱点ダッシュボード</div>
                <div className="text-sm text-gray-500">区分横断で進捗と苦手分野をチェック</div>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </>
  );
}
