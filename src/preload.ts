import { ipcRenderer } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from './config';

type SelectionState = {
  highlightIndex: number;
  commentIndex: number;
  replyIndex: number;
  inkEnabled: boolean;
  compactEnabled: boolean;
  compactPadding: number;
  selectedHighlight: HTMLElement | null;
  selectedHighlightGroup: HTMLElement[] | null;
  selectedComment: HTMLElement | null;
  selectedReply: HTMLElement | null;
};

const STYLE_ID = 'wxrd-style';
const CLASS_SELECTED = 'wxrd-selected';
const CLASS_INK = 'wxrd-ink';
const CLASS_COMPACT = 'wxrd-compact';
const HIGHLIGHT_KEY_ATTRIBUTES = [
  'data-underline-id',
  'data-wr-underline-id',
  'data-wr-id',
  'data-underline',
  'data-range',
  'data-uid',
];

const state: SelectionState = {
  highlightIndex: 0,
  commentIndex: 0,
  replyIndex: 0,
  inkEnabled: true,
  compactEnabled: false,
  compactPadding: CONFIG.UI.COMPACT_PADDING,
  selectedHighlight: null,
  selectedHighlightGroup: null,
  selectedComment: null,
  selectedReply: null,
};

// 日志函数 - 直接写入 debug.log
function log(...args: unknown[]) {
  const message = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
  console.log('[WXRD]', ...args);
  try {
    const logPath = path.join(process.cwd(), 'debug.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
  } catch (e) {
    console.error('Failed to write log:', e);
  }
}

const onReady = () => {
  log('onReady called, document.readyState:', document.readyState);
  log('URL:', window.location.href);
  injectStyles();
  setInkMode(true);
  // 使用 Capture 阶段确保能监听到 ESC
  document.addEventListener('keydown', handleKeydown, true);
  log('Keydown listener registered (capture phase)');

  // 启动面板观察器
  panelObserver.observe(document.body, { childList: true, subtree: true });

  // 延迟记录页面结构
  setTimeout(() => {
    log('Delayed page structure check:');
    log('  - Highlights:', document.querySelectorAll('.wr_underline_wrapper').length);
    log('  - All classes with "review":', Array.from(document.querySelectorAll('[class*="review"]')).map(el => el.className.split(' ').slice(0, 3).join(' ')).slice(0, 10));
  }, 3000);
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', onReady);
} else {
  onReady();
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
/* 墨水屏模式 */
.${CLASS_INK} * { animation: none !important; transition: none !important; }
.${CLASS_INK}, .${CLASS_INK} body { background: #f7f7f7 !important; color: #111 !important; }
.${CLASS_INK} img, .${CLASS_INK} canvas, .${CLASS_INK} video { filter: grayscale(1) contrast(1.05); }
.${CLASS_INK} .wr_highlight_bg { background: rgba(0, 0, 0, 0.12) !important; }
.${CLASS_SELECTED} { outline: 2px solid #111 !important; outline-offset: 2px; }

/* 正文内容的字体大小 */
/* 正文内容的字体大小 - 排除评论相关元素 */
.readerChapterContent, 
.readerChapterContent_container,
.readerChapterContent p:not([class*="review"]),
.readerChapterContent span:not([class*="review"]),
.readerChapterContent div:not([class*="review"]),
.preRenderContent p:not([class*="review"]),
.preRenderContent span:not([class*="review"]),
.preRenderContent div:not([class*="review"]) {
  font-size: ${CONFIG.UI.CONTENT_FONT_SIZE} !important;
  line-height: ${CONFIG.UI.CONTENT_LINE_HEIGHT} !important;
}

/* 紧凑阅读模式 - 浏览器验证优化的 CSS */
:root {
  --wxrd-compact-padding: 5px;
}

/* 1. 隐藏所有无关 UI */
.${CLASS_COMPACT} .readerTopBar,
.${CLASS_COMPACT} .readerControls,
.${CLASS_COMPACT} .readerFooter,
.${CLASS_COMPACT} .renderTarget_pager,
.${CLASS_COMPACT} .readerTopBar_container,
.${CLASS_COMPACT} [class*="TopBar"],
.${CLASS_COMPACT} [class*="Footer"],
.${CLASS_COMPACT} [class*="pager"] {
  display: none !important;
}

/* 2. 强制主要容器填满视口 */
.${CLASS_COMPACT} html,
.${CLASS_COMPACT} body,
.${CLASS_COMPACT} #app,
.${CLASS_COMPACT} .wr_horizontalReader_app,
.${CLASS_COMPACT} .wr_horizontalReader_app_content,
.${CLASS_COMPACT} .readerChapterContent_container,
.${CLASS_COMPACT} .readerChapterContent,
.${CLASS_COMPACT} .renderTargetContainer,
.${CLASS_COMPACT} .wr_canvasContainer {
  width: 100vw !important;
  height: 100vh !important;
  margin: 0 !important;
  padding: 0 !important;
  max-width: none !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  box-sizing: border-box !important;
}

/* 3. 关键！去除双页之间的空白 (50px padding) */
.${CLASS_COMPACT} .page { 
  padding: 0 !important; 
}

/* 4. 去除内部渲染层空白 */
.${CLASS_COMPACT} .preRenderContent { 
  padding: 0 !important; 
}

/* Canvas 强制贴边 */
.${CLASS_COMPACT} canvas {
  margin: 0 !important;
}

/* 确保背景纯白干净 */
.${CLASS_COMPACT} .wr_white_reader, 
.${CLASS_COMPACT} .readerChapterContent {
  background-color: #ffffff !important;
}

/* 1. 隐藏章节标题和顶部栏 (用户要求去掉标题) */
.${CLASS_COMPACT} .renderTargetPageInfo_header,
.${CLASS_COMPACT} .renderTargetPageInfo_header_chapterTitle,
.${CLASS_COMPACT} .readerTopBar {
  display: none !important;
}

/* 2. 恢复顶部边距 15px，保持底部 10px */
/* Top: 15px, Bottom: 10px */
.${CLASS_COMPACT} .readerChapterContent {
  font-size: ${CONFIG.UI.CONTENT_FONT_SIZE} !important;
  line-height: ${CONFIG.UI.CONTENT_LINE_HEIGHT} !important;
  height: calc(100vh - 25px) !important;
  margin-top: 15px !important;
  padding: 0 !important;
  border: none !important;
  position: relative !important;
  box-sizing: border-box !important;
  background-color: #ffffff !important;
  overflow: visible !important;
}
.${CLASS_COMPACT} .readerChapterContent::before {
  content: "";
  position: absolute;
  top: -15px;
  left: 0;
  right: 0;
  height: 15px;
  background-color: #ffffff !important;
}
.${CLASS_COMPACT} .readerChapterContent::after {
  content: "";
  position: absolute;
  bottom: -10px;
  left: 0;
  right: 0;
  height: 10px;
  background-color: #ffffff !important;
}

/* 评论列表和详情页大字体优化 */
[class*="reviewDetail"] .content,
[class*="reviewDetail"] .content *,
[class*="reviewDetail"] .text,
[class*="reviewDetail"] .item,
[class*="reviewDetail"] p,
[class*="reviewDetail"] span,
[class*="reviewDetail"] div,
[class*="reviews_panel"] .reader_float_reviews_panel_item_content,
[class*="reviews_panel"] .reader_float_reviews_panel_item_content *,
[class*="reviews_panel"] .content,
[class*="reviews_panel"] *,
[class*="item_content"] {
  font-size: ${CONFIG.UI.COMMENT_FONT_SIZE} !important;
  line-height: ${CONFIG.UI.COMMENT_LINE_HEIGHT} !important;
}
`;
  document.head.appendChild(style);
}

function setInkMode(enabled: boolean) {
  state.inkEnabled = enabled;
  document.documentElement.classList.toggle(CLASS_INK, enabled);
  log('setInkMode:', enabled);
}

function setCompactMode(enabled: boolean) {
  state.compactEnabled = enabled;
  document.documentElement.classList.toggle(CLASS_COMPACT, enabled);
  log('setCompactMode:', enabled, 'p:', state.compactPadding);

  if (enabled) {
    document.documentElement.style.setProperty('--wxrd-compact-padding', state.compactPadding + 'px');
  }

  // 关键：触发 resize 事件迫使应用重绘 Canvas
  // 使用多次触发以确保在 Canvas 初始化后也能生效
  [10, 100, 300].forEach(delay => {
    setTimeout(() => {
      log('Triggering window resize for layout update...', delay);
      window.dispatchEvent(new Event('resize'));
    }, delay);
  });
}

function adjustCompactPadding(delta: number) {
  // 调整边距：0-50px 范围
  const newPadding = Math.max(0, Math.min(50, state.compactPadding + delta));
  if (newPadding === state.compactPadding) return;

  state.compactPadding = newPadding;
  document.documentElement.style.setProperty('--wxrd-compact-padding', newPadding + 'px');
  log('adjustCompactPadding:', newPadding + 'px');
}

// 模拟完整点击事件 (Vue/React 兼容版 - 使用 PointerEvent)
function simulateClick(element: HTMLElement) {
  if (!element) return;

  // Vue 3 和现代框架通常使用 PointerEvent
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const pointerOpts: PointerEventInit = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: centerX,
    clientY: centerY,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
  };

  const mouseOpts: MouseEventInit = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: centerX,
    clientY: centerY,
    button: 0,
    buttons: 1,
  };

  // 触发完整的指针事件序列
  element.dispatchEvent(new PointerEvent('pointerdown', pointerOpts));
  element.dispatchEvent(new MouseEvent('mousedown', mouseOpts));
  element.dispatchEvent(new PointerEvent('pointerup', pointerOpts));
  element.dispatchEvent(new MouseEvent('mouseup', mouseOpts));
  element.dispatchEvent(new MouseEvent('click', mouseOpts));

  log('    simulateClick executed on:', element.className);
}

/**
 * 原生点击 (通过 Electron 主进程发送 isTrusted=true 的事件)
 */
async function nativeClick(element: HTMLElement) {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  const x = Math.round(rect.left + rect.width / 2);
  const y = Math.round(rect.top + rect.height / 2);
  log('    nativeClick at:', x, y);
  await ipcRenderer.invoke('wxrd-native-click', x, y);
}

/**
 * 强制应用字体样式到评论面板 (使用 CONFIG 配置)
 */
function forceFontSize() {
  const selectors = [
    '.reader_float_reviews_panel_item_content',
    '.reader_float_panel_reviewDetail_content',
    '.ck-content', // CKEditor content
    '[class*="reviewDetail"] [class*="content"]',
  ];

  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.setProperty('font-size', CONFIG.UI.COMMENT_FONT_SIZE, 'important');
      htmlEl.style.setProperty('line-height', CONFIG.UI.COMMENT_LINE_HEIGHT, 'important');
      // 递归应用到所有子元素
      el.querySelectorAll('*').forEach(child => {
        const childHtml = child as HTMLElement;
        childHtml.style.setProperty('font-size', CONFIG.UI.COMMENT_FONT_SIZE, 'important');
        childHtml.style.setProperty('line-height', CONFIG.UI.COMMENT_LINE_HEIGHT, 'important');
      });
    });
  });
}

// 监听 DOM 变化，当评论面板出现时强制修改样式
const panelObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement) {
          // 检查是否是评论面板或其子元素
          if (node.className.includes('review') || node.className.includes('panel') || node.querySelector('[class*="review"]')) {
            forceFontSize();
          }
          // 递归检查
          if (node.classList.contains('reader_float_reviews_panel_item_content') || node.classList.contains('reader_float_panel_reviewDetail_content')) {
            forceFontSize();
          }
        }
      });
    }
  }
});

// Global Keydown Handler (使用 Capture 捕获阶段，防止页面阻止 ESC)
function handleKeydown(event: KeyboardEvent) {
  // Allow basic navigation and shortcuts
  const code = event.code;
  const isShortcut = Object.values(CONFIG.SHORTCUTS).flat().includes(code);

  if (!event.altKey && !event.ctrlKey && !event.metaKey && !isShortcut) return;
  if (isEditableTarget(event.target)) return;

  // 仅在关键按键时打印日志，避免刷屏
  if (CONFIG.SHORTCUTS.BACK.includes(code) || CONFIG.SHORTCUTS.TOGGLE_COMPACT.includes(code)) {
    log('handleKeydown (capture):', code);
  }

  // 记录面板状态
  const detailOpen = isDetailPanelOpen();
  const mainOpen = isMainPanelOpen();

  // 快捷键处理
  let handled = true;

  if (CONFIG.SHORTCUTS.PREV.includes(code)) {
    // ArrowUp / ArrowLeft
    const delta = -1;
    if (detailOpen) selectReply(delta);
    else if (mainOpen) selectComment(delta);
    else selectHighlight(delta);
  } else if (CONFIG.SHORTCUTS.NEXT.includes(code)) {
    // ArrowDown / ArrowRight
    const delta = 1;
    if (detailOpen) selectReply(delta);
    else if (mainOpen) selectComment(delta);
    else selectHighlight(delta);
  } else if (CONFIG.SHORTCUTS.CONFIRM.includes(code)) {
    if (mainOpen && state.selectedComment) {
      clickSelectedComment();
    } else {
      clickSelectedHighlight();
    }
  } else if (CONFIG.SHORTCUTS.SCROLL.includes(code)) {
    scrollPanelOnePage();
  } else if (CONFIG.SHORTCUTS.BACK.includes(code)) {
    log('  -> handleEscape start');
    if (detailOpen) {
      log('    Handling BACK in Detail Panel');
      // 找到所有返回按钮，选择 x 坐标在 400-450 范围内的那个（列表面板的返回按钮）
      const allBackBtns = document.querySelectorAll<HTMLElement>('.reader_float_panel_header_backBtn');
      log('    Total back buttons found:', allBackBtns.length);

      let targetBtn: HTMLElement | null = null;
      let minX = Infinity;

      // 找到 x 坐标最小但大于 0 的按钮（最左边的可见按钮）
      allBackBtns.forEach((btn, i) => {
        const rect = btn.getBoundingClientRect();
        if (rect.left > 0 && rect.left < minX) {
          minX = rect.left;
          targetBtn = btn;
        }
      });

      if (targetBtn) {
        nativeClick(targetBtn as HTMLElement);
      } else {
        const closeBtn = document.querySelector<HTMLElement>(
          '.comment_detail_float_panel_reviewDetail .reader_float_panel_header_closeBtn'
        );
        if (closeBtn) simulateClick(closeBtn);
      }
    } else if (mainOpen) {
      log('    Closing Main Panel (List)');
      const selector = '.reviews_panel, [class*="float_panel"][class*="review"]';
      const panel = getVisiblePanel(selector);

      if (panel) {
        const closeBtn = panel.querySelector<HTMLElement>('.reader_float_panel_header_closeBtn, [class*="close"], [class*="Close"]');
        if (closeBtn) {
          simulateClick(closeBtn);
        } else {
          const buttons = panel.querySelectorAll('.reader_float_panel_header_closeBtn, .icon_close, [class*="close"]');
          if (buttons.length > 0) simulateClick(buttons[0] as HTMLElement);
        }
      }
    }
  } else if (CONFIG.SHORTCUTS.COPY_HIGHLIGHT.includes(code)) {
    clickCopyButton();
  } else if (CONFIG.SHORTCUTS.COPY_TEXT.includes(code)) {
    if (detailOpen && state.selectedReply) {
      copySelectedReply();
    } else if (mainOpen) {
      copySelectedComment();
    }
  } else if (CONFIG.SHORTCUTS.TOGGLE_INK.includes(code)) {
    setInkMode(!state.inkEnabled);
  } else if (CONFIG.SHORTCUTS.TOGGLE_COMPACT.includes(code)) {
    setCompactMode(!state.compactEnabled);
  } else if (CONFIG.SHORTCUTS.DECREASE_PADDING.includes(code)) {
    adjustCompactPadding(-5);
  } else if (CONFIG.SHORTCUTS.INCREASE_PADDING.includes(code)) {
    adjustCompactPadding(5);
  } else {
    handled = false;
  }

  if (handled) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return Boolean(
    el.closest(
      'input, textarea, [contenteditable="true"], [contenteditable=""], .ck-editor__editable',
    ),
  );
}

function isVisibleElement(el: Element | null): el is HTMLElement {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * 检测元素是否在其滚动容器的可视区域内（用户能看到的区域）
 */
function isElementInViewport(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  // 元素自身必须有尺寸
  if (rect.width === 0 || rect.height === 0) return false;

  // 查找最近的滚动容器
  let scrollContainer: HTMLElement | null = el.parentElement;
  while (scrollContainer) {
    const style = window.getComputedStyle(scrollContainer);
    if (style.overflow === 'auto' || style.overflow === 'scroll' ||
      style.overflowY === 'auto' || style.overflowY === 'scroll') {
      break;
    }
    scrollContainer = scrollContainer.parentElement;
  }

  if (scrollContainer) {
    const containerRect = scrollContainer.getBoundingClientRect();
    // 检查元素是否在容器可视区域内（元素的顶部或底部需要在容器范围内）
    const isAboveContainer = rect.bottom < containerRect.top;
    const isBelowContainer = rect.top > containerRect.bottom;
    if (isAboveContainer || isBelowContainer) return false;
  }

  // 同时检查视口范围
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < viewportHeight && rect.bottom > 0;
}

function getVisiblePanel(selector: string): HTMLElement | null {
  const panels = Array.from(document.querySelectorAll(selector));
  for (const panel of panels) {
    if (isVisibleElement(panel)) return panel;
  }
  return null;
}

function isDetailPanelOpen(): boolean {
  const panel = getVisiblePanel('.comment_detail_float_panel_reviewDetail');
  log('isDetailPanelOpen:', !!panel, panel);
  return Boolean(panel);
}

function isMainPanelOpen(): boolean {
  // 尝试多种可能的评论面板选择器
  const selectors = [
    '.reader_float_panel_reviewDetail',
    '.readerFloatPanel_reviewDetail',
    '[class*="reviewDetail"]',
    '[class*="float_panel"][class*="review"]',
  ];
  for (const sel of selectors) {
    const panel = getVisiblePanel(sel);
    if (panel) {
      log('isMainPanelOpen: found with', sel, panel);
      return true;
    }
  }
  log('isMainPanelOpen: false');
  return false;
}

function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return (index % length + length) % length;
}

function resolveIndex(
  list: HTMLElement[],
  previous: HTMLElement | null,
  fallback: number,
): number {
  if (!list.length) return -1;
  const idx = previous ? list.indexOf(previous) : -1;
  if (idx >= 0) return idx;
  return wrapIndex(fallback, list.length);
}

function clearSelected(el: HTMLElement | null) {
  if (el) el.classList.remove(CLASS_SELECTED);
}

function clearSelectedGroup(items: HTMLElement[] | null) {
  if (!items) return;
  for (const item of items) {
    item.classList.remove(CLASS_SELECTED);
  }
}

function setSelectedGroup(items: HTMLElement[] | null, previous: HTMLElement[] | null) {
  clearSelectedGroup(previous);
  if (!items || !items.length) return;
  for (const item of items) {
    item.classList.add(CLASS_SELECTED);
  }
  items[0].scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
}

function setSelected(el: HTMLElement | null, previous: HTMLElement | null) {
  clearSelected(previous);
  if (el) {
    el.classList.add(CLASS_SELECTED);
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
  }
}

function getHighlights(): HTMLElement[] {
  return Array.from(document.querySelectorAll('.wr_underline_wrapper')).filter(isVisibleElement);
}

function getHighlightGroupKey(el: HTMLElement): string | null {
  let current: HTMLElement | null = el;
  for (let depth = 0; depth < 4 && current; depth += 1) {
    for (const attr of HIGHLIGHT_KEY_ATTRIBUTES) {
      const value = current.getAttribute(attr);
      if (value) return `${attr}:${value}`;
    }
    for (const attr of current.getAttributeNames()) {
      if (attr.includes('underline') || attr.includes('range')) {
        const value = current.getAttribute(attr);
        if (value) return `${attr}:${value}`;
      }
    }
    current = current.parentElement;
  }
  return null;
}

function getHighlightColorKey(el: HTMLElement): string {
  for (const cls of Array.from(el.classList)) {
    if (cls.startsWith('wr_underline_color_')) return cls;
  }
  return '';
}

function getMedianHeight(rects: DOMRect[]): number {
  if (!rects.length) return 0;
  const heights = rects.map((rect) => rect.height).sort((a, b) => a - b);
  const mid = Math.floor(heights.length / 2);
  return heights.length % 2 === 0 ? (heights[mid - 1] + heights[mid]) / 2 : heights[mid];
}

function canGroupByGeometry(
  lastRect: DOMRect,
  nextRect: DOMRect,
  lineHeight: number,
): boolean {
  const vGap = Math.abs(nextRect.top - lastRect.top);

  // 同一行（垂直位置相近）应该合并
  if (vGap <= lineHeight * 0.5) return true;

  // 相邻行（垂直间距在合理范围内）
  if (vGap <= lineHeight * 2.0) {
    // 检查水平是否有重叠或连续
    const overlap = Math.max(
      0,
      Math.min(nextRect.right, lastRect.right) - Math.max(nextRect.left, lastRect.left),
    );
    const minWidth = Math.min(nextRect.width, lastRect.width);
    if (minWidth > 0 && overlap / minWidth >= 0.1) return true;

    const hGap =
      nextRect.left > lastRect.right
        ? nextRect.left - lastRect.right
        : lastRect.left - nextRect.right;
    return hGap <= lineHeight * 2.0;
  }

  return false;
}

function getHighlightGroups(): HTMLElement[][] {
  const highlights = getHighlights();
  if (!highlights.length) return [];

  const keyed = new Map<string, HTMLElement[]>();
  const unkeyed: HTMLElement[] = [];

  for (const el of highlights) {
    const key = getHighlightGroupKey(el);
    if (key) {
      const existing = keyed.get(key);
      if (existing) {
        existing.push(el);
      } else {
        keyed.set(key, [el]);
      }
    } else {
      unkeyed.push(el);
    }
  }

  const groups: HTMLElement[][] = [];
  Array.from(keyed.values()).forEach((items) => groups.push(items));

  if (unkeyed.length) {
    const entries = unkeyed
      .map((el) => ({ el, rect: el.getBoundingClientRect(), color: getHighlightColorKey(el) }))
      // 双屏阅读：先按 left 排序（左页优先），再按 top 排序
      .sort((a, b) => a.rect.left - b.rect.left || a.rect.top - b.rect.top);
    const lineHeight = getMedianHeight(entries.map((entry) => entry.rect)) || 24;

    const clustered: { items: HTMLElement[]; lastRect: DOMRect; color: string }[] = [];
    for (const entry of entries) {
      const last = clustered[clustered.length - 1];
      if (
        last &&
        last.color === entry.color &&
        canGroupByGeometry(last.lastRect, entry.rect, lineHeight)
      ) {
        last.items.push(entry.el);
        last.lastRect = entry.rect;
      } else {
        clustered.push({ items: [entry.el], lastRect: entry.rect, color: entry.color });
      }
    }
    for (const group of clustered) {
      groups.push(group.items);
    }
  }

  for (const group of groups) {
    group.sort((a, b) => {
      const rectA = a.getBoundingClientRect();
      const rectB = b.getBoundingClientRect();
      return rectA.top - rectB.top || rectA.left - rectB.left;
    });
  }

  // 双屏阅读：按页面位置分组，先左页（left 小）后右页
  // 同一页内按 top 排序
  const pageWidth = window.innerWidth / 2;
  return groups.sort((a, b) => {
    const rectA = a[0].getBoundingClientRect();
    const rectB = b[0].getBoundingClientRect();
    const pageA = rectA.left < pageWidth ? 0 : 1;
    const pageB = rectB.left < pageWidth ? 0 : 1;
    if (pageA !== pageB) return pageA - pageB;
    return rectA.top - rectB.top || rectA.left - rectB.left;
  });
}

function resolveGroupIndex(
  groups: HTMLElement[][],
  selected: HTMLElement | null,
  fallback: number,
): number {
  if (!groups.length) return -1;
  const idx = selected ? groups.findIndex((group) => group.includes(selected)) : -1;
  if (idx >= 0) return idx;
  return wrapIndex(fallback, groups.length);
}

function ensureHighlightSelection(): HTMLElement[] | null {
  const groups = getHighlightGroups();
  if (!groups.length) return null;
  const currentIndex = resolveGroupIndex(groups, state.selectedHighlight, state.highlightIndex);
  state.highlightIndex = currentIndex < 0 ? 0 : currentIndex;
  const group = groups[state.highlightIndex];
  setSelectedGroup(group, state.selectedHighlightGroup);
  state.selectedHighlightGroup = group;
  state.selectedHighlight = group[0] || null;
  return group;
}

function selectHighlight(delta: number) {
  const groups = getHighlightGroups();
  if (!groups.length) return;
  const currentIndex = resolveGroupIndex(groups, state.selectedHighlight, state.highlightIndex);
  const nextIndex = wrapIndex(currentIndex + delta, groups.length);
  state.highlightIndex = nextIndex;
  const group = groups[nextIndex];
  setSelectedGroup(group, state.selectedHighlightGroup);
  state.selectedHighlightGroup = group;
  state.selectedHighlight = group[0] || null;
}

function clickSelectedHighlight() {
  const group = ensureHighlightSelection();
  if (!group || !group.length) return;
  group[0].dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, view: window }),
  );
}

function clickSelectedComment() {
  if (!state.selectedComment) {
    log('clickSelectedComment: no comment selected');
    return;
  }

  // 优先点击评论内容区域
  const contentEl = state.selectedComment.querySelector(
    '[class*="panel_item_content"], [class*="item_content"]'
  ) as HTMLElement | null;

  const targetEl = contentEl || state.selectedComment;
  log('clickSelectedComment: simulating click on', targetEl.className);

  // 模拟完整的鼠标点击事件序列
  const rect = targetEl.getBoundingClientRect();
  const eventInit: MouseEventInit = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
    button: 0,
    buttons: 1,
  };

  // 模拟单击 (只发送一次 click，避免 Vue 重复渲染)
  targetEl.dispatchEvent(new MouseEvent('mousedown', eventInit));
  targetEl.dispatchEvent(new MouseEvent('mouseup', eventInit));
  targetEl.dispatchEvent(new MouseEvent('click', eventInit));
  // 注意：不要再发送额外的 click 事件，否则会导致 Vue 渲染两次

  log('clickSelectedComment: events dispatched');
}

function clickCopyButton() {
  // 查找评论面板中的复制按钮
  const panel = getVisiblePanel('[class*="float_panel"][class*="review"]');
  if (!panel) {
    log('clickCopyButton: no panel found');
    return;
  }

  const copyBtn = panel.querySelector('[class*="toolbar_item_copy"]') as HTMLElement | null;
  if (copyBtn) {
    log('clickCopyButton: clicking copy button');
    copyBtn.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, view: window }),
    );
  } else {
    log('clickCopyButton: copy button not found');
    // 尝试列出工具栏项目便于调试
    const toolbarItems = panel.querySelectorAll('[class*="toolbar_item"]');
    log('  Available toolbar items:', Array.from(toolbarItems).map(el => el.className).join(', '));
  }
}

function getCommentItems(): HTMLElement[] {
  // 优先使用实际匹配到的选择器
  const panelSelectors = [
    '[class*="float_panel"][class*="review"]',  // 这个实际能匹配到
    '[class*="ReviewsPanel"]',
    '[class*="reviewDetail"]',
    '.reader_floatReviewsPanel_content',
    '.reader_float_panel_reviewDetail',
    '.readerFloatPanel_reviewDetail',
  ];

  // 评论项可能的选择器
  const itemSelectors = [
    '[class*="comment_list_item"]',
    '[class*="commentListItem"]',
    '[class*="review_item"]',
    '[class*="reviewItem"]',
    '[class*="list_item"]:not([class*="sub_item"])',
    '[class*="listItem"]:not([class*="subItem"])',
    '.reader_float_panel_reviewDetail_comment_list_item',
    '.readerFloatPanel_reviewDetail_comment_list_item',
  ];

  log('getCommentItems: starting search');

  for (const panelSel of panelSelectors) {
    const panel = getVisiblePanel(panelSel);
    if (!panel) continue;

    // 记录面板内部结构便于调试
    const allChildren = Array.from(panel.querySelectorAll('*'));
    const classNames = new Set<string>();
    allChildren.slice(0, 100).forEach(el => {
      if (el.className && typeof el.className === 'string') {
        el.className.split(' ').forEach(cls => {
          if (cls && (cls.includes('item') || cls.includes('comment') || cls.includes('review') || cls.includes('list'))) {
            classNames.add(cls);
          }
        });
      }
    });
    log('  Panel found with', panelSel, 'className:', panel.className);
    log('  Relevant classes in panel:', Array.from(classNames).slice(0, 30).join(', '));

    for (const itemSel of itemSelectors) {
      const items = Array.from(panel.querySelectorAll(itemSel)).filter(isVisibleElement);
      log('    Trying', itemSel, '- found:', items.length);
      if (items.length) {
        log('  SUCCESS: Found', items.length, 'items with', itemSel);
        return items;
      }
    }
  }
  log('getCommentItems: no items found after checking all selectors');
  return [];
}

function selectComment(delta: number) {
  if (!isMainPanelOpen()) return;
  const list = getCommentItems();
  if (!list.length) return;

  // 如果当前没有选中项，或选中项不在可见区域内，按向下键选中可见的第一个，按向上键选中可见的最后一个
  let nextIndex: number;
  const hasValidSelection = state.selectedComment &&
    list.includes(state.selectedComment) &&
    isElementInViewport(state.selectedComment);

  if (!hasValidSelection) {
    // 找到可见区域内的项目
    const visibleItems = list.filter(isElementInViewport);
    if (visibleItems.length > 0) {
      const targetItem = delta > 0 ? visibleItems[0] : visibleItems[visibleItems.length - 1];
      nextIndex = list.indexOf(targetItem);
    } else {
      // 没有可见项，选择列表的第一个或最后一个
      nextIndex = delta > 0 ? 0 : list.length - 1;
    }
  } else {
    const currentIndex = list.indexOf(state.selectedComment!);
    nextIndex = wrapIndex(currentIndex + delta, list.length);
  }

  state.commentIndex = nextIndex;
  const el = list[nextIndex];
  setSelected(el, state.selectedComment);
  state.selectedComment = el;
  clearSelected(state.selectedReply);
  state.selectedReply = null;
  state.replyIndex = 0;
}

function getReplyItems(): HTMLElement[] {
  log('getReplyItems: starting search');

  // 评论详情面板选择器 - 使用 reader_float_panel_reviewDetail
  const detailPanelSelectors = [
    '.reader_float_panel_reviewDetail',
    '.comment_detail_float_panel_reviewDetail',
    '[class*="float_panel_reviewDetail"]',
  ];

  // 回复项选择器 - 排除 sub_item 以避免重复匹配嵌套回复
  const replyItemSelectors = [
    '.reader_float_panel_reviewDetail_comment_list_item:not([class*="sub_item"])',
    '.comment_detail_float_panel_reviewDetail_comment_list_item:not([class*="sub_item"])',
    '[class*="reviewDetail_comment_list_item"]:not([class*="sub_item"])',
  ];

  for (const panelSel of detailPanelSelectors) {
    const detailPanel = getVisiblePanel(panelSel);
    if (!detailPanel) continue;

    log('getReplyItems: detail panel found with', panelSel);
    log('  Panel className:', detailPanel.className);

    for (const itemSel of replyItemSelectors) {
      const items = Array.from(detailPanel.querySelectorAll(itemSel)).filter(isVisibleElement);
      log('  Trying', itemSel, '- found:', items.length);
      if (items.length) {
        log('  SUCCESS: Found', items.length, 'reply items');
        return items;
      }
    }
  }

  // 如果没有详情面板，尝试从选中的评论中获取子回复
  if (state.selectedComment) {
    log('getReplyItems: trying from selectedComment');
    const subItems = Array.from(
      state.selectedComment.querySelectorAll('[class*="sub_item"], [class*="subItem"]'),
    )
      .filter((el) => !el.className.includes('more'))
      .filter(isVisibleElement);
    if (subItems.length) {
      log('  Found', subItems.length, 'sub-items from selectedComment');
      return subItems;
    }
  }

  log('getReplyItems: no items found');
  return [];
}

function selectReply(delta: number) {
  const list = getReplyItems();
  if (!list.length) return;

  // 如果当前没有选中项，或选中项不在可见区域内，按向下键选中可见的第一个，按向上键选中可见的最后一个
  let nextIndex: number;
  const hasValidSelection = state.selectedReply &&
    list.includes(state.selectedReply) &&
    isElementInViewport(state.selectedReply);

  if (!hasValidSelection) {
    // 找到可见区域内的项目
    const visibleItems = list.filter(isElementInViewport);
    if (visibleItems.length > 0) {
      const targetItem = delta > 0 ? visibleItems[0] : visibleItems[visibleItems.length - 1];
      nextIndex = list.indexOf(targetItem);
    } else {
      // 没有可见项，选择列表的第一个或最后一个
      nextIndex = delta > 0 ? 0 : list.length - 1;
    }
  } else {
    const currentIndex = list.indexOf(state.selectedReply!);
    nextIndex = wrapIndex(currentIndex + delta, list.length);
  }

  state.replyIndex = nextIndex;
  const el = list[nextIndex];
  setSelected(el, state.selectedReply);
  state.selectedReply = el;
}

function scrollPanelOnePage() {
  log('scrollPanelOnePage: starting');

  // 查找可滚动的面板
  const panelSelectors = [
    // 评论列表面板
    '[class*="float_panel"][class*="review"]',
    // 评论详情面板
    '.reader_float_panel_reviewDetail',
    '.comment_detail_float_panel_reviewDetail',
  ];

  for (const panelSel of panelSelectors) {
    const panel = getVisiblePanel(panelSel);
    if (!panel) continue;

    log('  Found panel:', panel.className.split(' ')[0]);

    // 查找可滚动区域
    const scrollAreaSelectors = [
      '[class*="list_wrapper"]',
      '[class*="scroll_area"]',
      '[class*="content"]',
    ];

    for (const scrollSel of scrollAreaSelectors) {
      const scrollArea = panel.querySelector(scrollSel) as HTMLElement | null;
      if (scrollArea && scrollArea.scrollHeight > scrollArea.clientHeight) {
        const scrollAmount = Math.max(100, scrollArea.clientHeight * 0.9);
        log('  Scrolling', scrollSel, 'by', scrollAmount);
        scrollArea.scrollTop += scrollAmount;
        return;
      }
    }

    // 如果面板本身可滚动
    if (panel.scrollHeight > panel.clientHeight) {
      const scrollAmount = Math.max(100, panel.clientHeight * 0.9);
      log('  Scrolling panel itself by', scrollAmount);
      panel.scrollTop += scrollAmount;
      return;
    }
  }

  log('scrollPanelOnePage: no scrollable area found');
}

function copyText(text: string) {
  const safeText = text.trim();
  log('copyText:', safeText ? safeText.substring(0, 50) + '...' : '(empty)');
  if (!safeText) return;
  ipcRenderer.invoke('wxrd-copy', safeText);
}

function extractContentText(item: HTMLElement | null): string {
  if (!item) return '';
  // 优先使用精确的内容选择器，只获取评论内容文本
  const contentSelectors = [
    // 评论面板中的评论内容
    '.reader_float_reviews_panel_item_content',
    // 评论详情中的回复内容
    '.reader_float_panel_reviewDetail_comment_list_item_content',
    '.reader_float_panel_reviewDetail_comment_list_item_content_reply',
    // 通用选择器
    '[class*="item_content"]:not([class*="divider"])',
  ];

  for (const sel of contentSelectors) {
    const content = item.querySelector(sel) as HTMLElement | null;
    if (content) {
      const text = (content.innerText || '').replace(/\r\n/g, '\n').trim();
      if (text) {
        log('extractContentText: found with', sel);
        return text;
      }
    }
  }

  // 备选：使用整个元素的文本（不推荐）
  log('extractContentText: using fallback innerText');
  return (item.innerText || '').replace(/\r\n/g, '\n').trim();
}

function copySelectedComment() {
  if (!state.selectedComment) {
    selectComment(0);
  }
  copyText(extractContentText(state.selectedComment));
}

function copySelectedReply() {
  if (!state.selectedReply) {
    selectReply(0);
  }
  copyText(extractContentText(state.selectedReply));
}

function getHighlightTextFromPanel(): string {
  const panel =
    getVisiblePanel('.reader_float_panel_reviewDetail') ||
    getVisiblePanel('.comment_detail_float_panel_reviewDetail');
  if (!panel) return '';
  const content = panel.querySelector(
    '.reader_float_panel_reviewDetail_content, .comment_detail_float_panel_reviewDetail_content',
  ) as HTMLElement | null;
  const text = (content?.innerText || '').replace(/\r\n/g, '\n').trim();
  if (text) return text;
  const wrapper = panel.querySelector(
    '.reader_float_panel_reviewDetail_content_wrapper, .comment_detail_float_panel_reviewDetail_content_wrapper',
  ) as HTMLElement | null;
  return (wrapper?.innerText || '').replace(/\r\n/g, '\n').trim();
}

function copyHighlightText() {
  const text = getHighlightTextFromPanel();
  if (text) {
    copyText(text);
    return;
  }

  if (!ensureHighlightSelection()) return;
  clickSelectedHighlight();
  retryGetHighlightText(6, 200);
}

function retryGetHighlightText(remaining: number, delayMs: number) {
  window.setTimeout(() => {
    const text = getHighlightTextFromPanel();
    if (text) {
      copyText(text);
      return;
    }
    if (remaining > 0) {
      retryGetHighlightText(remaining - 1, delayMs);
    }
  }, delayMs);
}
