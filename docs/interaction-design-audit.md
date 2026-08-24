# 《见好不收 / ONE MORE RELIC》交互与操作手感审计

> 审计对象：当前工作区版本（Phaser 3.90 + TypeScript 5.9 + Vite 7）  
> 审计日期：2026-08-24  
> 审计性质：只读代码检查、浏览器实机测试与交互设计；未修改游戏代码、数值或美术资源。  
> 设计原则：**输入确认必须迅速；动画、镜头和氛围可以克制、沉重。**

## 0. 结论摘要

当前版本已经具备一套可玩的输入基础：WASD 斜向速度已归一化、移动采用加减速而非瞬移速度、Arcade Physics 的贴墙滑动在本次实测中稳定、点击移动支持 A* 绕障和 WASD 接管、暂停菜单能够真正暂停来源 Scene，并且清理玩法已经是连续拖动而不是点击热点。

当前最影响手感的不是“所有系统都迟钝”，而是**输入语义和生命周期不统一**：

1. 清理与观察只监听 Scene 内 `pointerup`。鼠标移出 Canvas 后松开，`strokeActive` / `artifactDragging` 仍保持为 `true`，会造成持续清理、持续损伤或观察卡死。
2. 对话、选项和结果共用同一组 `JustDown`，缺少输入上下文切换时的释放门和缓冲清空。实测连续快速按 E 会跨过整段对话，并确认默认选项。
3. 墓穴完成态把 ESC 与 E / Enter 一起解释为“返回古玩店”，不经过暂停语义；这与游戏其余阶段的 ESC 层级不一致。
4. `JustDown` 被各 Scene 在 `update()` 中直接轮询。实测 0 ms 的快速按下/松开可在两帧之间完全丢失；35 ms 按键可正常识别。项目需要动作事件缓冲，而不是继续在每个 Scene 分散补防抖。
5. 同一个“确认/继续”在不同场景支持不同：主菜单只支持鼠标；返程对话只认 E；墓穴调查只认 E；其余部分有的认 E/Enter，有的还认鼠标。玩家不能形成稳定肌肉记忆。

建议先建立统一的 `InputActionRouter + InputContextStack + TransitionGate`，再调移动、碰撞和摄像机参数。否则继续在单个 Scene 中加 `inputLockedUntil`，会让规则更加分裂。

## 1. 审计范围与方法

### 1.1 检查范围

检查了下列正式 Scene：

- `BootScene`
- `MainMenuScene`
- `StoryIntroScene`
- `ShopIntroductionScene`
- `TombScene`
- `AntiqueShopScene`
- `ShopGrowthScene`
- `PauseMenuScene`

同时检查了仅通过 `?scene=tomb25d` 进入的 `Tomb25DPrototypeScene`。它属于开发原型，不应纳入正式控制提示或正式验收。

重点代码：

- `src/main.ts`
- `src/objects/Player.ts`
- `src/config/tombFeelConfig.ts`
- `src/objects/InvestigableObject.ts`
- `src/systems/ClickMoveController.ts`
- `src/systems/RelicCleaningController.ts`
- `src/systems/RelicInspectionController.ts`
- `src/systems/DirectionalLampSystem.ts`
- `src/systems/TombDynamicShadowSystem.ts`
- `src/ui/styleBoardUi.ts`
- 所有 `src/scenes/*.ts`

### 1.2 实机环境

- 地址：`http://127.0.0.1:5173/one-more-relic/`
- 浏览器：Google Chrome，Playwright 驱动
- 基准画布：1280 × 720
- Canvas 缩放：`Phaser.Scale.FIT` + `CENTER_BOTH`
- 测试视口：1280 × 720、1400 × 800（后者用于制造 Canvas 外释放）
- Arcade Physics Debug：关闭，与正式运行一致

### 1.3 已实际执行的测试

| 测试 | 结果 | 证据摘要 |
| --- | --- | --- |
| 主菜单 Enter 开始 | 失败 | Enter 后仍在 `MainMenuScene`；当前只有鼠标按钮。 |
| 主菜单鼠标开始 | 通过 | 单击后进入 `StoryIntroScene`，`isStarting` 防止重复启动。 |
| 剧情介绍快速连续 E | 有问题 | 连按 12 次后只前进 1 幕，其余输入在 350 ms 整屏淡出锁中被丢弃。 |
| 店内 WASD 起步与停止 | 部分通过 | 约 67 ms 达最高速；松键后约 52–92 ms 归零，反馈快速，但动画在速度未归零时已切 Idle。 |
| 斜向速度 | 通过 | W+D 稳态 `vx=132.94, vy=-132.94`，合速度恰为 188 px/s。 |
| 桌角贴墙滑动 | 通过 | 连续斜推桌体 600 ms，Y 固定、X 连续变化，无位置抖动；但动画仍按“期望速度”播放。 |
| 古玩店走到柜台并按 E | 通过 | 把角色移动到柜台交互半径内并真实按键后进入 `conversation`，世界提示正确隐藏。 |
| 点击移动与 WASD 接管 | 代码与既有脚本确认 | 点击生成路径；WASD 会取消目的地。无效点击当前没有反馈。 |
| 古玩店开场对话快速 E ×30 | 失败 | 输入穿过 25 句对话、进入选择并确认默认项，随后进入下一组 13 句对话。 |
| 墓穴返程对话快速 E ×30 | 失败 | 4 句对话与后续默认选择被跨过，直接进入 `resolved`。 |
| 清理时移出 Canvas 松开 | 失败 | 松开后 `RelicCleaningController.strokeActive === true`。 |
| 观察时移出 Canvas 松开 | 失败 | 松开后 `RelicInspectionController.artifactDragging === true`。 |
| 清理/观察反复开关监听器 | 通过 | 5 次重建后监听数保持 `pointerdown=2, pointerup=1, pointermove=2, wheel=1`，未累增。 |
| ESC 0 ms 快速点击 | 失败 | `JustDown` 在下一帧前已回到 up，暂停没有打开。 |
| ESC 35 ms 正常点击 | 通过 | 正确打开 `PauseMenuScene`，来源 Scene 暂停；再次 ESC 恢复。 |
| ESC 快速连按 ×30 | 通过/需架构化 | 只保留 1 个暂停 Scene，来源 Scene 保持暂停；现有 `openPauseMenu` guard 有效。 |
| 墓穴 F 开关灯 | 通过 | 灯从 on 切为 off，视觉过渡由 150/190 ms 参数控制。 |
| 墓穴移动、转灯与调查 | 通过 | 用 E 完成入场、W+D 移动、鼠标转向、F 往返开关后，E 成功打开 `sealed-coffin` 调查。 |
| 墓穴完成态 ESC | 失败 | 约 780 ms 后进入 `AntiqueShopScene`，未打开暂停菜单。 |
| 清理工具切换与拖动 | 通过/规则可感知 | 鼠标选择竹签并拖过图册后工具状态正确；不匹配工具几乎不清污但产生约 3.7 损伤。 |
| 观察翻面、缩放、拖灯与取证 | 通过 | A/D 到内页、缩放至 1.3×、侧光约 -51.3°并稳定悬停后记录 `blank-fibres`。 |
| 墓穴常态帧间隔采样 | 当前机器通过 | 2.5 秒采样无错误，P95 约 12.6 ms、最大约 16.7 ms；headless 结果只能说明本机无明显卡帧，不能代替低端机验证。 |
| Scene 运行错误 | 通过 | 本轮自动测试未捕获 `pageerror` 或 console error。 |

