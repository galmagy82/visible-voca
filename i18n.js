/* ===== 다국어 지원 (i18n) ===== */

/* 번역 사전: 한국어(ko), 영어(en) */
const I18N = {
  ko: {
    /* 공통 */
    home: '홈',
    settings: '설정',
    save: '저장',
    cancel: '취소',
    logout: '로그아웃',
    confirm: '확인',
    delete: '삭제',
    close: '닫기',
    search: '검색',

    /* 탭 */
    tabSearch: '일반검색',
    tabPhoto: '사진에서 검색',
    tabWordbook: '단어장',
    tabQuiz: '퀴즈',

    /* 일반검색 */
    searchPlaceholder: '단어, 숙어, 문장을 입력하세요',
    searchGuideTitle: '나의 검색이 모두의 사전이 됩니다.',
    searchGuideBody: '혼자 외우는 단어장은 이제 그만!<br>내가 찾은 단어가 실시간으로 공유되어, 모두가 함께 완성해가는<br>커다란 단어 지도를 만들어갑니다.',
    searching: '느낌을 찾는 중...',
    imageLoading: '이미지 생성 중...',
    discoveryTitle: '✦ 새로운 단어를 발견했어요!',
    discoverySub: '님이 이 단어의 첫번째 탐험가에요 ✦',
    addToWordbook: '+ 단어장에 추가',
    addedToWordbook: '단어장에 추가됨',
    listenPronunciation: '발음 듣기',
    imageAlt: '의 느낌을 표현한 이미지',

    /* 사진에서 검색 */
    uploadPhoto: '📂 사진 올리기',
    photoGuideTitle: '사진에서 검색',
    photoGuideBody: '책을 읽다가 모르는 단어나 표현에 동그라미(○), 밑줄(_), 또는 #표시를 해두세요.<br>표시한 페이지의 사진을 찍어 📂 버튼을 눌러서 올리세요.<br>표시된 단어를 자동으로 찾아서 검색합니다.<br><br>사진은 여러 장을 한꺼번에 올릴 수 있어요.',
    photoGuideCircle: '동그라미',
    photoGuideUnderline: '밑줄',
    photoGuideHash: '#표시',
    extractingWords: '장에서 단어를 추출하는 중...',
    noWordsFound: '#표시된 단어를 찾지 못했습니다.',
    photoAnalysisFailed: '사진 분석에 실패했습니다. 다시 시도해주세요.',

    /* 단어장 */
    wordbookFilterPlaceholder: '단어 검색...',
    sortRecent: '최근 추가순',
    sortAlpha: '알파벳순',
    selectDelete: '선택 삭제',
    selectedCount: '개 선택',
    wordbookEmpty: '저장된 단어가 없습니다.',
    pronunciation: '발음',
    confirmDeleteWords: '개의 단어를 삭제하시겠습니까?',
    loadingResult: '의 결과를 불러오는 중...',
    loadFailed: '결과를 불러올 수 없습니다.',

    /* 퀴즈 */
    quizSetup: '퀴즈 설정',
    quizType: '유형',
    quizTypeFeel: '느낌 맞추기',
    quizTypeImage: '이미지 보고 맞추기',
    quizCount: '문제 수',
    quizCountUnit: '문제',
    quizRange: '출제 범위',
    quizRangeAll: '전체',
    quizRangeRecent: '최근 추가',
    quizRangeDate: '기준 날짜',
    quizStart: '퀴즈 시작',
    quizNext: '다음',
    quizResult: '퀴즈 결과',
    quizRetry: '다시 하기',

    /* 에러 메시지 */
    errorNoApiKey: '홈에서 설정 버튼을 눌러 API 키를 먼저 입력해주세요.',
    errorRateLimit: '하루 무료 요청 한도를 초과했습니다. 내일 다시 시도해주세요.',
    errorGeneral: '일시적인 오류가 발생했습니다. 다시 시도해주세요.',
    errorNoResponse: '응답을 받지 못했습니다.',

    /* 설정 모달 */
    apiSettings: 'API 설정',
    cacheManagement: '캐시 관리',
    aiService: 'AI 서비스',
    apiKey: 'API 키',
    apiKeyPlaceholder: 'API 키를 입력하세요',
    imageToggle: '이미지 생성 사용',
    imageToggleHint: 'API 결제 설정을 하지 않은 경우 체크를 해제해 주세요.',
    apiGuideToggle: 'API 키 발급 가이드',
    safetyGuideToggle: 'API 키 안전 안내',
    geminiGuideTitle: 'Gemini API 키 발급 방법',
    geminiGuideStep1: 'Google AI Studio에 접속합니다.',
    geminiGuideStep2: 'Google 계정으로 로그인합니다.',
    geminiGuideStep3: '"API 키 만들기" 버튼을 클릭합니다.',
    geminiGuideStep4: '생성된 키를 복사하여 위에 붙여넣습니다.',
    geminiNoBilling: 'Gemini API 키 결제 미설정 시',
    geminiNoBillingSearch: '· 단어 검색: 하루 무료 제공량 안에서 사용 가능',
    geminiNoBillingImage: '· 이미지 생성: 사용 불가',
    geminiBilling: 'Gemini API 키 결제 설정 시 (사용량에 따라 과금)',
    geminiBillingSearch: '· 단어 검색: 제한 없음',
    geminiBillingImage: '· 이미지 생성: 사용 가능',
    safetyGuideBody: '입력하신 API 키는 이 기기의 브라우저(localStorage)에만 저장되며, 개발자의 서버로 전송되지 않습니다.<br>Google/OpenAI API 호출 시에만 해당 서비스로 직접 전송됩니다.<br>공용 PC에서는 사용 후 설정에서 키를 삭제해 주세요.',
    deleteKey: '키 삭제',
    enterApiKey: 'API 키를 입력해주세요.',
    saved: '저장되었습니다.',
    cacheDesc: '이전에 검색한 단어는 캐시에 저장되어 다시 검색해도 비용이 발생하지 않습니다.<br>캐시를 초기화하면 같은 단어를 다시 검색할 때 새로운 이미지가 생성되며 비용이 발생합니다.',
    resetCache: '캐시 초기화',
    confirmResetCache: '캐시를 초기화하시겠습니까?\n같은 단어를 다시 검색하면 비용이 발생합니다.',
    cacheResetDone: '캐시가 초기화되었습니다.',
    confirmDeleteKey: 'API 키를 삭제하시겠습니까?\n삭제 후 웰컴 화면으로 이동합니다.',

    /* 데이터 수집 동의 배너 */
    consentMsg: '검색된 단어와 AI 생성 결과(텍스트, 이미지)는 서비스 품질 개선을 위해 서버에 저장됩니다. 개인을 식별할 수 있는 정보는 수집하지 않습니다.',
    consentAgree: '동의합니다',
    consentDecline: '거부',

    /* 퀴즈 메시지 */
    quizNoDate: '기준 날짜를 선택해주세요.',
    quizNoWords: '단어장에 단어가 없습니다. 단어를 먼저 추가해주세요.',
    quizNoImages: '이미지가 있는 단어가 없습니다. 느낌 맞추기를 이용해주세요.',
    noDescription: '(설명 없음)',
    quizCorrectFeedback: '정답!',
    quizWrongFeedbackText: '오답! 정답은 "{word}" 입니다.',
    quizScoreText: '{total}문제 중 {correct}개 정답',
    quizWrongLabel: '틀린 단어:',
    quizAllCorrect: '모두 맞았습니다!',

    /* 언어 설정 */
    language: '언어',
    langKo: '한국어',
    langEn: 'English',

    /* 사진 분석 프롬프트 */
    extractPrompt: `이 사진은 영어 소설(Novel)의 페이지를 찍은 것입니다.
사진에서 #표시, #표시와 동그라미, 또는 #표시와 밑줄로 표시된 영어 단어, 숙어, 또는 문장을 모두 찾아주세요.
결과는 쉼표로 구분하여 한 줄로 출력해주세요. 다른 설명 없이 추출된 단어/표현만 출력하세요.
예시: split, break down, take off`,

    /* 플레이스홀더 */
    geminiKeyPlaceholder: 'AIza... 형태의 Gemini API 키',
    openaiKeyPlaceholder: 'sk-... 형태의 OpenAI API 키',

    /* Welcome 페이지 */
    quickStart: '바로 시작하기 →',
    heroTagline: '단어의 느낌을 그림으로 만나다',
    heroQuestion: '단어를 외워도<br><span class="em">금방 까먹는 이유,</span><br>알고 계신가요?',
    startBtn: '시작하기',
    feedback: '의견 보내기',
    apiModalTitle: 'API 키 등록',
    saveAndStart: '저장 후 시작',

    /* Welcome 스토리 섹션 */
    s1Speech: '"엄마, <strong>hightail</strong>이 뭐야?"',
    s2DictLabel: '사전적 의미',
    s2DictMeaning: '급히 달아나다',
    s2Speech: '"급히 도망친다는 뜻이야."',
    s3MindLabel: '🧒 아이 머릿속',
    s3FadeWord: 'hightail = 급히 달아나다',
    s3Speech: '"뜻은 알겠는데... 느낌이 안 와..."',
    s3Copy1: '뜻으로 외운 단어는',
    s3Copy2: '오래 남지 않습니다',
    s4Label: 'Geminary✦ 방식',
    s4Desc: '👉 동물이 위험을 느끼고<br><span class="point">꼬리를 들고</span><br>빠르게 도망가는 느낌',
    s5ImgAlt: 'hightail – 달아나는 여우',
    s5Caption: '동물이 위험을 느끼고 꼬리를 들고 빠르게 도망가는 느낌',
    s5Speech: '"아! 이렇게 후다닥 도망가는 거구나!"',
    s6Speech: '"아… 방에서 <strong>확 도망간 거</strong>구나!"',
    s7Copy1: '단어는',
    s7Copy2: '뜻이 아니라',
    s7Copy3: '느낌과 장면으로',
    s7Copy4: '기억됩니다',
    s8Title: '이렇게 배워요',
    s8SneakDesc: '고양이처럼 살금살금, 발소리 없이 움직이는 느낌',
    s8DashDesc: '짧은 거리를 탁! 하고 빠르게 이동하는 느낌',
    s8PeekDesc: '문틈 사이로 몰래 살짝 들여다보는 느낌',

    /* 메인 메뉴 */
    menuVocaTitle: 'Visual Voca',
    menuVocaDesc: '단어의 느낌과 뉘앙스를 이미지와 함께 알아보세요',
    menuWritingTitle: 'Writing Coach',
    menuWritingDesc: '에세이를 코칭받고, 나만의 그림책으로 만들어보세요'
  },

  en: {
    /* 공통 */
    home: 'Home',
    settings: 'Settings',
    save: 'Save',
    cancel: 'Cancel',
    logout: 'Logout',
    confirm: 'OK',
    delete: 'Delete',
    close: 'Close',
    search: 'Search',

    /* 탭 */
    tabSearch: 'Search',
    tabPhoto: 'Photo Search',
    tabWordbook: 'Wordbook',
    tabQuiz: 'Quiz',

    /* 일반검색 */
    searchPlaceholder: 'Enter a word, phrase, or sentence',
    searchGuideTitle: 'Your search becomes everyone\'s dictionary.',
    searchGuideBody: 'No more memorizing alone! Every word you look up is shared in real time, building a vast word map that we all create together.',
    searching: 'Finding the feel...',
    imageLoading: 'Generating image...',
    discoveryTitle: '✦ New Word Discovered!',
    discoverySub: ' is the first explorer of this word ✦',
    addToWordbook: '+ Add to Wordbook',
    addedToWordbook: 'Added to Wordbook',
    listenPronunciation: 'Listen',
    imageAlt: ' - image expressing the feel',

    /* 사진에서 검색 */
    uploadPhoto: '📂 Upload Photo',
    photoGuideTitle: 'Photo Search',
    photoGuideBody: 'While reading, mark unknown words with circles (○), underlines (_), or # marks.<br>Take a photo of the page and tap 📂 to upload.<br>Marked words will be found and searched automatically.<br><br>You can upload multiple photos at once.',
    photoGuideCircle: 'Circle',
    photoGuideUnderline: 'Underline',
    photoGuideHash: '# Mark',
    extractingWords: ' photo(s) - extracting words...',
    noWordsFound: 'No marked words found.',
    photoAnalysisFailed: 'Photo analysis failed. Please try again.',

    /* 단어장 */
    wordbookFilterPlaceholder: 'Search words...',
    sortRecent: 'Recently added',
    sortAlpha: 'Alphabetical',
    selectDelete: 'Select & Delete',
    selectedCount: ' selected',
    wordbookEmpty: 'No saved words.',
    pronunciation: 'Pronounce',
    confirmDeleteWords: ' word(s). Delete?',
    loadingResult: ' - loading result...',
    loadFailed: 'Failed to load result.',

    /* 퀴즈 */
    quizSetup: 'Quiz Setup',
    quizType: 'Type',
    quizTypeFeel: 'Match the feel',
    quizTypeImage: 'Match the image',
    quizCount: 'Questions',
    quizCountUnit: ' questions',
    quizRange: 'Range',
    quizRangeAll: 'All',
    quizRangeRecent: 'Recently added',
    quizRangeDate: 'Since date',
    quizStart: 'Start Quiz',
    quizNext: 'Next',
    quizResult: 'Quiz Result',
    quizRetry: 'Try Again',

    /* 에러 메시지 */
    errorNoApiKey: 'Please enter your API key in Settings first.',
    errorRateLimit: 'Daily free quota exceeded. Please try again tomorrow.',
    errorGeneral: 'A temporary error occurred. Please try again.',
    errorNoResponse: 'No response received.',

    /* 설정 모달 */
    apiSettings: 'API Settings',
    cacheManagement: 'Cache',
    aiService: 'AI Service',
    apiKey: 'API Key',
    apiKeyPlaceholder: 'Enter your API key',
    imageToggle: 'Enable image generation',
    imageToggleHint: 'Uncheck if you have not set up API billing.',
    apiGuideToggle: 'API Key Guide',
    safetyGuideToggle: 'API Key Safety',
    geminiGuideTitle: 'How to get a Gemini API key',
    geminiGuideStep1: 'Go to Google AI Studio.',
    geminiGuideStep2: 'Sign in with your Google account.',
    geminiGuideStep3: 'Click "Create API key".',
    geminiGuideStep4: 'Copy the key and paste it above.',
    geminiNoBilling: 'Without billing setup',
    geminiNoBillingSearch: '· Word search: Available within daily free quota',
    geminiNoBillingImage: '· Image generation: Not available',
    geminiBilling: 'With billing setup (pay per use)',
    geminiBillingSearch: '· Word search: Unlimited',
    geminiBillingImage: '· Image generation: Available',
    safetyGuideBody: 'Your API key is stored only in this device\'s browser (localStorage) and is never sent to our server.<br>It is sent directly to Google/OpenAI only when making API calls.<br>Please delete your key after using a shared computer.',
    deleteKey: 'Delete Key',
    enterApiKey: 'Please enter your API key.',
    saved: 'Saved.',
    cacheDesc: 'Previously searched words are cached so re-searching them costs nothing.<br>Resetting the cache means new images will be generated (and charged) when you search the same word again.',
    resetCache: 'Reset Cache',
    confirmResetCache: 'Reset cache?\nRe-searching the same word will incur costs.',
    cacheResetDone: 'Cache has been reset.',
    confirmDeleteKey: 'Delete your API key?\nYou will be redirected to the welcome page.',

    /* 데이터 수집 동의 배너 */
    consentMsg: 'Search results (text and images) are stored on our server to improve service quality. No personally identifiable information is collected.',
    consentAgree: 'I agree',
    consentDecline: 'Decline',

    /* 퀴즈 메시지 */
    quizNoDate: 'Please select a date.',
    quizNoWords: 'No words in wordbook. Please add words first.',
    quizNoImages: 'No words with images. Use "Match the feel" instead.',
    noDescription: '(No description)',
    quizCorrectFeedback: 'Correct!',
    quizWrongFeedbackText: 'Wrong! The answer is "{word}".',
    quizScoreText: '{correct} out of {total} correct',
    quizWrongLabel: 'Incorrect words:',
    quizAllCorrect: 'All correct!',

    /* 언어 설정 */
    language: 'Language',
    langKo: '한국어',
    langEn: 'English',

    /* 사진 분석 프롬프트 */
    extractPrompt: `This is a photo of a page from an English novel.
Find all English words, phrases, or sentences marked with #, # with circles, or # with underlines.
Output them separated by commas in a single line. Only output the extracted words/expressions, nothing else.
Example: split, break down, take off`,

    /* 플레이스홀더 */
    geminiKeyPlaceholder: 'Gemini API key (AIza...)',
    openaiKeyPlaceholder: 'OpenAI API key (sk-...)',

    /* Welcome 페이지 */
    quickStart: 'Quick Start →',
    heroTagline: 'Meet the feel of words through illustrations',
    heroQuestion: 'Ever wonder why<br><span class="em">you keep forgetting words</span><br>you just learned?',
    startBtn: 'Get Started',
    feedback: 'Feedback',
    apiModalTitle: 'Register API Key',
    saveAndStart: 'Save & Start',

    /* Welcome 스토리 섹션 */
    s1Speech: '"Mom, what does <strong>hightail</strong> mean?"',
    s2DictLabel: 'Dictionary meaning',
    s2DictMeaning: 'to run away quickly',
    s2Speech: '"It means to run away quickly."',
    s3MindLabel: '🧒 In the child\'s mind',
    s3FadeWord: 'hightail = to run away quickly',
    s3Speech: '"I get the meaning... but I can\'t feel it..."',
    s3Copy1: 'Words memorized by definition',
    s3Copy2: 'don\'t stick around',
    s4Label: 'the Geminary✦ way',
    s4Desc: '👉 An animal senses danger,<br><span class="point">raises its tail</span><br>and runs away fast',
    s5ImgAlt: 'hightail – a fox running away',
    s5Caption: 'An animal senses danger, raises its tail and runs away fast',
    s5Speech: '"Oh! So it\'s like dashing away just like that!"',
    s6Speech: '"Ah… he <strong>bolted right out</strong> of his room!"',
    s7Copy1: 'Words are remembered',
    s7Copy2: 'not by definitions,',
    s7Copy3: 'but by feelings',
    s7Copy4: 'and scenes',
    s8Title: 'Learn like this',
    s8SneakDesc: 'Moving quietly like a cat, without making a sound',
    s8DashDesc: 'A quick burst of speed over a short distance',
    s8PeekDesc: 'Taking a sneaky glance through a gap',

    /* 메인 메뉴 */
    menuVocaTitle: 'Visual Voca',
    menuVocaDesc: 'Explore the feel and nuance of words with images',
    menuWritingTitle: 'Writing Coach',
    menuWritingDesc: 'Get essay coaching and create your own picture book'
  }
};

