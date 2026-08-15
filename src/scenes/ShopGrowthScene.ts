import Phaser from 'phaser';
import { DEFAULT_PLAYER_APPEARANCE_ID, isPlayerAppearanceId, type PlayerAppearanceId } from '../data/playerAppearances';
import { SHOP_RELICS, type RelicDisposition, type ShopRelicDefinition } from '../data/shopRelics';
import { Player } from '../objects/Player';
import { ShopProgressSystem, type TombLootRecord, type TombSettlement } from '../systems/ShopProgressSystem';
import type { GameFlowState } from '../types/GameFlowState';
import { createProceduralAtmosphere, type ProceduralAtmosphere } from '../visuals/createProceduralAtmosphere';
import { VISUAL_THEME } from '../visuals/visualTheme';
import { preloadPlayerAvatarAssets } from '../visuals/createPlayerAvatarVisual';
import { preloadShopkeeperAssets } from '../visuals/createShopkeeperVisual';
import { SHOP_UI } from '../ui/shopUiTheme';
import {
  createStyleBoardButtonBackground,
  createStyleBoardKeycap,
  createStyleBoardPanel,
  drawStyleBoardButton,
  styleBoardButtonTextColor,
} from '../ui/styleBoardUi';
import {
  ANTIQUE_SHOP_HEIGHT, ANTIQUE_SHOP_WIDTH, SHOP_INTERIOR_TEXTURES, SHOP_LAYOUT,
  antiqueShopDepthFromGround, createAntiqueShopInterior, preloadAntiqueShopInteriorAssets,
  type AntiqueShopInterior,
} from './shared/createAntiqueShopInterior';
import { isPauseButtonPressed, openPauseMenu } from './PauseMenuScene';
import { ShopAudioSystem } from '../systems/ShopAudioSystem';
import { createShopWorldCue } from '../ui/createShopWorldCue';

const SERIF = VISUAL_THEME.fonts.serif;
const SANS = VISUAL_THEME.fonts.sans;

type ShopGrowthData = { settlement?: TombSettlement; appearanceId?: PlayerAppearanceId };
type StationId = 'incoming' | 'workbench' | 'sell' | 'collect' | 'research' | 'pledge' | 'atlas' | 'display';
type Station = { id: StationId; x: number; y: number; radius: number; name: string; action: string; prompt: Phaser.GameObjects.Container; cue: Phaser.GameObjects.Container };
type FocusMode = 'cleaning' | 'inspection' | 'appraisal' | 'disposition' | 'atlas';

export class ShopGrowthScene extends Phaser.Scene {
  private incomingSettlement?: TombSettlement;
  private activeSettlementId = '';
  private appearanceId: PlayerAppearanceId = DEFAULT_PLAYER_APPEARANCE_ID;
  private flowState: GameFlowState = 'ShopFreeRoam';
  private returnState: GameFlowState = 'ShopFreeRoam';
  private player?: Player;
  private interior?: AntiqueShopInterior;
  private atmosphere?: ProceduralAtmosphere;
  private audio?: ShopAudioSystem;
  private stations = new Map<StationId, Station>();
  private nearby?: StationId;
  private selectedLoot?: TombLootRecord;
  private carriedLoot?: TombLootRecord;
  private focusMode?: FocusMode;
  private focusLayer?: Phaser.GameObjects.Container;
  private objective?: Phaser.GameObjects.Container;
  private objectiveText?: Phaser.GameObjects.Text;
  private toast?: Phaser.GameObjects.Container;
  private toastText?: Phaser.GameObjects.Text;
  private incomingTray?: Phaser.GameObjects.Container;
  private carriedVisual?: Phaser.GameObjects.Image;
  private displayVisual?: Phaser.GameObjects.Image;
  private atlasVisual?: Phaser.GameObjects.Container;
  private atlasInk?: Phaser.GameObjects.Graphics;
  private growthCabinet?: Phaser.GameObjects.Container;
  private growthCabinetImage?: Phaser.GameObjects.Image;
  private growthCurtain?: Phaser.GameObjects.Image;
  private growthCabinetGlow?: Phaser.GameObjects.Graphics;
  private growthCurtainBaseScaleX = 1;
  private growthCurtainBaseScaleY = 1;
  private growthRevealActive = false;
  private carryTransitionActive = false;
  private choiceIndex = 0;
  private cleaningMethod = 0;
  private cleaningMarks: Phaser.GameObjects.Arc[] = [];
  private cleaningStroke = false;
  private inspectionAngle = 0;
  private evidenceFound = new Set<string>();
  private inputLockedUntil = 0;
  private interactionKey?: Phaser.Input.Keyboard.Key;
  private escapeKey?: Phaser.Input.Keyboard.Key;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private leftKey?: Phaser.Input.Keyboard.Key;
  private rightKey?: Phaser.Input.Keyboard.Key;
  private upKey?: Phaser.Input.Keyboard.Key;
  private downKey?: Phaser.Input.Keyboard.Key;

  constructor() { super('ShopGrowthScene'); }

  init(data?: ShopGrowthData): void {
    this.incomingSettlement = data?.settlement;
    this.appearanceId = isPlayerAppearanceId(data?.appearanceId) ? data.appearanceId : DEFAULT_PLAYER_APPEARANCE_ID;
  }

  preload(): void { preloadPlayerAvatarAssets(this); preloadShopkeeperAssets(this); preloadAntiqueShopInteriorAssets(this); }

