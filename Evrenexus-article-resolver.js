// Evrenexus-article-resolver.js — ONE definition of article readiness.
(function (root) {
  var MIN_CONTENT = 300;
  function contentText(s) { return String(s || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim(); }
  function isHttp(u) { return typeof u === "string" && /^https?:\/\//i.test(u.trim()); }
  function nonEmpty(s) { return typeof s === "string" && s.trim().length > 0; }
  function pageCanRender(a) { return !!(a && a.status === "published" && a.content); }
  function featuredReady(a, opts) {
    opts = opts || {};
    var p = [];
    if (!a) return { ok: false, problems: ["article missing"] };
    if (!pageCanRender(a)) p.push(a.status !== "published" ? "status is not published" : "content missing");
    if (!nonEmpty(a.title)) p.push("title missing");
    if (!nonEmpty(a.summary)) p.push("summary missing");
    if (typeof a.content === "string") {
      if (contentText(a.content).length < MIN_CONTENT) p.push("content shorter than " + MIN_CONTENT);
    }
    var s = a.sources && a.sources[0];
    if (!s || !nonEmpty(s.name)) p.push("sources[0].name missing");
    if (!s || !isHttp(s.url)) p.push("sources[0].url missing or invalid");
    if (!isHttp(a.image)) p.push("image missing or invalid");
    else if (opts.imageUsable && !opts.imageUsable(a.image)) p.push("image not usable");
    if (opts.outOfScope) { var t = opts.outOfScope(a); if (t) p.push("out of scope: " + t); }
    return { ok: p.length === 0, problems: p };
  }
  function find(doc, id) {
    var it = doc && doc.items;
    return it && !Array.isArray(it) ? it[id] || null : null;
  }
  var api = { MIN_CONTENT: MIN_CONTENT, pageCanRender: pageCanRender, featuredReady: featuredReady, find: find };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.EvrenArticle = api;
})(typeof window !== "undefined" ? window : this);
