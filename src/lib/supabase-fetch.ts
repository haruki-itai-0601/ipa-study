// Supabaseは1リクエストあたり最大1000行までしか返さない（PostgRESTのmax-rows）。
// 1000行を超えうる取得はこのヘルパーで全件ページングする。

// .range() でページングしながら全行を取得する。
// build には from/to を受けてクエリを返す関数を渡す（.order() で順序を固定しておくこと）。
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
  }
  return all;
}

// .in() に渡すIDが多いときにチャンク分割して取得する（URL長・行数上限の両対策）。
export async function fetchByIdsChunked<T>(
  fetchChunk: (ids: string[]) => PromiseLike<{ data: T[] | null; error: unknown }>,
  ids: string[],
  chunkSize = 200
): Promise<T[]> {
  const all: T[] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const { data } = await fetchChunk(ids.slice(i, i + chunkSize));
    if (data) all.push(...data);
  }
  return all;
}
