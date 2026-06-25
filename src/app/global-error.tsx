"use client";

// ルートレイアウトごと壊れた場合の最終フォールバック。独自の html/body が必須で、
// CSSが読めない状況でも表示できるようインラインスタイルで最小限を描画する。
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          color: "#111827",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: "24px", maxWidth: "420px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 12px" }}>
            問題が発生しました
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "#6b7280",
              lineHeight: 1.7,
              margin: "0 0 20px",
            }}
          >
            予期しないエラーが発生しました。お手数ですが、もう一度お試しください。
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{
              background: "linear-gradient(to right,#4f46e5,#7c3aed)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            再読み込み
          </button>
        </div>
      </body>
    </html>
  );
}