  create(): void {
    this.audio = new ShopAudioSystem();
    const settlement = this.incomingSettlement ?? ShopProgressSystem.createFallbackSettlement();
    ShopProgressSystem.consumeSettlement(settlement);
    this.activeSettlementId = settlement.id;
    this.physics.world.setBounds(0, 0, ANTIQUE_SHOP_WIDTH, ANTIQUE_SHOP_HEIGHT);
    this.cameras.main.setBackgroundColor('#211a14');
    this.atmosphere = createProceduralAtmosphere(this, {
      style: 'antique-shop', worldWidth: ANTIQUE_SHOP_WIDTH, worldHeight: ANTIQUE_SHOP_HEIGHT,
      lightAnchors: [new Phaser.Math.Vector2(640, 390), new Phaser.Math.Vector2(640, 170), new Phaser.Math.Vector2(1020, 500)],
    });
    this.interior = createAntiqueShopInterior(this);
    this.player = new Player(
      this,
      SHOP_LAYOUT.playerSpawn.x,
      SHOP_LAYOUT.playerSpawn.y,
      this.appearanceId,
    );
    this.physics.add.collider(this.player, this.interior.obstacles);
    this.createShopObjects();
    this.createHud();
    this.registerInput();
    this.restoreFromData();
    this.refreshState();
    this.cameras.main.fadeIn(450, 8, 6, 4);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  update(): void {
    if (!this.player || !this.interactionKey || !this.escapeKey || !this.enterKey || !this.leftKey || !this.rightKey) return;
    const escape = Phaser.Input.Keyboard.JustDown(this.escapeKey);
    const confirm = Phaser.Input.Keyboard.JustDown(this.interactionKey) || Phaser.Input.Keyboard.JustDown(this.enterKey);
    const left = Phaser.Input.Keyboard.JustDown(this.leftKey);
    const right = Phaser.Input.Keyboard.JustDown(this.rightKey);
    const up = Boolean(this.upKey && Phaser.Input.Keyboard.JustDown(this.upKey));
    const down = Boolean(this.downKey && Phaser.Input.Keyboard.JustDown(this.downKey));
    if (this.focusMode) {
      if (escape) { this.closeFocus(); return; }
      this.updateFocusInput(confirm, left, right, up, down);
      return;
    }
    if (escape || isPauseButtonPressed(this)) { openPauseMenu(this); return; }
    this.player.update();
    this.player.setDepth(antiqueShopDepthFromGround(this.player.y + 28));
    this.updateCarriedVisual();
    this.atmosphere?.update(this.player.x, this.player.y, this.time.now);
    this.updateNearby();
    if (confirm && this.time.now >= this.inputLockedUntil && this.nearby) {
      this.handleStation(this.nearby);
      this.inputLockedUntil = this.time.now + 190;
    }
  }

  private createShopObjects(): void {
    const warm = this.add.graphics().setDepth(0.4).setBlendMode(Phaser.BlendModes.ADD);
    warm.fillStyle(0xe7a85c, 0.1); warm.fillEllipse(640, 490, 650, 380);
    const incoming = SHOP_LAYOUT.stations.incoming;
    const workbench = SHOP_LAYOUT.stations.workbench;
    const sell = SHOP_LAYOUT.stations.sell;
    const collect = SHOP_LAYOUT.stations.collect;
    const research = SHOP_LAYOUT.stations.research;
    const pledge = SHOP_LAYOUT.stations.pledge;
    const atlas = SHOP_LAYOUT.stations.atlas;
    const display = SHOP_LAYOUT.stations.display;

    this.incomingTray = this.add.container(incoming.x, incoming.y - 22, [
      this.add.image(-28, 1, SHOP_INTERIOR_TEXTURES.geomancersCompass).setDisplaySize(52, 52).setAngle(-12),
      this.add.image(30, 4, SHOP_INTERIOR_TEXTURES.brassTally).setDisplaySize(46, 46),
    ]).setDepth(4.15);
    this.createStation('incoming', incoming.x, incoming.y, incoming.radius, '待处理器物', '拿起一件');

    this.createStation('workbench', workbench.x, workbench.y, workbench.radius, '清理台', '放置器物');

    this.createDestination('sell', sell.x, sell.y, '交货箱', 0x493225);
    this.createDestination('collect', collect.x, collect.y, '展示柜', 0x4f3825);
    this.createDestination('research', research.x, research.y, '研究盘', 0x3c3327);
    this.createDestination('pledge', pledge.x, pledge.y, '抵押柜', 0x2f2924);

    this.atlasInk = this.add.graphics();
    this.atlasInk.lineStyle(2, 0x352617, 0.9).strokeRect(-34, -20, 68, 40).lineBetween(-10, -18, -10, 18).strokeCircle(19, 4, 6);
    this.atlasVisual = this.add.container(atlas.x, atlas.y - 44, [this.add.rectangle(0, 0, 100, 58, 0xc4b083).setStrokeStyle(1, 0x604631), this.atlasInk])
      .setDepth(4.18).setVisible(false);
    this.createStation('atlas', atlas.x, atlas.y, atlas.radius, '《万字藏图》', '翻阅');

    this.growthCabinetGlow = this.add.graphics();
    this.growthCabinetGlow.fillStyle(0xd9ad63, 0.13).fillRoundedRect(-95, -55, 190, 110, 12);
    this.growthCabinetGlow.lineStyle(2, 0xe2bc76, 0.62).strokeRoundedRect(-91, -51, 182, 102, 10);
    this.growthCabinetImage = this.add
      .image(0, 0, SHOP_INTERIOR_TEXTURES.displayCabinet)
      .setDisplaySize(190, 96);
    this.growthCurtain = this.add
      .image(0, 0, SHOP_INTERIOR_TEXTURES.displayCloth)
      .setDisplaySize(194, 100);
    this.growthCurtainBaseScaleX = this.growthCurtain.scaleX;
    this.growthCurtainBaseScaleY = this.growthCurtain.scaleY;
    this.growthCabinet = this.add
      .container(display.x, display.y - 34, [
        this.growthCabinetGlow,
        this.growthCabinetImage,
        this.growthCurtain,
      ])
      .setDepth(4.12)
      .setVisible(false);
    this.growthCabinetGlow.setAlpha(0.18);
    this.createStation('display', display.x, display.y, display.radius, '新展示柜', '揭开防尘布');
  }

  private createDestination(id: StationId, x: number, y: number, _name: string, _color: number): void {
    const layout = SHOP_LAYOUT.stations[id as keyof typeof SHOP_LAYOUT.stations];
    this.createStation(id, x, y, layout?.radius ?? 84, this.destinationName(id), this.destinationAction(id));
  }

  private createStation(id: StationId, x: number, y: number, radius: number, name: string, action: string): void {
    const cue = createShopWorldCue(this, radius * 1.35, 58)
      .setPosition(x, y)
      .setVisible(false);
    const key = createStyleBoardKeycap(this, 'E', 30, 30).setX(-74);
    const title = this.add.text(-50, -10, name, { fontFamily: SERIF, fontSize: '15px', color: SHOP_UI.colors.text }).setOrigin(0, 0.5);
    const verb = this.add.text(-50, 10, action, { fontFamily: SANS, fontSize: '12px', color: SHOP_UI.colors.muted }).setOrigin(0, 0.5);
    const prompt = this.add.container(x, y - 68, [createStyleBoardPanel(this, 200, 52, 'thin', SHOP_UI.alpha.prompt), key, title, verb])
      .setDepth(12).setVisible(false);
    this.stations.set(id, { id, x, y, radius, name, action, prompt, cue });
  }

  private createHud(): void {
    const paper = createStyleBoardPanel(this, 330, 58, 'thin', 0.9);
    const accent = this.add.rectangle(-162, 0, 4, 46, SHOP_UI.colors.cinnabar, 0.95);
    this.objectiveText = this.add.text(-140, 0, '', { fontFamily: SANS, fontSize: SHOP_UI.type.body, color: SHOP_UI.colors.text }).setOrigin(0, 0.5);
    this.objective = this.add.container(189, 49, [paper, accent, this.objectiveText]).setScrollFactor(0).setDepth(25);
    this.toastText = this.add.text(0, 0, '', { fontFamily: SERIF, fontSize: '16px', color: SHOP_UI.colors.text, align: 'center', wordWrap: { width: 600 } }).setOrigin(0.5);
    this.toast = this.add.container(640, 654, [createStyleBoardPanel(this, 660, 54, 'standard', 0.94), this.toastText])
      .setScrollFactor(0).setDepth(30).setVisible(false);
  }

  private registerInput(): void {
    const k = this.input.keyboard;
    if (!k) throw new Error('古玩店养成模式需要键盘输入。');
    this.interactionKey = k.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.escapeKey = k.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.enterKey = k.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.leftKey = k.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.rightKey = k.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.upKey = k.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.downKey = k.addKey(Phaser.Input.Keyboard.KeyCodes.S);
  }

  private restoreFromData(): void {
    const p = ShopProgressSystem.getProgress();
    const unloaded = p.unloadedSettlementIds.includes(this.activeSettlementId);
    this.incomingTray?.setVisible(!unloaded || p.activeLoot.some((x) => !x.placed && !x.disposition));
    this.atlasVisual?.setVisible(p.activeLoot.some((x) => x.definitionId === 'myriad-character-atlas' && x.placed));
    if (p.unlockedDisplays.includes('first-tomb-display')) {
      this.growthCabinet?.setVisible(true); this.growthCurtain?.setVisible(false);
    }
    const collected = p.activeLoot.find((x) => x.disposition === 'collect' && x.placed);
    if (collected) this.showPlacedRelic(collected, 1025, 440);
  }

  private refreshState(): void {
    const p = ShopProgressSystem.getProgress();
    const pending = p.activeLoot.find((x) => !x.placed);
    if (this.carriedLoot) this.flowState = this.carriedLoot.disposition ? 'Placement' : 'RelicSelected';
    else if (p.growthStage > 0 && !this.growthCurtain?.visible) this.flowState = 'ShopFreeRoam';
    else if (!pending && p.atlasPage === 0) this.flowState = 'AtlasEvent';
    else if (p.atlasPage > 0 && this.growthCurtain?.visible) this.flowState = 'ShopGrowthReveal';
    else this.flowState = 'ShopFreeRoam';
    this.updateObjective();
  }

  private updateNearby(): void {
    if (!this.player) return;
    const previousNearby = this.nearby;
    let nearest: Station | undefined; let distance = Infinity;
    for (const station of this.stations.values()) {
      const active = this.stationAvailable(station.id);
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, station.x, station.y);
      const selected = active && d <= station.radius && d < distance;
      if (selected) { nearest = station; distance = d; }
      station.prompt.setVisible(false);
      station.cue.setVisible(active && (selected || this.isGuidedStation(station.id)));
    }
    this.nearby = nearest?.id;
    if (nearest) {
      nearest.prompt.setVisible(true);
      if (previousNearby !== nearest.id) {
        nearest.prompt.setAlpha(0).setY(nearest.y - 58);
        this.tweens.add({
          targets: nearest.prompt,
          alpha: 1,
          y: nearest.y - 68,
          duration: 180,
          ease: 'Cubic.Out',
        });
      }
    }
  }

