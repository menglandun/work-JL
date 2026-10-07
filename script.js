/* 个人简历 · 页面交互 */
(function () {
  "use strict";

  /* ---------- 个人信息（由密码门解密后注入） ----------
     明文只存在于加密载荷 resume.enc.js 中；
     解锁成功后 gate.js 会把码点数组挂到 window.RESUME_PERSONAL。 */
  var PERSONAL = window.RESUME_PERSONAL || { name: [], city: [], email: [], phone: [] };

  function decodeCodes(codes) {
    return codes
      .map(function (code) {
        return String.fromCharCode(code);
      })
      .join("");
  }

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  var revealed = false;

  /* 脱敏规则：姓名保留姓、手机保留前 3 后 4、邮箱保留前 4 位 */
  function maskName(name) {
    var chars = Array.from(name);
    return chars.length > 1 ? chars[0] + "**" : name;
  }

  function maskPhone(phone) {
    return phone.length > 7 ? phone.slice(0, 3) + "****" + phone.slice(-4) : phone;
  }

  function maskEmail(email) {
    var parts = email.split("@");
    if (parts.length !== 2) return email;
    return parts[0].slice(0, 4) + "****@" + parts[1];
  }

  function applyPersonal() {
    var name = decodeCodes(PERSONAL.name);
    var city = decodeCodes(PERSONAL.city);
    var email = decodeCodes(PERSONAL.email);
    var phone = decodeCodes(PERSONAL.phone);
    var shownName = revealed ? name : maskName(name);
    var shownEmail = revealed ? email : maskEmail(email);
    var shownPhone = revealed ? phone : maskPhone(phone);

    document.title = shownName + " · AI 产品 / 产品总监";
    setText("brand-mark", name.charAt(0));
    setText("brand-name", shownName);
    setText("hero-name", shownName);
    setText("footer-name", shownName);
    setText("contact-note", city + " · 期望城市不限 · " + shownEmail + " · " + shownPhone);

    var favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      var svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        "<rect width='64' height='64' rx='14' fill='#0f1417'/>" +
        "<text x='32' y='44' font-family='PingFang SC, sans-serif' font-size='32' font-weight='600' fill='#ffffff' text-anchor='middle'>" +
        name.charAt(0) +
        "</text></svg>";
      favicon.href = "data:image/svg+xml," + encodeURIComponent(svg);
    }

    var meta = document.getElementById("hero-meta");
    if (meta) {
      meta.textContent = "";
      var mail = document.createElement("a");
      mail.href = "mailto:" + email;
      mail.textContent = shownEmail;
      var tel = document.createElement("a");
      tel.href = "tel:" + phone;
      tel.textContent = shownPhone;
      var place = document.createElement("span");
      place.textContent = city + " · 期望城市不限";
      [mail, tel, place].forEach(function (node, index) {
        if (index > 0) {
          var sep = document.createElement("span");
          sep.setAttribute("aria-hidden", "true");
          sep.textContent = "/";
          meta.appendChild(sep);
        }
        meta.appendChild(node);
      });
    }

    var mailBtn = document.getElementById("contact-mail");
    if (mailBtn) mailBtn.setAttribute("href", "mailto:" + email);
    var telBtn = document.getElementById("contact-tel");
    if (telBtn) telBtn.setAttribute("href", "tel:" + phone);

    ["hero-copy-email", "contact-copy-email"].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) btn.setAttribute("data-copy-email", email);
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-toggle-reveal]"), function (btn) {
      btn.classList.toggle("is-revealed", revealed);
      btn.setAttribute("aria-pressed", String(revealed));
      btn.setAttribute(
        "aria-label",
        revealed ? "隐藏完整个人信息" : "显示完整个人信息"
      );
      var label = btn.querySelector("[data-reveal-label]");
      if (label) label.textContent = revealed ? "隐藏完整信息" : "显示完整信息";
    });
  }

  applyPersonal();

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var nav = document.getElementById("site-nav");
  var menuBtn = document.getElementById("menu-btn");
  var toTop = document.getElementById("to-top");
  var toast = document.getElementById("toast");
  var toastTimer = null;

  /* ---------- 移动端菜单 ---------- */

  function closeMenu() {
    if (!nav || !menuBtn) return;
    nav.classList.remove("nav-open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-label", "打开菜单");
  }

  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("nav-open");
      menuBtn.setAttribute("aria-expanded", String(isOpen));
      menuBtn.setAttribute("aria-label", isOpen ? "关闭菜单" : "打开菜单");
    });
  }

  document.addEventListener("click", function (event) {
    if (!nav) return;
    var link = event.target.closest && event.target.closest("#nav-links a");
    if (link) closeMenu();
    else if (nav.classList.contains("nav-open") && !nav.contains(event.target)) closeMenu();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeMenu();
  });

  /* ---------- 复制邮箱 / 打印 ---------- */

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2000);
  }

  function legacyCopy(value) {
    var field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.top = "-1000px";
    document.body.appendChild(field);
    field.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (error) {
      ok = false;
    }
    document.body.removeChild(field);
    return ok;
  }

  function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(value);
    return new Promise(function (resolve, reject) {
      legacyCopy(value) ? resolve() : reject(new Error("copy failed"));
    });
  }

  document.addEventListener("click", function (event) {
    if (!event.target.closest) return;

    var toggle = event.target.closest("[data-toggle-reveal]");
    if (toggle) {
      revealed = !revealed;
      applyPersonal();
      return;
    }

    var copyTarget = event.target.closest("[data-copy-email]");
    if (copyTarget) {
      var email = copyTarget.getAttribute("data-copy-email");
      copyText(email).then(
        function () {
          showToast("邮箱已复制：" + email);
        },
        function () {
          showToast("复制失败，请手动选择邮箱");
        }
      );
      return;
    }

    var printTarget = event.target.closest("[data-print]");
    if (printTarget) {
      closeMenu();
      window.print();
    }
  });

  /* ---------- 回到顶部 ---------- */

  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  }

  /* ---------- 滚动状态与导航高亮 ---------- */

  var sectionIds = ["skills", "experience", "projects", "education", "contact"];
  var sections = sectionIds
    .map(function (id) {
      return document.getElementById(id);
    })
    .filter(Boolean);

  function updateActiveLink() {
    var offset = window.scrollY + 140;
    var current = null;

    sections.forEach(function (section) {
      if (section.offsetTop <= offset) current = section.id;
    });

    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 4) {
      current = "contact";
    }

    sectionIds.forEach(function (id) {
      var link = document.querySelector('.nav-links a[href="#' + id + '"]');
      if (link) link.classList.toggle("is-active", id === current);
    });
  }

  function updateScrollUi() {
    var y = window.scrollY;
    if (nav) nav.classList.toggle("is-scrolled", y > 8);
    if (toTop) toTop.hidden = y < 620;
    updateActiveLink();
  }

  var ticking = false;
  window.addEventListener(
    "scroll",
    function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        updateScrollUi();
        ticking = false;
      });
    },
    { passive: true }
  );
  window.addEventListener("resize", updateScrollUi);
  updateScrollUi();

  /* ---------- 进入视口淡入 ---------- */

  var revealTargets = document.querySelectorAll(
    ".section-head, .skill, .project-card, .timeline-item, .edu-item, .contact-inner > *"
  );

  if (!prefersReducedMotion && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    Array.prototype.forEach.call(revealTargets, function (target) {
      if (target.closest(".hero")) return;
      target.classList.add("reveal");
      observer.observe(target);
    });
  }

  /* 打印前把所有淡入动画直接置为可见，避免未滚动到的内容在 PDF 里变成空白 */
  window.addEventListener("beforeprint", function () {
    Array.prototype.forEach.call(document.querySelectorAll(".reveal"), function (node) {
      node.classList.add("is-visible");
    });
  });

  /* ---------- 页脚年份 ---------- */

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
