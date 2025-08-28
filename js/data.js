/* =======================
   script.js (full)
   - 카드 렌더링
   - 필터
   - 모달(YouTube/MP4)
   - 툴 표시(tool chips)
======================= */

// -----------------------
// 설정
// -----------------------
const DATA_URL = "data/data.json";
let ALL_ITEMS = [];

// 모달 엘리먼트
const modal = document.getElementById("projectModal");
const mp4 = document.getElementById("mp4Player");
const mTitle = document.getElementById("mTitle");
const mDesc = document.getElementById("mDesc");
const mDate = document.getElementById("mDate");
const mType = document.getElementById("mType");
// 툴 표시 영역(모달에 <ul id="mTools"> 추가해둔 경우)
const mTools = document.getElementById("mTools");

// YouTube iframe을 한 번만 만들어 재사용
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
  // mp4 바로 뒤에 붙여 같은 공간 재사용
  mp4.insertAdjacentElement("afterend", yt);
})();

// -----------------------
// 초기 로드
// -----------------------
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error("data.json 로드 실패");
    ALL_ITEMS = await res.json();

    renderCards(ALL_ITEMS);
    bindFilters();
    bindModalClose();
  } catch (e) {
    console.error(e);
  }
});

// -----------------------
// 카드 렌더링
// -----------------------
function renderCards(items) {
  const grid = document.getElementById("projectGrid");
  if (!grid) return;

  grid.innerHTML = items
    .map(
      (item) => `
    <article 
      class="project-card ${item.type || ""}" 
      data-id="${item.id}"
      data-action="${(item.action || "").toLowerCase()}"
      data-href="${item.href || ""}"
    >
      <div class="thumb" style="background-image:url('${item.imgSrc}')"></div>
      <p>${escapeHTML(item.title || "")}</p>

    </article>
  `
    )
    .join("");

  // 카드 클릭
  grid.querySelectorAll(".project-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = +card.dataset.id;
      const item = ALL_ITEMS.find((i) => i.id === id);
      if (!item) return;

      const action = (card.dataset.action || "").toLowerCase();

      // 링크 타입은 새창 이동
      if (action === "link" && card.dataset.href) {
        window.open(card.dataset.href, "_blank");
        return;
      }

      // 모달 오픈
      openModal(item);
    });
  });
}

// -----------------------
// 필터(상단 탭)
// -----------------------
function bindFilters() {
  const ul = document.getElementById("filters");
  if (!ul) return;

  ul.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    e.preventDefault();

    // on 토글
    ul.querySelectorAll("li").forEach((li) => li.classList.remove("on"));
    a.parentElement.classList.add("on");

    const href = a.getAttribute("href"); // "*", ".poster", ...
    if (href === "*" || href === "#*") {
      renderCards(ALL_ITEMS);
      return;
    }
    const type = href.replace(".", "").toLowerCase();
    const filtered = ALL_ITEMS.filter(
      (i) => (i.type || "").toLowerCase() === type
    );
    renderCards(filtered);
  });
}

// -----------------------
// 모달
// -----------------------
function openModal(item) {
  if (!modal) return;

  mTitle && (mTitle.textContent = item.title || "");
  mDesc && (mDesc.textContent = item.tool || "");
  mDate && (mDate.textContent = item.createdAt || "");
  mType && (mType.textContent = toKoreanType(item.type));

  // 툴 표시 (모달에 영역이 있을 때만)
  if (mTools) mTools.innerHTML = renderTools(item.tool);

  // 플레이어 초기화
  try {
    mp4.pause();
  } catch {}
  mp4.removeAttribute("src");
  mp4.style.display = "none";
  yt.removeAttribute("src");
  yt.style.display = "none";

  // youtubeUrl 우선, 없으면 mp4 폴백
  if (item.youtubeUrl) {
    const embed = toYouTubeEmbed(item.youtubeUrl, {
      autoplay: 1,
      mute: 1,
      playsinline: 1,
    });
    if (embed) {
      yt.src = embed;
      yt.style.display = "";
    }
  } else if (item.videoUrl) {
    mp4.src = item.videoUrl;
    mp4.style.display = "";
    mp4.play().catch(() => {}); // 자동재생 실패 무시
  }

  modal.classList.add("is-open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  if (!modal) return;

  modal.classList.remove("is-open");
  document.body.style.overflow = "";

  try {
    mp4.pause();
  } catch {}
  mp4.removeAttribute("src");
  mp4.style.display = "none";

  yt.removeAttribute("src");
  yt.style.display = "none";
}

function bindModalClose() {
  if (!modal) return;

  modal.addEventListener("click", (e) => {
    // X 버튼 또는 반투명 배경(data-close) 클릭 시 닫기
    if (e.target.closest("[data-close]")) {
      closeModal();
    }
  });
}

// -----------------------
// 유틸
// -----------------------
function toKoreanType(t) {
  const map = {
    poster: "포스터",
    filming: "촬영물",
    "motion-graphic": "모션그래픽",
    detail: "상세페이지",
    interview: "인터뷰",
    ad: "광고영상",
  };
  return map[(t || "").toLowerCase()] || t || "";
}

// YouTube URL -> embed URL
function toYouTubeEmbed(url, params = {}) {
  const id = extractYouTubeId(url);
  if (!id) return "";
  const sp = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    ...params,
  });
  return `https://www.youtube.com/embed/${id}?${sp.toString()}`;
}

// 다양한 유튜브 링크 형태에서 ID 추출
function extractYouTubeId(url) {
  try {
    const u = new URL(url);

    // https://www.youtube.com/watch?v=VIDEOID
    if (
      (u.hostname.includes("youtube.com") ||
        u.hostname.includes("youtube-nocookie.com")) &&
      u.pathname === "/watch"
    ) {
      const v = u.searchParams.get("v");
      if (v) return v;
    }
    // https://youtu.be/VIDEOID
    if (u.hostname === "youtu.be") {
      const seg = u.pathname.split("/").filter(Boolean)[0];
      if (seg) return seg;
    }
    // /shorts/VIDEOID or /embed/VIDEOID
    if (u.pathname.startsWith("/shorts/") || u.pathname.startsWith("/embed/")) {
      const seg = u.pathname.split("/").filter(Boolean)[1];
      if (seg) return seg;
    }
  } catch {
    // url 파싱 실패 시 11자 ID인지 검사
    const maybeId = String(url).trim();
    if (/^[\w-]{11}$/.test(maybeId)) return maybeId;
  }
  return "";
}

// 툴 값을 chips HTML로 변환 (배열/콤마 문자열 모두 지원)
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

// XSS 방지용 간단 escape
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