  private stationAvailable(id: StationId): boolean {
    const p = ShopProgressSystem.getProgress();
    if (id === 'incoming') return !this.carriedLoot && p.activeLoot.some((x) => !x.placed);
    if (id === 'workbench') return Boolean(this.carriedLoot && !this.carriedLoot.disposition);
    if (['sell', 'collect', 'research', 'pledge'].includes(id)) return Boolean(this.carriedLoot?.disposition === id);
    if (id === 'atlas') return p.activeLoot.some((x) => x.definitionId === 'myriad-character-atlas' && x.placed);
    if (id === 'display') return p.atlasPage > 0 && Boolean(this.growthCurtain?.visible);
    return false;
  }

  private isGuidedStation(id: StationId): boolean {
    if (this.carriedLoot?.disposition) return id === this.carriedLoot.disposition;
    if (this.carriedLoot) return id === 'workbench';
    const p = ShopProgressSystem.getProgress();
    if (p.activeLoot.some((x) => !x.placed)) return id === 'incoming';
    if (p.atlasPage === 0) return id === 'atlas';
    return p.atlasPage > 0 && Boolean(this.growthCurtain?.visible) && id === 'display';
  }

  private handleStation(id: StationId): void {
    this.audio?.playSfx('interact');
    if (id === 'incoming') { this.pickNextRelic(); return; }
    if (id === 'workbench') { this.openWork(); return; }
    if (['sell', 'collect', 'research', 'pledge'].includes(id)) { this.placeDisposition(id as RelicDisposition); return; }
    if (id === 'atlas') { this.openAtlas(); return; }
    if (id === 'display') { this.revealGrowth(); }
  }

