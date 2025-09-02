/* =======================
   script.js (full)
   - 카드 렌더링
   - 필터
   - 모달(포스터=이미지 전용 / 그 외 YouTube>MP4>이미지)
   - 좌우 탐색(현재 필터 결과 기준)
   - 툴 표시
======================= */

// ----------------------- 설정 -----------------------
// 수정(버전 태그 하나 붙이기)
const APP_ASSET_VERSION = "2025-09-02-01"; // 임의의 값
const DATA_URL = `data/data.json?v=${APP_ASSET_VERSION}`;
let ALL_ITEMS = [];
let RENDERED_ITEMS = []; // 현재 그리드에 표시 중인 목록
let CURRENT_INDEX = -1; // 모달에서 열려있는 인덱스 (RENDERED_ITEMS 기준)

// 모달 엘리먼트
const modal = document.getElementById("projectModal");
const mp4 = document.getElementById("mp4Player");
const mImage = document.getElementById("mImage");
const mTitle = document.getElementById("mTitle");
const mDesc = document.getElementById("mDesc");
const mDate = document.getElementById("mDate");
const mType = document.getElementById("mType");
const mTools = document.getElementById("mTools");

// 네비 버튼(없어도 에러 안나게 안전 처리)
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

// YouTube iframe 1회 생성
let yt;
(function ensureYouTubeIframe() {
  yt = document.createElement("iframe");
  yt.id = "ytPlayer";
  yt.title = "YouTube video player";
  yt.setAttribute("frameborder", "0");
  yt.setAttribute(
    "allow",
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  );
  yt.setAttribute("allowfullscreen", "true");
  yt.style.width = "100%";
  yt.style.aspectRatio = "16 / 9";
  yt.style.display = "none";
  if (mp4) mp4.insertAdjacentElement("afterend", yt);
})();

// ----------------------- 초기 로드 -----------------------
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error("data.json 로드 실패");
    ALL_ITEMS = await res.json();

    renderCards(ALL_ITEMS); // 처음엔 전체 렌더
    bindFilters();
    bindModalClose();
    bindEscAndArrows();
    bindNavButtons();
  } catch (e) {
    console.error(e);
  }
});

// ----------------------- 카드 렌더링 -----------------------
function renderCards(items) {
  const grid = document.getElementById("projectGrid");
  if (!grid) return;

  RENDERED_ITEMS = items.slice(); // 현재 화면 목록 저장
  CURRENT_INDEX = -1;

  grid.innerHTML = items
    .map((item, idx) => {
      const classes = Array.isArray(item.type)
        ? item.type.join(" ")
        : item.type || "";
      return `
      <article 
        class="project-card ${classes}" 
        data-id="${item.id}"
        data-idx="${idx}"
        data-action="${(item.action || "").toLowerCase()}"
        data-href="${item.href || ""}"
      >
        <div class="thumb" style="background-image:url('${item.imgSrc}')"></div>
        <p>${escapeHTML(item.title || "")}</p>
      </article>
    `;
    })
    .join("");

  // 카드 클릭
  grid.querySelectorAll(".project-card").forEach((card) => {
    card.addEventListener("click", () => {
      const action = (card.dataset.action || "").toLowerCase();
      if (action === "link" && card.dataset.href) {
        window.open(card.dataset.href, "_blank");
        return;
      }
      const idx = +card.dataset.idx;
      openModalByIndex(idx); // 현재 렌더 목록 기준
    });
  });

  // 네비 버튼 활성/비활성 갱신
  updateNavDisabled();
}

// ----------------------- 필터(상단 탭) -----------------------
function bindFilters() {
  const ul = document.getElementById("filters");
  if (!ul) return;

  ul.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    e.preventDefault();

    ul.querySelectorAll("li").forEach((li) => li.classList.remove("on"));
    a.parentElement.classList.add("on");

    const href = a.getAttribute("href"); // "*", ".poster", ...
    if (href === "*" || href === "#*") {
      renderCards(ALL_ITEMS);
      return;
    }
    const type = href.replace(".", "").toLowerCase();

    const filtered = ALL_ITEMS.filter((i) => {
      const t = i.type;
      if (Array.isArray(t)) {
        return t.map((x) => String(x).toLowerCase()).includes(type);
      }
      return (t || "").toLowerCase() === type;
    });

    renderCards(filtered);
  });
}

// ----------------------- 모달 열기/닫기 -----------------------
function openModalByIndex(idx) {
  if (!modal) return;
  if (idx < 0 || idx >= RENDERED_ITEMS.length) return;

  CURRENT_INDEX = idx;
  const item = RENDERED_ITEMS[idx];

  // 메타
  mTitle && (mTitle.textContent = item.title || "");
  mDesc && (mDesc.textContent = item.tool || "");
  mDate && (mDate.textContent = item.createdAt || "");
  mType && (mType.textContent = toKoreanType(item.type));
  if (mTools) mTools.innerHTML = renderTools(item.tool);

  // 초기화 (모든 미디어 숨김)
  try {
    mp4 && mp4.pause();
  } catch {}
  if (mp4) {
    mp4.removeAttribute("src");
    mp4.style.display = "none";
  }
  if (yt) {
    yt.removeAttribute("src");
    yt.style.display = "none";
  }
  if (mImage) {
    mImage.removeAttribute("src");
    mImage.style.display = "none";
  }

  // 포스터면 이미지 전용, 그 외 YouTube>MP4>이미지
  if (hasType(item, "poster")) {
    const full = item.fullImg || item.imgSrc;
    if (full && mImage) {
      mImage.src = full;
      mImage.alt = item.title || "";
      mImage.style.display = "block"; // ← 반드시 block
    }
  } else {
    if (item.youtubeUrl) {
      const embed = toYouTubeEmbed(item.youtubeUrl, {
        autoplay: 1,
        mute: 1,
        playsinline: 1,
      });
      if (embed && yt) {
        yt.src = embed;
        yt.style.display = "";
      }
    } else if (item.videoUrl && mp4) {
      mp4.src = item.videoUrl;
      mp4.style.display = "";
      mp4.play?.().catch(() => {});
    } else if (mImage) {
      const full = item.fullImg || item.imgSrc;
      if (full) {
        mImage.src = full;
        mImage.alt = item.title || "";
        mImage.style.display = "";
      }
    }
  }

  modal.classList.add("is-open");
  document.body.style.overflow = "hidden";
  updateNavDisabled();
}

