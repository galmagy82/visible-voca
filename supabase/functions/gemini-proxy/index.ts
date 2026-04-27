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

/* Gemini 텍스트 생성 호출
   jsonMode: true 이면 responseSchema 를 포함해 구조화 JSON 응답을 강제한다.
   현재 한국어 프롬프트에서만 사용. 롤백: 프론트에서 jsonMode 를 보내지 않으면
   기존 태그 방식으로 자동 폴백 (이 함수 변경 없이 복구 가능). */
async function callGeminiText(prompt: string, apiKey: string, jsonMode?: boolean) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const generationConfig: Record<string, unknown> = { temperature: 0.7, maxOutputTokens: 8192 }

  /* JSON 구조화 출력 — 모든 필드를 required 로 선언해 Gemini 가 누락할 수 없게 강제.
     어휘 모드가 아닌 필드(pos, ipa 등)는 빈 문자열("")로 채워진다. */
  if (jsonMode) {
    generationConfig.responseMimeType = "application/json"
    generationConfig.responseSchema = {
      type: "OBJECT",
      properties: {
        corrected:   { type: "STRING", description: "교정된 영어 표현. 오류 없으면 빈 문자열" },
        source_lang: { type: "STRING", description: "비영어 입력의 ISO 639-1 언어코드. 해당 없으면 빈 문자열" },
        pos:         { type: "STRING", description: "품사(뜻) 형식. 어휘 모드만. 표현 모드이면 빈 문자열" },
        ipa:         { type: "STRING", description: "IPA 발음기호. 어휘 모드만. 표현 모드이면 빈 문자열" },
        cefr:        { type: "STRING", description: "CEFR 난이도 A1-C2. 어휘 모드만. 표현 모드이면 빈 문자열" },
        verb_forms:  { type: "STRING", description: "동사 3단변화. 동사가 아니면 빈 문자열" },
        scene_en:    { type: "STRING", description: "이미지 생성용 영어 장면 묘사. 어휘 모드만" },
        // feeling: 문장 단위 배열로 반환하여 프론트에서 줄바꿈 렌더링에 사용
        // - 어휘 모드: [핵심 느낌 문장, 비유/장면 묘사 문장] (정확히 2개 원소)
        // - 표현 모드: 입력의 자연스러운 한국어 번역 (1-2개 원소)
        feeling:     { type: "ARRAY", items: { type: "STRING" }, description: `문장 단위 배열. 어휘 모드: 정확히 2개 원소. [0]="큰따옴표로 감싼 핵심 느낌" + 자연스러운 서술어로 완결된 문장. [1]=비유나 구체적 장면 묘사 문장. 각 원소는 완결된 종결어미(~다/~예요/~해요 등)로 끝낼 것. "~는", "~ㄴ" 같은 수식어 형태로 끝나는 미완성 문장 금지. 예: ["\"하나였던 것이 딱 갈라지는\" 이미지예요.", "나무를 도끼로 쪼개는 장면을 떠올려보세요."] 표현 모드: 입력의 자연스러운 한국어 번역 1-2개 원소 배열, 구어체.` },
        examples:    { type: "ARRAY", description: "예문/풀이 블록. 한 줄 = 한 원소. [noun] 등 품사 라벨, 빈 줄(\"\")도 각각 원소로.", items: { type: "STRING" } },
      },
      required: ["corrected", "source_lang", "pos", "ipa", "cefr", "verb_forms", "scene_en", "feeling", "examples"],
    }
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig,
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
   v3 (한글) 에는 Color/Lighting 이 없었고, 그때 결과가 더 일러스트에 가까웠음 → 그 지점을 복원.

   sceneEn: 프론트에서 [SCENE_EN:] 태그로 뽑아 전달하는 영어 장면 1문장.
     - 있으면: "Scene to convey" 섹션으로 최상단 삽입 → 단어 일반 해석보다 이 장면을 우선.
     - 없으면: 일반 단어 기반 프롬프트로 폴백 (구버전 호출 호환). */
const V5_IMAGE_PROMPT = (word: string, sceneEn: string) => {
  const scenePriorityBlock = sceneEn ? `
Scene to convey (highest priority):
- Illustrate this specific scene: "${sceneEn}"
- Your image MUST clearly depict this exact scene, not a generic interpretation of "${word}".
- Include the subject, action, and setting described in the scene above.
- If there is tension between the scene and generic meanings of "${word}", follow the scene.
` : '';
  return `Create an editorial illustration (as an illustrated picture, not a photograph) that captures the feeling, mood, and essence of the English word "${word}".
${scenePriorityBlock}

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
}

/* v6 프롬프트 — v5 에서 실사 편향의 근본 원인 2가지를 제거:
   1) "Monocle or Kinfolk" 레퍼런스 삭제 — 두 매거진 모두 사진 중심이라
      모델이 에디토리얼 사진 톤으로 끌리는 원인이었음.
   2) 부정문("NOT a photograph") 대신 **긍정 매체 앵커**를 최상단에 배치:
      "A gouache and ink illustration..." 으로 시작해 모델이 첫 토큰부터
      회화 매체에 락되도록 유도.
   참고 레퍼런스는 실제로 일러스트 중심 매체로 교체 (The New Yorker,
   NYT editorial illustration, Christoph Niemann 스타일). */
const V6_IMAGE_PROMPT = (word: string, sceneEn: string) => {
  /* sceneEn 이 있을 때만 "Scene to depict" 블록 삽입 — 단어 일반 해석보다 이 장면 우선 */
  const scenePriorityBlock = sceneEn ? `
Scene to depict (highest priority):
- Paint this specific scene: "${sceneEn}"
- This exact scene must be clearly illustrated, not a generic interpretation of "${word}".
- Include the subject, action, and setting described above.
- If there is tension between the scene and generic meanings of "${word}", follow the scene.
` : '';
  return `A gouache and ink illustration — painted with visible brush texture and loose hand-drawn outlines. This is a painted picture, not a photograph.
${scenePriorityBlock}
The illustration visualizes the English word "${word}".

Medium & style:
- Gouache on textured paper, with soft ink linework visible
- Inspired by contemporary editorial illustration: The New Yorker, The New York Times opinion section, The Atlantic, and Christoph Niemann's visual style
- Flat, limited color palette (3–5 harmonious muted colors)
- Visible painted texture and brushwork — not crisp, not airbrushed, not photographic
- Warm, matte, printed-book quality
- Refined adult editorial tone — not cartoonish, not childish, not anime, not manga

Scene:
- Concrete, recognizable situation
- Only elements essential to conveying the word or scene
- No text, letters, numbers, or typography anywhere in the image

Framing:
- Full bleed to all edges of the canvas
- No white borders, no margins, no frames, no vignettes
- Simple, supportive background that doesn't distract from the main subject

People:
- Avoid human body parts unless essential to the meaning
- No disembodied hands or fingers
- If people appear, show them in a natural, contextual pose

Part of speech awareness:
- First, identify the part of speech of "${word}".
- Illustrate the meaning of THIS exact form, not a related derived form.
- Noun: paint the thing itself, or a scene featuring it as the subject.
- Verb: paint the action in progress — someone or something doing it.
- Adjective: paint an object or scene that clearly exemplifies the quality.
- Adverb: paint the situation or state that the adverb describes — the manner, degree, or extent. Do NOT fall back to the related adjective.
  e.g. "practically" means "almost / virtually / in effect" → paint a scene of "almost empty", "nearly done", "virtually identical" — NOT a scene of practical/functional objects.
- Preposition / Conjunction: paint the spatial or logical relationship between two elements (e.g. "between" → two objects with space between them; "although" → contrast of two situations).

Derivational suffix caution:
- Words ending in -ly, -ness, -tion, -ment, -ity are often derived from another base word but have DIFFERENT meanings. Illustrate the derived form's own meaning, not the base word's meaning.
- Examples of WRONG behavior to avoid:
  · "practically" (adv) painted as "practical" (adj)
  · "happiness" (noun: the state) painted only as "happy" (adj: a smile)
  · "creation" (noun: the act/result) painted only as "create" (verb)

Format reminder: This is a painted illustration on textured paper. Favor loose brushwork and visible texture over photographic crispness. If in doubt, make it more painterly, not more realistic.`;
}

async function callGeminiImage(word: string, sceneEn: string, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`
  /* 현재 활성: v6 (매체 앵커를 긍정문 최상단에 배치 + 사진 레퍼런스 제거)
     롤백: 실사 편향이 다시 나오거나 일러스트 품질이 V5 보다 떨어지면
     아래 imagePrompt 를 V5_IMAGE_PROMPT / V4_IMAGE_PROMPT / V1_IMAGE_PROMPT 로 교체 후 재배포.
     sceneEn 이 비어 있으면 "Scene to depict" 섹션 없이 일반 프롬프트로 폴백. */
  const imagePrompt = V6_IMAGE_PROMPT(word, sceneEn)

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

/* Gemini 사진 단어 추출 호출
   thinkingBudget:
     - 0   → thinking off (마크 모드: 단순 패턴 검출이라 추론 불필요, 응답속도 우선)
     - -1  → dynamic (AI 자동 검색 모드: 난이도 판단·ZPD 선별에 추론 필요. 모델이 자동 할당)
     - 정수 → 상한 지정
   프론트가 값을 안 보내면 기존 동작(0) 유지. */
async function callGeminiExtract(base64Data: string, mimeType: string, extractPrompt: string, apiKey: string, thinkingBudget: number = 0) {
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
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget },
      },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini extract API error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null
}