## 2. 当前控制方式总表

| 场景/状态 | 键盘 | 鼠标 | 手柄 | 当前 ESC 行为 |
| --- | --- | --- | --- | --- |
| 主菜单 | 无正式键盘操作 | 悬停、按下、单击“开始” | 无 | 无 |
| 剧情背景介绍 | E / Enter 继续；S 跳过 | 点击全屏继续 | 仅通过全局暂停键间接支持 | 暂停 |
| 古玩店初见·自由移动 | WASD；E / Enter 互动 | 点击地面移动 | 仅暂停键 | 暂停 |
| 古玩店初见·对话 | E / Enter 继续 | 点击对话框继续 | 无 | 暂停 |
| 古玩店初见·选择 | A / D 选择；E / Enter 确认 | 悬停选择、点击确认 | 无 | 暂停 |
| 墓穴自由探索 | WASD；E 调查；F 灯；Tab 背包 | 鼠标瞄灯；点击地面移动 | 暂停键 | 暂停 |
| 墓穴入场介绍 | E / Enter 继续 | 无 | 无 | 当前被入场分支吞掉，不暂停 |
| 墓穴调查面板 | E 执行/关闭；Tab 背包 | 无 | 无 | 关闭调查 |
| 墓穴背包 | 1 / 2、W / S 选择；E / Enter 确认；Tab 关闭 | 无 | 无 | 关闭背包 |
| 墓穴壁画/地窖发现 | E / Enter 确认或关闭 | 部分面板有交互对象，非统一 | 无 | 关闭当前面板 |
| 墓穴撤离确认 | E 确认 | 无 | 无 | 取消确认 |
| 墓穴完成结果 | E / Enter / ESC 返回古玩店 | 无 | 无 | **返回古玩店** |
| 返程古玩店·自由移动 | WASD；E 互动 | 点击地面移动 | 暂停键 | 暂停 |
| 返程古玩店·对话 | **仅 E** | 点击对话框继续 | 无 | 暂停 |
| 返程古玩店·选择 | A / D 选择；**仅 E** 确认 | 悬停选择、点击确认 | 无 | 暂停 |
| 养成店内自由移动 | WASD；E / Enter 互动 | 点击地面移动 | 暂停键 | 暂停 |
| 文物清理 | A / D 切工具；ESC 返回 | 按住拖动；工具按钮；停止按钮 | 无 | 返回店内 |
| 文物观察 | A / D 换面；ESC 返回 | 拖动翻面；滚轮缩放；拖工作灯 | 无 | 返回店内 |
| 鉴定/处置 | WASD 方向选择；E / Enter 确认 | 悬停、按下、点击 | 无 | 返回店内 |
| 暂停菜单 | 方向键导航；Enter 确认；ESC 取消/继续 | 悬停、点击 | 方向/A/B | ESC 继续或取消二次确认 |
| 2.5D 原型 | WASD；F3 切镜头调试 | 无 | 无 | 无正式定义 |

### 控制一致性结论

- `Space` 当前没有被正式使用。
- `Enter` 的支持不完整；返程对话/选择、墓穴调查、撤离确认都存在只认 E 的分支。
- 鼠标点击在对话类页面的覆盖不完整；墓穴入场、调查、背包、撤离确认仍偏键盘专用。
- 主菜单没有 Keyboard Focus，因此游戏尚未形成从启动到完成的完整键盘路径。
- 手柄只有暂停菜单相对完整，其余 Scene 不能宣称支持手柄。

## 3. 问题清单与代码位置

优先级定义遵循本次任务：P0 输入丢失/重复/无响应/长黑屏；P1 移动碰撞摄像机交互；P2 对话按钮转场；P3 清理观察；P4 表现增强。

