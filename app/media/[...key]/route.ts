import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key: pieces } = await context.params;
  const key = pieces.map(decodeURIComponent).join("/");
  const bucket = (env as unknown as { BUCKET?: R2Bucket }).BUCKET;
  if (!bucket || !key) return new Response("Not found", { status: 404 });
  const object = await bucket.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=3600");
  return new Response(object.body, { headers });
}
