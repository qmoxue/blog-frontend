# 技刊 TechMag

一个米白纸质质感的杂志风技术博客页面。用分栏、首字下沉、刊号、通栏引用与错落卡片还原真实刊物的阅读节奏，而不是套一层卡片网格。

## 技术栈

- Vue 3 + TypeScript + Vite（`<script setup lang="ts">`）
- Tailwind CSS（任意值精细控制字号、字重、行高、间距）
- @vueuse/motion + `<TransitionGroup>`：滚动淡入、列表追加过渡
- @vueuse/core：`useScroll`、`useIntersectionObserver`
- lucide-vue-next：`Search`、`Menu`、`ArrowUpRight`、`X`

## 目录

```
src/
├─ components/
│  ├─ MagazineNav.vue    页眉式导航（滚动出分割线 + 移动端抽屉）
│  ├─ Masthead.vue       刊头（刊号 + 1.8 倍首字 + 右栏描述）
│  ├─ FeaturedPost.vue   7:5 不对称精选（首字下沉 + 分类标签）
│  ├─ ColumnStrip.vue    本月专栏（发丝线分栏）
│  ├─ ArticleStream.vue  文章流 + 通栏引用 + 加载更多
│  ├─ SlimeButton.vue    软胶黏块按钮（单路径形变 + 弹簧物理）
│  ├─ PageCurl.vue       图片右下角折角（纸背 + 折痕投影）
│  ├─ PostCard.vue       标准卡 / 横版卡 / 文字卡
│  └─ QuoteBlock.vue     引用块（分割线由中间向两端绘制）
├─ api/
│  ├─ client.ts          fetch 封装：统一错误码、超时、带 cookie
│  ├─ adapters.ts        后端字段 → 组件类型的翻译层（防腐层）
│  └─ articles.ts        文章 / 专栏 / 归档的业务函数
├─ data/articles.ts      本地演示数据（接口不可用时的兜底）
├─ directives/reveal.ts  v-reveal：进入视口淡入上移 12px
├─ types/index.ts        Article / NavItem / Quote / Column / StreamItem
├─ assets/fonts/         自托管字体（Gilda Display、Geist）
└─ style.css             色板、纸张纹理、动效曲线
```

## 数据从哪来

首页数据来自后端接口（另一个仓库 `E:/WorkBuddy/techmag-api`），**接口挂了会自动回退到 `data/articles.ts` 里的本地演示数据**，页面永远不会白屏。

请求地址一律写相对路径 `/api/v1/...`，开发时由 Vite 代理转发到 `127.0.0.1:3000`（见 `vite.config.ts`），生产时由 Nginx 反代。**不要写成 `http://localhost:3000`**——那样浏览器会当成跨域请求，cookie 带不过去，登录态永远建立不起来。

`api/adapters.ts` 是唯一知道「后端字段长什么样」的地方。组件只认 `types/index.ts` 里的 `Article`。后端改字段名时只改 adapter，组件一行不用动。

> 想看到真实数据，先启动后端：
>
> ```bash
> cd E:/WorkBuddy/techmag-api
> npm run seed     # 首次：灌演示数据 + 生成封面图
> npm run dev      # 端口 3000
> ```
>
> 后端没启动时，浏览器控制台会打印 `[TechMag] 接口不可用，已回退到本地演示数据`，这是预期行为。

## 几个实现决定

**文章流用「行分组」而不是 CSS columns。** `column-span: all` 的通栏元素会把分栏切成独立段落，横版卡之后只剩 2 张卡时，第三栏会整列空掉。改为按行分组：三张成一行、行末接一条通栏引用、横版卡用 `col-span-2` 真正占两栏，既没有空栏，也不需要 JS 计算高度。

**字体自托管。** 保留 Google Fonts 的 `<link>`，同时把 Gilda Display / Geist 的 woff2 放进 `assets/fonts` 并 `@font-face` 声明，避免外网不可达时整页退回 Times。中文字形不在两个拉丁字体里，`font-display` 与 `font-body` 都补了宋体 / 苹方回退链。

**图片失败降级。** 外链图片加载失败时不留破图，改用纸色占位 + `TECHMAG` 字样；头像降级为姓名首字。

**动效只用 opacity / transform。** 入场 0.8s、图片放大 1.03 倍、下划线 `scaleX`，统一 `cubic-bezier(0.22, 0.61, 0.36, 1)`；`prefers-reduced-motion` 下直接显示。

**「加载更多」是一块软胶。** `SlimeButton.vue` 不叠两层元素：整块容器的形状由**一条闭合 SVG 路径**画出来，四条边是双控点三次曲线、四个角是圆角弧。悬停时把边的控制点朝指针方向推、把角沿对角线顶出去，圆角半径同步放大——因为始终是同一条曲线的参数在变，圆角与形变之间不存在"切换"。四条边各有一个阻尼弹簧，甩动时前缘被拉长、后缘被拽回；移出后弹簧回到 0，最后精确落回标准圆角矩形（不是近似值）。文字与装饰横线是独立的 DOM 层，z 轴在路径之上，形变再大也不会被挤压。

**文章图片的折角不是 3D 翻转。** `PageCurl.vue` 用的是杂志里常见的「折角」：右下角一块纸背三角，斜边是二次贝塞尔采样出来的**轻微外弧**（不是直线，直线会像剪出来的），折线一侧压暗、靠近折痕处留一道高光，三段明暗交代纸面在弯。之所以不做真正的 `rotate3d` 翻页：真实翻折会把纸角折到对角去，而照片卡片没有"下一页"可以露出来，那个位置会变成一个洞——看起来像贴纸而不是翻角。折角从角尖 `scale(.18) → 1` 展开，折线是"扫"出来的；纸厚用 1px 偏移的 `drop-shadow` 交代，翘起投影用第二层模糊阴影。

## 开发

```bash
npm install
npm run dev               # http://127.0.0.1:5173
npm run build             # 类型检查 + 常规产物（dist/，需要 http 服务）
npm run preview           # 预览 dist/
npm run build:standalone  # 单文件产物（dist-standalone/index.html，可双击直接打开）
```

### 关于「双击 index.html 打不开」

`dist/index.html` 是通过 `<script type="module">` 加载 JS 的。用 `file://` 直接打开时，
浏览器会以 CORS 策略拒绝加载本地模块脚本（控制台报
`Access to script ... from origin 'null' has been blocked by CORS policy`），
页面就是一片空白 —— 这不是文件损坏，只是缺一个 HTTP 服务。

两种正确打开方式：

1. 起服务：`npm run preview`，然后访问终端里给出的地址；
2. 需要能双击就看的单文件：`npm run build:standalone`，
   产物 `dist-standalone/index.html` 已把 JS / CSS / 字体全部内联，双击即可。

### 用 VS Code Live Server（5500 端口）时

Live Server 是静态文件服务器，不会做 TS → JS 编译。直接打开
`http://127.0.0.1:5500/index.html` 会白屏，控制台报：

```
Failed to load module script: Expected a JavaScript module script
but the server responded with a MIME type of "video/mp2t"
```

因为根目录 `index.html` 的入口是 `<script type="module" src="/src/main.ts">`，
而 `.ts` 在 Windows 上被识别成 `video/mp2t`（MPEG 传输流），浏览器拒绝执行。

要么改开构建后的地址：`http://127.0.0.1:5500/dist/index.html`，
要么干脆用 Vite 开发服务 `npm run dev`（带热更新，改源码即时生效）。

代码规范：`.editorconfig` + `.prettierrc.json`（无分号、单引号、100 列）。