| 场景/功能 | 当前输入 | 当前反馈 | 手感问题 | 原因与代码位置 | 修改建议 | 优先级 |
| --- | --- | --- | --- | --- | --- | --- |
| 全局离散输入 | Scene 在 `update()` 中轮询 `JustDown` | 命中帧才响应 | 极短按键可完全丢失 | `StoryIntroScene.ts:73-100`、`ShopGrowthScene.ts:148-173`、`TombScene.ts:824-847` 等 | 用动作事件队列记录 `keydown` 边沿，缓冲 100–140 ms，由当前输入上下文消费 | P0 |
| 对话到选项的状态切换 | 连续 E / Enter / 点击 | 文本或选项立即变化 | 同一串连按会穿过对话并确认默认选项 | `ShopIntroductionScene.ts:379-400, 999-1020`；`AntiqueShopScene.ts:369-400, 1031-1050` | 上下文切换时清空 Confirm 缓冲；要求释放后再武装；每次推进最小 90–140 ms | P0 |
| 剧情介绍推进 | E / Enter / 点击 | 每幕全容器淡出 160 ms + 淡入 190 ms | 动画锁期间输入直接丢弃；普通句切换像场景转场 | `StoryIntroScene.ts:73-81, 181-208` | 文字首次输入补全、第二次推进；普通句只做 80–140 ms 局部交叉淡化，不把输入锁绑在整屏动画上 | P0/P2 |
| 墓穴完成态 ESC | E / Enter / ESC | 650 ms 淡出后返店 | ESC 不再是暂停，极易误离开 | `TombScene.ts:892-896, 4932-4948` | 完成态 ESC 仍打开暂停；返店只由明确按钮/E/Enter触发，并有 180–250 ms transition gate | P0 |
| 清理 Canvas 外释放 | 按住拖动 | 工具和污层连续变化 | 外部松开后仍持续清理/损伤 | `RelicCleaningController.ts:73-75, 90-95, 106-130` | Pointer Capture；同时监听 `gameout`、window `pointerup`、blur、visibilitychange，统一 `cancelStroke()` | P0 |
| 观察 Canvas 外释放 | 按住拖文物 | 文物挤压/翻面预览 | 外部松开后永远处于 dragging，证据 update 直接 return | `RelicInspectionController.ts:70-75, 84-87, 140-159` | 与清理共用 `PointerGestureSession`；所有取消路径执行回弹和状态复位 | P0 |
| 场景加载 | 开始/转场 | 依赖 Scene preload 和背景色 | 冷缓存/慢网络没有进度反馈，可能出现无解释空屏 | `BootScene.ts:7-9`；`MainMenuScene.ts:128-135`；各 Scene 自行 preload | Boot 预载核心 UI；重资源转场显示带最短停留的加载层和真实 loader progress | P0（风险） |
| Player 停止动画 | 松开 WASD | 物理速度渐减 | 速度尚未归零时动画立刻 Idle，产生短距离滑脚 | `Player.ts:134-151` | 动画依据实际速度；低于 6–10 px/s 才 Idle；步频随实际速度缩放 | P1 |
| Player 加减速 | WASD | 188 px/s，2800/3600 加减速 | 起停都约 52–67 ms，偏“脆”；氛围重但无需迟钝 | `tombFeelConfig.ts:120-125`；`Player.ts:154-161` | 保持 188；加速度约 2200、减速度约 1900，起停约 85/99 ms | P1 |
| 撞墙动画 | 斜推障碍 | Arcade 正确分离并沿墙滑 | 视觉仍使用期望方向和满速动画，撞墙时脚步与位移不匹配 | `Player.ts:154-176` | 方向用输入意图，步频/是否移动用碰撞后的实际位移或 body delta | P1 |
| 碰撞体 | 28 × 28，offset 10,12 | 本轮桌角无抖动 | 对 48 × 48 角色略方，窄门和装饰角仍有卡角风险 | `Player.ts:60-75`；`TombScene.ts:5643-5703` | 先以 debug 验证足底，候选 24 × 22；只缩足底，不改墙体结构 | P1 |
| 点击移动无效 | 单击不可走点 | 什么都不发生 | 玩家无法判断是 UI 遮挡、障碍还是未识别点击 | `ClickMoveController.ts:118-126` | 80 ms 内给残缺罗盘印“拒绝”抖动/暗红闪；不得移动角色 | P1 |
| 点击寻路性能 | 每次点击同步 A* | 立即出路径 | 快速点击大地图可能同帧重复建网格和线段采样 | `ClickMoveController.ts:194-285, 288-315` | 同帧只保留最后点击；地图障碍版本不变时缓存 walkability grid；预算 2 ms | P1 |
| 世界交互目标 | 半径 + 大类优先级 + 距离 + 极宽后方惩罚 | 只高亮第一候选 | 相近目标可因优先级直接抢占；没有目标粘滞；后方容忍到 dot -0.72 | `TombScene.ts:4008-4235, 5486-5525` | 统一评分、180–250 ms 粘滞、进入/退出半径滞回、正面角度权重、近身兜底 | P1 |
| 交互可见性 | 灯光可见才进入候选 | 黑暗中无提示 | 目标刚进出光束时会闪烁；交互距离与光照边界耦合 | `DirectionalLampSystem.ts:153-210`；`TombScene.ts:4023-4028` | 可见性也做 120–180 ms 滞回；近身目标不因单帧光照抖动消失 | P1 |
| 摄像机跟随 | Tomb lerp .095、Dead Zone 84×46、Round Pixels | 平滑跟随 | lerp 为逐帧比例，帧率变化时响应时间不同；无 look-ahead/房间构图层 | `TombScene.ts:1784-1800`；`tombFeelConfig.ts:126-131` | 用 delta-time 时间常数；加入速度 look-ahead 和可撤销镜头请求栈 | P1 |
| 手电与人物朝向 | 鼠标持续控制灯和 facing | 8 向视觉 + 前进/后退判定 | 脚步动画仍主要依据期望移动；侧移/碰撞时会“身体对灯、脚对输入”不完全一致 | `TombScene.ts:867-869, 1011-1013`；`Player.ts:162-176, 217-231` | 灯光保持独立即时瞄准；上身/持灯朝 aim，脚步相位和移动方向取实际速度 | P1 |
| 主菜单 | 鼠标 | hover/pressed | 没有 Enter/Space、Keyboard Focus、Loading 状态 | `MainMenuScene.ts:78-136` | 默认聚焦开始；Enter/Space/E 确认；启动后切 Loading 并禁止重复 | P2 |
| Canvas 焦点 | W/A/S/D 会主动 focus | 无可见焦点框 | E/ESC 不主动 focus；Canvas CSS 移除 outline；键盘虽 target window 仍可工作，但无可访问焦点反馈 | `main.ts:70-79, 89-111`；`style.css:35` | 所有游戏动作可恢复焦点；仅键盘 Tab 导航时显示可见 focus ring；不要依赖焦点修复输入丢失 | P2 |
| 确认键一致性 | 各 Scene 自行定义 | 提示文字各异 | E / Enter / Space / 鼠标支持矩阵不一致 | `AntiqueShopScene.ts:353-400`；`TombScene.ts:885-1059` 等 | 统一 `Confirm={E,Enter,Space,PrimaryClick,A}`，上下文决定动作，不在 Scene 重复判断 | P2 |
| 暂停按钮 | Enter / 方向 / 鼠标 / 手柄 | focused 样式 | 鼠标没有 pressed；无 disabled/loading；键盘 focus 与 selected 共用视觉 | `PauseMenuScene.ts:192-243, 283-332` | 补齐七态；返回主菜单确认后显示 Loading；按钮 pointerdown/pointercancel 复位 | P2 |
| UI 组件状态模型 | style board 有 6 态 | 可画 default/hover/pressed/focused/disabled/selected | 缺 Loading；Focused 与 Selected 语义混合 | `styleBoardUi.ts:31-40, 85-163` | 扩展 Loading；Focus 外框与 Selected 持久标记分层 | P2 |
| 普通转场 | 420–650 ms fade | 克制的暗场 | 转场 guard 分散，真实加载无提示；部分总时长近 900 ms | `ShopIntroductionScene.ts:1080-1094`；`TombScene.ts:4675-4741, 4932-4948` | 普通淡黑 220–320 ms；满黑不超过 350 ms；重加载显示真实进度；统一 TransitionGate | P2 |
| Toast | 触发后 2.8 s 淡出 | 新 toast 复用同对象 | 旧 delayedCall 可把更新后的新 toast 提前隐藏 | `ShopGrowthScene.ts:925-927` | 保存并取消旧 timer/tween；每次 toast 使用 generation token | P2 |
| 清理插值计量 | 每 9 px 插值 | 视觉上连续 | 同一 pointermove 的每个插值点都把 dt 最小钳为 16 ms，长距离事件可能在一帧重复累计清理/损伤 | `RelicCleaningController.ts:119-137, 146-170` | 一次事件只计算一次总 dt，再按路径长度分摊；距离和时间两种强度分别归一化 | P3 |
| 清理工具跟随 | 直接贴到 pointer+offset | 即时 | 没有材质差异化跟随；任意鼠标键都能开笔 | `RelicCleaningController.ts:67-68, 106-111, 129` | 仅主键；刷/布 25–45 ms 轻滞后，竹签 10–20 ms；不增加输入延迟，只影响工具视觉 | P3 |
| 观察翻面 | 水平拖 >52 px 切下一面 | 挤压 + 160 ms 回弹 | 没有惯性/阻尼；只看累计距离；边缘释放卡死 | `RelicInspectionController.ts:140-159` | 记录拖动速度，限制 100–180 ms 惯性并吸附离散面；取消手势必回弹 | P3 |
| 观察证据 | 区域内立刻 cursor=zoom-in | 文本提示和停留发现 | 光标在条件不满足时仍暴露精确热点，变相成为隐形彩色圆圈 | `RelicInspectionController.ts:99-125` | 条件接近前保持普通观察光标；用自然反光/聚焦边缘提示，最后 150–250 ms 才微调光标 | P3 |
| 观察灯光 | 拖灯，容差 ±55–62° | dragend 给方向文字 | 提示只在 dragend 更新，拖动中“是否接近”不够连续 | `RelicInspectionController.ts:168-187`；`relicRestoration.ts:130-177` | 接近目标角 20–30°时渐进反光与低声提示；继续保留宽容差，避免像素级对准 | P3 |
| 墓穴灯光 CPU | 每帧 14 层黑暗 + 11 层光束，每层 55 射线，对 37 遮挡体求交 | 当前机器稳定 | 约 25×55×37 ≈ 50,875 次矩形求交/帧，另有点光和阴影；低端机风险 | `DirectionalLampSystem.ts:274-440`；当前运行 occluder=37 | 缓存静态求交结构；灯/相机变化不足阈值时降频；目标 60 FPS，不能以降低输入频率换性能 | P4/性能 |
| 2.5D 原型 F3 | 匿名 `keydown-F3` | 切镜头 | 开发输入没有显式清理说明 | `Tomb25DPrototypeScene.ts:55-82` | 保持 DEV-only；若继续使用，改具名 handler 并在 shutdown off | P4/开发 |

