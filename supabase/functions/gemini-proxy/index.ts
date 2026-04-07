/* ===== Gemini API 프록시 Edge Function ===== */
/* 프론트엔드 대신 Gemini API를 호출하고, 사용량을 추적합니다. */

import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

/* 환경변수에서 키 로드 */
/* 모든 Gemini 호출은 결제 설정된 단일 유료 키(GEMINI_API_KEY)를 사용한다.
   무료 체험 한도(FREE_LIMIT) 초과 시에도 텍스트 검색은 같은 유료 키로 계속 처리하고,
   이미지 생성만 차단한다. (과거에는 결제 미설정 무료 키 풀로 폴백했으나
   하드코딩 노출 위험과 운영 복잡도로 인해 제거함) */
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

/* 무료 사용 횟수 제한 */
const FREE_LIMIT = 3

/* CORS 헤더 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

/* Supabase 서비스 클라이언트 (RLS 우회) */
function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

/* 사용량 확인 및 증가 */
async function checkAndIncrementUsage(userId: string): Promise<{ allowed: boolean; count: number; subscribed: boolean }> {
  const supabase = getSupabase()

  /* 사용자 조회 */
  const { data, error } = await supabase
    .from("user_usage")
    .select("free_trial_count, subscribed")
    .eq("user_id", userId)
    .single()

  if (error || !data) {
    /* 신규 사용자 — 레코드 생성 */
    await supabase.from("user_usage").insert({ user_id: userId, free_trial_count: 1, subscribed: false })
    return { allowed: true, count: 1, subscribed: false }
  }

  /* 구독자는 무제한 */
  if (data.subscribed) {
    await supabase.from("user_usage").update({ free_trial_count: data.free_trial_count + 1 }).eq("user_id", userId)
    return { allowed: true, count: data.free_trial_count + 1, subscribed: true }
  }

  /* 사용량 증가 */
  await supabase.from("user_usage").update({ free_trial_count: data.free_trial_count + 1 }).eq("user_id", userId)
  const newCount = data.free_trial_count + 1
  const exceeded = newCount > FREE_LIMIT
  return { allowed: !exceeded, count: newCount, subscribed: false }
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

/* Gemini 이미지 생성 호출 */
async function callGeminiImage(word: string, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`
  const imagePrompt = `Generate an image: Create an illustration that captures the feeling and mood of the English word "${word}". Use a concrete, recognizable scene or situation rather than abstract shapes, but keep it stylish and sophisticated — not cartoonish or childish. Think editorial illustration style with warm, natural colors and clean composition. Minimize unnecessary objects — only include objects essential to explaining the word. No text in the image.`

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: imagePrompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
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

    /* count 액션: 카운트만 증가하고 상태 반환 (캐시/DB 히트 시 사용) */
    if (action === "count") {
      const usage = await checkAndIncrementUsage(userId)
      return new Response(
        JSON.stringify({ allowed: usage.allowed, count: usage.count, subscribed: usage.subscribed }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    /* 사용량 확인 (extract는 카운트 대상 아님 — 검색·이미지 액션에서만 카운트) */
    /* 모든 액션은 동일한 유료 키(GEMINI_API_KEY)를 사용한다.
       한도 초과 시 분기는 "이미지는 차단 / 텍스트는 그대로 호출"만 처리한다. */
    const apiKey = GEMINI_API_KEY
    if (action === "search" || action === "image") {
      const usage = await checkAndIncrementUsage(userId)
      if (!usage.allowed && !usage.subscribed) {
        /* 이미지는 무료 체험 초과 시 차단 — 클라이언트가 빌링 안내 placeholder를 표시 */
        if (action === "image") {
          return new Response(
            JSON.stringify({ error: "FREE_LIMIT_EXCEEDED", count: usage.count, limit: FREE_LIMIT }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }
        /* 텍스트 검색은 한도 초과 후에도 계속 동작 — 키 변경 없이 GEMINI_API_KEY 그대로 사용 */
      }
    }
    /* extract 액션은 한도와 무관하게 항상 GEMINI_API_KEY 사용 (위에서 이미 할당됨) */

    let result: unknown

    switch (action) {
      case "search": {
        /* 텍스트 검색 */
        if (!prompt) {
          return new Response(
            JSON.stringify({ error: "prompt is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }
        const text = await callGeminiText(prompt, apiKey)
        result = { text }
        break
      }
      case "image": {
        /* 이미지 생성 (무료 체험 초과 시 위에서 이미 차단됨) */
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
