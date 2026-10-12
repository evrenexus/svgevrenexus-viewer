(function () {
  "use strict";
  if (window.__EVRENEXUS_IMPORTANT_POSTS_LOADED__) return;
  window.__EVRENEXUS_IMPORTANT_POSTS_LOADED__ = true;

  var DATA_URL = "./data/public/important-posts.json";
  var VIEWER_URL = "./viewer.html";
  var FALLBACK_IMAGE = "https://cdn.imgurl.ir/uploads/p26339_EVREN_NEXUS_Avrin_2.png";
  var SLIDE_MS = 5000;
  var ALLOWED_TOPICS = ["economy", "markets", "crypto", "currency-gold", "real-estate", "technology", "ai", "health", "auto", "science-life"];
  var lastUpdated = "";
  var slideIndex = 0;
  var slideTimer = null;

  function addStyles() {
    if (document.getElementById("Evrenxus-important-posts-css")) return;
    var style = document.createElement("style");
    style.id = "Evrenxus-important-posts-css";
    style.textContent = [
      "#Evrenxus-slider{position:relative;width:100%;height:315px;margin:0 0 14px;background:#15191c;overflow:hidden;box-sizing:border-box;direction:rtl}",
      "#Evrenxus-slider .Evrenxus-slides{position:absolute;inset:0}",
      "#Evrenxus-slider .Evrenxus-slide{display:none;position:absolute;inset:0;width:100%;height:100%;overflow:hidden}",
      "#Evrenxus-slider .Evrenxus-slide.active{display:block}",
      "#Evrenxus-slider .Evrenxus-slide a{display:block;width:100%;height:100%;color:#fff;text-decoration:none;position:relative}",
      "#Evrenxus-slider .Evrenxus-slide img{width:100%;height:100%;object-fit:cover;display:block;background:#263744}",
      "#Evrenxus-slider .Evrenxus-slide:after{content:'';position:absolute;inset:35% 0 0;pointer-events:none;background:linear-gradient(transparent,rgba(0,0,0,.85))}",
      "#Evrenxus-slider .Evrenxus-slide-caption{position:absolute;left:14px;right:auto;bottom:28px;z-index:3;padding:12px 14px;max-width:78%;background:rgba(13,22,29,.82);border-left:4px solid #d64c43;color:#fff;font:700 16px/1.8 Tahoma,Arial,sans-serif;text-align:left;direction:rtl;max-height:48%;overflow:hidden;overflow-wrap:anywhere}",
      "#Evrenxus-slider .Evrenxus-slider-prev,#Evrenxus-slider .Evrenxus-slider-next{position:absolute;top:50%;transform:translateY(-50%);z-index:5;width:34px;height:48px;border:0;background:rgba(0,0,0,.5);color:#fff;font:28px Arial;cursor:pointer}",
      "#Evrenxus-slider .Evrenxus-slider-prev{left:0}#Evrenxus-slider .Evrenxus-slider-next{right:0}",
      "#Evrenxus-slider .Evrenxus-slider-dots{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);z-index:6;display:flex;gap:6px}",
      "#Evrenxus-slider .Evrenxus-slider-dot{width:8px;height:8px;border:0;border-radius:50%;background:rgba(255,255,255,.5);cursor:pointer}",
      "#Evrenxus-slider .Evrenxus-slider-dot.active{background:#fff}",
      "#Evrenxus-sidebar-important .Evrenxus-important-link{display:block;padding:8px 10px;border-bottom:1px solid #e8edf1;color:#243949;text-decoration:none;font:700 10px/1.8 Tahoma,Arial,sans-serif;overflow-wrap:anywhere}",
      "#Evrenxus-sidebar-important .Evrenxus-important-link:hover{background:#f8fafb;color:#d64c43}",
      "#Evrenxus-sidebar-important .Evrenxus-important-time{display:block;margin-top:2px;color:#9aa1a6;font:400 8px/1.7 Tahoma,Arial,sans-serif}",
      "#Evrenxus-sidebar-important .Evrenxus-important-archive{display:block;padding:10px;text-align:center;background:#f8fafb;color:#d64c43;text-decoration:none;font:700 10px/1.8 Tahoma,Arial,sans-serif;border-top:1px solid #e8ebed}",
      "@media(max-width:700px){#Evrenxus-slider{height:auto;aspect-ratio:16/9;max-height:300px;min-height:190px}#Evrenxus-slider .Evrenxus-slide-caption{left:8px;right:auto;bottom:22px;padding:7px 9px;font-size:12px;max-width:calc(100% - 54px);max-height:55%;line-height:1.65}#Evrenxus-slider .Evrenxus-slider-prev,#Evrenxus-slider .Evrenxus-slider-next{width:28px;height:40px;font-size:24px}#sidebar-host{width:100%!important;min-width:0!important;max-width:100%!important}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function safeText(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function makeViewerLink(item) {
    return VIEWER_URL + "?url=" + encodeURIComponent(item.url || "");
  }

  function setStatus(container, message) {
    if (!container) return;
    var status = document.createElement("div");
    status.className = "Evrenxus-important-status";
    status.textContent = message;
    container.appendChild(status);
  }

  function ensureSlider() {
    var slider = document.getElementById("Evrenxus-slider");
    if (slider) return slider;
    var host = document.getElementById("Evrenxus-slider-host");
    if (!host) return null;
    slider = document.createElement("section");
    slider.id = "Evrenxus-slider";
    slider.setAttribute("aria-label", "مطالب مهم");
    slider.innerHTML = '<div id="Evrenxus-slides" class="Evrenxus-slides"></div><button type="button" class="Evrenxus-slider-prev" aria-label="اسلاید قبلی">‹</button><button type="button" class="Evrenxus-slider-next" aria-label="اسلاید بعدی">›</button><div id="Evrenxus-slider-dots" class="Evrenxus-slider-dots"></div>';
    host.replaceWith(slider);
    slider.querySelector(".Evrenxus-slider-prev").addEventListener("click", function () { showSlide(slideIndex - 1); });
    slider.querySelector(".Evrenxus-slider-next").addEventListener("click", function () { showSlide(slideIndex + 1); });
    return slider;
  }

  var currentSlides = [], currentDots = [];
  function showSlide(next) {
    if (!currentSlides.length) return;
    slideIndex = (next + currentSlides.length) % currentSlides.length;
    currentSlides.forEach(function (slide, i) { slide.classList.toggle("active", i === slideIndex); });
    currentDots.forEach(function (dot, i) { dot.classList.toggle("active", i === slideIndex); });
  }

  function renderSlider(items) {
    var slider = ensureSlider();
    if (!slider) return;
    var slidesContainer = document.getElementById("Evrenxus-slides");
    var dotsContainer = document.getElementById("Evrenxus-slider-dots");
    if (!slidesContainer || !dotsContainer) return;
    slidesContainer.textContent = "";
    dotsContainer.textContent = "";
    if (slideTimer) window.clearInterval(slideTimer);
    currentSlides = [];
    currentDots = [];
    slideIndex = 0;
    slider.style.display = "block";

    if (!items.length) {
      setStatus(slidesContainer, "فعلاً مطلب مهمی برای نمایش وجود ندارد");
      return;
    }

    items.slice(0, 8).forEach(function (item, index) {
      var slide = document.createElement("div");
      slide.className = "Evrenxus-slide" + (index === 0 ? " active" : "");
      var link = document.createElement("a");
      link.href = makeViewerLink(item);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      var image = document.createElement("img");
      image.src = item.image || FALLBACK_IMAGE;
      image.alt = safeText(item.title);
      image.loading = index === 0 ? "eager" : "lazy";
      image.onerror = function () { if (this.src !== FALLBACK_IMAGE) this.src = FALLBACK_IMAGE; };
      var caption = document.createElement("div");
      caption.className = "Evrenxus-slide-caption";
      caption.textContent = safeText(item.title);
      link.appendChild(image);
      link.appendChild(caption);
      slide.appendChild(link);
      slidesContainer.appendChild(slide);
      currentSlides.push(slide);

      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "Evrenxus-slider-dot" + (index === 0 ? " active" : "");
      dot.setAttribute("aria-label", "نمایش مطلب " + (index + 1));
      dot.addEventListener("click", function () { showSlide(index); });
      dotsContainer.appendChild(dot);
      currentDots.push(dot);
    });
    window.EvrenxusNextSlide = function () { showSlide(slideIndex + 1); };
    window.EvrenxusPrevSlide = function () { showSlide(slideIndex - 1); };
    slideTimer = window.setInterval(function () { showSlide(slideIndex + 1); }, SLIDE_MS);
  }


  function formatPublished(value) {
    if (!value) return "";
    var date = new Date(value);
    if (isNaN(date.getTime())) return "";
    try {
      return date.toLocaleString("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch (_) {
      return date.toLocaleString();
    }
  }

  function renderSidebar(items) {
    // Only use the designated existing sidebar slot; never clear an unrelated custom box.
    var slot = document.getElementById("Evrenxus-sidebar-important");
    if (!slot) return;
    slot.textContent = "";
    var list = document.createElement("div");
    var shown = items.slice(0, 16);
    if (!shown.length) {
      var empty = document.createElement("div");
      empty.textContent = "فعلاً مطلب مهمی برای نمایش وجود ندارد";
      empty.style.cssText = "padding:10px;font:10px/1.8 Tahoma,Arial,sans-serif;color:#888";
      list.appendChild(empty);
    }
    shown.forEach(function (item) {
      var link = document.createElement("a");
      link.className = "Evrenxus-important-link";
      link.href = makeViewerLink(item);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      var title = document.createElement("span");
      title.className = "Evrenxus-important-title";
      title.textContent = safeText(item.title);
      link.appendChild(title);
      var published = formatPublished(item.published);
      if (published) {
        var time = document.createElement("span");
        time.className = "Evrenxus-important-time";
        time.textContent = published;
        link.appendChild(time);
      }
      list.appendChild(link);
    });
    slot.appendChild(list);
    var archive = document.createElement("a");
    archive.className = "Evrenxus-important-archive";
    archive.href = "./important-archive.html";
    archive.target = "_top";
    archive.textContent = "آرشیو مطالب مهم";
    slot.appendChild(archive);
  }

  function load() {
    Promise.all([
      fetch(DATA_URL + "?t=" + Date.now(), { cache: "no-store" }).then(function (response) { if (!response.ok) throw new Error("HTTP " + response.status); return response.json(); }),
      fetch("./data/editorial.json?t=" + Date.now(), { cache: "no-store" }).then(function (response) { if (!response.ok) throw new Error("Editorial HTTP " + response.status); return response.json(); }).catch(function () { return { items: {} }; })
    ])
      .then(function (parts) {
        var data = parts[0], editorial = parts[1];
        if (!data || !Array.isArray(data.items)) throw new Error("Invalid data");
        if (data.updated && data.updated === lastUpdated) return;
        lastUpdated = data.updated || "";
        var deleted = editorial && editorial.items || {};
        var items = data.items.filter(function (item) {
          return item && item.title && item.url && !(deleted[String(item.id)] && deleted[String(item.id)].deleted === true) && Array.isArray(item.topics) &&
            item.topics.some(function (topic) { return ALLOWED_TOPICS.indexOf(topic) !== -1; });
        }).slice(0, 16);
        addStyles();
        renderSlider(items);
        renderSidebar(items);
      })
      .catch(function () {
        addStyles();
        var slider = ensureSlider();
        if (slider) {
          var slides = document.getElementById("Evrenxus-slides");
          if (slides && !slides.children.length) setStatus(slides, "دریافت مطالب مهم ممکن نشد؛ کمی بعد دوباره تلاش کنید");
        }
      });
  }

  function start() {
    addStyles();
    load();
    window.setInterval(load, 10 * 60 * 1000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();