## 4. 推荐交互架构

### 4.1 `InputActionRouter`

不要让每个 Scene 继续直接组合 `JustDown`。建立动作层：

```ts
type InputAction =
  | 'MoveUp' | 'MoveDown' | 'MoveLeft' | 'MoveRight'
  | 'Interact' | 'Confirm' | 'Cancel' | 'Pause'
  | 'Inventory' | 'LampToggle' | 'Skip'
  | 'NavigateUp' | 'NavigateDown' | 'NavigateLeft' | 'NavigateRight'
  | 'PrimaryPointer' | 'Zoom';

type InputActionEvent = {
  action: InputAction;
  phase: 'pressed' | 'held' | 'released' | 'cancelled';
  device: 'keyboard' | 'mouse' | 'gamepad';
  at: number;
  sequence: number;
};
```

动作映射建议：

- `Interact`：E / 手柄 X（世界交互）
- `Confirm`：E、Enter、Space、鼠标主键、手柄 A（UI/对话）
- `Cancel`：ESC、鼠标右键、手柄 B（关闭当前局部界面）
- `Pause`：ESC、手柄 Menu；只有没有局部可取消界面时才打开暂停
- `LampToggle`：F
- `Inventory`：Tab

`keydown` 边沿进入长度受控的事件队列，不以“下一帧键是否还按着”为前提。连续移动仍读取 held state；离散操作消费 event。

### 4.2 `InputContextStack`

推荐上下文，从低到高：

1. `WorldGameplay`
2. `Dialogue`
3. `Choice`
4. `Inventory`
5. `Cleaning`
6. `Inspection`
7. `ConfirmationModal`
8. `Pause`
9. `Transition`

只有栈顶上下文可以消费离散输入。ESC 层级固定为：

```text
局部操作/局部弹窗 -> 对话内菜单（如有） -> 暂停菜单 -> 二次确认 -> 回到暂停
```

`Transition` 是唯一能暂时屏蔽大部分输入的上下文，但必须：

- 在 80 ms 内给出视觉确认；
- 持有唯一 token；
- Scene shutdown 时自动失效；
- 不把上一上下文的 Confirm 缓冲带到下一 Scene。

### 4.3 缓冲、去抖与释放门

| 规则 | 推荐值 |
| --- | --- |
| 离散输入缓冲 | 100–140 ms，建议 120 ms |
| 世界交互重复冷却 | 180–240 ms，建议 200 ms |
| 对话首次补全文字后最短再推进间隔 | 80–120 ms，建议 100 ms |
| 进入新输入上下文后的释放门 | 直到相关键/鼠标释放，再加 60–100 ms |
| Scene 转场触发锁 | 触发即锁；不使用仅靠 delayedCall 的布尔散件 |
| 长按重复导航初延迟 | 320 ms |
| 长按重复导航间隔 | 90–120 ms |

关键规则：**一次物理按下最多触发一个语义动作，且不能跨上下文。**

### 4.4 `PointerGestureSession`

清理、翻面、拖灯共用手势生命周期：

- 只接受主鼠标键或单指主触点；
- 开始时记录 pointer id，并调用 Pointer Capture；
- `pointerup`、`pointercancel`、`gameout`、window blur、`visibilitychange`、Scene shutdown 都走同一个 `cancel/finish`；
- 任何结束路径都必须恢复工具 alpha、cursor、drag flag、临时 scale/angle；
- 新手势开始前强制取消旧手势；
- 不允许清理手势和工作灯拖拽同时激活。

### 4.5 `InteractionResolver`

把 Tomb、Shop Introduction、Antique Shop、Shop Growth 的“附近目标”统一成数据候选：

```ts
type InteractionCandidate = {
  stableId: string;
  position: Phaser.Math.Vector2;
  radius: number;
  priority: number;
  facingRequired: boolean;
  enabled: boolean;
  visible: boolean;
  prompt: string;
  execute: () => void;
};
```

推荐评分：