/* 단어 검색 프롬프트 — 언어별 */
const PROMPT_TEMPLATES = {
  ko: `너는 한국어로만 대답하는 영어 단어 느낌 사전이야. 절대 영어로 사고하거나 영어 문장을 먼저 만들지 마. 처음부터 끝까지 한국어로 사고하고 한국어로 작성해.

"{{WORD}}"

위 영어 단어(또는 문장/표현)의 핵심 느낌을 설명해줘.

형식:
만약 입력에 문법 오류나 오타가 있다면, 첫 줄에 [CORRECTED: 올바른 표현] 형식으로 교정된 문장을 적어줘. 오류가 없으면 이 줄은 생략.
입력이 단어나 숙어인 경우, [POS: 품사(뜻)] 형식으로 품사와 핵심 뜻을 함께 적어줘. 품사는 영어 약어로 적을 것. 여러 품사가 가능하면 쉼표로 구분. 예) [POS: noun(신뢰), verb(신뢰하다)]. 입력이 문장이면 이 줄은 생략.
입력이 단어나 숙어인 경우, [IPA: /발음기호/] 형식으로 IPA 발음기호를 적어줘. 입력이 문장이면 이 줄은 생략.
입력이 단어나 숙어인 경우, [CEFR: A1~C2] 형식으로 CEFR 난이도를 적어줘. 입력이 문장이면 이 줄은 생략.
1줄: 핵심 느낌을 큰따옴표로 감싸서 한 문장 요약. 예) "하나였던 것이 딱 갈라지는" 이미지예요.
2줄: 그 느낌을 바로 이해할 수 있는 비유나 장면 딱 1문장만. 반드시 2줄(핵심 1문장 + 부연 1문장) 이내로 끝낼 것. 절대 3줄 이상 쓰지 말 것.
---
3줄 이후: 품사가 2개 이상이면 [noun], [verb] 처럼 품사 소제목을 달고 그 아래에 예시를 적을 것. 품사가 1개면 소제목 없이 바로 예시를 적을 것.
각 품사별로 예시 1~2개. 영어 예문 한 줄, 바로 다음 줄에 한국어 해석 한 줄. 절대 "영어:", "한국어:" 같은 라벨을 붙이지 마. 라벨 없이 문장만 적을 것. 예문과 예문 사이에는 빈 줄 하나를 넣어서 구분할 것.

규칙:
- 반드시 한국어로만 설명할 것 ([CORRECTED: ...], [POS: ...] 안의 영어만 예외)
- 번역투 금지. 자연스러운 한국어 구어체로 작성
- 짧고 간결하게
- 마크다운 서식 쓰지 말 것
- 느낌 설명과 예시 사이에 반드시 --- 구분선을 넣을 것`,

  en: `You are an English word feel dictionary. Explain the core feeling and nuance of words in a vivid, memorable way.

"{{WORD}}"

Explain the core feel of this English word (or phrase/sentence).

Format:
If there is a grammar error or typo, write [CORRECTED: corrected expression] on the first line. Skip this line if there is no error.
If the input is a word or idiom, write [POS: part_of_speech(meaning)] with core meaning per POS. Separate multiple POS with commas. e.g. [POS: noun(trust), verb(to trust)]. Skip this line for sentences.
If the input is a word or idiom, write [IPA: /pronunciation/] with IPA notation. Skip this line for sentences.
If the input is a word or idiom, write [CEFR: A1~C2] for the CEFR difficulty level. Skip this line for sentences.
Line 1: One-sentence summary of the core feeling in double quotes. e.g. "The feeling of something splitting apart cleanly."
Line 2: A vivid analogy or scene in exactly 1 sentence. Keep it to 2 lines total (1 core + 1 analogy). Never exceed 3 lines.
---
Line 3+: If the word has 2+ parts of speech, group examples under subheadings like [noun], [verb]. If only 1 POS, skip the subheading.
1~2 examples per POS. Write the English sentence on one line and the meaning/context on the next line. Separate examples with a blank line.

Rules:
- Write in clear, natural English
- Keep it short and concise
- No markdown formatting
- Always put a --- separator between the feel description and examples`
};