  private pickNextRelic(): void {
    const loot = ShopProgressSystem.getProgress().activeLoot.find((x) => !x.placed);
    if (!loot) return;
    ShopProgressSystem.markUnloaded(this.activeSettlementId);
    this.carriedLoot = loot;
    this.selectedLoot = loot;
    const def = SHOP_RELICS[loot.definitionId];
    this.carriedVisual = this.createCarryRelic(loot);
    const source = this.stations.get('incoming');
    if (source && this.carriedVisual && this.player) {
      this.carryTransitionActive = true;
      const baseScaleX = this.carriedVisual.getData('heldScaleX') as number;
      const baseScaleY = this.carriedVisual.getData('heldScaleY') as number;
      this.carriedVisual
        .setPosition(source.x, source.y - 28)
        .setScale(baseScaleX * 0.72, baseScaleY * 0.72)
        .setAlpha(0.72);
      this.player.setCarrying(true);
      this.player.playCarryAction('pickup');
      const target = this.getHeldRelicTarget();
      this.tweens.add({
        targets: this.carriedVisual,
        x: target.x,
        y: target.y,
        scaleX: baseScaleX,
        scaleY: baseScaleY,
        alpha: 1,
        duration: 320,
        ease: 'Cubic.Out',
        onComplete: () => { this.carryTransitionActive = false; },
      });
    }
    this.showToast(`拿起：${def.unidentifiedChineseName}。清理台的灯亮了。`);
    this.refreshState();
  }

  private openWork(): void {
    if (!this.carriedLoot || this.carryTransitionActive) return;
    this.selectedLoot = this.carriedLoot;
    this.carryTransitionActive = true;
    this.player?.setMovementEnabled(false);
    this.player?.setCarrying(false);
    this.player?.playCarryAction('place');
    const workbench = SHOP_LAYOUT.stations.workbench;
    const finish = (): void => {
      this.carriedVisual?.destroy(); this.carriedVisual = undefined;
      this.carryTransitionActive = false;
      if (!this.selectedLoot) return;
      if (this.selectedLoot.appraised) this.openDisposition();
      else if (this.selectedLoot.cleaned) this.openInspection();
      else this.openCleaning();
    };
    if (this.carriedVisual) {
      const baseScaleX = this.carriedVisual.getData('heldScaleX') as number;
      const baseScaleY = this.carriedVisual.getData('heldScaleY') as number;
      this.tweens.add({
        targets: this.carriedVisual,
        x: workbench.x,
        y: workbench.y - 42,
        scaleX: baseScaleX * 0.82,
        scaleY: baseScaleY * 0.82,
        angle: 0,
        duration: 280,
        ease: 'Cubic.InOut',
        onComplete: finish,
      });
    } else {
      finish();
    }
  }

  private beginFocus(mode: FocusMode, state: GameFlowState): Phaser.GameObjects.Container {
    this.focusMode = mode; this.returnState = this.flowState; this.flowState = state;
    this.player?.setMovementEnabled(false); this.objective?.setVisible(false);
    const shade = this.add.rectangle(0, 0, 1280, 720, 0x0b0907, 0.86).setOrigin(0).setInteractive();
    const layer = this.add.container(0, 0, [shade]).setScrollFactor(0).setDepth(80);
    this.focusLayer = layer;
    return layer;
  }

  private addFocusHeader(layer: Phaser.GameObjects.Container, title: string, subtitle: string): void {
    layer.add(this.add.text(60, 46, title, { fontFamily: SERIF, fontSize: SHOP_UI.type.display, color: SHOP_UI.colors.text }));
    layer.add(this.add.text(61, 91, subtitle, { fontFamily: SANS, fontSize: SHOP_UI.type.body, color: SHOP_UI.colors.muted }));
    layer.add(this.add.text(1220, 53, 'ESC  返回店内', { fontFamily: SANS, fontSize: SHOP_UI.type.caption, color: SHOP_UI.colors.muted }).setOrigin(1, 0));
    layer.add(this.add.rectangle(640, 124, 1160, 1, SHOP_UI.colors.gold, 0.35));
  }

  private openCleaning(): void {
    if (!this.selectedLoot) return;
    const def = SHOP_RELICS[this.selectedLoot.definitionId];
    const layer = this.beginFocus('cleaning', 'Cleaning');
    this.addFocusHeader(layer, `清理 · ${def.unidentifiedChineseName}`, '拖动鼠标擦拭污损；方法不同，速度和证据损耗也不同。');
    const tray = this.add.ellipse(640, 420, 500, 290, 0x31251b, 1).setStrokeStyle(2, SHOP_UI.colors.gold, 0.55);
    const relic = this.createFocusRelic(def, 640, 390, 250);
    layer.add([tray, relic]);
    this.cleaningMarks = [];
    const seed = [[-78,-42],[-22,-67],[48,-54],[84,-10],[-62,28],[2,42],[70,54],[12,-8],[-104,0]];
    seed.slice(0, Math.max(0, 9 - this.selectedLoot.cleaningProgress)).forEach(([dx, dy], i) => {
      const mark = this.add.circle(640 + dx, 390 + dy, 24 + (i % 3) * 5, 0x4b3a2b, 0.86).setStrokeStyle(1, 0x20170f, 0.4).setInteractive();
      this.cleaningMarks.push(mark); layer.add(mark);
    });
    const methodButtons = def.cleaningMethodsChinese.map((label, i) => this.createChoiceCard(340 + i * 320, 625, 270, 62, label, i, () => { this.cleaningMethod = i; this.refreshCleaningButtons(methodButtons); }));
    layer.add(methodButtons); this.refreshCleaningButtons(methodButtons);
    const progress = this.add.text(640, 548, '', { fontFamily: SANS, fontSize: '15px', color: SHOP_UI.colors.text }).setOrigin(0.5);
    layer.add(progress);
    const refresh = (): void => {
      progress.setText(`剩余污损 ${this.cleaningMarks.filter((x) => x.active).length}  ·  证据完整度 ${Math.max(0, 100 - this.selectedLoot!.cleaningDamage)}%`);
    };
    refresh();
    const cleanAt = (pointer: Phaser.Input.Pointer): void => {
      if (!this.cleaningStroke || !this.selectedLoot) return;
      const radius = this.cleaningMethod === 0 ? 27 : 52;
      let removed = 0;
      this.cleaningMarks.forEach((mark) => {
        if (mark.active && Phaser.Math.Distance.Between(pointer.x, pointer.y, mark.x, mark.y) < radius) {
          mark.disableInteractive(); mark.setActive(false);
          this.tweens.add({ targets: mark, alpha: 0, scale: 0.6, duration: 180, onComplete: () => mark.setVisible(false) });
          removed += 1;
        }
      });
      if (removed && this.cleaningMethod === 1) this.selectedLoot.cleaningDamage = Math.min(35, this.selectedLoot.cleaningDamage + removed * 7);
      this.selectedLoot.cleaningProgress = 9 - this.cleaningMarks.filter((x) => x.active).length;
      refresh();
      if (this.cleaningMarks.every((x) => !x.active)) {
        this.selectedLoot.cleaned = true;
        this.audio?.playSfx('choice-confirm');
        this.time.delayedCall(350, () => this.openInspection());
      }
    };
    this.input.on('pointerdown', () => { this.cleaningStroke = true; });
    this.input.on('pointerup', () => { this.cleaningStroke = false; });
    this.input.on('pointermove', cleanAt);
  }

