/* Evren Nexus — published WordPress posts shared by slider, sidebar and news lists */
(function () {
  "use strict";
  var API = "https://evrenexus.ir/wp/wp-json/wp/v2/posts";
  var cached = null, cachedAt = 0, pending = null;
  var TOPIC_ALIASES = {
    "economy":"economy","markets":"markets","economy-investment":"economy-investment",
    "crypto":"crypto","currency-gold":"currency-gold","real-estate":"real-estate",
    "technology":"technology","technology-ai":"technology-ai","ai":"ai","health":"health",
    "auto":"auto","science-life":"science-life","economy-and-investment":"economy-investment",
    "realestate":"real-estate","artificial-intelligence":"technology-ai","technology-and-ai":"technology-ai"
  };
  var NAME_ALIASES = {
    "اقتصاد":"economy","بازارها":"markets","اقتصاد و سرمایه گذاری":"economy-investment",
    "اقتصاد و سرمایه‌گذاری":"economy-investment","ارزهای دیجیتال":"crypto","ارز و طلا":"currency-gold",
    "مسکن":"real-estate","املاک":"real-estate","فناوری":"technology",
    "فناوری و هوش مصنوعی":"technology-ai","هوش مصنوعی":"ai","پزشکی و سلامت":"health",
    "سلامت":"health","خودرو":"auto","علم و سبک زندگی":"science-life"
  };
  function text(v) {
    var d = document.createElement("div");
    d.innerHTML = String(v == null ? "" : v);
    return (d.textContent || d.innerText || "").replace(/\s+/g, " ").trim();
  }
  function firstImage(html) {
    var s = String(html || "");
    var m = s.match(/<img\b[^>]*(?:src|data-src|data-lazy-src)=["']([^"']+)["']/i);
    if (m && /^https?:\/\//i.test(m[1])) return m[1];
    m = s.match(/<img\b[^>]*srcset=["']([^"']+)["']/i);
    if (m) {
      var u = m[1].split(",")[0].trim().split(/\s+/)[0];
      if (/^https?:\/\//i.test(u)) return u;
    }
    return "";
  }
  function normalize(post) {
    var embedded = post && post._embedded || {};
    var media = Array.isArray(embedded["wp:featuredmedia"]) ? embedded["wp:featuredmedia"][0] : null;
    var sizes = media && media.media_details && media.media_details.sizes || {};
    var image = (sizes.large && sizes.large.source_url) ||
      (sizes.medium_large && sizes.medium_large.source_url) ||
      (sizes.full && sizes.full.source_url) || (media && media.source_url) ||
      firstImage(post && post.content && post.content.rendered);
    var terms = embedded["wp:term"] || [], topics = [];
    terms.forEach(function (group) {
      (Array.isArray(group) ? group : []).forEach(function (term) {
        var slug = String(term.slug || "").toLowerCase();
        var name = text(term.name).toLowerCase();
        var topic = TOPIC_ALIASES[slug] || NAME_ALIASES[name];
        if (topic && topics.indexOf(topic) < 0) topics.push(topic);
      });
    });
    var title = text(post && post.title && post.title.rendered);
    var summary = text(post && post.excerpt && post.excerpt.rendered);
    if (!summary) summary = text(post && post.content && post.content.rendered).slice(0, 260);
    return {
      id: "wp-" + String(post.id), wpId: Number(post.id), wordpress: true,
      title: title, summary: summary,
      image: /^https?:\/\//i.test(String(image || "")) ? image : "",
      url: String(post.link || ""), articleUrl: "",
      published: String(post.date || ""), updated_at: String(post.modified || post.date || ""),
      source: "Evren Nexus", topics: topics,
      categories: Array.isArray(post.categories) ? post.categories : []
    };
  }
  function getPosts(force) {
    if (!force && cached && Date.now() - cachedAt < 45000) return Promise.resolve(cached.slice());
    if (pending) return pending.then(function (items) { return items.slice(); });
    var fields = "id,date,modified,link,title,excerpt,content,categories,_embedded";
    var url = API + "?per_page=100&page=1&orderby=date&order=desc&_embed=1&_fields=" + encodeURIComponent(fields) + "&_wpv=" + Date.now();
    pending = fetch(url, { cache: "no-store", credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw new Error("WordPress REST API HTTP " + r.status); return r.json(); })
      .then(function (data) {
        if (!Array.isArray(data)) throw new Error("WordPress REST API returned an unexpected response");
        cached = data.map(normalize).filter(function (p) { return p.title && p.url; });
        cachedAt = Date.now();
        return cached.slice();
      })
      .finally(function () { pending = null; });
    return pending;
  }
  window.EvrenWordPress = { getPosts: getPosts, normalize: normalize, text: text, refresh: function () { return getPosts(true); } };
})();
