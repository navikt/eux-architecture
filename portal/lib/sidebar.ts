/**
 * Collapsed/expanded state for the desktop sidebar. The source of truth is the
 * `data-sidebar` attribute on <html>: this boot script (run from app/layout.tsx)
 * sets it from localStorage before first paint, so the CSS renders the right
 * width with no flash. components/Sidebar.tsx reads and updates it.
 */
export const SIDEBAR_STORAGE_KEY = "portal-sidebar";
export const SIDEBAR_COLLAPSED = "collapsed";

/** Where the sidebar is a fixed column; below it, it's a fold-out menu. Keep in sync with globals.css. */
export const SIDEBAR_DESKTOP_QUERY = "(min-width: 900px)";

export const sidebarBootScript = `try{if(localStorage.getItem(${JSON.stringify(
  SIDEBAR_STORAGE_KEY,
)})===${JSON.stringify(SIDEBAR_COLLAPSED)})document.documentElement.setAttribute("data-sidebar",${JSON.stringify(
  SIDEBAR_COLLAPSED,
)});}catch(_){}`;
