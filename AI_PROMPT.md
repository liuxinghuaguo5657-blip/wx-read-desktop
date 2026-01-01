# AI 提示词：构建微信读书桌面客户端

## 项目目标

使用 Electron + TypeScript 构建微信读书桌面客户端，核心功能是为 https://weread.qq.com/ 添加键盘快捷键操作支持。

## 技术要求

1. **Electron 配置**
   - 在 webPreferences 中设置 `contextIsolation: false` 以允许 preload 脚本访问网页 DOM
   - 添加 IPC 通道用于日志记录和剪贴板复制

2. **预加载脚本 (preload.ts)**
   - 监听 `keydown` 事件，处理 Alt 组合键
   - 实现面板状态检测函数判断当前上下文

## 快捷键功能

| 快捷键 | 功能 |
|--------|------|
| `Alt+↑/↓` | 切换选中划线/评论/回复（根据面板状态智能判断） |
| `Alt+Enter` | 点击选中项 |
| `Alt+C` | 复制划线原文 |
| `Alt+X` | 复制评论或回复内容 |
| `Alt+Z` | 评论面板翻页 |
| `Alt+E` | 切换墨水屏模式 |

## 关键 CSS 选择器

```
评论面板: [class*="float_panel"][class*="review"]
评论项: [class*="list_item"]:not([class*="sub_item"])
评论内容: .reader_float_reviews_panel_item_content
回复面板: .reader_float_panel_reviewDetail
回复项: .reader_float_panel_reviewDetail_comment_list_item
回复内容: .reader_float_panel_reviewDetail_comment_list_item_content
```

## 实现要点

1. **面板状态检测**
   - `isMainPanelOpen()`: 检测评论列表面板是否可见
   - `isDetailPanelOpen()`: 检测评论详情面板是否可见
   - 使用 `getVisiblePanel(selector)` 判断元素是否可见且在视口内

2. **选择逻辑**
   - 无面板时：操作页面划线元素
   - 评论面板打开时：操作评论列表项
   - 评论详情打开时：操作回复列表项

3. **选中状态**
   - 为选中元素添加 `wxrd-selected` 类
   - 使用 CSS 样式高亮显示选中项
   - 选中后自动滚动到可视区域

4. **复制功能**
   - 使用精确的内容选择器只提取文本，不包含用户昵称等无关信息
   - 通过 IPC 调用主进程的 clipboard.writeText()

5. **翻页功能**
   - 查找面板内的可滚动区域（list_wrapper, scroll_area, content）
   - 每次滚动 90% 的可视高度

## 调试建议

- 实现日志系统写入 debug.log 文件
- 记录按键事件、面板状态、选择器匹配结果
- 方便排查 DOM 结构变化导致的选择器失效