  private refreshCleaningButtons(buttons: Phaser.GameObjects.Container[]): void {
    buttons.forEach((b, i) => this.styleChoice(b, i === this.cleaningMethod));
  }

  private openInspection(): void {
    if (!this.selectedLoot) return;
    this.clearFocusOnly();
    const def = SHOP_RELICS[this.selectedLoot.definitionId];
    const layer = this.beginFocus('inspection', 'Inspection');
    this.addFocusHeader(layer, `观察 · ${def.unidentifiedChineseName}`, 'A / D 旋转器物，点击发亮部位记录证据。墓中的方位记忆会参与判断。');
    const relic = this.createFocusRelic(def, 550, 390, 300);
    layer.add(relic);
    const evidenceTitle = this.add.text(900, 178, '证据签', { fontFamily: SERIF, fontSize: '22px', color: '#3b291c' }).setOrigin(0.5);
    const evidenceBody = this.add.text(770, 222, '', { fontFamily: SANS, fontSize: '15px', color: '#463322', wordWrap: { width: 260 }, lineSpacing: 8 });
    layer.add([this.add.rectangle(900, 370, 330, 410, SHOP_UI.colors.paper, 0.96).setStrokeStyle(1, 0x725437), evidenceTitle, evidenceBody]);
    this.evidenceFound = new Set(this.selectedLoot.evidenceIds);
    const hotspotAngles = [-34, 34];
    const hotspots = def.evidence.map((ev, i) => {
      const h = this.add.circle(550 + (i ? 82 : -82), 390 + (i ? 35 : -35), 18, SHOP_UI.colors.cinnabar, 0.18).setStrokeStyle(2, SHOP_UI.colors.focus, 0.9).setInteractive({ useHandCursor: true });
      h.on('pointerup', () => {
        const target = hotspotAngles[i];
        if (Math.abs(Phaser.Math.Angle.WrapDegrees(this.inspectionAngle - target)) > 40) { this.showToast('角度还不对，再转一转器物。'); return; }
        this.evidenceFound.add(ev.id); this.selectedLoot!.evidenceIds = Array.from(this.evidenceFound);
        h.setFillStyle(SHOP_UI.colors.cinnabar, 0.65); this.audio?.playSfx('interact'); refreshEvidence();
      });
      layer.add(h); return h;
    });
    const tombEvidence = '墓内记忆：铜钱一面长期朝向供桌空位，磨损方向固定。';
    const refreshEvidence = (): void => {
      const found = def.evidence.filter((e) => this.evidenceFound.has(e.id));
      evidenceBody.setText(`${found.map((e) => `◆ ${e.chineseLabel}\n${e.chineseDetail}`).join('\n\n') || '尚未记录器物证据'}\n\n◇ ${tombEvidence}`);
      if (found.length === def.evidence.length) {
        const next = this.createChoiceCard(900, 608, 270, 58, '根据证据作出鉴定', 0, () => this.openAppraisal());
        layer.add(next); this.styleChoice(next, true);
      }
    };
    (layer as Phaser.GameObjects.Container & { setData: (k: string, v: unknown) => Phaser.GameObjects.Container }).setData('inspectRelic', relic);
    hotspots.forEach((h, i) => h.setData('offset', i ? 82 : -82));
    refreshEvidence();
  }

  private openAppraisal(): void {
    if (!this.selectedLoot) return;
    this.clearFocusOnly();
    const def = SHOP_RELICS[this.selectedLoot.definitionId];
    const layer = this.beginFocus('appraisal', 'AppraisalDecision');
    this.addFocusHeader(layer, '鉴定结论', `已记录 ${this.evidenceFound.size} 条器物证据，并关联 1 条墓内方位记忆。`);
    layer.add(this.add.rectangle(360, 390, 490, 430, SHOP_UI.colors.paper, 0.97).setStrokeStyle(1, 0x76583b));
    layer.add(this.add.text(145, 195, '本次依据', { fontFamily: SERIF, fontSize: '23px', color: '#3a291c' }));
    layer.add(this.add.text(145, 240, `${def.evidence.map((e) => `◆ ${e.chineseLabel}`).join('\n')}\n◆ 墓中供桌的空位与朝向`, { fontFamily: SANS, fontSize: '16px', color: '#4b3928', lineSpacing: 13 }));
    const cards = def.conclusions.map((c, i) => this.createChoiceCard(870, 285 + i * 145, 470, 105, this.conclusionChinese(def.id, i), i, () => this.confirmAppraisal(i)));
    layer.add(cards); this.choiceIndex = 0; cards.forEach((c, i) => this.styleChoice(c, i === 0));
    layer.setData('choiceCards', cards);
  }

  private confirmAppraisal(index: number): void {
    if (!this.selectedLoot) return;
    const def = SHOP_RELICS[this.selectedLoot.definitionId];
    const correct = index === def.correctConclusionIndex;
    ShopProgressSystem.recordConclusion(this.selectedLoot, index, correct);
    this.audio?.playSfx('choice-confirm');
    this.showToast(correct ? '朱砂印落下：证据彼此吻合。' : '账本标作“存疑”：证据链不能完全支持该结论，估价下降。');
    if (def.isCore) {
      this.selectedLoot.disposition = 'research';
      this.carriedLoot = this.selectedLoot;
      this.closeFocus(false);
      this.carriedVisual = this.createCarryRelic(this.selectedLoot);
      this.player?.setCarrying(true);
      this.player?.playCarryAction('pickup');
      this.flowState = 'Placement'; this.updateObjective();
    } else this.openDisposition();
  }

