#!/bin/bash
# IPA 令和4年度 過去問取得スクリプト
# 公式PDFをDL → OCRで問題文抽出 → 解答PDFから正解取得 → SQL生成

set -e

BASE_URL="https://www.ipa.go.jp/shiken/mondai-kaiotu"
WORK_DIR="$HOME/Desktop/ipa_r4_work"
mkdir -p "$WORK_DIR"

echo "=== IPA R4 過去問 取得開始 ===" >&2

# ---- 試験定義 ----
# format: exam_id|period|qs_path|ans_path|year_label
EXAMS=(
  "pm|aki|gmcbt80000008smf-att/2022r04a_pm_am2_qs.pdf|gmcbt80000008smf-att/2022r04a_pm_am2_ans.pdf|令和4年度 秋期"
  "sc|aki|gmcbt80000008smf-att/2022r04a_sc_am2_qs.pdf|gmcbt80000008smf-att/2022r04a_sc_am2_ans.pdf|令和4年度 秋期"
  "db|aki|gmcbt80000008smf-att/2022r04a_db_am2_qs.pdf|gmcbt80000008smf-att/2022r04a_db_am2_ans.pdf|令和4年度 秋期"
  "au|aki|gmcbt80000008smf-att/2022r04a_au_am2_qs.pdf|gmcbt80000008smf-att/2022r04a_au_am2_ans.pdf|令和4年度 秋期"
  "nw|haru|gmcbt80000009sgk-att/2022r04h_nw_am2_qs.pdf|gmcbt80000009sgk-att/2022r04h_nw_am2_ans.pdf|令和4年度 春期"
  "st|haru|gmcbt80000009sgk-att/2022r04h_st_am2_qs.pdf|gmcbt80000009sgk-att/2022r04h_st_am2_ans.pdf|令和4年度 春期"
  "sa|haru|gmcbt80000009sgk-att/2022r04h_sa_am2_qs.pdf|gmcbt80000009sgk-att/2022r04h_sa_am2_ans.pdf|令和4年度 春期"
  "sm|haru|gmcbt80000009sgk-att/2022r04h_sm_am2_qs.pdf|gmcbt80000009sgk-att/2022r04h_sm_am2_ans.pdf|令和4年度 春期"
  "sc|haru|gmcbt80000009sgk-att/2022r04h_sc_am2_qs.pdf|gmcbt80000009sgk-att/2022r04h_sc_am2_ans.pdf|令和4年度 春期"
)

# ---- PDF ダウンロード ----
echo "--- PDF ダウンロード中 ---" >&2
for entry in "${EXAMS[@]}"; do
  IFS='|' read -r exam_id period qs_path ans_path year_label <<< "$entry"
  key="${exam_id}_${period}"

  qs_file="$WORK_DIR/${key}_qs.pdf"
  ans_file="$WORK_DIR/${key}_ans.pdf"

  if [ ! -f "$qs_file" ]; then
    echo "  DL: ${key} 問題PDF" >&2
    curl -s "$BASE_URL/$qs_path" -o "$qs_file" --max-time 30
    sleep 1
  fi
  if [ ! -f "$ans_file" ]; then
    echo "  DL: ${key} 解答PDF" >&2
    curl -s "$BASE_URL/$ans_path" -o "$ans_file" --max-time 30
    sleep 0.5
  fi
done

# ---- 解答PDF テキスト抽出 ----
echo "--- 解答テキスト抽出中 ---" >&2
for entry in "${EXAMS[@]}"; do
  IFS='|' read -r exam_id period qs_path ans_path year_label <<< "$entry"
  key="${exam_id}_${period}"
  ans_file="$WORK_DIR/${key}_ans.pdf"
  ans_txt="$WORK_DIR/${key}_ans.txt"

  pdftotext -layout "$ans_file" "$ans_txt" 2>/dev/null
  echo "  解答: $key → $(grep -c '問' "$ans_txt" || echo 0) 行" >&2
done

# ---- 問題PDF → JPEG → OCR ----
echo "--- 問題PDF OCR処理中（時間がかかります）---" >&2
for entry in "${EXAMS[@]}"; do
  IFS='|' read -r exam_id period qs_path ans_path year_label <<< "$entry"
  key="${exam_id}_${period}"
  qs_file="$WORK_DIR/${key}_qs.pdf"
  ocr_dir="$WORK_DIR/${key}_ocr"
  ocr_txt="$WORK_DIR/${key}_ocr.txt"

  if [ -f "$ocr_txt" ]; then
    echo "  SKIP (cache): $key" >&2
    continue
  fi

  mkdir -p "$ocr_dir"

  # PDF → JPEG 変換 (r=200 dpi)
  pages=$(pdfinfo "$qs_file" 2>/dev/null | grep Pages | awk '{print $2}')
  echo "  $key: ${pages}ページ → OCR" >&2
  pdftoppm -r 200 -jpeg "$qs_file" "$ocr_dir/page" 2>/dev/null

  # 各ページをOCR
  > "$ocr_txt"
  for img in "$ocr_dir"/page-*.jpg; do
    base=$(basename "$img" .jpg)
    out_base="$ocr_dir/${base}_out"
    # tesseract は日本語ファイル名が苦手なのでホームディレクトリに一時コピー
    tmp_img="$HOME/Desktop/_ocr_tmp.jpg"
    tmp_out="$HOME/Desktop/_ocr_out"
    cp "$img" "$tmp_img"
    tesseract "$tmp_img" "$tmp_out" -l jpn --oem 1 --psm 3 2>/dev/null
    if [ -f "${tmp_out}.txt" ]; then
      cat "${tmp_out}.txt" >> "$ocr_txt"
      echo "--- PAGE BREAK ---" >> "$ocr_txt"
      rm -f "${tmp_out}.txt"
    fi
    rm -f "$tmp_img"
  done
  echo "  $key: OCR完了 ($(wc -l < "$ocr_txt") 行)" >&2
done

echo "" >&2
echo "=== 完了 ===" >&2
echo "作業ディレクトリ: $WORK_DIR" >&2
echo "次のステップ: parse-ipa-r4.mjs でSQL生成" >&2
