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

/* Gemini 이미지 생성 호출 */
async function callGeminiImage(word: string, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`
  const imagePrompt = `Generate an image: Create an illustration that captures the feeling and mood of the English word "${word}". Use a concrete, recognizable scene or situation rather than abstract shapes, but keep it stylish and sophisticated — not cartoonish or childish. Think editorial illustration style with warm, natural colors and clean composition. Minimize unnecessary objects — only include objects essential to explaining the word. No text in the image. The illustration must fill the entire canvas edge to edge with no white borders, margins, or padding.`

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
