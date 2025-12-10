import { parseStringPromise } from "xml2js";

export type NoteArticle = {
  title: string;
  link: string;
  thumbnail?: string;
  pubDate?: string;
  excerpt?: string;
};

const NOTE_RSS_URL = "https://note.com/waholii/rss";

export async function fetchNoteArticles(limit = 6): Promise<NoteArticle[]> {
  const res = await fetch(NOTE_RSS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Note RSS: ${res.status} ${res.statusText}`);
  }

  const xml = await res.text();
  const data = await parseStringPromise(xml, { explicitArray: false });

  const items = (data?.rss?.channel?.item ?? []) as any[];
  const list = Array.isArray(items) ? items : [items];

  return list.slice(0, limit).map((item) => {
    const thumbNode = (item as any)["media:thumbnail"];

    let thumbnail: string | undefined;
    if (typeof thumbNode === "string") {
      thumbnail = thumbNode;
    } else if (thumbNode?.$?.url) {
      thumbnail = thumbNode.$.url;
    } else if (typeof thumbNode?._ === "string") {
      thumbnail = thumbNode._;
    }

    const rawDescription: string = item.description ?? "";
    const excerpt = createExcerpt(rawDescription, 120);

    const rawPubDate: string = item.pubDate ?? "";

    return {
      title: item.title ?? "",
      link: item.link ?? "",
      thumbnail,
      pubDate: formatPubDate(rawPubDate),
      excerpt,
    };
  });
}

function createExcerpt(html: string, maxLength: number): string {
  // タグを除去してプレーンテキスト化
  let withoutTags = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  // Note 固有の「続きをみる」などの文言は削除
  withoutTags = withoutTags.replace(/続きをみる.*$/g, "").trim();

  if (withoutTags.length <= maxLength) return withoutTags;
  return `${withoutTags.slice(0, maxLength)}…`;
}

function formatPubDate(pubDate: string): string {
  if (!pubDate) return "";
  const date = new Date(pubDate);
  if (Number.isNaN(date.getTime())) return pubDate;

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  // 2025年12月09日のような日本語フォーマットに整形
  return `${y}年${m}月${d}日`;
}