```text
score = distanceNormalized * 0.55
      + facingPenalty      * 0.30
      + priorityPenalty    * 0.15
```

不是先按大类硬排序再看距离。剧情强制目标可以提高 priority，但近在脚边的可放回槽不应被远处目标抢走。

目标稳定规则：

- 当前目标至少保持 180 ms；
- 新目标必须比当前目标好 15% 以上才抢占；
- 进入半径与退出半径相差 16–24 px；
- 距离小于 56–64 px 时忽略面向角，防止贴身转圈；
- 灯光可见也使用 120–180 ms 滞回。

## 5. 目标交互规范与参数

### 5.1 玩家移动

| 项目 | 当前值/行为 | 目标值 | 选择理由 |
| --- | --- | --- | --- |
| 最大速度 | 188 px/s | **188 px/s**；允许 180–195 | 当前速度能兼顾探索和路线长度，不应为“更灵敏”盲目提速。 |
| 加速度 | 2800 px/s² | **2200 px/s²**；范围 2000–2500 | 到顶约 85 ms，输入快但不是瞬移。 |
| 减速度 | 3600 px/s² | **1900 px/s²**；范围 1700–2300 | 从 188 停下约 99 ms，落在 80–140 ms 验收窗。 |
| 斜向归一化 | 已归一化 | 保持 | 实测正确，禁止回归。 |
| 键盘死区 | 不适用 | 0 | 数字键输入即时。 |
| 手柄死区（未来） | 无完整支持 | 0.18，径向重映射 | 防漂移，同时保留小幅移动。 |
| 转向输入 | 当帧改变 | 逻辑方向当帧；视觉混合 50–80 ms | 快速响应，避免贴图硬跳。 |
| 碰撞体 | 28 × 28 | 候选 **24 × 22**，足底对齐 | 降低门框和桌角挂住概率；必须用 debug 与全地图回归后决定。 |
| 贴墙滑动 | Arcade 默认分离 | 保留未受阻分量 | 本轮实测稳定，不要改成反弹或全停。 |
| 墙角辅助 | 无 | 仅在持续输入且卡住时偏移 4–6 px，最多 120 ms | 小幅帮助通过视觉门口，不允许自动穿墙。 |
| 动画启动 | 有期望输入即走 | 实际速度 > 8 px/s | 避免被墙挡住仍原地满速走。 |
| 动画停止 | 无输入立即 Idle | 实际速度 < 6 px/s | 消除减速阶段滑脚。 |
| 步频 | 固定基础帧率 | 以 `actualSpeed / maxSpeed` 乘 0.75–1.05 | 视觉与位移同步。 |

灯光和朝向：

- 鼠标灯光瞄准保持即时，角度平滑速度当前 10.5 rad/s 可保留在 9–12 rad/s。
- 角色上身/持灯朝瞄准方向；脚步朝实际移动方向。
- `dot(move, aim) < -0.35` 的倒退门槛可保留为初始值，但应有 0.08–0.12 的滞回，避免边界反复切前进/倒退。
- 碰撞后必须用实际 body delta 更新步频；面向仍可保留玩家意图。

### 5.2 世界交互

| 参数 | 建议 |
| --- | --- |
| 普通器物进入半径 | 88–104 px；以美术脚点为中心 |
| 大型门/出口 | 112–128 px |
| 贴身无视面向半径 | 56–64 px |
| 正面有效角 | 目标方向与角色朝向 ±70–78°；建议 ±75° |
| 退出半径 | 进入半径 + 16–24 px |
| 目标粘滞 | 180–250 ms；建议 220 ms |
| 抢占阈值 | 新候选分数至少优 15% |
| 输入缓冲 | 120 ms |
| 单目标防重复 | 200 ms + transaction token |
| 距离不足提示窗口 | 最近目标在交互半径外 0–48 px |
| 点击移动到达半径 | 10–14 px；当前 12 可保留 |

反馈规范：

- 进入有效范围：提示在 120–180 ms 内淡入，不弹跳抢戏。
- 按 E 成功：80 ms 内出现压下/光晕/音效之一。
- 距离略不足：提示“再靠近一点”，持续 450–700 ms，同一目标 1 秒内不重复刷屏。
- 点击不可走区域：目的地风水印暗红收缩一次；不播放成功路径音。
- 目标重叠：只显示一个主提示；目标切换必须稳定，不允许每帧闪。

### 5.3 对话与提示

目标输入：E、Enter、Space、鼠标主键、手柄 A 全部等价为 Confirm。

文字节奏：

- 中文 28–36 字/秒，建议 32；英文 42–55 字符/秒，建议 48。
- 单句显示时长下限 0.45 秒，上限 2.2 秒；长句仍允许第一次输入立即补全。
- 第一次 Confirm：立即显示完整句，不进入下一句。
- 第二次 Confirm：进入下一句。
- 上一次按键尚未释放时，不得触发第二次。
- 进入 Choice 上下文后必须清空 Dialogue 的 Confirm 缓冲，避免默认选项被确认。

其他规则：

- ESC 允许暂停；恢复后保留当前句、显字进度和语音位置（语音不能精确续播时可从当前句开头重播，但不推进句子）。
- 跳过：S 或可见“跳过”按钮，建议按住 450–600 ms，防误触。
- 自动播放：默认关闭；若开启，在全文显示完后等待 1.2–2.4 秒，按文本长度调整。
- 普通句之间不使用整屏黑场。局部文本 alpha 80–140 ms 即可，背景构图保持。
- 无效点击：对话箭头轻微下压但不推进，并在 80 ms 内恢复。

### 5.4 摄像机

当前 Tomb 的 Round Pixels 和 Dead Zone 方向正确，应保留；目标参数如下：

| 项目 | 目标 |
| --- | --- |
| 跟随时间常数 | 120–180 ms，建议 150 ms，必须 delta-time 独立 |
| Dead Zone | 84–104 × 46–64 px，建议 92 × 54 |
| Look Ahead | 速度方向 24–42 px，建议最大 32 px |
| Look Ahead 平滑 | 180–240 ms |
| 像素取整 | 最终 camera scroll 取整；世界对象不反复取整 |
| 进房构图偏移 | 目标房间中心 6–10% 画幅，260–380 ms |
| 调查聚焦 | 向器物偏 40–72 px，缩放不超过 1.04–1.08，280–360 ms |
| 恐怖事件接管 | 使用可取消 token；强制镜头 250–900 ms；不吞暂停 |
| 恢复玩家 | 280–420 ms 平滑衔接，不瞬间 snap |

