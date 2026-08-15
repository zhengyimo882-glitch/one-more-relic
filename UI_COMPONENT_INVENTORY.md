# 《见好不收》像素UI组件清单

设计基准：1280×720，建议像素资产按1×逻辑像素制作并以整数倍缩放；安全区左右24、上20、下24。尺寸为推荐包围盒，不是强制最终美术尺寸。

## 通用组件（共30种）

|ID|组件|使用Screen|建议尺寸|九宫格|透明底|动态文字|状态|动画|P|
|---|---|---|---:|:---:|:---:|:---:|---|---|:---:|
|C01|主按钮|S01/S05/S15/S16/S19|240×56|是|是|是|Default/Hover/Pressed/Focused/Disabled|按下1–2px、焦点脉冲|P0|
|C02|次按钮|S05/S19/S20|220×52|是|是|是|同C01|同C01|P0|
|C03|危险按钮|S20|220×52|是|是|是|Default/Hover/Pressed/Focused/Warning|朱砂边框/印记闪现|P0|
|C04|图标按钮|工具/关闭/页签|40×40|是|是|否|Default/Hover/Pressed/Focused/Disabled|轻位移|P1|
|C05|探索目标签|S04/S08/S12|自适应，最大320×64|是|是|是|Collapsed/Expanded/New/Complete/Hidden|展开、完成盖章、淡出|P0|
|C06|对象交互提示|S04/S08/S12|180×48|是|是|是|Available/Focused/Disabled/Warning/OutOfBounds|靠近淡入、主键跳动一次|P0|
|C07|按键胶囊|所有操作页|24×24或自适应|是|是|是|Keyboard/Mouse/Gamepad/Pressed/Disabled|按下压缩|P0|
|C08|携带槽1/1|S08|150×54|是|是|是|Empty/Filled/Swap/Warning|拾取弹入、放置淡出|P0|
|C09|归位计数|S08|180×30|是|是|是|0/N/Progress/Complete|数字跳变、完成印章|P0|
|C10|Toast|全流程|最大620×48|是|是|是|Info/Success/Warning/Error/Resource|上浮+淡出|P0|
|C11|对话框|S04/S05|1120×180|是|是|是|Narration/NPC/Player/Thought/Appraisal|逐字可选、说话人切换|P0|
|C12|肖像框|S04|128×128|否|是|否|NPC gesture/Player/Narrator empty|2–4帧表情|P1|
|C13|对话进度/继续|S04|120×24|否|是|是|Continue/Auto/End|省略号/箭头循环|P1|
|C14|双选项卡|S05/S15|440×88|是|是|是|Default/Hover/Focused/Selected/Disabled|焦点描边、确认盖章|P0|
|C15|四选项卡|S16|480×132|是|是|是|同C14+Locked/Warning|同C14|P0|
|C16|专注层标题栏|S13–S17|1160×84|否|是|是|Default/StepComplete/BackAvailable|进入淡入|P0|
|C17|纸页/证据面板|S14/S15/S17|320×410及720×480|是|可选|是|Empty/Partial/Complete/Anomalous|新证据墨迹写入|P0|
|C18|证据条目|S14/S15|280×64|否|是|是|Unknown/Discovered/Used/Damaged|发现盖朱砂点|P0|
|C19|证据热点|S14|24×24|否|是|否|Hidden/Near/Available/Found/Damaged|呼吸、点击收束|P0|
|C20|清理污损遮罩|S13|随器物|否|是|否|Untouched/Active/Removed/Damaged|擦除、碎屑|P0|
|C21|清理工具卡|S13|270×62|是|是|是|Default/Hover/Selected/Disabled/Risky|工具切换、风险闪烁|P0|
|C22|线性进度条|S13/加载候选|240×12|是|是|可选|Empty/Progress/Complete/Warning|平滑填充或像素分段|P1|
|C23|货币变化签|S16/结算Toast|160×40|是|是|是|Gain/Loss/Estimate/Pledged|数字滚动、铜钱跳出|P1|
|C24|物品/展示槽|S12/S18|72×72|是|是|是|Empty/Filled/Focused/Locked/New/SetComplete|物品落位、New角标|P1|
|C25|锁定与新内容角标|S16/S18|16×16/24×12|否|是|否|Locked/New/Warning|New闪一次|P1|
|C26|确认弹窗|S10/S20|620×300|是|是|是|Default/Warning/KeyboardFocus/GamepadFocus|弹入、危险确认停顿|P0|
|C27|暂停菜单面板|S19|500×430|是|是|是|Default/ConfirmOverlay|淡入遮罩|P0|
|C28|场景标题卡|S03/S07|最大360×96|否|是|是|Enter/Hold/Exit|淡入停留淡出|P2|
|C29|异常墨迹效果|S17/S18|可平铺/遮罩|否|是|否|Dormant/Revealing/Marked/Afterglow|逐像素渗墨、轻抖|P1|
|C30|焦点框与光标|所有交互页|9-slice + 16×16光标|焦点框是|是|否|Mouse/Keyboard/Gamepad/Danger|整数像素移动、无模糊缩放|P0|

## 目前不存在、暂不应要求MiniMax设计的控件

滑条、开关、下拉选择、滚动条、存档槽、加载旋转器、分页背包格和键位绑定控件当前没有使用页面。若未来新增设置/存档，再作为独立增补批次；本轮不应混入正式组件包。

## 像素交付规范

- 所有面板同时交付：透明PNG外观层、可拉伸中心/边角切片说明、文字安全框。
- 交互控件必须用同一轮廓尺寸提供至少 Default、Hover、Pressed、Focused、Disabled；危险控件另给 Warning。
- 不依赖颜色区分：Focused需轮廓/角标，Disabled需图形和明度变化，Error需符号或短文案。
- 中文正文优先像素黑体或点阵宋体，但必须覆盖常用汉字；12px以下不可承担关键正文。
- 器物、场景背景和角色不属于UI资产，不得重绘进组件切片。

