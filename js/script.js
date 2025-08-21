// 메뉴 클릭 시 active 클래스 적용
const menuLinks = document.querySelectorAll(".menulist ul li a");

menuLinks.forEach((link) => {
  link.addEventListener("click", () => {
    menuLinks.forEach((l) => l.classList.remove("active")); // 다른 메뉴 비활성화
    link.classList.add("active"); // 클릭한 메뉴 활성화
  });
});
