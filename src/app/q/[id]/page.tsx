import { createClient } from "@supabase/supabase-js";
import { getExam } from "@/lib/exams";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SingleQuestion, { type SingleQ } from "@/components/single-question";

type Question = SingleQ;

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

async function getQuestion(id: string): Promise<Question | null> {
  // UUID形式でなければ即無効
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) return null;
  const { data } = await sb().from("questions").select("*").eq("id", id).maybeSingle();
  return (data as Question) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const q = await getQuestion(id);
  if (!q) return { title: "問題が見つかりません｜高度情報処理 過去問道場" };
  const exam = getExam(q.exam_id);
  const title = `【今日の1問】${exam?.name ?? ""} ${q.year}｜高度情報処理 過去問道場`;
  const description = q.question.slice(0, 110);
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary", title, description },
  };
}

export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await getQuestion(id);
  if (!q) notFound();
  const exam = getExam(q.exam_id);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <div className="text-sm text-gray-500">今日の1問</div>
            <div className="font-bold text-gray-900">{exam?.name ?? "過去問"}</div>
          </div>
        </div>
      </header>

      <SingleQuestion q={q} />
    </div>
  );
}
