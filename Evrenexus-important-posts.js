(function () {
  "use strict";
  if (window.__EVRENEXUS_IMPORTANT_POSTS_LOADED__) return;
  window.__EVRENEXUS_IMPORTANT_POSTS_LOADED__ = true;

  var VIEWER_URL = "./viewer.html";
  var SIDEBAR_COUNT = 12;
  var ALLOWED_TOPICS = ["economy", "markets", "economy-investment", "crypto", "currency-gold", "real-estate", "technology", "technology-ai", "ai", "health", "auto", "science-life"];
  var lastUpdated = "";

  function addStyles() {
    if (document.getElementById("Evrenxus-important-posts-css")) return;
    var style = document.createElement("style");
    style.id = "Evrenxus-important-posts-css";
    style.textContent = [
      "#Evrenxus-sidebar-important .Evrenxus-important-link{display:block;padding:0 0 10px;margin:0 0 10px;border-bottom:1px solid #e8edf1;color:#243949;text-decoration:none;font:700 10px/1.8 Tahoma,Arial,sans-serif;overflow-wrap:anywhere}",
      "#Evrenxus-sidebar-important .Evrenxus-important-image{display:block;width:100%;aspect-ratio:16/9;height:auto;object-fit:cover;background:#edf0f2;margin:0 0 7px}",
      "#Evrenxus-sidebar-important .Evrenxus-important-title{display:block;padding:0 10px}",
      "#Evrenxus-sidebar-important .Evrenxus-important-link:hover{background:#f8fafb;color:#d64c43}",
      
      "#Evrenxus-sidebar-important .Evrenxus-important-time{display:block;margin-top:2px;color:#9aa1a6;font:400 8px/1.7 Tahoma,Arial,sans-serif}",
      "#Evrenxus-sidebar-important .Evrenxus-important-archive{display:block;padding:10px;text-align:center;background:#f8fafb;color:#d64c43;text-decoration:none;font:700 10px/1.8 Tahoma,Arial,sans-serif;border-top:1px solid #e8ebed}",
      "@media(max-width:700px){#sidebar-host{width:100%!important;min-width:0!important;max-width:100%!important}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function safeText(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function makeViewerLink(item) {
    if (item.wordpress && item.url) return item.url;
    return item.article_url ? "./" + String(item.article_url).replace(/^\.\//, "") : VIEWER_URL + "?url=" + encodeURIComponent(item.url || "");
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
    var shown = items.slice(0, SIDEBAR_COUNT);
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
      var imageUrl = String(item.image || "");
      if (/^https?:\/\//i.test(imageUrl)) {
        var image = document.createElement("img");
        image.className = "Evrenxus-important-image";
        image.src = imageUrl;
        image.alt = "";
        image.loading = "lazy";
        image.referrerPolicy = "no-referrer";
        image.onerror = function () { this.remove(); };
        link.appendChild(image);
      }
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
    archive.href = "https://evrenexus.ir/important-archive.html";
    archive.target = "_top";
    archive.textContent = "مطالب مهم";
    slot.appendChild(archive);
  }

  function loadLegacy() {
    Promise.all([
      fetch("./data/editorial.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("Editorial HTTP " + r.status); return r.json(); }),
      fetch("./data/news.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("News HTTP " + r.status); return r.json(); })
    ]).then(function (parts) {
      var editorial = parts[0] && parts[0].items || {};
      var raw = parts[1];
      var source = Array.isArray(raw) ? raw : (Array.isArray(raw.items) ? raw.items : (Array.isArray(raw.news) ? raw.news : []));
      var byId = Object.create(null);
      source.forEach(function (n) { if (n && n.id != null) byId[String(n.id)] = n; });
      var stamp = String(parts[0] && parts[0].updated || "") + "|" + String(source.length);
      if (stamp && stamp === lastUpdated) return;
      lastUpdated = stamp;
      // Sidebar content is based on manual selection; publishing/content fields are not prerequisites.
      var items = Object.keys(editorial).map(function (id) {
        var s = editorial[id] || {}, n = byId[String(id)] || {};
        var articlePath = String(s.article_url || "");
        if (s.manual_important !== true || s.deleted === true) return null;
        var topics = s.topics_manual === true && Array.isArray(s.topics) ? s.topics : (Array.isArray(n.topics) ? n.topics : []);
        return {
          id: String(id), title: safeText(s.title || n.title), summary: safeText(s.summary || n.summary),
          image: /^https?:\/\//i.test(String(s.image || n.image || "")) ? String(s.image || n.image) : "",
          source: safeText(n.source || "Evren Nexus"), published: String(n.published || s.updated_at || ""),
          url: String(n.url || ""), article_url: articlePath, topics: topics,
          updated_at: String(s.updated_at || "")
        };
      }).filter(function (item) { return item && item.title; });
      items.sort(function (a, b) {
        return (Date.parse(b.updated_at || b.published) || 0) - (Date.parse(a.updated_at || a.published) || 0);
      });
      addStyles();
      renderSidebar(items.slice(0, SIDEBAR_COUNT));
    }).catch(function (error) {
      console.warn("Evrenexus important sidebar unavailable:", error);
    });
  }

  function load() {
    if (window.EvrenWordPress && typeof window.EvrenWordPress.getPosts === "function") {
      window.EvrenWordPress.getPosts(true).then(function (posts) {
        if (!Array.isArray(posts)) { loadLegacy(); return; }
        if (!posts.length) { renderSidebar([]); return; }
        lastUpdated = "wordpress|" + posts.map(function (p) { return p.id + ":" + p.updated_at; }).join("|");
        renderSidebar(posts.map(function (p) {
          return { id: p.id, wordpress: true, title: p.title, summary: p.summary, image: p.image,
            url: p.url, published: p.published, updated_at: p.updated_at, topics: p.topics || [] };
        }).slice(0, SIDEBAR_COUNT));
      }).catch(function (error) {
        console.warn("WordPress important posts unavailable; using legacy feed:", error);
        loadLegacy();
      });
      return;
    }
    loadLegacy();
  }

  function start() {
    addStyles();
    load();
    window.setInterval(load, 2 * 60 * 1000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();