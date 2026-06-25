// 弱点分析の共通チャート部品（分析ページ等で流用）。
// ※ home-dashboard.tsx にも同等のインライン実装があり、将来そちらもここへ寄せると重複解消できる。

// 正答率→色（緑=合格圏 / 黄=あと一歩 / 赤=要対策）
export function accHex(acc: number): string {
  if (acc >= 70) return "#16a34a";
  if (acc >= 40) return "#ca8a04";
  return "#dc2626";
}

// リングゲージ（60%＝合格ラインの目盛りつき）。未演習は「—」表示。
export function DonutGauge({
  label,
  acc,
  answered,
  correct,
}: {
  label: string;
  acc: number;
  answered: number;
  correct: number;
}) {
  const R = 40;
  const C = 2 * Math.PI * R;
  const has = answered > 0;
  const frac = has ? Math.max(0.01, acc / 100) : 0;
  const color = has ? accHex(acc) : "#e5e7eb";
  // 合格ライン(60%)の目盛り：上から時計回りに216°
  const tickRad = ((-90 + 0.6 * 360) * Math.PI) / 180;
  const tcos = Math.cos(tickRad);
  const tsin = Math.sin(tickRad);
  return (
    <div className="flex flex-col items-center rounded-xl border border-gray-100 bg-gray-50/60 px-2 py-3">
      <svg viewBox="0 0 100 100" className="w-20 h-20 md:w-24 md:h-24">
        <circle cx={50} cy={50} r={R} fill="none" stroke="#eceef3" strokeWidth={9} />
        {has && (
          <circle
            cx={50}
            cy={50}
            r={R}
            fill="none"
            stroke={color}
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={`${frac * C} ${C}`}
            transform="rotate(-90 50 50)"
          />
        )}
        <line
          x1={50 + (R - 7) * tcos}
          y1={50 + (R - 7) * tsin}
          x2={50 + (R + 7) * tcos}
          y2={50 + (R + 7) * tsin}
          stroke="#9ca3af"
          strokeWidth={2.5}
        />
        <text x={50} y={57} textAnchor="middle" fontSize={21} fontWeight={800} fill={has ? accHex(acc) : "#9ca3af"}>
          {has ? `${acc}%` : "—"}
        </text>
      </svg>
      <div className="mt-1 text-sm font-bold text-gray-800 leading-tight text-center">{label}</div>
      <div className="text-xs text-gray-400 mt-0.5">{has ? `${correct}/${answered}問` : "未演習"}</div>
    </div>
  );
}