/* Reading Tutor: 책 페이지 사진 1장 → 원문 OCR + 사용자 UI 언어로 번역
   페이지 단위 호출. 프론트엔드가 N장을 병렬 호출한다.
   responseSchema 로 JSON 구조화 응답을 강제하여 프론트 파싱 실패 위험 제거.
   no_text: true 인 경우 빈 페이지/글자 없음으로 처리 (프론트가 안내 표시). */
const READING_LANG_NAMES: Record<string, string> = {
  ko: 'Korean',
  en: 'English',
  ja: 'Japanese',
  zh: 'Chinese (Simplified)',
  es: 'Spanish',
  vi: 'Vietnamese',
  th: 'Thai',
  pt: 'Portuguese',
}
/* GE 점수 → 영어 라벨 매핑 (프롬프트용). i18n.js 의 한국어/다국어 라벨과 의미 동일. */
function geBandLabelEn(ge: number): string {
  if (ge < 3) return 'Beginner'
  if (ge < 5) return 'Elementary'
  if (ge < 7) return 'Intermediate'
  if (ge < 9) return 'Upper-Intermediate'
  return 'Advanced'
}

/* Reading Tutor 페이지 1장 추출 — OCR + 번역 + 학습 단어 동시 처리.
   geScore 가 null/미지정이면 study_items 는 빈 배열로 반환되도록 프롬프트 분기. */
