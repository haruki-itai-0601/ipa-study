"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

export function GateClient() {
  const sp = useSearchParams();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(j.error || "ログインできませんでした");
        setBusy(false);
        return;
      }
      // 検証済み。元のページ（なければトップ）へ
      const raw = sp.get("next");
      const next = raw && raw.startsWith("/") && !raw.startsWith("//") && !/[\\\t\r\n]/.test(raw) ? raw : "/";
      window.location.href = next;
    } catch {
      setErr("通信に失敗しました。時間をおいて再度お試しください。");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0E1B33] text-white">
          <Lock className="h-6 w-6" />
        </span>
        <h1 className="text-[19px] font-bold text-[#15202E]">過去問演習ラボ</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#5A6B85]">
          現在このサイトは非公開です。
          <br />
          パスワードを入力してください。
        </p>
      </div>

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
        autoComplete="current-password"
        placeholder="パスワード"
        className="w-full rounded-xl border border-[#D9E0EC] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#1D4ED8]"
      />

      {err && <p className="mt-2.5 text-center text-[13px] font-bold text-[#D14343]">{err}</p>}

      <button
        type="submit"
        disabled={busy || !password}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] py-3.5 text-[15px] font-bold text-white disabled:opacity-50"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? "確認中…" : "ログイン"}
      </button>
    </form>
  );
}