  private openDisposition(): void {
    if (!this.selectedLoot) return;
    this.clearFocusOnly();
    const def = SHOP_RELICS[this.selectedLoot.definitionId];
    const layer = this.beginFocus('disposition', 'DispositionDecision');
    this.addFocusHeader(layer, `决定去向 · ${def.chineseName}`, '选择后需把器物亲自送到店内对应位置，放下时才会结算。');
    const choices: { d: RelicDisposition; title: string; body: string }[] = [
      { d: 'sell', title: `出售  +¥${Math.max(60, def.saleValue - this.selectedLoot.cleaningDamage * 3 - (this.selectedLoot.appraisalCorrect === false ? 45 : 0))}`, body: '放入交货箱；获得现款，失去后续研究与组合机会。' },
      { d: 'collect', title: '收藏陈列', body: '占用一个展示位置；器物会留在店内，并可能形成关联收藏。' },
      { d: 'research', title: '留作研究', body: '暂时没有收入；保留未知证据，送往研究盘。' },
      { d: 'pledge', title: `留作抵押  墓价¥${def.pledgeValue}`, body: '保留器物并承担下次下墓风险，送入抵押柜。' },
    ];
    const cards = choices.map((c, i) => this.createChoiceCard(365 + (i % 2) * 550, 285 + Math.floor(i / 2) * 190, 490, 145, `${c.title}\n${c.body}`, i, () => this.selectDisposition(c.d)));
    layer.add(cards); this.choiceIndex = 0; cards.forEach((c, i) => this.styleChoice(c, i === 0)); layer.setData('choiceCards', cards); layer.setData('dispositions', choices.map((x) => x.d));
  }

  private selectDisposition(disposition: RelicDisposition): void {
    if (!this.selectedLoot) return;
    this.selectedLoot.disposition = disposition;
    this.carriedLoot = this.selectedLoot;
    this.closeFocus(false); this.flowState = 'Placement';
    this.carriedVisual = this.createCarryRelic(this.selectedLoot);
    this.player?.setCarrying(true);
    this.player?.playCarryAction('pickup');
    this.showToast(`已在账本夹签：${this.destinationName(disposition)}。结算将在放下器物时生效。`);
    this.updateObjective();
  }

  private placeDisposition(disposition: RelicDisposition): void {
    if (
      !this.carriedLoot ||
      this.carriedLoot.disposition !== disposition ||
      this.carryTransitionActive
    ) return;
    const loot = this.carriedLoot; const def = SHOP_RELICS[loot.definitionId];
    const appraisalPenalty = loot.appraisalCorrect === false ? 45 : 0;
    const value = Math.max(60, def.saleValue - loot.cleaningDamage * 3 - appraisalPenalty);
    const station = this.stations.get(disposition)!;
    this.carryTransitionActive = true;
    this.player?.setMovementEnabled(false);
    this.player?.setCarrying(false);
    this.player?.playCarryAction('place');
    const finish = (): void => {
      ShopProgressSystem.applyDisposition(loot, disposition, value);
      ShopProgressSystem.markPlaced(loot);
      this.carriedVisual?.destroy(); this.carriedVisual = undefined;
      if (disposition !== 'sell') this.showPlacedRelic(loot, station.x, station.y - 32);
      this.audio?.playSfx('place-relic');
      this.showToast(disposition === 'sell' ? `交货完成，账本记入 ¥${value}。` : `${def.chineseName}已放入${this.destinationName(disposition)}，店内陈列永久改变。`);
      this.carriedLoot = undefined; this.selectedLoot = undefined;
      this.carryTransitionActive = false;
      this.player?.setMovementEnabled(true);
      this.refreshState();
    };
    if (this.carriedVisual) {
      const baseScaleX = this.carriedVisual.getData('heldScaleX') as number;
      const baseScaleY = this.carriedVisual.getData('heldScaleY') as number;
      this.tweens.add({
        targets: this.carriedVisual,
        x: station.x,
        y: station.y - 32,
        scaleX: baseScaleX * 0.78,
        scaleY: baseScaleY * 0.78,
        angle: disposition === 'sell' ? 8 : 0,
        alpha: disposition === 'sell' ? 0.3 : 1,
        duration: 300,
        ease: 'Cubic.InOut',
        onComplete: finish,
      });
    } else {
      finish();
    }
  }

  private openAtlas(): void {
    const p = ShopProgressSystem.getProgress();
    const layer = this.beginFocus('atlas', 'AtlasEvent');
    this.addFocusHeader(layer, '《万字藏图》', '墨迹并非地图的终点，而是在店内寻找自己的位置。');
    const page = this.add.rectangle(640, 400, 720, 480, SHOP_UI.colors.paper, 1).setStrokeStyle(2, 0x5f432c);
    const ink = this.add.graphics(); ink.lineStyle(5, 0x3d2b1e, 0.8).strokeRect(410, 235, 460, 300).lineBetween(560, 235, 560, 535).lineBetween(720, 235, 720, 535).strokeCircle(790, 390, 38);
    const mark = this.add.circle(790, 390, 12, SHOP_UI.colors.cinnabar, 0.9);
    layer.add([page, ink, mark, this.add.text(640, 565, p.atlasPage === 0 ? '第一页正在显影……展示柜的位置与前室壁龛重合。' : '第一页：店铺局部平面。朱砂标记仍指向展示柜。', { fontFamily: SERIF, fontSize: '18px', color: '#38271b' }).setOrigin(0.5)]);
    if (p.atlasPage === 0) {
      ink.setAlpha(0); mark.setAlpha(0);
      this.tweens.add({ targets: ink, alpha: 1, duration: 1500, onComplete: () => this.tweens.add({ targets: mark, alpha: 1, scale: { from: 1.8, to: 1 }, duration: 450, onComplete: () => {
        ShopProgressSystem.unlockFirstGrowth(); this.growthCabinet?.setVisible(true); this.growthCurtain?.setVisible(true); this.audio?.playSfx('transition');
      } }) });
    }
  }

