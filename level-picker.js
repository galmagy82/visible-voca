/* level-picker.js
   공통 "내 영어 레벨" 컴포넌트 — vocabulary.html / reading.html 에서 재사용.
   - 로직(label/format/load/save)은 양쪽 페이지가 공유
   - UI(모달, 칩)는 reading.html 같이 슬라이더가 인라인이 아닌 페이지에서 사용
   - vocabulary.html 의 인라인 슬라이더는 그대로 두되, label 헬퍼만 호출 (회귀 리스크 최소화)
   필요 i18n 키: settingsLevelGroup, settingsGeHint, geLabelBeginner ~ geLabelAdvanced,
                photoGeSetBtn (칩의 미설정 CTA), setSaveBtn, setCancelBtn (모달 버튼) */
(function () {
  /* GE 점수 → 5단계 라벨 매핑. [a, b) 경계 (정확히 3.0 은 초중급, 5.0 은 중급, ...). */
  const BANDS = [
    { max: 3,        key: 'geLabelBeginner' },
    { max: 5,        key: 'geLabelElementary' },
    { max: 7,        key: 'geLabelIntermediate' },
    { max: 9,        key: 'geLabelUpperInt' },
    { max: Infinity, key: 'geLabelAdvanced' },
  ];

  /* i18n 의 t() 가 아직 로드되지 않은 환경(독립 호출)에서도 안전하게 동작 */
  function _t(k) {
    return (typeof t === 'function') ? t(k) : k;
  }

  /* 점수 → 레벨 라벨 (i18n 적용). */
  function label(val) {
    const band = BANDS.find(b => val < b.max);
    return _t(band.key);
  }

  /* 점수 표시 문자열 — 예) "6.5 (중급)" */
  function format(val) {
    return `${Number(val).toFixed(1)} (${label(val)})`;
  }

  /* user_profile.ge_score 조회 (미로그인은 null). */
  async function load(supabase, userId) {
    if (!supabase || !userId) return null;
    const { data, error } = await supabase
      .from('user_profile')
      .select('ge_score')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) { console.warn('[LevelPicker] load failed:', error); return null; }
    return data?.ge_score != null ? Number(data.ge_score) : null;
  }

  /* user_profile.ge_score 저장 (upsert). */
  async function save(supabase, userId, score) {
    if (!supabase || !userId) return false;
    const nowIso = new Date().toISOString();
    const row = {
      user_id: userId,
      ge_score: score,
      ge_updated_at: nowIso,
      updated_at: nowIso,
    };
    const { error } = await supabase
      .from('user_profile')
      .upsert(row, { onConflict: 'user_id' });
    if (error) { console.warn('[LevelPicker] save failed:', error); return false; }
    return true;
  }

  /* ========== 칩 렌더러 ==========
     - 설정됨: "내 영어 레벨: 6.5 (중급) ✏️" — 클릭 시 onClick
     - 미설정: "내 영어 레벨 설정하기" — 클릭 시 onClick (여기선 동일하게 모달 호출 의도) */
  function renderChip({ container, score, onClick }) {
    if (!container) return;
    /* 칩 자체에도 CSS 가 필요하므로 모달 열기 전 칩 렌더 시점에서 미리 주입 */
    ensureStyles();
    container.innerHTML = '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'level-chip' + (score == null ? ' unset' : '');
    if (score == null) {
      btn.textContent = _t('photoGeSetBtn');
    } else {
      /* "내 영어 레벨: 6.5 (중급) ✏️" */
      btn.innerHTML =
        `<span class="level-chip-label">${escapeHtml(_t('settingsLevelGroup'))}:</span>` +
        ` <span class="level-chip-value">${escapeHtml(format(score))}</span>` +
        ` <span class="level-chip-edit" aria-hidden="true">✏️</span>`;
    }
    btn.addEventListener('click', onClick);
    container.appendChild(btn);
  }

  /* HTML 인젝션 방지를 위한 간단한 이스케이프 */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  /* ========== 모달 ========== */
  let _styleInjected = false;

  /* 모달 스타일을 <head> 에 한 번만 주입 (reading.html 등에 별도 CSS 추가하지 않아도 되도록) */
  function ensureStyles() {
    if (_styleInjected) return;
    _styleInjected = true;
    const css = `
.level-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  font-size: 0.78rem;
  border: 1px solid #D5D2CC;
  border-radius: 999px;
  background: #FFFFFF;
  color: #4A4641;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;
}
.level-chip:hover { background: #EDECEA; border-color: #B0ACA6; }
.level-chip.unset { color: #6B6660; border-style: dashed; }
.level-chip-label { color: #8A8078; }
.level-chip-value { font-weight: 600; color: #2D2B28; }
.level-chip-edit { font-size: 0.75rem; opacity: 0.7; }

.lp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(45, 43, 40, 0.45);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}
.lp-overlay.show { display: flex; }
.lp-modal {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 24px 22px 20px;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0,0,0,0.18);
}
.lp-title { font-size: 1.05rem; font-weight: 600; color: #2D2B28; margin-bottom: 6px; }
.lp-hint { font-size: 0.78rem; color: #8A8078; line-height: 1.5; margin-bottom: 24px; }

/* 슬라이더 (vocabulary.html 의 .ge-* 와 동일 디자인) */
.lp-slider-wrap { position: relative; padding-top: 28px; }
.lp-bubble {
  position: absolute;
  top: 0;
  left: 0;
  transform: translateX(-50%);
  background: #A89A83;
  color: #FFFFFF;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 8px;
  white-space: nowrap;
  pointer-events: none;
  transition: left 0.05s linear;
}
.lp-bubble::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -4px;
  transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 4px solid #A89A83;
}
.lp-slider {
  -webkit-appearance: none; appearance: none;
  width: 100%; height: 6px;
  background: #E5E2DE; border-radius: 3px; outline: none; margin: 0;
}
.lp-slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 22px; height: 22px; border-radius: 50%;
  background: #A89A83; cursor: pointer;
  border: 2px solid #FFFFFF; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.lp-slider::-moz-range-thumb {
  width: 22px; height: 22px; border-radius: 50%;
  background: #A89A83; cursor: pointer;
  border: 2px solid #FFFFFF; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.lp-ticks {
  display: flex; justify-content: space-between;
  font-size: 0.7rem; color: #B0ACA6; margin-top: 6px;
}
.lp-actions {
  display: flex; justify-content: flex-end; gap: 8px;
  margin-top: 24px;
}
.lp-btn {
  padding: 8px 16px; border-radius: 10px; font-size: 0.9rem; cursor: pointer;
  border: 1px solid #D5D2CC; background: #FFFFFF; color: #6B6660;
}
.lp-btn:hover { background: #EDECEA; }
.lp-btn-primary {
  background: #5A8A42; color: #FFFFFF; border-color: #5A8A42;
}
.lp-btn-primary:hover { background: #4A7635; border-color: #4A7635; }
`;
    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  /* 슬라이더 핸들 위 말풍선 위치 갱신 (vocabulary.html 의 updateGeBubble 와 같은 계산) */
  function updateBubble(slider, bubble) {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const percent = (val - min) / (max - min);
    const thumbWidth = 22;
    const trackWidth = slider.offsetWidth;
    const left = percent * (trackWidth - thumbWidth) + thumbWidth / 2;
    bubble.style.left = left + 'px';
    bubble.textContent = format(val);
  }

  /* 모달 열기.
     params:
     - supabase: 페이지의 supabase client
     - userId: 현재 로그인 사용자 id
     - currentScore: 시작값 (null 이면 7.0 으로 시작)
     - onSave(score): 저장 성공 후 콜백 (선택)
     - onCancel(): 취소 콜백 (선택) */
  function openModal({ supabase, userId, currentScore, onSave, onCancel }) {
    ensureStyles();

    /* 기존 모달이 있으면 제거 (중복 방지) */
    const old = document.getElementById('lp-overlay');
    if (old) old.remove();

    const startVal = (currentScore != null) ? Number(currentScore) : 7.0;

    const overlay = document.createElement('div');
    overlay.id = 'lp-overlay';
    overlay.className = 'lp-overlay';
    overlay.innerHTML = `
      <div class="lp-modal" role="dialog" aria-modal="true">
        <div class="lp-title">${escapeHtml(_t('settingsLevelGroup'))}</div>
        <div class="lp-hint">${escapeHtml(_t('settingsGeHint'))}</div>
        <div class="lp-slider-wrap">
          <div class="lp-bubble" id="lp-bubble"></div>
          <input type="range" id="lp-slider" class="lp-slider"
                 min="1.0" max="13.0" step="0.1" value="${startVal}">
          <div class="lp-ticks"><span>1</span><span>13</span></div>
        </div>
        <div class="lp-actions">
          <button type="button" class="lp-btn" id="lp-cancel">${escapeHtml(_t('setCancelBtn'))}</button>
          <button type="button" class="lp-btn lp-btn-primary" id="lp-save">${escapeHtml(_t('setSaveBtn'))}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const slider = overlay.querySelector('#lp-slider');
    const bubble = overlay.querySelector('#lp-bubble');
    const btnSave = overlay.querySelector('#lp-save');
    const btnCancel = overlay.querySelector('#lp-cancel');

    /* 첫 노출 시 bubble 위치 계산 — 다음 frame 으로 미뤄야 trackWidth 가 측정됨 */
    overlay.classList.add('show');
    requestAnimationFrame(() => updateBubble(slider, bubble));

    slider.addEventListener('input', () => updateBubble(slider, bubble));

    /* 창 크기 변동 시 말풍선 재배치 (모바일 회전 등) */
    const onResize = () => updateBubble(slider, bubble);
    window.addEventListener('resize', onResize);

    function close() {
      window.removeEventListener('resize', onResize);
      overlay.remove();
    }

    btnCancel.addEventListener('click', () => {
      close();
      if (typeof onCancel === 'function') onCancel();
    });

    /* 오버레이 빈 영역 클릭 → 취소와 동일 처리 */
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        close();
        if (typeof onCancel === 'function') onCancel();
      }
    });

    btnSave.addEventListener('click', async () => {
      const v = parseFloat(slider.value);
      btnSave.disabled = true;
      const ok = await save(supabase, userId, v);
      btnSave.disabled = false;
      if (!ok) {
        /* 저장 실패 시 모달 유지하고 사용자가 다시 시도하도록 */
        return;
      }
      close();
      if (typeof onSave === 'function') onSave(v);
    });
  }

  /* 글로벌로 노출 */
  window.LevelPicker = {
    bands: BANDS,
    label,
    format,
    load,
    save,
    renderChip,
    openModal,
  };
})();
