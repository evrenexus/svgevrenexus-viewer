// Explicit host-side entry point for regenerating permanent article pages.
// build-featured.mjs currently exits after regular-list synchronization, so this
// invokes the exported page builder directly without enabling automatic selections.
import { loadAll, linkAll } from "./featured-lib.mjs";
import { generateImportantPages } from "./build-important-pages.mjs";

const { rows } = linkAll(loadAll());
const generated = generateImportantPages(rows);
console.log("Host article-page build completed: " + generated.size + " pages generated or preserved.");