function closeModal() {
  if (!modal) return;

  modal.classList.remove("is-open");
  document.body.style.overflow = "";

  try {
    mp4 && mp4.pause();
  } catch {}
  if (mp4) {
    mp4.removeAttribute("src");
    mp4.style.display = "none";
  }
  if (yt) {
    yt.removeAttribute("src");
    yt.style.display = "none";
  }
  if (mImage) {
    mImage.removeAttribute("src");
    mImage.style.display = "none";
  }

  CURRENT_INDEX = -1;
}

// 닫기 트리거(배경/X)
function bindModalClose() {
  if (!modal) return;
  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
  });
}

// ESC / 방향키
function bindEscAndArrows() {
  document.addEventListener("keydown", (e) => {
    if (!modal || !modal.classList.contains("is-open")) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowLeft") showPrev();
    if (e.key === "ArrowRight") showNext();
  });
}

// 좌우 버튼 (있을 때만 연결)
function bindNavButtons() {
  if (prevBtn)
    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showPrev();
    });
  if (nextBtn)
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showNext();
    });
  const openOriginal = document.getElementById("openOriginal");
  if (openOriginal) {
    openOriginal.addEventListener("click", (e) => {
      e.stopPropagation();
      const item = RENDERED_ITEMS[CURRENT_INDEX];
      const full = item?.fullImg || item?.imgSrc;
      if (full) window.open(full, "_blank");
    });
  }

  if (mImage) {
    const openIfVisible = (e) => {
      if (getComputedStyle(mImage).display === "none") return;
      e.stopPropagation();
      const item = RENDERED_ITEMS[CURRENT_INDEX];
      const full = item?.fullImg || item?.imgSrc;
      if (full) window.open(full, "_blank");
    };
    mImage.addEventListener("click", openIfVisible);
    mImage.addEventListener("dblclick", openIfVisible); // 원하면 유지
  }
}

function showPrev() {
  if (CURRENT_INDEX <= 0) return;
  openModalByIndex(CURRENT_INDEX - 1);
}
function showNext() {
  if (CURRENT_INDEX >= RENDERED_ITEMS.length - 1) return;
  openModalByIndex(CURRENT_INDEX + 1);
}

function updateNavDisabled() {
  // 버튼이 있다면 양끝에서 비활성화 스타일을 주고 싶을 때 사용
  if (!prevBtn || !nextBtn) return;
  prevBtn.disabled = CURRENT_INDEX <= 0;
  nextBtn.disabled =
    CURRENT_INDEX < 0 || CURRENT_INDEX >= RENDERED_ITEMS.length - 1;
}

// ----------------------- 유틸 -----------------------
function hasType(item, key) {
  const t = item.type;
  if (Array.isArray(t))
    return t.map((x) => String(x).toLowerCase()).includes(key);
  return String(t || "").toLowerCase() === key;
}

function toKoreanType(t) {
  const map = {
    poster: "포스터",
    filming: "촬영물",
    "motion-graphic": "모션그래픽",
    detail: "상세페이지",
    interview: "인터뷰",
    ad: "광고영상",
  };
  if (Array.isArray(t))
    return t.map((x) => map[String(x).toLowerCase()] || x).join(", ");
  return map[(t || "").toLowerCase()] || t || "";
}

function toYouTubeEmbed(url, params = {}) {
  const id = extractYouTubeId(url);
  if (!id) return "";
  const sp = new URLSearchParams({ rel: "0", modestbranding: "1", ...params });
  return `https://www.youtube.com/embed/${id}?${sp.toString()}`;
}

function extractYouTubeId(url) {
  try {
    const u = new URL(url);
    if (
      (u.hostname.includes("youtube.com") ||
        u.hostname.includes("youtube-nocookie.com")) &&
      u.pathname === "/watch"
    ) {
      const v = u.searchParams.get("v");
      if (v) return v;
    }
    if (u.hostname === "youtu.be") {
      const seg = u.pathname.split("/").filter(Boolean)[0];
      if (seg) return seg;
    }
    if (u.pathname.startsWith("/shorts/") || u.pathname.startsWith("/embed/")) {
      const seg = u.pathname.split("/").filter(Boolean)[1];
      if (seg) return seg;
    }
  } catch {
    const maybeId = String(url).trim();
    if (/^[\w-]{11}$/.test(maybeId)) return maybeId;
  }
  return "";
}

function renderTools(tool) {
  if (!tool || (Array.isArray(tool) && tool.length === 0)) return "";
  const list = Array.isArray(tool)
    ? tool
    : String(tool)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  if (list.length === 0) return "";
  return (
    `<ul class="tool-chips">` +
    list.map((t) => `<li>${escapeHTML(t)}</li>`).join("") +
    `</ul>`
  );
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
  });
}