镜头请求栈建议：`GameplayFollow < RoomComposition < InvestigationFocus < HorrorEvent < Transition`。高层结束后恢复上一层目标，而不是每个事件直接调用 `startFollow`/`pan` 互相覆盖。

### 5.5 文物清理

当前三工具数值可以作为第一轮基线，不需推翻：软毛刷半径 34、竹签 15、干布 52。目标手感：

| 项目 | 软毛刷 | 竹签 | 干布 |
| --- | --- | --- | --- |
| 正式笔触半径 | 30–38 px | 12–18 px | 46–58 px |
| 工具视觉跟随 | 25–45 ms | 10–20 ms | 30–50 ms |
| 最佳材质 | 浮尘、松泥 | 硬锈 | 浮灰、表面膜 |
| 风险 | 很低，久停仍应提示 | 久停 450–650 ms 后快速增伤 | >380–480 px/s 易涂抹/磨损 |
| 反馈 | 细尘、软刷声 | 碎锈、细刮声 | 布摩擦、污迹拖尾 |

路径采样：

- 采样间距 `min(toolRadius × 0.25, 9 px)`，下限 5 px。
- 一次 `pointermove` 的总 dt 只计一次，再平均分配到插值点；禁止每个插值点都最小累计 16 ms。
- 快速鼠标移动也必须连续，不得出现大于笔触直径 20% 的可见断点。
- Pointer Capture 后，即便视觉指针离开文物，仍能接收释放；文物外路径不清理，但结束状态可靠。
- 损伤出现后 80 ms 内给细刮痕/纸屑/异响，避免大红字。
- “停止清理”始终可用；如果证据显露不足，允许停止，但用一句非阻断提示说明风险。
- 不自动要求 100%；当前 82% 后包浆变薄的规则方向正确。

### 5.6 文物观察

| 项目 | 建议值/行为 |
| --- | --- |
| 拖动映射 | 0.22–0.35°/px 的预览感，离散面仍使用吸附 |
| 翻面阈值 | 50–70 px 或释放速度 >350 px/s |
| 惯性 | 100–180 ms；只用于视觉收尾，不连续旋转多圈 |
| 阻尼 | 8–12 s⁻¹ |
| 吸附时间 | 160–220 ms |
| 缩放 | 0.85×–1.8×；当前 0.82×–1.8×可收窄下限 |
| 滚轮步长 | 0.08–0.12；当前 0.1 合适 |
| 灯光接近提示 | 距目标 20–30°开始自然反光；最终判定容差 45–60° |
| 证据停留 | 0.45–0.75 秒；当前 0.46–0.58 秒合适 |
| 鼠标稳定速度 | 80–110 px/s；当前 95 合适 |

证据提示不应把热点直接暴露出来：只有清理、观察面、缩放和侧光都接近有效时，才允许光标产生轻微变化；其他时候依靠纹理反光、环境音降低和自然语言观察描述。

### 5.7 UI 按钮七态规范

| 状态 | 视觉 | 输入规则 | 时间指标 |
| --- | --- | --- | --- |
| Default | 暗木/黑面板、标准铜边 | 可交互 | — |
| Hover | 边框亮 8–14%，背景亮 4–8% | 只播放一次 hover 声；不自动确认 | 进入后 ≤50 ms |
| Pressed | 下压 1–2 px 或 scale 0.97–0.985；内阴影加强 | pointerup 在同一按钮才确认 | 按下后 ≤50 ms |
| Selected | 持久金色标记/虚线，不依赖 hover | 表示数据选择，不等于键盘焦点 | 即时 |
| Disabled | alpha 0.45–0.65、普通光标 | 不接收确认；可给原因 tooltip | 即时 |
| Keyboard Focus | 独立 2 px 外框/四角焦点 | Enter/Space/E 可确认 | 导航后 ≤50 ms |
| Loading | 文本省略号/小印章转动；保持布局 | 禁止重复触发；直到 promise/Scene ready | 触发后 ≤80 ms |

必须补充 `pointercancel` / `pointerout` 复位。Keyboard Focus 与 Selected 不得再共用同一种视觉，否则玩家无法区分“正在浏览”和“已经选择”。

## 6. 每个 Scene 的修改方案

### 6.1 `BootScene`

- 保持职责轻量，不添加剧情逻辑。
- 预载通用字体回退检测、核心 UI、主菜单资源和加载层资源。
- 暴露 loader progress；重资源 Scene 可复用同一加载层。
- 不建议把所有墓穴大图一次性塞入 Boot，避免首屏等待过长。

### 6.2 `MainMenuScene`

- 默认 Keyboard Focus 在“开始游戏”。
- Enter / Space / E / 手柄 A 与鼠标点击一致。
- pointerdown 显示 Pressed；触发后改 Loading，而不是停留在 Pressed。
- `isStarting` 保留，但由统一 TransitionGate 承担跨设备重复触发。
- 主菜单标题 650 ms 淡入可保留；按钮不应等待标题动画结束才响应。

### 6.3 `StoryIntroScene`

- 移除普通幕之间对整个 `root` 的输入锁。
- 增加逐字显示状态：第一次 Confirm 补全文字，第二次推进。
- 背景图可 180–260 ms 交叉淡化，文字局部 80–140 ms；不全屏黑。
- S 改为按住跳过，并显示进度；ESC 暂停。
- 从 Story 到 Shop Introduction 使用 TransitionGate，清除 Confirm 缓冲。

### 6.4 `ShopIntroductionScene`

- 1.6 秒入场标题期间允许移动可以保留，但要明确：标题不是输入锁。
- 对话统一 E / Enter / Space / click；选择使用鼠标、方向和 Confirm。
- 每个 Dialogue → Choice → Dialogue 切换都要求释放门，杜绝连按默认选择。
- 当前 150 ms 文本淡入可以保留，不应阻塞下一次合法输入。
- 柜台交互从纯距离改用统一 InteractionResolver，加入目标滞回。
- 出发转墓穴的 250 + 650 ms 动画可保留沉重感，但满黑段要有加载/转场信息，输入触发后 80 ms 内确认。

### 6.5 `TombScene`

- 优先修正完成态 ESC：局部面板先取消，否则一律暂停；不得直接返店。
- 入场介绍、调查、背包、壁画、地窖发现和撤离确认全部接入 InputContextStack。
- 统一 Confirm 支持 E / Enter / Space / click；Tab 只负责背包。
- 交互目标加入 220 ms 粘滞、距离滞回、面向权重和光照可见滞回。
- 灯光 F 必须保持即时，不受普通镜头动画影响；暂停和 Transition 时禁用。
- Player 动画以实际速度为准；保留独立灯光瞄准。
- Camera 使用 delta-time 时间常数，保留 Round Pixels；加入房间构图请求层。
- 墓穴与地窖切换继续使用渐黑，但 `cellarTransitionActive` 改为统一 token；Scene shutdown 可取消 delayedCall。
- 灯光射线优化只降低重复计算，不降低输入/Player update 频率。
- 当前隐藏调试 F3/F6/F7/F8 继续限制在 DEV，不写入正式控制提示。