/* 현재 언어 가져오기 */
function getLang() {
  const settings = localStorage.getItem('visibleVoca_settings');
  if (settings) {
    const parsed = JSON.parse(settings);
    if (parsed.lang) return parsed.lang;
  }
  return 'ko';
}

/* 현재 언어 저장하기 */
function setLang(lang) {
  const settings = localStorage.getItem('visibleVoca_settings');
  const parsed = settings ? JSON.parse(settings) : {};
  parsed.lang = lang;
  localStorage.setItem('visibleVoca_settings', JSON.stringify(parsed));
}

/* 번역 키로 텍스트 가져오기 */
function t(key) {
  const lang = getLang();
  return I18N[lang]?.[key] || I18N['ko']?.[key] || key;
}

/* 현재 언어에 맞는 프롬프트 가져오기 */
function getPromptTemplate() {
  return PROMPT_TEMPLATES[getLang()] || PROMPT_TEMPLATES['ko'];
}

/* data-i18n 속성이 있는 모든 요소에 번역 적용 */
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = val;
    } else if (el.tagName === 'OPTION') {
      el.textContent = val;
    } else {
      el.innerHTML = val;
    }
  });
  /* title 속성 번역 */
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.getAttribute('data-i18n-title'));
  });
  /* alt 속성 번역 */
  document.querySelectorAll('[data-i18n-alt]').forEach(el => {
    el.alt = t(el.getAttribute('data-i18n-alt'));
  });
}
