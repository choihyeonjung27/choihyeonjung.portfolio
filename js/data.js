// =======================
// 설정
// =======================
const DATA_URL = "data/data.json";
let ALL_ITEMS = [];

// 모달 엘리먼트
const modal = document.getElementById("projectModal");
const mp4 = document.getElementById("mp4Player");
const mTitle = document.getElementById("mTitle");
const mDesc = document.getElementById("mDesc");
const mDate = document.getElementById("mDate");
const mType = document.getElementById("mType");

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
  yt.style.aspectRatio = "16 / 9"; // 레이아웃 고정
  yt.style.display = "none"; // 기본 숨김
  // mp4 바로 뒤에 붙여 같은 영역을 공유
  mp4.insertAdjacentElement("afterend", yt);
})();

// =======================
// 초기 로드
// =======================
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

// =======================
// 카드 렌더링
// =======================
function renderCards(items) {
  const grid = document.getElementById("projectGrid");

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
      <p>${item.title || ""}</p>
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

      // 링크 타입은 새창으로 이동
      if (action === "link" && card.dataset.href) {
        window.open(card.dataset.href, "_blank");
        return;
      }

      // 모달 오픈
      openModal(item);
    });
  });
}

// =======================
// 필터(상단 탭)
// =======================
function bindFilters() {
  const ul = document.getElementById("filters");
  ul.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    e.preventDefault();

    // on 표시 토글
    ul.querySelectorAll("li").forEach((li) => li.classList.remove("on"));
    a.parentElement.classList.add("on");

    const href = a.getAttribute("href"); // "*", ".poster", ".filming", ...
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

// =======================
// 모달
// =======================
function openModal(item) {
  mTitle.textContent = item.title || "";
  mDesc.textContent = item.desc || "";
  mDate.textContent = item.createdAt || "";
  mType.textContent = toKoreanType(item.type);

  // 플레이어 초기화
  try {
    mp4.pause();
  } catch {}
  mp4.removeAttribute("src");
  mp4.style.display = "none";
  yt.removeAttribute("src");
  yt.style.display = "none";

  // youtubeUrl 우선, 없으면 mp4로 폴백
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
    mp4.play().catch(() => {}); // 자동재생 실패는 무시
  }

  modal.classList.add("is-open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.classList.remove("is-open");
  document.body.style.overflow = "";
  try {
    mp4.pause();
  } catch {}
  mp4.removeAttribute("src");
  mp4.style.display = "none";
  yt.removeAttribute("src"); // src 제거로 재생 중지
  yt.style.display = "none";
}

function bindModalClose() {
  modal.addEventListener("click", (e) => {
    // X 버튼 또는 반투명 배경(data-close 달린 곳)을 누르면 닫기
    if (e.target.closest("[data-close]")) {
      closeModal();
    }
  });
}

// =======================
// 유틸
// =======================
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
    // https://www.youtube.com/shorts/VIDEOID 또는 /embed/VIDEOID
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