### 6.6 `AntiqueShopScene`

- 对话与选择补齐 Enter / Space；鼠标现有实现保留。
- 连按必须不能越过 Conversation Completion 并确认默认报价。
- `resolved` 页面需要 Loading 状态，防止 E/Enter 重复启动 Shop Growth。
- 柜台交互使用统一目标选择，不再只用一个布尔 `shopkeeperNearby`。
- Arrival 2.6 秒不应阻止暂停；是否允许移动保持现状即可。

### 6.7 `ShopGrowthScene`

- 清理和观察先修手势取消路径，再调工具手感。
- 清理插值 dt 按事件总量分摊；仅主键开笔。
- 观察加入有限惯性/阻尼；去掉条件不足时的精确热点 cursor 泄露。
- A/D 在清理切工具、观察切面、鉴定横向选择时由上下文解释；切换上下文必须清 held state。
- ESC 关闭 Focus 后不要在同一次物理按下继续打开 Pause。
- Toast 使用 generation token，避免旧 timer 隐藏新消息。
- 鉴定/处置按钮补齐 Keyboard Focus、Disabled、Loading。
- 店内自由移动与工作台 Focus 的 ClickMove 启停逻辑当前正确，保留。

### 6.8 `PauseMenuScene`

- 保留 `openPauseMenu` 的 active/paused guard 和来源 Scene pause；这是当前可靠设计。
- 保留首次 160 ms 输入保护和再次 ESC 继续语义。
- 补 pointerdown Pressed、pointercancel、Loading；返回主菜单确认后立即进入 Loading。
- 增加 E / Space 作为 Confirm，与全局规则一致。
- 焦点导航按实际按钮数量 clamp/wrap，不写死二选一，以便将来加入设置。
- 返回主菜单前继续二次确认；不要改为长按或单击直接返回。

### 6.9 `Tomb25DPrototypeScene`

- 明确标记 DEV-only，不纳入普通构建入口和控制说明。
- 若保留 F3 调试，使用具名 handler 并在 shutdown 清理。
- 不要把原型镜头参数反向覆盖正式 Tomb 参数。

## 7. 推荐实施顺序

### P0-A：输入生命周期（必须最先）

1. 新建 `InputActionRouter`、`InputContextStack`、`TransitionGate`。
2. 为离散输入加入 120 ms 缓冲和跨上下文释放门。
3. 修复清理/观察 Canvas 外释放与 blur/visibility cancel。
4. 修复 Tomb 完成态 ESC。
5. 先迁移 Pause、Dialogue、Choice 三类输入，建立最小闭环。

### P0-B：加载与转场

1. 建统一加载层。
2. 所有 Scene start 走 TransitionGate。
3. 冷缓存、慢网和资源失败显示反馈；取消无提示空屏。

### P1：移动、碰撞、交互和摄像机

1. Player 动画改读实际速度。
2. 调整 accel/decel；保留 188 最大速度和斜向归一化。
3. 在 Debug 下试 24×22 碰撞体并跑全地图；不直接提交未经路线验证的尺寸。
4. 接入 InteractionResolver 和目标粘滞。
5. 摄像机改 delta-time 平滑，加入 look-ahead/请求栈。

### P2：对话、按钮、焦点、转场细节

1. 统一 E/Enter/Space/click。
2. 实现首次补全文字、第二次推进。
3. 补齐七态按钮与主菜单键盘路径。
4. 修复 Toast 竞态。

### P3：清理与观察手感

1. 修正清理插值计量。
2. 加工具视觉跟随差异。
3. 加有限惯性、阻尼和吸附。
4. 调整自然证据提示，不显示隐形热点。

### P4：表现与性能

1. 音效、粒子、轻微镜头反馈。
2. 灯光射线缓存与低端机性能档。
3. 调试输入和诊断 overlay 清理。

## 8. 验收指标与测试清单

### 8.1 自动化必须覆盖

- [ ] 任意离散键按下后 80 ms 内出现视觉/声音确认。
- [ ] 模拟 5 ms、15 ms、35 ms 的 E/ESC 按键，均被动作队列记录一次。
- [ ] 快速按 30 次 E：不会漏掉合法世界交互，也不会对同一对象重复执行事务。
- [ ] 在 Dialogue 最后一句连按 E：不会自动确认 Choice 默认项。
- [ ] 在 Choice 确认时保持 E：下一段 Dialogue 不自动前进。
- [ ] ESC 在墓穴完成态只打开暂停，不触发返店。
- [ ] 暂停/继续循环 20 次，Pause Scene 始终最多一个，来源状态完整。
- [ ] 清理中移出 Canvas 松开，100 ms 内 `strokeActive=false`。
- [ ] 观察和拖灯中移出 Canvas 松开，100 ms 内所有 drag flag=false，文物吸附回合法状态。
- [ ] 浏览器 blur、切换标签页、`visibilitychange=hidden` 后所有 held/drag state 清空。
- [ ] Scene 切换 20 次后 pointer/keyboard listener 数不增长。
- [ ] 无效地图点击 80 ms 内显示拒绝反馈，角色不移动。
- [ ] 快速连续点击两个有效目的地，只执行最后一次寻路请求。

### 8.2 移动与碰撞

- [ ] 直线稳态速度 188 ±2 px/s。
- [ ] 斜向稳态速度不高于直线 1%。
- [ ] 从静止到 95% 最大速度约 80–120 ms。
- [ ] 松开方向键后约 80–140 ms 停止。
- [ ] 动画在实际速度 <6 px/s 后才 Idle。
- [ ] 连续斜推每个门框/桌角 3 秒，不发生位置正负反复或可见抖动。
- [ ] 被墙阻挡时，未受阻轴继续滑动；步频按实际位移降低。
- [ ] 点击移动途中按 WASD，80 ms 内取消自动移动。

### 8.3 交互与摄像机

- [ ] 两目标距离差小于 12 px 时，轻微移动不会让提示每帧跳变。
- [ ] 当前目标至少稳定 180 ms，除非它失效或玩家明确转向。
- [ ] 进入/退出交互边缘来回移动 10 次，提示不闪烁。
- [ ] 灯束边缘扫过目标时，提示具有 120–180 ms 可见滞回。
- [ ] 摄像机 30/60/120 FPS 下达到同一跟随偏移的时间差不超过 30 ms。
- [ ] Camera scroll 取整后角色和墙面无细碎亚像素抖动。
- [ ] 调查/恐怖镜头结束后 280–420 ms 内平滑恢复玩家跟随。

