import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// CORS 설정 (브라우저에서 호출 가능하도록)
const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:3000", // 개발 시
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};


Deno.serve(async (req) => {
  // CORS preflight 요청(OPTIONS) 대응
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { item_id, title, description, tags = [] } = await req.json();
    if (!item_id) {
      return new Response("item_id required", {
        status: 400,
        headers: corsHeaders,
      });
    }

    // OpenAI 임베딩 입력 텍스트 구성
    const text = [title, description, tags.join(", ")].filter(Boolean).join("\n");

    const apiKey = Deno.env.get("OPENAI_API_KEY")!;
    const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    const embedJson = await embedRes.json();
    const vec: number[] = embedJson.data?.[0]?.embedding;
    if (!vec) {
      console.error("[item-embed] embedding failed", embedJson);
      return new Response("embedding_failed", {
        status: 502,
        headers: corsHeaders,
      });
    }

    // 🔹 Supabase 연결 (service role key 사용)
    const supa = (await import("npm:@supabase/supabase-js")).createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 🔹 item_embeddings 테이블에 upsert
    const { error } = await supa
      .from("item_embeddings")
      .upsert({ item_id, embedding: vec }, { onConflict: "item_id" });

    if (error) {
      console.error("[item-embed] upsert error", error);
      return new Response(error.message, {
        status: 500,
        headers: corsHeaders,
      });
    }

    console.log(`[item-embed] ✅ ${item_id} embedding saved`);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[item-embed] unexpected error", e);
    return new Response(`error: ${e}`, { status: 500, headers: corsHeaders });
  }
});
