# X（旧Twitter）自動投稿のセットアップ

朝・昼・夕（JST）に「1日1問」を自動投稿します。仕組みは
**GitHub Actions（クラウドの定時実行）→ `scripts/post-to-x.mjs` → X API**。
PCを開いていなくても動きます。重複は `social_posts` テーブルで自動回避します。

## あなたがやること（1回だけ）

### 1. X API の認証情報を取得
1. https://developer.x.com/ で開発者登録（Free プランでOK。投稿=Write は Free で可能）。
2. アプリを作成し、**User authentication settings** で権限を **Read and write** に設定。
3. 次の4つのキーを控える（OAuth 1.0a）:
   - **API Key**（= X_API_KEY）
   - **API Key Secret**（= X_API_SECRET）
   - **Access Token**（= X_ACCESS_TOKEN）
   - **Access Token Secret**（= X_ACCESS_SECRET）
   - ※Access Token/Secret は「Read and write」権限で発行し直すこと（権限変更前の古いトークンは Write 不可）。

### 2. Supabase のキーを用意
- **Project URL**（= SUPABASE_URL）: Supabaseダッシュボード → Project Settings → API
- **service_role key**（= SUPABASE_SERVICE_ROLE_KEY）: 同ページ。※強い権限なので GitHub Secrets 以外に置かない。

### 3. GitHub Secrets に登録
リポジトリ `haruki-itai-0601/ipa-study` → **Settings → Secrets and variables → Actions → New repository secret** で以下6つを登録:

| Name | 値 |
|---|---|
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
| `X_API_KEY` | API Key |
| `X_API_SECRET` | API Key Secret |
| `X_ACCESS_TOKEN` | Access Token |
| `X_ACCESS_SECRET` | Access Token Secret |

### 4. 動作テスト
GitHub → **Actions → daily-tweet → Run workflow**（手動実行）で1回投稿してみる。
成功するとXに「メイン投稿＋正解リプ」が流れ、`social_posts` に記録されます。

## 投稿時刻（JST）
- 朝 07:30 / 昼 12:30 / 夕 18:30（各1問）
- 変更は `.github/workflows/daily-tweet.yml` の cron（UTC）を編集。
- ※GitHub Actions のスケジュールは数分〜十数分遅れることがあります（仕様）。

## ローカルで中身だけ確認（投稿しない）
```bash
node scripts/post-to-x.mjs --dry-run
```

## メモ
- 1回の実行で「本文＋正解リプ」の2ツイート。3回/日 = 6ツイート/日（Free枠の月1,500投稿に十分収まる）。
- 図表問題は自動除外、280字超は選択肢省略版に自動切替。
- 出典（IPA）とアプリURLは全投稿に自動付与。