async function callGeminiReadingExtract(base64Data: string, mimeType: string, targetLang: string, geScore: number | null, meaningLang: string, apiKey: string) {
  const langName = READING_LANG_NAMES[targetLang] || 'Korean'
  /* 학습 단어 의미를 어떤 언어로 표기할지.
     - 'en' → "English" (영영 풀이: "영어로 사고하는 훈련" 선호 학습자용)
     - 그 외 → langName (UI 언어 = 모국어로 풀이) */
  const meaningLangName = (meaningLang === 'en') ? 'English' : langName
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

  /* 단어 추출 지침 — 사용자 GE 기반으로 [+1.0, +2.5] 범위에서 선정.
     GE 11 이상은 cap 에 빠르게 닿으므로 정성적 보완 문구 추가. */
  let studyInstructions = ''
  if (geScore != null) {
    const targetMin = Math.min(13, geScore + 1.0)
    const targetMax = Math.min(13, geScore + 2.5)
    const bandLabel = geBandLabelEn(geScore)
    const advancedCue = geScore >= 11
      ? '\n  - This user is at an advanced level — prioritize sophisticated, low-frequency vocabulary, formal/literary expressions, and nuanced idioms.'
      : ''
    /* meaningLang === 'en' 일 때는 학습자 영어 레벨에 맞춰 정의어를 가공해야 함을 명시.
       단순히 "in English" 만 두면 너무 어려운 영영 정의가 나올 수 있음. */
    const meaningGuide = (meaningLang === 'en')
      ? `a concise English explanation suitable for a learner at GE ${geScore.toFixed(1)} (use simpler words than the target item itself)`
      : `a concise ${langName} explanation (1 short phrase)`
    studyInstructions = `
3. From the extracted text, pick words/idioms/expressions that this user should learn next.

User profile:
  - Reading level (Renaissance STAR Reading GE): ${geScore.toFixed(1)} (${bandLabel})
  - Target items to pick: GE ${targetMin.toFixed(1)} ~ ${targetMax.toFixed(1)}${advancedCue}

Selection rules for "study_items":
  - Categories: "word" | "idiom" | "phrasal_verb" | "collocation"
  - 0 to 7 items per page. NO MINIMUM. If nothing in the text falls in the target range, return an empty array.
  - Skip items at or below GE ${geScore.toFixed(1)} (the user already knows these).
  - Skip items above GE ${targetMax.toFixed(1)} (too hard for context-based learning at this stage).
  - Prioritize items that expand this user's vocabulary in the next learning step.
  - "surface" must be the EXACT substring as it appears in the text (preserve casing/punctuation).
  - "meaning" should be ${meaningGuide}.`
  } else {
    studyInstructions = `
3. Return an empty array for "study_items" (user level not provided).`
  }

  const prompt = `You are an OCR + translation + vocabulary picker for a reading-comprehension app. The image is one page of an English book.

Page boundary handling:
- The image should show one page, but the photo may have captured fragments of the adjacent page along the edges (cut-off lines, isolated words near the binding gutter, a different page number).
- Extract text from the PRIMARY page only — the page that fills most of the frame and is clearly the subject of the photo.
- Ignore edge fragments that are obviously from a different page (half-cut letters at the very edge, single isolated words across a binding gutter, mismatched paragraph flow at the edge).
- If two complete facing pages are both fully captured, treat them as one continuous spread and extract both.
- Ignore faint ghosted text that bleeds through from the reverse side of the page. Such text appears noticeably lighter than the main printed text and is often mirrored or upside-down. Extract only text clearly printed on the front (current) side.
- This rule applies to all three tasks below — do not include study_items whose "surface" comes from an ignored fragment or bleed-through.

Tasks:
1. Extract the original English text exactly as it appears on the page, preserving line breaks (use \\n) and paragraph structure.
2. Translate that text into natural ${langName}, preserving paragraph structure (line breaks between paragraphs).${studyInstructions}

If the image contains no readable text (blank page, decoration only, illegible photo), set "no_text" to true, return empty strings for original and translated, and empty array for study_items.

Do NOT add commentary. Return ONLY the JSON object.`

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64Data } },
        ],
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 6144,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            original:   { type: "STRING", description: "Extracted original text, preserving line breaks." },
            translated: { type: "STRING", description: `Natural ${langName} translation, preserving paragraph breaks.` },
            no_text:    { type: "BOOLEAN", description: "True if the page has no readable text." },
            study_items: {
              type: "ARRAY",
              description: "Words/idioms/expressions worth learning at the user's level. Empty if none.",
              items: {
                type: "OBJECT",
                properties: {
                  surface: { type: "STRING", description: "Exact substring from the text." },
                  type:    { type: "STRING", description: "word | idiom | phrasal_verb | collocation" },
                  meaning: { type: "STRING", description: `Concise meaning in ${meaningLangName}.` },
                },
                required: ["surface", "type", "meaning"],
              },
            },
          },
          required: ["original", "translated", "no_text", "study_items"],
        },
        thinkingConfig: { thinkingBudget: -1 },
      },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini reading-extract API error ${res.status}: ${err}`)
  }
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty response from Gemini')
  return JSON.parse(text) as {
    original: string;
    translated: string;
    no_text: boolean;
    study_items: Array<{ surface: string; type: string; meaning: string }>;
  }
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
    const { action, userId, prompt, word, sceneEn, base64Data, mimeType, extractPrompt, thinkingBudget } = body

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
        /* 텍스트 생성과 사용량 카운트를 병렬 실행
           jsonMode: 프론트가 true 를 보내면 Gemini JSON 구조화 응답 활성화 */
        const [text] = await Promise.all([
          callGeminiText(prompt, apiKey, body.jsonMode),
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
        const imageData = await callGeminiImage(word, sceneEn || '', apiKey)
        result = { image: imageData }
        break
      }
      case "extract": {
        /* 사진에서 단어 추출.
           thinkingBudget: 프론트가 안 보내면 기본 0 (마크 모드 호환). AI 모드는 -1 전달. */
        if (!base64Data || !mimeType || !extractPrompt) {
          return new Response(
            JSON.stringify({ error: "base64Data, mimeType, extractPrompt are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }
        const budget = typeof thinkingBudget === "number" ? thinkingBudget : 0
        const extracted = await callGeminiExtract(base64Data, mimeType, extractPrompt, apiKey, budget)
        result = { text: extracted }
        break
      }
      case "reading-extract": {
        /* Reading Tutor: 책 페이지 1장 → 원문 + 번역 + 학습 단어 (구조화 JSON).
           프론트엔드가 페이지별로 병렬 호출. 사용량 카운트는 별도 정책 필요시 프론트에서 처리.
           geScore: 사용자 GE 점수. null/미지정이면 study_items 빈 배열 반환. */
        if (!base64Data || !mimeType) {
          return new Response(
            JSON.stringify({ error: "base64Data and mimeType are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }
        const targetLang: string = typeof body.targetLang === "string" ? body.targetLang : "ko"
        const geScore: number | null = typeof body.geScore === "number" ? body.geScore : null
        /* meaningLang: 학습 단어 의미 표기 언어. 'en' 이면 영영 풀이, 그 외/미지정은 'native'(targetLang). */
        const meaningLang: string = (body.meaningLang === "en") ? "en" : "native"
        const parsed = await callGeminiReadingExtract(base64Data, mimeType, targetLang, geScore, meaningLang, apiKey)
        result = parsed
        break
      }
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Use: search, image, extract, reading-extract" }),
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
