(function () {
  "use strict";
  if (window.__EVRENEXUS_IMPORTANT_POSTS_LOADED__) return;
  window.__EVRENEXUS_IMPORTANT_POSTS_LOADED__ = true;

  var DATA_URL = "https://evrenexus.github.io/svgevrenexus-viewer/data/public/important-posts.json";
  var VIEWER_URL = "https://evrenexus.github.io/svgevrenexus-viewer/viewer.html";
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
      "#Evrenxus-important-posts{margin:0 0 14px;padding:0;border:1px solid #d8dfe3;background:#fff;direction:rtl;overflow:hidden}",
      "#Evrenxus-important-posts .Evrenxus-important-heading{padding:10px 9px;background:#172b3a;color:#fff;font: bold 13px/1.8 Tahoma,Arial,sans-serif;border-right:4px solid #d9b45b}",
      "#Evrenxus-important-posts .Evrenxus-important-list{margin:0;padding:0;list-style:none}",
      "#Evrenxus-important-posts .Evrenxus-important-item{display:block;padding:8px 9px;border-bottom:1px solid #edf0f2;color:#28343c;text-decoration:none;font:11px/1.9 Tahoma,Arial,sans-serif}",
      "#Evrenxus-important-posts .Evrenxus-important-item:last-child{border-bottom:0}",
      "#Evrenxus-important-posts .Evrenxus-important-item:hover{background:#f4f7f8;color:#147a9c}",
      "#Evrenxus-important-posts .Evrenxus-important-source{display:block;margin-top:2px;color:#89939a;font:10px/1.6 Tahoma,Arial,sans-serif}",
      "#Evrenxus-important-posts .Evrenxus-important-status{padding:12px 8px;color:#777;font:11px/1.8 Tahoma,Arial,sans-serif;text-align:center}",
      "#Evrenxus-slider .Evrenxus-slide{position:absolute;inset:0;width:100%;height:100%}",
      "#Evrenxus-slider .Evrenxus-slide.active{display:block}",
      "#Evrenxus-slider .Evrenxus-slide img{width:100%;height:100%;object-fit:cover;display:block;background:#263744}",
      "#Evrenxus-slider .Evrenxus-slide-caption{z-index:2;pointer-events:none}",
      "#Evrenxus-slider .Evrenxus-slider-dot{display:inline-block;border:0;padding:0}",
      "@media(max-width:850px){#Evrenxus-slider{max-width:100%}#Evrenxus-slider .Evrenxus-slide{max-width:100%}#Evrenxus-slider .Evrenxus-slide img{max-width:100%}}"
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

  function renderSlider(items) {
    var slider = document.getElementById("Evrenxus-slider");
    var slidesContainer = document.getElementById("Evrenxus-slides");
    var dotsContainer = document.getElementById("Evrenxus-slider-dots");
    if (!slider || !slidesContainer || !dotsContainer) return;

    slidesContainer.textContent = "";
    dotsContainer.textContent = "";
    if (slideTimer) window.clearInterval(slideTimer);
    slideIndex = 0;
    slider.style.display = "block";

    if (!items.length) {
      setStatus(slidesContainer, "فعلاً مطلب مهمی برای نمایش وجود ندارد");
      return;
    }

    var slides = [];
    var dots = [];

    items.slice(0, 4).forEach(function (item, index) {
      var slide = document.createElement("div");
      slide.className = "Evrenxus-slide" + (index === 0 ? " active" : "");

      var link = document.createElement("a");
      link.href = makeViewerLink(item);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.style.display = "block";
      link.style.width = "100%";
      link.style.height = "100%";
      link.style.textDecoration = "none";

      var image = document.createElement("img");
      image.src = item.image || FALLBACK_IMAGE;
      image.alt = safeText(item.title);
      image.loading = index === 0 ? "eager" : "lazy";
      image.onerror = function () {
        if (this.src !== FALLBACK_IMAGE) this.src = FALLBACK_IMAGE;
      };

      var caption = document.createElement("div");
      caption.className = "Evrenxus-slide-caption";
      caption.textContent = safeText(item.title);

      link.appendChild(image);
      link.appendChild(caption);
      slide.appendChild(link);
      slidesContainer.appendChild(slide);
      slides.push(slide);

      var dot = document.createElement("span");
      dot.className = "Evrenxus-slider-dot" + (index === 0 ? " active" : "");
      dot.setAttribute("role", "button");
      dot.setAttribute("tabindex", "0");
      dot.setAttribute("aria-label", "نمایش مطلب " + (index + 1));
      dot.addEventListener("click", function () { showSlide(index); });
      dot.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          showSlide(index);
        }
      });
      dotsContainer.appendChild(dot);
      dots.push(dot);
    });

    function showSlide(next) {
      if (!slides.length) return;
      slideIndex = (next + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        slide.classList.toggle("active", i === slideIndex);
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle("active", i === slideIndex);
      });
    }

    window.EvrenxusNextSlide = function () { showSlide(slideIndex + 1); };
    window.EvrenxusPrevSlide = function () { showSlide(slideIndex - 1); };
    slideTimer = window.setInterval(function () { showSlide(slideIndex + 1); }, SLIDE_MS);
  }

  function renderSidebar(items, updated) {
    var sidebar = document.getElementById("sidebar");
    if (!sidebar) return;
    var customBox = sidebar.querySelector(".custombox");
    if (!customBox) return;

    var widget = document.getElementById("Evrenxus-important-posts");
    if (!widget) {
      widget = document.createElement("section");
      widget.id = "Evrenxus-important-posts";
      customBox.insertBefore(widget, customBox.firstChild);
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
      link.textContent = safeText(item.title);

      var source = document.createElement("span");
      source.className = "Evrenxus-important-source";
      source.textContent = [safeText(item.source), safeText(item.published).slice(0, 10)].filter(Boolean).join(" · ");

      link.appendChild(source);
      li.appendChild(link);
      list.appendChild(li);
    });
    widget.appendChild(list);

    if (items.length < 16) {
      var note = document.createElement("div");
      note.className = "Evrenxus-important-status";
      note.textContent = "در حال حاضر " + items.length + " مطلب مهم در دسترس است";
      widget.appendChild(note);
    }
  }

  function load() {
    fetch(DATA_URL + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
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
        renderSidebar(items, data.updated);
      })
      .catch(function () {
        var slider = document.getElementById("Evrenxus-slider");
        var slides = document.getElementById("Evrenxus-slides");
        var customBox = document.querySelector("#sidebar .custombox");
        if (slider && slides && !slides.children.length) {
          slider.style.display = "block";
          setStatus(slides, "دریافت مطالب مهم ممکن نشد؛ لطفاً کمی بعد دوباره تلاش کنید");
        }
        if (customBox && !document.getElementById("Evrenxus-important-posts")) {
          var widget = document.createElement("section");
          widget.id = "Evrenxus-important-posts";
          addStyles();
          setStatus(widget, "دریافت مطالب مهم ممکن نشد");
          customBox.insertBefore(widget, customBox.firstChild);
        }
      });
  }

  function start() {
    addStyles();
    load();
    window.setInterval(load, 10 * 60 * 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();