// 用户配置文件
export const CONFIG = {
  // 应用窗口设置
  WINDOW: {
    WIDTH: 1280,
    HEIGHT: 800,
    // 默认加载的 URL
    INITIAL_URL: 'https://weread.qq.com/',
  },

  // 阅读和界面设置
  UI: {
    // 评论列表和详情页的字体大小
    COMMENT_FONT_SIZE: '20px',
    // 正文内容字体大小
    CONTENT_FONT_SIZE: '40px',
    // 正文内容行高
    CONTENT_LINE_HEIGHT: '1.8',
    // 评论区行高
    COMMENT_LINE_HEIGHT: '1.6',
    // 紧凑模式下的默认边距 (px)
    COMPACT_PADDING: 5,
  },

  // 快捷键配置 (Code values from KeyboardEvent.code)
  SHORTCUTS: {
    // 导航
    PREV: ['ArrowUp'],
    NEXT: ['ArrowDown'],
    // 动作
    CONFIRM: ['Numpad0', 'Enter', 'NumpadEnter'],
    BACK: ['NumpadDecimal', 'Escape'],
    COPY_HIGHLIGHT: ['Numpad1', 'KeyC'],
    COPY_TEXT: ['Numpad2', 'KeyX'],
    SCROLL: ['Numpad3', 'KeyZ'],
    // 切换模式
    TOGGLE_INK: ['KeyE'],
    TOGGLE_COMPACT: ['KeyD'],
    // 调整
    DECREASE_PADDING: ['BracketLeft'],
    INCREASE_PADDING: ['BracketRight'],
  },
};