export const TOPICS=["economy","markets","currency-gold","real-estate","technology","ai","health","auto","science-life"];
export const HOME="home";
export const FEATURED_COUNT=4;
export const REGULAR_PER_PAGE=16;
export const REGULAR_MAX=160;
export const MIN_FEATURED_SCORE=0;
export const LINK_RATE_MIN=0.95;
export const LINK_SCHEME="sha256(news.id)";
export const articleUrl=a=>{const id=a?.id??a?.slug??a?.__key;return id?"articles/"+encodeURIComponent(String(id))+".html":"";};