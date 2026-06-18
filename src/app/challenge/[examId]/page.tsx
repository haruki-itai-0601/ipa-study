import { createClient } from "@supabase/supabase-js";
import { getExam } from "@/lib/exams";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ChallengeRunner, { type ChQ } from "@/components/challenge-runner";

export const dynamic = "force-dynamic"; // 毎回ちがう5問にする

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ examId: string }> }): Promise<Metadata> {
  const { examId } = await params;
  const exam = getExam(examId);
  const title = `${exam?.name ?? ""}の5問チャレンジ｜過去問演習ラボ`;
  const description = `${exam?.name ?? ""}の過去問から5問。あなたは何問解ける？1分で腕試し！`;
  return { title, description, openGraph: { title, description }, twitter: { card: "summary", title, description } };
}

async function pickFive(examId: string): Promise<ChQ[]> {
  // DB側で全年度から抽選（1000行上限の影響なし）。図問題を除外するため多めに取ってから絞る
  const { data } = await sb().rpc("get_random_past_questions", {
    p_exam_id: examId,
    p_count: 60,
  });
  type RandQ = ChQ & { image_url?: string | null };
  const pool = ((data as RandQ[] | null) ?? []).filter(
    (q) =>
      q.question &&
      !q.image_url &&
      !/[図表]/.test(q.question) &&
      !/アローダイアグラム|グラフ|次のプログラム|流れ図/.test(q.question)
  );
  return pool.slice(0, 5);
}

export default async function ChallengePage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const exam = getExam(examId);
  if (!exam) notFound();
  const questions = await pickFive(examId);
  if (questions.length < 5) notFound();

  return (
    <div className="min-h-screen">
      <header className="bg-white/70 backdrop-blur-xl border-b border-gray-200/70 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
          <Link href="/challenge" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <div className="text-sm text-gray-500">5問チャレンジ</div>
            <div className="font-bold text-gray-900">{exam.name}</div>
          </div>
        </div>
      </header>
      <ChallengeRunner examId={examId} questions={questions} />
    </div>
  );
}
