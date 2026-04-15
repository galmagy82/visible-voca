/* ===== Gemini API 프록시 Edge Function ===== */
/* 프론트엔드 대신 Gemini API를 호출한다. */

import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "@supabase/supabase-js"

/* 환경변수에서 키 로드 */
/* 모든 Gemini 호출은 결제 설정된 단일 유료 키(GEMINI_API_KEY)를 사용한다.
   사용량 제한 없이 텍스트·이미지 모두 이 키로 처리한다. */
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!

/* Supabase 서비스 클라이언트 (RLS 우회하여 user_usage 테이블 접근) */
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

/* CORS 헤더 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

/* Gemini 텍스트 생성 호출 */
async function callGeminiText(prompt: string, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini text API error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null
}

/* Gemini 이미지 생성 호출
   ---------------------------------------------------------------
   프롬프트 롤백 안내:
   현재 프롬프트로 오히려 결과가 나빠지면 아래 PREV_IMAGE_PROMPT 로 교체하세요.
   (imagePrompt 변수에 PREV_IMAGE_PROMPT 를 할당하면 즉시 이전 버전으로 복구됨.)
   롤백 시에도 `supabase functions deploy gemini-proxy` 재배포 필요. */

/* v1 프롬프트 — 롤백용으로 보관 */
const V1_IMAGE_PROMPT = (word: string) => `Generate an image: Create an illustration that captures the feeling and mood of the English word "${word}". Use a concrete, recognizable scene or situation rather than abstract shapes, but keep it stylish and sophisticated — not cartoonish or childish. Think editorial illustration style with warm, natural colors and clean composition. Minimize unnecessary objects — only include objects essential to explaining the word. No text in the image. The illustration must fill the entire canvas edge to edge with no white borders, margins, or padding.`

/* v4 프롬프트 — 영어, 구조화된 섹션별 지시 */
const V4_IMAGE_PROMPT = (word: string) => `Create an editorial illustration that captures the feeling, mood, and essence of the English word "${word}".

Style:
- Editorial illustration in the style of Monocle or Kinfolk magazine
- Sophisticated and refined, not cartoonish or childish
- Clean composition with a single focal point

Scene:
- Use a concrete, recognizable scene or situation
- Only include elements essential to conveying the word
- No abstract shapes or decorative elements
- No text, letters, or typography in the image

Color:
- Choose colors that best match the emotional tone of the word
- Keep saturation low and refined
- Harmonious, intentional color palette

Lighting:
- Natural, soft lighting
- Avoid harsh shadows or overly dramatic contrast

Composition:
- Fill the entire canvas edge to edge
- No white borders, no padding, no margins
- No frames or vignettes of any kind
- Full bleed image extending to all edges
- Background should be simple and supportive, not distracting from the main subject

People:
- Do not include human body parts unless essential to the meaning
- No hands, fingers, or feet unless the word specifically requires them
- If people appear, show them in a natural, contextual pose

Part of speech awareness:
- First, identify the part of speech of "${word}".
- Illustrate the meaning of THIS exact form, not a related derived form.
- Noun: draw the thing itself, or a scene featuring it as the subject.
- Verb: draw the action in progress — someone or something doing it.
- Adjective: draw an object or scene that clearly exemplifies the quality.
- Adverb: draw the situation or state that the adverb describes — the manner, degree, or extent. Do NOT fall back to the related adjective.
  e.g. "practically" means "almost / virtually / in effect" → draw a scene of "almost empty", "nearly done", "virtually identical" — NOT a scene of practical/functional objects.
- Preposition / Conjunction: draw the spatial or logical relationship between two elements (e.g. "between" → two objects with space between them; "although" → contrast of two situations).

Derivational suffix caution:
- Words ending in -ly, -ness, -tion, -ment, -ity are often derived from another base word but have DIFFERENT meanings. Illustrate the derived form's own meaning, not the base word's meaning.
- Examples of WRONG behavior to avoid:
  · "practically" (adv) drawn as "practical" (adj)
  · "happiness" (noun: the state) drawn only as "happy" (adj: a smile)
  · "creation" (noun: the act/result) drawn only as "create" (verb)`

/* v5 프롬프트 — v4 에서 Color/Lighting 섹션(사진 보정·조명 용어) 을 제거하고,
   "hand-illustrated, not photograph" 방어선을 명시적으로 추가.
   배경: v4 결과가 실사/포토리얼로 기울어 학습 앱 톤(손그림 일러스트) 과 이질감.
   v3 (한글) 에는 Color/Lighting 이 없었고, 그때 결과가 더 일러스트에 가까웠음 → 그 지점을 복원. */