### 8.4 对话与 UI

- [ ] 第一 Confirm 只补全文字，第二 Confirm 才换句。
- [ ] E、Enter、Space、鼠标主键行为一致。
- [ ] 普通句切换无整屏黑场。
- [ ] 主菜单可以纯键盘开始游戏。
- [ ] 每个按钮均可截图验证 Default/Hover/Pressed/Selected/Disabled/Keyboard Focus/Loading。
- [ ] Pressed 在 pointerout/pointercancel 后必定复位。
- [ ] 普通转场满黑不超过 350 ms；真实加载显示进度或明确加载反馈。

### 8.5 清理与观察

- [ ] 快速拖动不留下大于笔触直径 20% 的污层断点。
- [ ] 相同路径在 30/60/120 FPS 下清理进度误差不超过 3%。
- [ ] 一次超长 pointermove 不会因插值点数量成倍增加 damage。
- [ ] 三工具在范围、效率、风险、声音和光标动画上可盲测区分。
- [ ] 损伤发生后 80 ms 内可见/可听，但不出现大型红字。
- [ ] 玩家可在任意进度主动停止；未清够只影响证据，不阻塞流程。
- [ ] 观察翻面释放后 220 ms 内吸附到合法面。
- [ ] 证据不会因单纯悬停热点而发现；必须满足清理、面、缩放、灯光和停留。

### 8.6 性能

- [ ] 目标机器主要场景稳定接近 60 FPS。
- [ ] 60 FPS 下主线程单帧 P95 <16.7 ms，P99 <25 ms。
- [ ] 点击寻路单次同步预算 <2 ms；超预算则分帧或缓存。
- [ ] 灯光优化不能降低 Player/Input 更新频率；输入仍每帧处理。
- [ ] 低端设备进入墓穴时无超过 350 ms 的无反馈黑屏。

## 9. 回归风险

| 风险 | 可能回归 | 防护 |
| --- | --- | --- |
| 从 `JustDown` 迁移动作队列 | 同一按键被旧代码和新 Router 各处理一次 | 每迁移一个上下文就删除/禁用旧轮询；加消费日志和 sequence id。 |
| ESC 层级统一 | 局部弹窗关闭后同次 ESC 又打开暂停 | 事件只允许消费一次；上下文切换要求释放门。 |
| 缩小碰撞体 | 角色视觉穿入桌柜/墙角 | 只缩足底；全地图门框、桌角、墓室碰撞截图回归。 |
| 调低减速度 | 角色靠近互动点时略过半径 | InteractionResolver 使用滞回；点击移动提前制动。 |
| Camera look-ahead | 小房间露出黑边或 UI 判断错位 | look-ahead 受 camera bounds 限制；UI 全部 scrollFactor 0。 |
| Pointer Capture | UI 按钮和清理工具争抢 pointer | 手势开始时检查 top input context 和 hit target；每次只允许一个 session。 |
| 清理 dt 修正 | 旧存档 progress 与新速率体感变化 | 保留存档字段；为旧 mask 点做版本迁移；用相同路径回放对比。 |
| 证据光标降提示 | 玩家再次觉得“触发困难” | 用渐进反光、方向文字和容差提示替代热点，不减少已有宽容差。 |
| 统一 Confirm | Space 可能导致页面滚动 | Phaser capture Space，Canvas 激活时 `preventDefault`；输入框焦点时不拦截。 |
| 加载层 | Scene 已 ready 但最短展示造成假等待 | 无硬性最短等待，只有 120–180 ms 防闪烁阈值；资源已就绪可立即进入。 |
| 灯光缓存 | 光束穿墙或动态门更新不及时 | 遮挡体版本号；门/棺/地窖状态变化时使缓存失效。 |

## 10. 明确不建议修改的现有设计

1. **不提高最大移动速度来制造“灵敏”。** 当前 188 px/s 合理；灵敏应来自输入确认、起步和反馈，而不是把探索变成街机冲刺。
2. **不移除移动加减速。** 只把停步调到 80–140 ms，并让动画跟上实际速度。
3. **不取消斜向归一化。** 当前实现和实测都正确。
4. **不取消 Arcade Physics 的贴墙滑动。** 本轮桌角实测稳定；只需调整动画和在必要时加极轻墙角辅助。
5. **不把手电朝向强制绑定移动方向。** 鼠标独立瞄准是墓穴观察和恐怖构图的重要玩法；应解决的是上下身动画协调。
6. **不把所有互动目标永久高亮。** 保留灯光、观察和探索感，只为目标选择增加稳定性与距离不足反馈。
7. **不把对话动画全部删除。** 保留 80–150 ms 局部淡入和语音/手势；删除的是吞输入的整屏锁。
8. **不把清理改回点击热点。** 当前连续遮罩方向正确，应修生命周期和计量。
9. **不把观察改成直接显示彩色热点。** 继续使用缩放、侧光、朝向和停留，但提高渐进提示的可理解度。
10. **不删除暂停二次确认。** 当前“返回主菜单”二次确认和来源 Scene pause 是可靠设计，应保留。
11. **不为了修输入而提高全局 `timeScale`、跳过氛围动画或缩短所有剧情。** 输入层和表现层需要解耦。
12. **不让点击移动替代 WASD。** 两种模式并存；WASD 始终即时接管并取消自动路径。
13. **不把 Tomb 2.5D 原型的 F3 调试操作暴露到正式游戏。** 它不是玩家功能。

## 11. 开发完成定义

本轮交互改造只有同时满足以下条件才算完成：

- 输入动作由统一上下文消费，不再由 Scene 各自猜测同一按键语义；
- 快速输入不丢失，也不能穿透状态确认默认选项；
- 所有拖拽都能在 Canvas 外释放、窗口失焦和 Scene shutdown 时可靠结束；
- 玩家移动保持 188 px/s 和斜向归一化，起停落在目标时间窗，动画与实际位移同步；
- 世界交互目标稳定、有距离不足和无效点击反馈；
- ESC 层级在所有 Scene 一致，墓穴完成态不再直接返店；
- 对话、UI、清理、观察的输入均在 80 ms 内给确认；
- 普通转场满黑不超过 350 ms，真实加载有反馈；
- 主要场景接近 60 FPS，性能优化不牺牲输入采样频率；
- 上述自动化清单进入持续回归，而不是只进行一次人工试玩。
