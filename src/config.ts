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
    COMMENT_FONT_SIZE: '30px',
    // 正文内容字体大小
    CONTENT_FONT_SIZE: '30px',
    // 正文内容行高
    CONTENT_LINE_HEIGHT: '1.5',
    // 评论区行高
    COMMENT_LINE_HEIGHT: '1.2',
    // 紧凑模式下的默认边距 (px)
    COMPACT_PADDING: 5,
    // 评论面板宽度 (如 '500px'、'600px' 或 '80%')
    COMMENT_PANEL_WIDTH: '50%',
    // 选中划线的边框粗细 (如 '2px'、'3px'、'4px')
    SELECTED_BORDER_WIDTH: '5px',
    // 评论面板是否显示在高亮同侧 (true=同侧会遮挡内容, false=异侧不遮挡/原始行为)
    PANEL_SAME_SIDE: true,
    // 左侧高亮时面板的 X 坐标 (px - 数字)
    LEFT_PANEL_X: 10,
    // 右侧高亮时面板的 X 坐标 (px - 数字 或 百分比字符串如 '50%')
    RIGHT_PANEL_X: '50%',
  },

  // 快捷键配置 (Code values from KeyboardEvent.code)
  SHORTCUTS: {
    // 导航
    PREV: ['ArrowUp'],
    NEXT: ['ArrowDown'],
    // 动作
    CONFIRM: ['Numpad0', 'Enter', 'NumpadEnter', 'Space'],
    BACK: ['NumpadDecimal', 'Escape', 'KeyA'],
    COPY_HIGHLIGHT: ['Numpad1', 'KeyC'],
    COPY_TEXT: ['Numpad2', 'KeyX'],
    SCROLL: ['Numpad3', 'KeyZ', 'PageDown'],
    // 切换模式
    TOGGLE_INK: ['KeyE'],
    TOGGLE_COMPACT: ['KeyD'],
    // 调整
    DECREASE_PADDING: ['BracketLeft'],
    INCREASE_PADDING: ['BracketRight'],
  },
};