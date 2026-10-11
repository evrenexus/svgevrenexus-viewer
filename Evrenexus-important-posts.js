(function () {
  "use strict";
  if (window.__EVRENEXUS_IMPORTANT_POSTS_LOADED__) return;
  window.__EVRENEXUS_IMPORTANT_POSTS_LOADED__ = true;

  var DATA_URL = "./data/public/important-posts.json";
  var VIEWER_URL = "./viewer.html";
  var FALLBACK_IMAGE = "https://cdn.imgurl.ir/uploads/p26339_EVREN_NEXUS_Avrin_2.png";
  var SLIDE_MS = 5000;
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
      "#Evrenxus-slider .Evrenxus-slide-caption{position:absolute;right:14px;bottom:28px;left:14px;z-index:3;padding:12px 14px;background:rgba(13,22,29,.78);border-right:4px solid #d9232e;color:#fff;font:700 16px/1.8 Tahoma,Arial,sans-serif;text-align:right;max-height:48%;overflow:hidden}",
      "#Evrenxus-slider .Evrenxus-slider-prev,#Evrenxus-slider .Evrenxus-slider-next{position:absolute;top:50%;transform:translateY(-50%);z-index:5;width:34px;height:48px;border:0;background:rgba(0,0,0,.5);color:#fff;font:28px Arial;cursor:pointer}",
      "#Evrenxus-slider .Evrenxus-slider-prev{left:0}#Evrenxus-slider .Evrenxus-slider-next{right:0}",
      "#Evrenxus-slider .Evrenxus-slider-dots{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);z-index:6;display:flex;gap:6px}",
      "#Evrenxus-slider .Evrenxus-slider-dot{width:8px;height:8px;border:0;border-radius:50%;background:rgba(255,255,255,.5);cursor:pointer}",
      "#Evrenxus-slider .Evrenxus-slider-dot.active{background:#fff}",
      "#Evrenxus-important-posts{width:100%;margin:0 0 14px;padding:0;border:1px solid #d8dfe3;background:#fff;direction:rtl;overflow:hidden}",
      "#Evrenxus-important-posts .Evrenxus-important-heading{padding:10px 9px;background:#172b3a;color:#fff;font:700 13px/1.8 Tahoma,Arial,sans-serif;border-right:4px solid #d9b45b}",
      "#Evrenxus-important-posts .Evrenxus-important-list{margin:0;padding:0;list-style:none}",
      "#Evrenxus-important-posts .Evrenxus-important-item{display:block;padding:8px 9px;border-bottom:1px solid #edf0f2;color:#28343c;text-decoration:none;font:11px/1.9 Tahoma,Arial,sans-serif}",
      "#Evrenxus-important-posts .Evrenxus-important-item:last-child{border-bottom:0}",
      "#Evrenxus-important-posts .Evrenxus-important-item:hover{background:#f4f7f8;color:#147a9c}",
      "#Evrenxus-important-posts .Evrenxus-important-source{display:block;margin-top:2px;color:#89939a;font:10px/1.6 Tahoma,Arial,sans-serif}",
      "#Evrenxus-important-posts .Evrenxus-important-status{padding:12px 8px;color:#777;font:11px/1.8 Tahoma,Arial,sans-serif;text-align:center}",
      "@media(max-width:700px){#Evrenxus-slider{height:auto;aspect-ratio:16/9;max-height:300px}#Evrenxus-slider .Evrenxus-slide-caption{right:8px;left:8px;bottom:23px;padding:7px 9px;font-size:12px}#sidebar-host{width:100%!important;min-width:0!important;max-width:100%!important}#Evrenxus-important-posts{width:100%}}"
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

    items.slice(0, 4).forEach(function (item, index) {
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

  function renderSidebar(items) {
    var host = document.getElementById("sidebar-host") || document.getElementById("sidebar");
    if (!host) return;
    var widget = document.getElementById("Evrenxus-important-posts");
    if (!widget) {
      widget = document.createElement("section");
      widget.id = "Evrenxus-important-posts";
      if (host.id === "sidebar") {
        var customBox = host.querySelector(".custombox");
        if (customBox) host = customBox;
      }
      host.insertBefore(widget, host.firstChild);
    }
    widget.textContent = "";
    var heading = document.createElement("div");
    heading.className = "Evrenxus-important-heading";
    heading.textContent = "مطالب مهم (۱۶ مطلب)";
    widget.appendChild(heading);
    var list = document.createElement("ul");
    list.className = "Evrenxus-important-list";
    items.slice(0, 16).forEach(function (item) {
      var li = document.createElement("li");
      var link = document.createElement("a");
      link.className = "Evrenxus-important-item";
      link.href = makeViewerLink(item);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.appendChild(document.createTextNode(safeText(item.title)));
      var source = document.createElement("span");
      source.className = "Evrenxus-important-source";
      source.textContent = [safeText(item.source), safeText(item.published).slice(0, 10)].filter(Boolean).join(" · ");
      link.appendChild(source);
      li.appendChild(link);
      list.appendChild(li);
    });
    widget.appendChild(list);
    if (items.length < 16) setStatus(widget, "در حال حاضر " + items.length + " مطلب مهم در دسترس است");
  }

  function load() {
    fetch(DATA_URL + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (response) { if (!response.ok) throw new Error("HTTP " + response.status); return response.json(); })
      .then(function (data) {
        if (!data || !Array.isArray(data.items)) throw new Error("Invalid data");
        if (data.updated && data.updated === lastUpdated) return;
        lastUpdated = data.updated || "";
        var items = data.items.filter(function (item) {
          return item && item.title && item.url && Array.isArray(item.topics) && item.topics.length;
        }).slice(0, 16);
        var currentBatch = Array.isArray(data.batches) && data.batches.length && Array.isArray(data.batches[0].items)
          ? data.batches[0].items
          : items.slice(0, 4);
        addStyles();
        renderSlider(currentBatch);
        renderSidebar(items);
      })
      .catch(function () {
        addStyles();
        var slider = ensureSlider();
        if (slider) {
          var slides = document.getElementById("Evrenxus-slides");
          if (slides && !slides.children.length) setStatus(slides, "دریافت مطالب مهم ممکن نشد؛ کمی بعد دوباره تلاش کنید");
        }
        var host = document.getElementById("sidebar-host");
        if (host && !document.getElementById("Evrenxus-important-posts")) {
          var widget = document.createElement("section");
          widget.id = "Evrenxus-important-posts";
          setStatus(widget, "دریافت مطالب مهم ممکن نشد");
          host.insertBefore(widget, host.firstChild);
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