function placeGifs() {
  document.querySelectorAll(".panel--has-gif").forEach((panel) => {
    const base = panel.querySelector(".panel__base");
    const gif = panel.querySelector(".panel__gif");
    if (!base || !gif) return;

    // 원본 PNG 크기가 준비될 때까지 대기
    const apply = () => {
      const natW = base.naturalWidth;
      if (!natW) return; // 아직 로드 안됨 → 다음 기회
      const dispW = base.clientWidth;
      const scale = dispW / natW; // 표시배율

      const x = Number(panel.dataset.gifX || 0) * scale;
      const y = Number(panel.dataset.gifY || 0) * scale;
      const w = Number(panel.dataset.gifW || 0) * scale;

      gif.style.left = x + "px";
      gif.style.top = y + "px";
      if (w > 0) gif.style.width = w + "px";
    };

    if (base.complete) apply(); // 이미 로드됨
    else base.addEventListener("load", apply); // 로드 후 계산
  });
}

window.addEventListener("load", placeGifs);
window.addEventListener("resize", placeGifs);
