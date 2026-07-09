// JSON-LD を <script type="application/ld+json"> に安全に埋め込むためのシリアライザ。
// JSON.stringify は "<" をエスケープしないため、DB由来の文字列に "</script>" や "<!--" が
// 含まれるとスクリプトタグを抜け出して任意HTML/スクリプト注入が可能になる
// （このサイトのCSPは script-src に 'unsafe-inline' を許可しているため、埋め込みタグ破壊は防げない）。
// ld+json の中身はJSONとしてパースされ実行はされないため、"<" を < に退避すれば
// タグ破壊（</script> ・ <!-- ・ <script>）を確実に封じられる。
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
