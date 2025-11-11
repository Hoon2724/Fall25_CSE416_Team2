// supabase/functions/item-embed/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  try {
    const { item_id, title, description, tags = [] } = await req.json();
    if (!item_id) return new Response("item_id required", { status: 400 });

    const text = [title, description, tags.join(", ")].filter(Boolean).join("\n");
    const apiKey = Deno.env.get("OPENAI_API_KEY")!;
    const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
    });
    const embedJson = await embedRes.json();
    const vec: number[] = embedJson.data?.[0]?.embedding;
    if (!vec) return new Response("embedding_failed", { status: 502 });

    const supa = (await import("npm:@supabase/supabase-js")).createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supa
      .from("item_embeddings")
      .upsert({ item_id, embedding: vec }, { onConflict: "item_id" });
    if (error) return new Response(error.message, { status: 500 });

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(`error: ${e}`, { status: 500 });
  }
});