  private revealGrowth(): void {
    if (!this.growthCurtain?.visible || this.growthRevealActive) return;
    this.growthRevealActive = true;
    this.flowState = 'ShopGrowthReveal'; this.player?.setMovementEnabled(false);
    this.stations.get('display')?.prompt.setVisible(false);
    this.stations.get('display')?.cue.setVisible(false);
    this.audio?.playSfx('transition');
    this.cameras.main.pan(SHOP_LAYOUT.stations.display.x, SHOP_LAYOUT.stations.display.y, 500, Phaser.Math.Easing.Sine.InOut);
    this.tweens.add({
      targets: this.growthCurtain,
      y: -10,
      scaleX: this.growthCurtainBaseScaleX * 1.035,
      scaleY: this.growthCurtainBaseScaleY * 0.92,
      duration: 220,
      ease: 'Sine.Out',
      onComplete: () => {
        this.emitCabinetRevealDust();
        this.tweens.add({
          targets: this.growthCabinetGlow,
          alpha: 1,
          duration: 680,
          ease: 'Sine.Out',
        });
        this.growthCabinetImage?.setAlpha(0.72);
        this.tweens.add({
          targets: this.growthCabinetImage,
          alpha: 1,
          duration: 620,
          ease: 'Sine.Out',
        });
        this.tweens.add({
          targets: this.growthCurtain,
          x: 118,
          y: 82,
          angle: 14,
          scaleX: this.growthCurtainBaseScaleX * 0.72,
          scaleY: this.growthCurtainBaseScaleY * 0.48,
          alpha: 0,
          duration: 760,
          ease: 'Cubic.In',
          onComplete: () => {
            this.growthCurtain?.setVisible(false);
            this.growthRevealActive = false;
            this.player?.setMovementEnabled(true);
            this.cameras.main.pan(640, 360, 450, Phaser.Math.Easing.Sine.InOut);
            this.showToast('布罩滑落，铜角与玻璃依次亮起。柜格的比例，像极了墓室壁龛。');
            this.refreshState();
          },
        });
      },
    });
  }

  private updateFocusInput(confirm: boolean, left: boolean, right: boolean, up: boolean, down: boolean): void {
    if (!this.focusLayer || !this.focusMode) return;
    if (this.focusMode === 'inspection' && (left || right)) {
      this.inspectionAngle = Phaser.Math.Wrap(this.inspectionAngle + (right ? 34 : -34), -180, 180);
      const relic = this.focusLayer.getData('inspectRelic') as Phaser.GameObjects.Container | undefined;
      relic?.setAngle(this.inspectionAngle); this.audio?.playSfx('choice-move'); return;
    }
    if (this.focusMode === 'cleaning' && (left || right)) { this.cleaningMethod = this.cleaningMethod ? 0 : 1; return; }
    const cards = this.focusLayer.getData('choiceCards') as Phaser.GameObjects.Container[] | undefined;
    if (!cards) return;
    if (left || right || up || down) {
      const columns = cards.length > 2 ? 2 : 1;
      const delta = left ? -1 : right ? 1 : up ? -columns : columns;
      this.choiceIndex = Phaser.Math.Wrap(this.choiceIndex + delta, 0, cards.length);
      cards.forEach((c, i) => this.styleChoice(c, i === this.choiceIndex)); this.audio?.playSfx('choice-move');
    }
    if (confirm) {
      if (this.focusMode === 'appraisal') this.confirmAppraisal(this.choiceIndex);
      if (this.focusMode === 'disposition') {
        const ds = this.focusLayer.getData('dispositions') as RelicDisposition[]; this.selectDisposition(ds[this.choiceIndex]);
      }
    }
  }

  private closeFocus(restoreCarriedVisual = true): void {
    const was = this.focusMode;
    this.clearFocusOnly();
    this.player?.setMovementEnabled(true); this.objective?.setVisible(true);
    if (
      restoreCarriedVisual &&
      was !== 'atlas' &&
      this.carriedLoot &&
      !this.carriedVisual
    ) {
      this.carriedVisual = this.createCarryRelic(this.carriedLoot);
      this.player?.setCarrying(true);
      this.player?.playCarryAction('pickup');
    }
    if (was === 'atlas') this.refreshState(); else { this.flowState = this.returnState; this.refreshState(); }
  }

  private clearFocusOnly(): void {
    this.input.off('pointerdown'); this.input.off('pointerup'); this.input.off('pointermove');
    this.cleaningStroke = false; this.focusLayer?.destroy(true); this.focusLayer = undefined; this.focusMode = undefined;
  }