const V5_IMAGE_PROMPT = (word: string) => `Create an editorial illustration (as an illustrated picture, not a photograph) that captures the feeling, mood, and essence of the English word "${word}".

Style:
- Editorial illustration in the style of Monocle or Kinfolk magazine
- Sophisticated and refined, not cartoonish or childish
- Clean composition with a single focal point
- Hand-illustrated look — NOT a photograph, NOT a 3D render, NOT photorealistic

Scene:
- Use a concrete, recognizable scene or situation
- Only include elements essential to conveying the word
- No abstract shapes or decorative elements
- No text, letters, or typography in the image

Framing:
- Fill the entire canvas edge to edge
- No white borders, no padding, no margins
- No frames or vignettes of any kind
- Full bleed image extending to all edges
- Background should be simple and supportive, not distracting from the main subject

People:
- Do not include human body parts unless essential to the meaning
- No hands, fingers, or feet unless the word specifically requires them
- If people appear, show them in a natural, contextual pose

Part of speech awareness:
- First, identify the part of speech of "${word}".
- Illustrate the meaning of THIS exact form, not a related derived form.
- Noun: draw the thing itself, or a scene featuring it as the subject.
- Verb: draw the action in progress — someone or something doing it.
- Adjective: draw an object or scene that clearly exemplifies the quality.
- Adverb: draw the situation or state that the adverb describes — the manner, degree, or extent. Do NOT fall back to the related adjective.
  e.g. "practically" means "almost / virtually / in effect" → draw a scene of "almost empty", "nearly done", "virtually identical" — NOT a scene of practical/functional objects.
- Preposition / Conjunction: draw the spatial or logical relationship between two elements (e.g. "between" → two objects with space between them; "although" → contrast of two situations).

Derivational suffix caution:
- Words ending in -ly, -ness, -tion, -ment, -ity are often derived from another base word but have DIFFERENT meanings. Illustrate the derived form's own meaning, not the base word's meaning.
- Examples of WRONG behavior to avoid:
  · "practically" (adv) drawn as "practical" (adj)
  · "happiness" (noun: the state) drawn only as "happy" (adj: a smile)
  · "creation" (noun: the act/result) drawn only as "create" (verb)`

async function callGeminiImage(word: string, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`
  /* 현재 활성: v5 (손그림 일러스트 톤 복원 + 사진 용어 제거)
     롤백하려면 아래 imagePrompt 를 V4_IMAGE_PROMPT(word) 또는 V1_IMAGE_PROMPT(word) 로 교체 후 재배포 */
  const imagePrompt = V5_IMAGE_PROMPT(word)

  /* aspectRatio 실험:
     모델이 자유롭게 캔버스 비율을 고르면 내부에 여백을 채우는 경향이 있어,
     명시적으로 "4:3" 고정 → 모델이 그 프레임 안에서 꽉 채우도록 유도.
     결과가 나빠지면 아래 generationConfig 를 이전 버전(responseModalities 만 있는 것)으로 되돌릴 것.
     롤백용 이전 버전(주석): generationConfig: { responseModalities: ["IMAGE", "TEXT"] }, */
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: imagePrompt }] }],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
        imageConfig: { aspectRatio: "4:3" },
      },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini image API error ${res.status}: ${err}`)
  }
  const data = await res.json()
  const parts = data.candidates?.[0]?.content?.parts || []
  for (const part of parts) {
    if (part.inlineData) {
      return { mimeType: part.inlineData.mimeType, data: part.inlineData.data }
    }
  }
  return null
}

/* Gemini 사진 단어 추출 호출 */
async function callGeminiExtract(base64Data: string, mimeType: string, extractPrompt: string, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: extractPrompt },
          { inlineData: { mimeType, data: base64Data } },
        ],
      }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini extract API error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null
}

/* 사용량 증가: 최초 검색 시 row 생성, 이후 검색 시 trial_count +1 */
async function incrementTrialCount(userId: string): Promise<number> {
  const { data } = await supabase
    .from('user_usage')
    .select('trial_count')
    .eq('user_id', userId)
    .maybeSingle()

  if (data) {
    const newCount = (data.trial_count || 0) + 1
    await supabase
      .from('user_usage')
      .update({ trial_count: newCount })
      .eq('user_id', userId)
    return newCount
  } else {
    await supabase
      .from('user_usage')
      .insert({ user_id: userId, trial_count: 1, subscribed: false })
    return 1
  }
}

/* 메인 핸들러 */
Deno.serve(async (req) => {
  /* CORS preflight */
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action, userId, prompt, word, base64Data, mimeType, extractPrompt } = body

    if (!userId || !action) {
      return new Response(
        JSON.stringify({ error: "userId and action are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const apiKey = GEMINI_API_KEY
    let result: unknown

    switch (action) {
      case "search": {
        /* 텍스트 검색 + 사용량 카운트 */
        if (!prompt) {
          return new Response(
            JSON.stringify({ error: "prompt is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }
        /* 텍스트 생성과 사용량 카운트를 병렬 실행 */
        const [text] = await Promise.all([
          callGeminiText(prompt, apiKey),
          incrementTrialCount(userId)
        ])
        result = { text }
        break
      }
      case "image": {
        /* 이미지 생성 */
        if (!word) {
          return new Response(
            JSON.stringify({ error: "word is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }
        const imageData = await callGeminiImage(word, apiKey)
        result = { image: imageData }
        break
      }
      case "extract": {
        /* 사진에서 단어 추출 */
        if (!base64Data || !mimeType || !extractPrompt) {
          return new Response(
            JSON.stringify({ error: "base64Data, mimeType, extractPrompt are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }
        const extracted = await callGeminiExtract(base64Data, mimeType, extractPrompt, apiKey)
        result = { text: extracted }
        break
      }
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Use: search, image, extract" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    /* TS strict 모드에서 catch 변수는 unknown 타입이므로 메시지 추출 시 타입 가드 필요 */
    console.error("Edge Function error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
