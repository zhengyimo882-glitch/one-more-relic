# 清代风水师墓视觉审计截图索引

采集日期：2026-08-14  
运行地址：`http://127.0.0.1:4173/one-more-relic/?scene=tomb`  
采集环境：Chrome Headless，1280×720，deviceScaleFactor 1，Vite 本地开发构建。  
采集原则：保留正式 HUD；关闭调试文本、碰撞/路径可视化；只调用项目现有场景、灯光、器物与遭遇状态，不生成或拼接不存在的画面。

## 截图清单

| 文件 | 当前实现中的真实内容 | 状态 |
|---|---|---|
| `TOMB_A_entrance_default.png` | 长甬道最南端的出生/撤离端；当前没有独立盗洞房 | 灯开，默认 |
| `TOMB_A_entrance_light.png` | 同上，灯束指向北侧朱门 | 灯开，主方向 |
| `TOMB_A_entrance_lamp_off.png` | 同上 | 灯灭，最低环境亮度 |
| `TOMB_B_corridor_default.png` | 壁画甬道下段 | 灯开，前向 |
| `TOMB_B_corridor_mural_light.png` | 壁画甬道，灯束偏向壁画 | 壁画仍只获得很弱显现 |
| `TOMB_B_corridor_lamp_off.png` | 壁画甬道 | 灯灭 |
| `TOMB_C_frontroom_default.png` | 中央供物室及东西耳室 | 默认阵列 |
| `TOMB_C_frontroom_artifact_light.png` | 随葬器皿与中央阵列 | 灯照关键器物 |
| `TOMB_C_frontroom_disturbed.png` | 随葬器皿被真实拿起 | `Remembering`，原位标记与正式反馈出现 |
| `TOMB_C_frontroom_after_disturbance.png` | 离开原位后的中央/南室过渡 | `Following` |
| `TOMB_D_compass_area_sealed.png` | 当前罗盘功能并入北侧棺室 | 棺椁封闭；没有独立罗盘侧室 |
| `TOMB_D_compass_area_opened.png` | 棺盖开启后罗盘出现 | 真实 `coffin-opened` 状态 |
| `TOMB_E_mainchamber_default.png` | 当前主墓室与 D 共用北侧棺室 | 灯开，棺盖已开 |
| `TOMB_E_mainchamber_lamp_off.png` | 同上 | 灯灭 |
| `TOMB_F_escape_shadow.png` | 南室/墓门上方回程段 | 真实 `Manifesting` 墙影状态 |
| `TOMB_F_escape_lamp_off.png` | 同上 | 灯灭，墙影停止显现 |
| `TOMB_F_escape_appeased.png` | 供物归回真实原位后 | 真实 `Appeased` 状态 |

## 未能采集的状态

- 独立的 A「盗洞/塌口」房间：当前版本没有该空间；出生点直接位于长甬道最南端。
- 独立的 D「罗盘侧室」：当前罗盘位于北侧棺椁内，与 E 共用房间。
- E 中 GDD 所述的封坛与《万字藏图》组合：当前首墓没有对应的独立场景资产和同屏状态。
- F 的高速追逐/被抓黑屏回退：当前可验证的是 `Following → Manifesting → Appeased/Provoked` 墙影流程，没有独立高速追逐状态或可重复的抓取回退演出，因此没有伪造“追逐截图”。
- 完全无 HUD 截图：本次审计按要求保留影响画面判断的正式 HUD；MiniMax 第一批应以这些图为结构参考，并另行输出无 UI 设计版本。

## 运行验证

- 17 张截图全部成功写入。
- 页面错误：0。
- 浏览器控制台错误：0。
- 最终状态：`Appeased`。
- 最终灯光状态：开启。
- 调试层：关闭。
