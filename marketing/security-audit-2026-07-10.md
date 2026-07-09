# セキュリティ監査レポート（2026-07-10 夜間・自律実行）

多エージェント監査（7観点で探索 → 各指摘を敵対的に検証 → 網羅性クリティック。計27エージェント）を実施。
**総評：全体は堅牢。既知の重大（Critical/High）欠陥はなし。** 確定11件は重複統合で8件、大半が Low / Info。

---

## ✅ 今夜プッシュ済み（検証済み・非破壊・commit 924e542）

| # | 修正 | 深刻度 | 内容 |
|---|---|---|---|
| 1 | **JSON-LD の `</script>` エスケープ** | Low（潜在XSS） | 4箇所の `dangerouslySetInnerHTML` で `JSON.stringify` の `<` を `<` に退避（`src/lib/json-ld.ts` 新設）。今はDB文字列（公開・改ざん不可）なので**未発火**だが、CSPが `unsafe-inline` 許可のため万一 `</script>` が混入すると防げない層。先回りで封鎖。 |
| 2 | **/account のオープンリダイレクト** | Low | `?next=/%5Cevil.com`（バックスラッシュ）がブラウザURL正規化で外部サイト化する迂回を封鎖。`/admin/login` と同じガードに統一。 |
| 3 | **/api/og/shindan の Cache-Control** | Low | 無認証OG画像が毎回再ラスタライズ（satori+フォント95KB）される CPU/コスト増幅を、CDNキャッシュ header で抑止。Xクローラも高速化。 |
| 4 | **/api/questions の転送量削減** | Low | ランダム出題を「id抽選→当選分のみ全カラム取得」に変更。匿名1リクエストの転送量を約285KB→数KBへ（ランダム性は維持）。 |

検証：tsc clean／dev で全ルート描画OK／JSON-LDは有効JSONのまま `</script>` 無害化を実証／questions API 正常／OG 200画像。

---

## 🔴 あなたの対応が必要（今夜は触っていない）

### A. record_daily_post 匿名書き込み（**最優先・唯一の対外面リスク**／Low-Medium）
**何が起きるか：** `record_daily_post` RPC が匿名（anon）実行可能で、`x_daily_posts` を無認証で上書きできる（監査で実際にHTTP 204で書込→削除を確認済み）。攻撃者が朝の投票後〜夜の答え合わせの間に上書きすると、**ブランドXアカウントの「答え合わせ」返信が攻撃者の選んだツイート下に投稿される／別問題の答えを晒す／夜の投稿が落ちる**。ユーザーデータ・課金には無影響、翌朝上書きで自己修復。

**なぜ今夜直さなかったか：** 現行のXボット（`scripts/post-tweet.mjs`）は anon キーで `record_daily_post` を呼んでいる。anon の EXECUTE を剥奪すると**ボットの朝の記録が壊れ、夜の答え合わせがスレッドにならず単独投稿に劣化する**。あなたが寝ている間にボットを壊すのは避けた。

**直し方（あなたが起きたら、10分）：**
1. GitHub → リポジトリ Settings → Secrets and variables → Actions で **`SUPABASE_SERVICE_ROLE_KEY`** を追加（Supabaseダッシュボード → Project Settings → API → service_role key）。
2. 私に「サービスロール入れた」と言えば、`.github/workflows/tweet.yml` と `post-tweet.mjs` をそのキー使用に切替＋`REVOKE EXECUTE ON FUNCTION record_daily_post FROM anon, authenticated` をMCPで適用（順序厳守で非破壊に実施）。

### B. Supabaseダッシュボードのトグル（コード不可・各1クリック）
- **漏洩パスワード保護（HaveIBeenPwned）が無効** → Authentication → Password security で ON（推奨・Info）。
- **Auth の Redirect URLs 許可リスト**を確認 → ワイルドカード（`*` や `https://*.vercel.app`）が入っていたらトークン漏洩のオープンリダイレクトになるので `https://kakomon-labo.com/**` 等に限定（要確認）。
- **匿名サインインの要否** → ゲスト自己採点に本当に必要か。不要なら OFF で悪用面が減る（下記Cと関連）。

### C. 方針判断（低優先・仕様の話）
- **進捗/統計テーブルの自己改ざん** … ログイン（匿名含む）ユーザーは自分の `user_stats`/`user_progress` 行を PostgREST で直接書ける（RLSは自分の行に限定）。連続日数や正答率を自己申告で盛れるが、**ランキング・報酬・課金には一切繋がらないので実害なし**（自分を騙すだけ）。将来リーダーボードを作るならサーバー集計に。今は放置でOK。
- **AI利用の1日上限**：Pro会員1人あたり grade-pm+recommend 合算40回/日。原価的には理論上サブスク額を超えうる（セキュリティではなく収益設計の話）。月次上限や採点モデルの見直しは任意。

---

## ✅ 監査で「安全」と確認済み（次回掘り直し不要）
- **Pro自己付与は不可**（subscriptions はSELECTのみ・書込はStripe webhookのservice_roleだけ）。
- **AIコスト濫用の入口 bump_ai_usage は競合安全・fail-closed**（原子的upsert・匿名false・client引数無視）。
- **Realtime配信テーブル0件／Storageバケット0件／IDORなし／管理Cookieフラグ適正／sitemap・robotsは非公開URLを漏らさない**。
- **秘密情報のコミット無し・クライアントバンドルへの鍵漏洩無し・npm audit 0件・CSP/HSTS/各ヘッダ enforce**。
- **決済（Stripe署名検証・価格サーバー固定・冪等）／午後模範解答の課金コンテンツ（記述）はマスク済み**。
- `device-preview.html` は本番404（gitignore済・未デプロイ）。

監査の全ログ：セッションの workflow 出力（run wf_1f677ffc-d3d）。
