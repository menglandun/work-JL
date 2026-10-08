/* 密码门：用输入的密码派生密钥，本地解密 resume.enc.js 里的密文后渲染简历 */
(function () {
  "use strict";

  var box = document.getElementById("passwordBox");
  var content = document.getElementById("resumeContent");
  var form = document.getElementById("gateForm");
  var input = document.getElementById("pwdInput");
  var button = document.getElementById("gateBtn");
  var tip = document.getElementById("tip");
  var envTip = document.getElementById("tipEnv");
  var busy = false;

  function fromBase64(value) {
    var binary = window.atob(value);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  function unsupported() {
    form.hidden = true;
    envTip.hidden = false;
  }

  function decrypt(password) {
    var cfg = window.RESUME_ENC;
    var encoder = new TextEncoder();
    return window.crypto.subtle
      .importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"])
      .then(function (baseKey) {
        return window.crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: fromBase64(cfg.salt),
            iterations: cfg.iterations,
            hash: cfg.hash,
          },
          baseKey,
          { name: "AES-GCM", length: 256 },
          false,
          ["decrypt"]
        );
      })
      .then(function (key) {
        return window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv: fromBase64(cfg.iv) },
          key,
          fromBase64(cfg.data)
        );
      })
      .then(function (plain) {
        return JSON.parse(new TextDecoder().decode(plain));
      });
  }

  function unlock(payload) {
    window.RESUME_PERSONAL = payload.personal || {};
    content.innerHTML = payload.html || "";
    document.body.classList.remove("gate");
    box.hidden = true;
    content.hidden = false;

    var reduceMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* 内容淡入，并平滑滚动到简历内容顶部 */
    window.requestAnimationFrame(function () {
      content.classList.add("is-ready");
      if (typeof content.scrollIntoView === "function") {
        content.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
      } else {
        window.scrollTo(0, 0);
      }
    });

    var site = document.createElement("script");
    site.src = "script.js";
    document.body.appendChild(site);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (busy) return;

    var password = input.value;
    if (!password) return;

    busy = true;
    button.disabled = true;
    tip.hidden = true;

    decrypt(password)
      .then(function (payload) {
        busy = false;
        unlock(payload);
      })
      .catch(function () {
        busy = false;
        button.disabled = false;
        input.value = "";
        input.focus();
        tip.hidden = false;
      });
  });

  if (!window.crypto || !window.crypto.subtle || !window.RESUME_ENC) {
    unsupported();
  }
})();