  private createFocusRelic(def: ShopRelicDefinition, x: number, y: number, size: number): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    if (def.id === 'first-tomb-ritual-coin') {
      g.fillStyle(0x87633e).fillCircle(0, 0, size * 0.32); g.lineStyle(6, 0xb58b56).strokeCircle(0, 0, size * 0.32); g.fillStyle(0x211812).fillRect(-size * 0.07, -size * 0.07, size * 0.14, size * 0.14);
    } else {
      g.fillStyle(0xc7b487).fillRoundedRect(-size * 0.36, -size * 0.28, size * 0.72, size * 0.56, 6); g.lineStyle(3, 0x65503a).strokeRoundedRect(-size * 0.36, -size * 0.28, size * 0.72, size * 0.56, 6); g.lineBetween(0, -size * 0.27, 0, size * 0.27);
    }
    return this.add.container(x, y, [g]);
  }

  private createChoiceCard(x: number, y: number, w: number, h: number, label: string, index: number, action: () => void): Phaser.GameObjects.Container {
    const bg = createStyleBoardButtonBackground(this, w, h, 'default', 'primary');
    const text = this.add.text(-w / 2 + 20, 0, label, { fontFamily: SANS, fontSize: '16px', color: SHOP_UI.colors.text, wordWrap: { width: w - 40 }, lineSpacing: 5 }).setOrigin(0, 0.5);
    const card = this.add.container(x, y, [bg, text]).setSize(w, h).setInteractive({ useHandCursor: true });
    card.setData('bg', bg); card.setData('label', text); card.setData('index', index);
    card.on('pointerover', () => { this.choiceIndex = index; const siblings = this.focusLayer?.getData('choiceCards') as Phaser.GameObjects.Container[] | undefined; siblings?.forEach((c, i) => this.styleChoice(c, i === index)); });
    card.on('pointerup', action); return card;
  }

  private styleChoice(card: Phaser.GameObjects.Container, selected: boolean): void {
    const bg = card.getData('bg') as Phaser.GameObjects.Graphics; const label = card.getData('label') as Phaser.GameObjects.Text;
    const width = card.width; const height = card.height;
    if (bg) drawStyleBoardButton(bg, width, height, selected ? 'selected' : 'default', 'primary');
    label?.setColor(styleBoardButtonTextColor(selected ? 'selected' : 'default'));
  }

  private createCarryRelic(loot: TombLootRecord): Phaser.GameObjects.Image {
    const texture = loot.definitionId === 'first-tomb-ritual-coin' ? SHOP_INTERIOR_TEXTURES.geomancersCompass : SHOP_INTERIOR_TEXTURES.brassTally;
    const target = this.getHeldRelicTarget();
    const image = this.add
      .image(target.x, target.y, texture)
      .setDisplaySize(40, 40)
      .setDepth(target.depth);
    image.setData('heldScaleX', image.scaleX);
    image.setData('heldScaleY', image.scaleY);
    return image;
  }

  private getHeldRelicTarget(): { x: number; y: number; depth: number; angle: number } {
    if (!this.player) return { x: 640, y: 610, depth: 4.2, angle: 0 };
    const facing = this.player.getFacing();
    const offsets = {
      north: { x: 0, y: -23, depth: 0.2, angle: 0 },
      'north-east': { x: 14, y: -26, depth: 0.19, angle: 6 },
      east: { x: 19, y: -29, depth: 0.18, angle: 8 },
      'south-east': { x: 14, y: -23, depth: 0.21, angle: 5 },
      south: { x: 0, y: -20, depth: 0.22, angle: 0 },
      'south-west': { x: -14, y: -23, depth: 0.21, angle: -5 },
      west: { x: -19, y: -29, depth: 0.18, angle: -8 },
      'north-west': { x: -14, y: -26, depth: 0.19, angle: -6 },
    } as const;
    const offset = offsets[facing];
    return {
      x: this.player.x + offset.x,
      y: this.player.y + offset.y,
      depth: this.player.depth + offset.depth,
      angle: offset.angle,
    };
  }

  private updateCarriedVisual(): void {
    if (!this.carriedVisual || !this.player || this.carryTransitionActive) return;
    const target = this.getHeldRelicTarget();
    const moving = this.player.getMovementVelocity().lengthSq() > 16;
    const bob = moving ? Math.sin(this.time.now / 92) * 1.8 : Math.sin(this.time.now / 430) * 0.45;
    this.carriedVisual
      .setPosition(target.x, target.y + bob)
      .setDepth(target.depth)
      .setAngle(target.angle + (moving ? Math.sin(this.time.now / 105) * 2.2 : 0));
  }

  private emitCabinetRevealDust(): void {
    const cabinet = SHOP_LAYOUT.stations.display;
    for (let index = 0; index < 14; index += 1) {
      const dust = this.add
        .circle(
          cabinet.x + Phaser.Math.Between(-76, 76),
          cabinet.y - 34 + Phaser.Math.Between(-28, 28),
          Phaser.Math.Between(2, 4),
          index % 3 === 0 ? 0xd1ad72 : 0x8f7555,
          0.62,
        )
        .setDepth(4.35);
      this.tweens.add({
        targets: dust,
        x: dust.x + Phaser.Math.Between(-34, 48),
        y: dust.y + Phaser.Math.Between(-44, 32),
        alpha: 0,
        scale: 0.3,
        duration: Phaser.Math.Between(520, 880),
        ease: 'Sine.Out',
        onComplete: () => dust.destroy(),
      });
    }
    this.cameras.main.shake(120, 0.0011);
  }

  private showPlacedRelic(loot: TombLootRecord, x: number, y: number): void {
    const texture = loot.definitionId === 'first-tomb-ritual-coin' ? SHOP_INTERIOR_TEXTURES.geomancersCompass : SHOP_INTERIOR_TEXTURES.brassTally;
    this.displayVisual = this.add.image(x, y, texture).setDisplaySize(44, 44).setDepth(3.8);
  }

  private updateObjective(): void {
    const p = ShopProgressSystem.getProgress();
    let text = '在店里走走，查看发生变化的陈列。';
    if (this.carriedLoot?.disposition) text = `把器物送到${this.destinationName(this.carriedLoot.disposition)}。`;
    else if (this.carriedLoot) text = '把手中的器物放到清理台。';
    else if (p.activeLoot.some((x) => !x.placed)) text = '到待处理桌拿起一件器物。';
    else if (p.atlasPage === 0) text = '查看工作台上自行显墨的《万字藏图》。';
    else if (this.growthCurtain?.visible) text = '揭开新展示柜的防尘布。';
    this.objectiveText?.setText(text);
  }

  private showToast(text: string): void {
    this.toastText?.setText(text); this.toast?.setVisible(true).setAlpha(1);
    this.time.delayedCall(2800, () => this.toast && this.tweens.add({ targets: this.toast, alpha: 0, duration: SHOP_UI.motion.normal, onComplete: () => this.toast?.setVisible(false) }));
  }

  private destinationName(id: StationId | RelicDisposition): string {
    return ({ sell: '交货箱', collect: '展示柜', research: '研究盘', pledge: '抵押柜', incoming: '待处理器物', workbench: '清理台', atlas: '《万字藏图》', display: '新展示柜' } as Record<string, string>)[id] ?? '';
  }
  private destinationAction(id: StationId): string { return ({ sell: '放入并结算', collect: '放入陈列', research: '放入研究盘', pledge: '锁入抵押柜' } as Record<string, string>)[id] ?? '交互'; }
  private conclusionChinese(id: string, index: number): string {
    if (id === 'myriad-character-atlas') return index === 0 ? '未使用的旧账本' : '等待特定方位触发的仪式地图';
    return index === 0 ? '普通流通铜钱' : '供桌仪式排列中的方位标记';
  }

  private cleanup(): void { this.clearFocusOnly(); this.audio?.destroy(); this.atmosphere?.destroy(); this.player?.setMovementEnabled(false); }
}
