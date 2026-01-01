# 微信读书桌面客户端

基于 Electron 的微信读书桌面客户端，支持完整的键盘快捷键操作。

## 功能特性

### 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Alt+↑/↓` | 切换选中划线、评论或回复 |
| `Alt+Enter` | 点击选中项（打开评论面板/进入详情） |
| `Alt+C` | 复制划线原文 |
| `Alt+X` | 复制评论或回复内容 |
| `Alt+Z` | 评论面板翻页 |
| `Alt+E` | 切换墨水屏模式 |

### 智能上下文识别

- 无面板时：`Alt+↑/↓` 切换页面划线
- 评论面板：`Alt+↑/↓` 切换评论条目
- 评论详情：`Alt+↑/↓` 切换回复条目

## 核心代码结构

### main.ts - 主进程

```typescript
// 禁用 contextIsolation 允许 preload 访问 DOM
webPreferences: {
  contextIsolation: false,
  preload: path.join(__dirname, 'preload.js'),
}

// IPC 通道：日志和复制
ipcMain.handle('wxrd-log', (_, ...args) => { /* 写入 debug.log */ })
ipcMain.handle('wxrd-copy', (_, text) => { clipboard.writeText(text) })
```

### preload.ts - 快捷键核心逻辑

```typescript
// 键盘事件监听
document.addEventListener('keydown', (e) => {
  if (e.altKey) handleKeydown(e)
})

// 面板状态检测
function isMainPanelOpen()    // 评论列表面板
function isDetailPanelOpen()  // 评论详情面板

// 选择器
const 评论面板 = '[class*="float_panel"][class*="review"]'
const 评论项 = '[class*="list_item"]:not([class*="sub_item"])'
const 回复面板 = '.reader_float_panel_reviewDetail'
const 回复项 = '.reader_float_panel_reviewDetail_comment_list_item'

// 核心功能
function selectHighlight(delta)  // 切换划线
function selectComment(delta)    // 切换评论
function selectReply(delta)      // 切换回复
function extractContentText()    // 提取评论内容
function scrollPanelOnePage()    // 面板翻页
```

## 安装与运行

```bash
npm install
npm run start
```

## 调试

日志文件 `debug.log` 记录键盘事件和面板状态。

## 技术栈

- Electron + TypeScript
- 微信读书 Web 版

## 许可

MIT
