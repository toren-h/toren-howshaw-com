(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Starfield ---------- */
  const canvas = document.getElementById("starfield");
  const ctx = canvas.getContext("2d");
  let stars = [];

  function resize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    const count = Math.floor((window.innerWidth * window.innerHeight) / 2500);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 * devicePixelRatio,
      a: Math.random(),
      s: 0.005 + Math.random() * 0.02,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const st of stars) {
      st.a += st.s;
      const alpha = 0.4 + Math.abs(Math.sin(st.a)) * 0.6;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!reduceMotion) requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  resize();
  draw();
  if (!document.getElementById("intro")) return; // 404 page only needs stars

  /* ---------- Opening crawl ---------- */
  const intro = document.getElementById("intro");
  const INTRO_LENGTH = 45000; // ms before the crawl auto-closes
  let introTimer;

  function endIntro() {
    clearTimeout(introTimer);
    intro.classList.add("hidden");
    document.body.classList.remove("intro-active");
    sessionStorage.setItem("crawlSeen", "1");
    document.removeEventListener("keydown", onIntroKey);
  }

  function onIntroKey(e) {
    if (["Escape", "Enter", " "].includes(e.key)) endIntro();
  }

  function startIntro() {
    // Restart CSS animations by re-inserting the node's children
    intro.querySelectorAll(".intro-preface, .intro-title, .crawl").forEach((el) => {
      el.style.animation = "none";
      void el.offsetHeight;
      el.style.animation = "";
    });
    intro.classList.remove("hidden");
    document.body.classList.add("intro-active");
    document.addEventListener("keydown", onIntroKey);
    introTimer = setTimeout(endIntro, INTRO_LENGTH);
  }

  document.getElementById("skip-intro").addEventListener("click", endIntro);
  document.getElementById("replay").addEventListener("click", () => {
    window.scrollTo(0, 0);
    startIntro();
  });

  if (reduceMotion || sessionStorage.getItem("crawlSeen")) {
    intro.classList.add("hidden");
  } else {
    startIntro();
  }

  /* ---------- Light / Dark side ---------- */
  const sideBtn = document.getElementById("side-toggle");
  function applySide(dark) {
    document.body.classList.toggle("dark-side", dark);
    sideBtn.querySelector("span").textContent = dark ? "Dark Side" : "Light Side";
  }
  applySide(localStorage.getItem("side") === "dark");
  sideBtn.addEventListener("click", () => {
    const dark = !document.body.classList.contains("dark-side");
    localStorage.setItem("side", dark ? "dark" : "light");
    applySide(dark);
  });

  /* ---------- Mobile nav ---------- */
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.getElementById("nav-links");
  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
  navLinks.addEventListener("click", (e) => {
    if (e.target.tagName === "A") navLinks.classList.remove("open");
  });

  /* ---------- Typed tagline ---------- */
  const typed = document.getElementById("typed");
  const phrases = JSON.parse(typed.dataset.phrases);
  if (reduceMotion) {
    typed.textContent = phrases[0];
  } else {
    let p = 0, i = 0, deleting = false;
    (function tick() {
      const word = phrases[p];
      i += deleting ? -1 : 1;
      typed.textContent = word.slice(0, i);
      let delay = deleting ? 40 : 90;
      if (!deleting && i === word.length) { deleting = true; delay = 1800; }
      else if (deleting && i === 0) { deleting = false; p = (p + 1) % phrases.length; delay = 400; }
      setTimeout(tick, delay);
    })();
  }

  /* ---------- Reveal on scroll + ignite sabers ---------- */
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("visible");
      entry.target.querySelectorAll(".skills li").forEach((li) => {
        li.querySelector(".saber i").style.width = `calc((100% - 2.5rem) * ${li.dataset.level / 100})`;
      });
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.15 });
  document.querySelectorAll(".panel").forEach((el) => observer.observe(el));

  document.getElementById("year").textContent = new Date().getFullYear();
})();
