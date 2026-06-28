# 【Qiita/Zenn 記事ドラフト】そのまま投稿OK（技術者＝FE/AP受験層に届く狙い）
# リンクは kakomon-labo.com

---

title: 「応用情報の午後（記述式）」をClaudeでAI採点する仕組みを個人開発で作った
tags: ["Claude", "Nextjs", "Supabase", "個人開発", "AI"]

---

## はじめに

応用情報技術者試験の**午後問題は記述式**です。過去問を解いても、自分の答案が正解なのか・部分点がもらえるのか、**自分では採点しづらい**——ここが受験者の一番のストレスだと思います。

そこで、個人開発しているIPA学習サイト「**過去問演習ラボ**」に、**午後の記述解答をAIが採点する機能**を実装しました。本記事ではその設計のポイント、特に

- **カンニングを防ぐサーバーサイド採点**
- **JSON Schema による構造化出力で UI を安定させる**
- **記述／短答でのプロンプト出し分け**
- **有料機能としての会員ゲート**

を、実際のコードを抜粋しながら共有します。LLMで「曖昧な正誤判定」を扱う一例として参考になれば。

## 何が難しいか

1. 記述採点は本質的に曖昧。表現が違っても要点が合えば正解、一部だけなら部分点。→ ルールベースは無理、**LLM向き**。
2. 素朴に作ると、採点のために**模範解答をフロントに送る**必要が出て、DevToolsで丸見え＝**カンニング可能**になる。
3. LLMの出力はブレる。UI側は `○ / △ / ×` に正規化したい。

## 設計

- 採点は**サーバーの API Route** で実行し、**模範解答はDBからサーバー側で取得**（クライアントには絶対に渡さない）。
- モデルは **Claude Haiku**。**JSON Schema 出力**で `result: correct | partial | wrong` と `comment` を強制。
- `text`（記述）と `short`（短答）で**プロンプトを分岐**。
- 有料機能なので `subscriptions` テーブルで**会員判定**してからAIを呼ぶ（非会員にはAPIコストを発生させない）。

## コード抜粋

```ts
// app/api/grade-pm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  const { subId, userAnswer } = await request.json();
  const supabase = await createSupabaseServerClient();

  // ① ログイン＆会員チェック（非会員にはAIを呼ばない＝課金しない）
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ code: "auth_required" }, { status: 401 });

  const { data: sub } = await supabase
    .from("subscriptions").select("status, current_period_end")
    .eq("user_id", user.id).maybeSingle();
  const isMember = sub?.status === "active" &&
    (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
  if (!isMember) return NextResponse.json({ code: "not_member" }, { status: 403 });

  // ② 模範解答は subId からサーバー側で取得（クライアントに渡さない＝カンニング防止）
  const { data: q } = await supabase
    .from("pm_sub_answers").select("label, answer_type, correct")
    .eq("id", subId).maybeSingle();
  if (!q) return NextResponse.json({ error: "not found" }, { status: 404 });

  // ③ Claude で採点。JSON Schema で出力フォーマットを固定
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 400,
    system:
      "あなたはIPA応用情報技術者試験（午後）の採点者です。受験者の記述解答を公式の模範解答と" +
      "意味的に照合し、要点が合えば correct、一部のみ partial、外していれば wrong とします。" +
      "講評は日本語で簡潔に。",
    messages: [{
      role: "user",
      content: `【設問】${q.label}\n【模範解答】${q.correct}\n【受験者の解答】${userAnswer}\n採点してください。`,
    }],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            result: { type: "string", enum: ["correct", "partial", "wrong"] },
            comment: { type: "string" },
          },
          required: ["result", "comment"],
          additionalProperties: false,
        },
      },
    },
  });

  const block = message.content.find((b) => b.type === "text");
  const parsed = JSON.parse(block && "text" in block ? block.text : "{}");
  return NextResponse.json({ result: parsed.result, comment: parsed.comment, correct: q.correct });
}
```

### ポイント1：カンニング対策
採点に必要な模範解答は **`subId` を鍵にサーバー側でDBから引く**だけ。フロントには答えが一切流れません。「AI採点」と「正解の秘匿」を両立させる肝です。

### ポイント2：JSON Schema で UI を安定
`result` を `enum` で固定するので、フロントは `○ / △ / ×` のマッピングを安心して書けます。LLM出力のブレに振り回されません。

### ポイント3：記述／短答の出し分け
短答（用語・短い語句）は、完全一致判定をすり抜けた**表記ゆれ・同義語を救済**する用途でAIを使い、`partial` は使わず `correct / wrong` の2値に倒しています。記述は `partial`（部分点）あり。設問タイプでプロンプトと判定ロジックを変えるのがコツでした。

## 結果

午後の記述まで「○△×＋講評」で振り返れるようになり、**自己採点できない問題を潰せる**ようになりました。さらに今は、解答傾向から弱点を分析して**「次にやるべき演習」をAIが提案するAIレコメンド**も実装中です。

技術構成は Next.js（App Router）/ Supabase / Stripe / Claude / Vercel。過去問は1万問以上をDB収録しています。

## おわりに

「LLMで曖昧な正誤を判定し、有料機能として安全に提供する」一例として、誰かの参考になれば嬉しいです。

サイトはこちら（過去問演習・AI弱点分析は無料、午後AI採点は14日間無料で試せます）：
👉 **過去問演習ラボ** https://kakomon-labo.com

ITパスポート・基本情報・応用情報を受ける方、よかったら触ってフィードバックをもらえると飛び上がって喜びます。
