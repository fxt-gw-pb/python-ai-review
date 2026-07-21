/* AI 启航 · 学习复习站 —— 交互脚本 */
(function () {
  "use strict";
  const LS_DONE = "study.done.v1";     // 已完成页面集合
  const LS_CHECK = "study.checks.v1";  // 清单勾选状态

  const store = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) || fallback; }
      catch (e) { return fallback; }
    },
    set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  };

  /* ---------- 代码块：复制按钮 ---------- */
  document.querySelectorAll(".code-card").forEach(card => {
    const btn = card.querySelector(".copy-btn");
    const pre = card.querySelector("pre");
    if (!btn || !pre) return;
    btn.addEventListener("click", () => {
      navigator.clipboard.writeText(pre.innerText).then(() => {
        btn.textContent = "✓ 已复制";
        btn.classList.add("ok");
        setTimeout(() => { btn.textContent = "复制"; btn.classList.remove("ok"); }, 1600);
      }).catch(() => {
        // 兼容 file:// 下部分浏览器剪贴板受限
        const r = document.createRange();
        r.selectNodeContents(pre);
        const sel = getSelection();
        sel.removeAllRanges(); sel.addRange(r);
        document.execCommand("copy");
        sel.removeAllRanges();
        btn.textContent = "✓ 已复制"; btn.classList.add("ok");
        setTimeout(() => { btn.textContent = "复制"; btn.classList.remove("ok"); }, 1600);
      });
    });
  });

  /* ---------- 答案折叠 ---------- */
  document.querySelectorAll(".answer-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const body = btn.parentElement.querySelector(".answer-body");
      const open = body.classList.toggle("show");
      btn.classList.toggle("open", open);
      btn.innerHTML = open
        ? '<span>🙈 收起答案</span><span class="arrow">▲</span>'
        : '<span>💡 查看参考答案</span><span class="arrow">▼</span>';
    });
  });

  /* ---------- 页面目录高亮 ---------- */
  const tocLinks = document.querySelectorAll(".toc a");
  if (tocLinks.length) {
    const map = new Map();
    tocLinks.forEach(a => {
      const id = decodeURIComponent(a.getAttribute("href").slice(1));
      const el = document.getElementById(id);
      if (el) map.set(el, a);
    });
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          tocLinks.forEach(a => a.classList.remove("active"));
          const link = map.get(en.target);
          if (link) link.classList.add("active");
        }
      });
    }, { rootMargin: "-70px 0px -72% 0px" });
    map.forEach((a, el) => obs.observe(el));
  }

  /* ---------- 完成进度 ---------- */
  const doneSet = new Set(store.get(LS_DONE, []));

  function refreshDoneMarks() {
    document.querySelectorAll("[data-page-key]").forEach(el => {
      el.classList.toggle("is-done", doneSet.has(el.dataset.pageKey));
    });
    const bar = document.querySelector(".mark-done-btn");
    if (bar) {
      const key = bar.dataset.key;
      const done = doneSet.has(key);
      bar.classList.toggle("done", done);
      bar.textContent = done ? "✓ 已完成，做得好！（点击取消）" : "⛳ 学完了？标记为已完成";
    }
    // 首页进度统计（总目录行与卡片均带 data-page-key，按唯一 key 去重）
    const prog = document.getElementById("progress-num");
    if (prog) {
      const total = parseInt(prog.dataset.total, 10) || 0;
      const keys = new Set();
      document.querySelectorAll("a[data-page-key]").forEach(c => keys.add(c.dataset.pageKey));
      let n = 0;
      keys.forEach(k => { if (doneSet.has(k)) n++; });
      prog.textContent = n + " / " + total;
    }
  }

  const markBtn = document.querySelector(".mark-done-btn");
  if (markBtn) {
    markBtn.addEventListener("click", () => {
      const key = markBtn.dataset.key;
      if (doneSet.has(key)) doneSet.delete(key); else doneSet.add(key);
      store.set(LS_DONE, [...doneSet]);
      refreshDoneMarks();
    });
  }
  refreshDoneMarks();

  /* ---------- 任务清单勾选 ---------- */
  const checks = store.get(LS_CHECK, {});
  document.querySelectorAll(".check-list li").forEach(li => {
    const box = li.querySelector("input");
    const id = li.dataset.checkId;
    if (!box || !id) return;
    if (checks[id]) { box.checked = true; li.classList.add("done"); }
    li.addEventListener("click", e => {
      if (e.target !== box) box.checked = !box.checked;
      li.classList.toggle("done", box.checked);
      checks[id] = box.checked;
      store.set(LS_CHECK, checks);
    });
  });

  /* ---------- 图片灯箱 ---------- */
  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.innerHTML = "<img alt=''>";
  document.body.appendChild(lb);
  const lbImg = lb.querySelector("img");
  document.querySelectorAll(".doc img").forEach(img => {
    img.addEventListener("click", () => {
      lbImg.src = img.src;
      lb.classList.add("show");
    });
  });
  lb.addEventListener("click", () => lb.classList.remove("show"));
  document.addEventListener("keydown", e => { if (e.key === "Escape") lb.classList.remove("show"); });

  /* ---------- 返回顶部 ---------- */
  const top = document.createElement("button");
  top.className = "to-top";
  top.title = "返回顶部";
  top.textContent = "↑";
  document.body.appendChild(top);
  top.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
  addEventListener("scroll", () => {
    top.classList.toggle("show", scrollY > 500);
  }, { passive: true });

  /* ---------- 侧栏：桌面收起 / 移动端抽屉 ---------- */
  const menuBtn = document.querySelector(".menu-btn");
  const sidenav = document.querySelector(".sidenav");
  const SIDENAV_KEY = "sidenav-collapsed";
  const isMobileNav = () => matchMedia("(max-width: 900px)").matches;

  const syncMenuBtn = () => {
    if (!menuBtn || !sidenav) return;
    if (isMobileNav()) {
      const open = sidenav.classList.contains("open");
      menuBtn.title = open ? "关闭菜单" : "打开菜单";
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      return;
    }
    const collapsed = document.body.classList.contains("sidenav-collapsed");
    menuBtn.title = collapsed ? "展开侧栏" : "收起侧栏";
    menuBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
  };

  if (menuBtn && sidenav) {
    if (!isMobileNav() && localStorage.getItem(SIDENAV_KEY) === "1") {
      document.body.classList.add("sidenav-collapsed");
    }
    syncMenuBtn();

    menuBtn.addEventListener("click", () => {
      if (isMobileNav()) {
        sidenav.classList.toggle("open");
      } else {
        document.body.classList.toggle("sidenav-collapsed");
        localStorage.setItem(
          SIDENAV_KEY,
          document.body.classList.contains("sidenav-collapsed") ? "1" : "0"
        );
      }
      syncMenuBtn();
    });

    document.addEventListener("click", e => {
      if (!isMobileNav()) return;
      if (!sidenav.contains(e.target) && !menuBtn.contains(e.target)) {
        sidenav.classList.remove("open");
        syncMenuBtn();
      }
    });

    addEventListener("resize", () => {
      if (isMobileNav()) {
        document.body.classList.remove("sidenav-collapsed");
      } else {
        sidenav.classList.remove("open");
        if (localStorage.getItem(SIDENAV_KEY) === "1") {
          document.body.classList.add("sidenav-collapsed");
        }
      }
      syncMenuBtn();
    }, { passive: true });
  }
})();
