import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Label = { description: string; score: number };

/** 공통 CORS 헤더 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // 필요 시 특정 도메인으로 교체
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function pickCategory(labels: Label[]): string {
  const text = labels.map((l) => l.description.toLowerCase()).join(" ");
  if (/laptop|notebook|macbook|computer|charger|keyboard|monitor/.test(text))
    return "electronics";
  if (/shoe|sneaker|clothing|shirt|jacket|pants|skirt|bag/.test(text))
    return "fashion";
  if (/chair|desk|table|sofa|furniture|lamp|shelf/.test(text)) return "furniture";
  if (/book|textbook|novel|magazine/.test(text)) return "books";
  if (/grocery|snack|kitchen|cookware|mug/.test(text)) return "living";
  return "etc";
}

function makeHashtags(labels: Label[]): string[] {
  return Array.from(
    new Set(
      labels
        .slice(0, 5) // Vision에서 상위 5개 라벨만
        .map((l) => "#" + l.description.toLowerCase().replace(/\s+/g, ""))
    )
  );
}

Deno.serve(async (req) => {
  // 프리플라이트(OPTIONS) 요청 처리
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // JSON 파싱 (비정상 본문 대비)
    let payload: any = {};
    try {
      payload = await req.json();
    } catch {
      // body가 비어있거나 JSON이 아니면 오류
      return new Response(
        JSON.stringify({ error: "invalid_json_body" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const { imageUrl } = payload;
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "imageUrl required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("GOOGLE_VISION_KEY");
    const hasKey = Boolean(apiKey && apiKey.length > 5);
    console.log("has_key", hasKey);
    if (!hasKey) {
      return new Response(
        JSON.stringify({ error: "vision key missing" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Google Vision API 호출
    const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
    const body = {
      requests: [
        {
          image: { source: { imageUri: imageUrl } },
          features: [{ type: "LABEL_DETECTION", maxResults: 10 }],
        },
      ],
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const raw = await res.text();
    console.log("vision_status", res.status);
    console.log("vision_raw", raw);

    if (!res.ok) {
      // Vision이 200이 아니면 그대로 전달
      return new Response(
        JSON.stringify({ error: "vision_http_error", status: res.status, raw }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    let data: any = {};
    try {
      data = JSON.parse(raw);
    } catch {
      // 파싱 실패 시 에러 반환
      return new Response(
        JSON.stringify({ error: "vision_json_parse_error", raw }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const resp0 = data?.responses?.[0];
    if (resp0?.error) {
      return new Response(
        JSON.stringify({ error: "vision_error", detail: resp0.error }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const anns: any[] = resp0?.labelAnnotations ?? [];
    const labels: Label[] = anns.map((a) => ({
      description: a.description,
      score: a.score,
    }));
    const category = pickCategory(labels);
    const hashtags = makeHashtags(labels);

    return new Response(
      JSON.stringify({ labels, category, hashtags }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("handler_error", e);
    return new Response(
      JSON.stringify({ error: "classification_failed", detail: String(e) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});