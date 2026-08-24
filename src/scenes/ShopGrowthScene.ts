import Phaser from 'phaser';
import { polishSceneTypography } from '../ui/gameTypography';
import { DEFAULT_PLAYER_APPEARANCE_ID, isPlayerAppearanceId, type PlayerAppearanceId } from '../data/playerAppearances';
import { SHOP_RELICS, type RelicDisposition } from '../data/shopRelics';
import {
  RESTORATION_TEXTURES,
  RESTORATION_TOOLS,
  calculateRelicValue,
  preloadRelicRestorationAssets,
  restorationDefinitionFor,
  type RestorationToolId,
} from '../data/relicRestoration';
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
import { RelicCleaningController } from '../systems/RelicCleaningController';
import { RelicInspectionController } from '../systems/RelicInspectionController';
import { ClickMoveController } from '../systems/ClickMoveController';
import { preloadClickMoveVisuals } from '../visuals/clickMoveVisuals';
import { createShopWorldCue } from '../ui/createShopWorldCue';
import { NARRATIVE_ART_TEXTURES, preloadNarrativeArt } from '../visuals/narrativeArt';
import { InputActionManager } from '../input/InputActionManager';
import { InteractionController } from '../systems/InteractionController';
import { installSceneLoadingOverlay, markSceneInteractive } from '../systems/SceneTransitionController';
import { InteractionDebugOverlay } from '../systems/InteractionDebugOverlay';

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
  private cleaningController?: RelicCleaningController;
  private inspectionController?: RelicInspectionController;
  private clickMove?: ClickMoveController;
  private evidenceFound = new Set<string>();
  private inputLockedUntil = 0;
  private inputActions?: InputActionManager;
  private interactionController?: InteractionController<Station>;
  private interactionDebug?: InteractionDebugOverlay;

  constructor() { super('ShopGrowthScene'); }

  init(data?: ShopGrowthData): void {
    this.incomingSettlement = data?.settlement;
    this.appearanceId = isPlayerAppearanceId(data?.appearanceId) ? data.appearanceId : DEFAULT_PLAYER_APPEARANCE_ID;
  }

  preload(): void {
    installSceneLoadingOverlay(this);
    preloadClickMoveVisuals(this);
    preloadPlayerAvatarAssets(this); preloadShopkeeperAssets(this); preloadAntiqueShopInteriorAssets(this);
    preloadRelicRestorationAssets(this);
    preloadNarrativeArt(this);
  }

  create(): void {
    this.inputActions = InputActionManager.forScene(this);
    this.interactionController = new InteractionController(this, { stickMs: 250 });
    this.interactionDebug = new InteractionDebugOverlay(this, {
      player: () => this.player,
      target: () => this.nearby ?? '',
      dragging: () => this.cleaningController?.isDragging()
        ? 'cleaning'
        : this.inspectionController?.isDragging()
          ? 'inspection'
          : '',
    });
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
    this.clickMove = new ClickMoveController(this, this.player, {
      obstacles: () => this.interior?.obstacles.getChildren() ?? [],
      isEnabled: () => !this.focusMode && Boolean(this.player?.isMovementEnabled()),
      screenExclusions: [
        new Phaser.Geom.Rectangle(0, 0, 370, 115),
        new Phaser.Geom.Rectangle(0, 635, 1280, 85),
      ],
      clearance: 19,
      depth: 18,
    });
    this.createShopObjects();
    this.createHud();
    this.registerInput();
    this.restoreFromData();
    this.refreshState();
    polishSceneTypography(this);
    this.cameras.main.fadeIn(260, 8, 6, 4);
    markSceneInteractive(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  update(): void {
    if (!this.player || !this.inputActions) return;
    this.inputActions.setContext(this.focusMode ? `shop-focus:${this.focusMode}` : 'shop-growth-world');
    const escape = this.inputActions.consume('cancel');
    const confirm = this.inputActions.consume('confirm');
    const left = this.inputActions.consume('nav-left', { cooldownMs: 120 });
    const right = this.inputActions.consume('nav-right', { cooldownMs: 120 });
    const up = this.inputActions.consume('nav-up', { cooldownMs: 120 });
    const down = this.inputActions.consume('nav-down', { cooldownMs: 120 });
    this.clickMove?.update(this.time.now);
    this.interactionDebug?.update(this.time.now);
    if (this.focusMode) {
      this.cleaningController?.update(this.time.now);
      this.inspectionController?.update(this.time.now, this.input.activePointer);
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
    // Authored station centers often sit inside their furniture collider. Give
    // the player's foot collider a small reachable interaction margin.
    const reachableRadius = radius + 24;
    const cue = createShopWorldCue(this, radius * 1.35, 58)
      .setPosition(x, y)
      .setVisible(false);
    const key = createStyleBoardKeycap(this, 'E', 30, 30).setX(-74);
    const title = this.add.text(-50, -10, name, { fontFamily: SERIF, fontSize: '15px', color: SHOP_UI.colors.text }).setOrigin(0, 0.5);
    const verb = this.add.text(-50, 10, action, { fontFamily: SANS, fontSize: '12px', color: SHOP_UI.colors.muted }).setOrigin(0, 0.5);
    const prompt = this.add.container(x, y - 68, [createStyleBoardPanel(this, 200, 52, 'thin', SHOP_UI.alpha.prompt), key, title, verb])
      .setDepth(12).setVisible(false);
    const station = { id, x, y, radius: reachableRadius, name, action, prompt, cue };
    this.stations.set(id, station);
    this.add.zone(x, y, radius * 1.35, radius * 1.1)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        if (!this.stationAvailable(id)) return;
        if (this.nearby === id && this.time.now >= this.inputLockedUntil) {
          this.interactionController?.acknowledge(cue);
          this.handleStation(id);
          this.inputLockedUntil = this.time.now + 160;
        } else {
          const moving = this.clickMove?.moveNear(x, y, reachableRadius, () => {
            if (!this.stationAvailable(id) || this.focusMode) return;
            const distance = this.player
              ? Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y)
              : Infinity;
            if (distance > reachableRadius + 14) return;
            this.updateNearby();
            this.interactionController?.acknowledge(cue);
            this.handleStation(id);
            this.inputLockedUntil = this.time.now + 160;
          });
          if (!moving) this.interactionController?.rejectAt(x, y - 58, '这边被挡住了，换个方向试试');
        }
      });
  }

  private createHud(): void {
    const paper = createStyleBoardPanel(this, 330, 58, 'thin', 0.9);
    const accent = this.add.rectangle(-162, 0, 4, 46, SHOP_UI.colors.cinnabar, 0.95);
    this.objectiveText = this.add.text(-140, 0, '', { fontFamily: SANS, fontSize: SHOP_UI.type.body, color: SHOP_UI.colors.text }).setOrigin(0, 0.5);
    this.objective = this.add.container(189, 49, [paper, accent, this.objectiveText]).setScrollFactor(0).setDepth(25);
    this.toastText = this.add.text(0, 0, '', { fontFamily: SERIF, fontSize: '16px', color: SHOP_UI.colors.text, align: 'center', wordWrap: { width: 600 } }).setOrigin(0.5);
    this.toast = this.add.container(640, 654, [createStyleBoardPanel(this, 660, 54, 'standard', 0.94), this.toastText])
      .setScrollFactor(0).setDepth(30).setVisible(false);
    this.add.text(640, 700, 'WASD / 鼠标点击地面  移动', {
      fontFamily: SANS, fontSize: '13px', color: SHOP_UI.colors.muted,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(25);
  }

  private registerInput(): void {
    this.inputActions = InputActionManager.forScene(this);
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
    const candidates: Array<{ id: string; value: Station; score: number }> = [];
    for (const station of this.stations.values()) {
      const active = this.stationAvailable(station.id);
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, station.x, station.y);
      if (active && d <= station.radius) candidates.push({ id: station.id, value: station, score: d });
      station.prompt.setVisible(false);
      station.cue.setVisible(active && this.isGuidedStation(station.id));
    }
    const nearest = this.interactionController?.select(candidates);
    for (const station of this.stations.values()) {
      if (station.id === nearest?.id) station.cue.setVisible(true);
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
    this.showToast(`已拿起${def.unidentifiedChineseName}。清理台的灯亮了。`);
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
    const restoration = restorationDefinitionFor(this.selectedLoot);
    const layer = this.beginFocus('cleaning', 'Cleaning');
    this.addFocusHeader(layer, `清理 · ${def.unidentifiedChineseName}`, '按住并拖动工具。看清需要的细节后，可以随时停止。');
    const workbench = this.add.image(452, 382, RESTORATION_TEXTURES.workbench).setDisplaySize(820, 468);
    const status = this.add.text(60, 142, '', {
      fontFamily: SANS, fontSize: '15px', color: '#ead7b6', lineSpacing: 6,
    });
    const warning = this.add.text(60, 186, '', {
      fontFamily: SERIF, fontSize: '15px', color: '#d7af77', wordWrap: { width: 760 },
    });
    layer.add([workbench, status, warning]);

    const updateStatus = (progress: number, damage: number, dirtType = 'loose-dust'): void => {
      const dirtName = ({ 'loose-dust': '浮尘', 'hard-corrosion': '硬锈', 'surface-film': '污膜', mold: '霉斑' } as Record<string, string>)[dirtType];
      status.setText(`显露 ${Math.round(progress)}%  ·  保存完整度 ${Math.round(Math.max(0, 100 - damage))}%\n当前触感：${dirtName}`);
      if (progress > 82 && !warning.text) warning.setText('包浆已经很薄。继续清理不一定会得到更多依据。');
    };
    updateStatus(this.selectedLoot.cleaningProgress, this.selectedLoot.cleaningDamage);
    this.cleaningController = new RelicCleaningController(
      this, layer, restoration, this.selectedLoot, this.audio, 452, 388,
      {
        onChanged: (progress, damage, dirtType) => updateStatus(progress, damage, dirtType),
        onWarning: (message) => {
          warning.setText(message).setAlpha(1);
          this.tweens.add({ targets: warning, alpha: 0.45, duration: 850, yoyo: true });
        },
      },
    );

    const toolIds: RestorationToolId[] = ['soft-brush', 'bamboo-pick', 'dry-cloth'];
    const toolButtons = toolIds.map((toolId, index) => {
      const tool = RESTORATION_TOOLS[toolId];
      const card = this.createChoiceCard(150 + index * 205, 655, 188, 58, `${index + 1}  ${tool.name}\n${tool.shortHint}`, index, () => selectTool(toolId));
      const icon = this.add.image(-74, 0, tool.texture).setDisplaySize(40, 52);
      const label = card.getData('label') as Phaser.GameObjects.Text;
      label.setX(-48).setFontSize('13px').setWordWrapWidth(136);
      card.add(icon); return card;
    });
    const selectTool = (toolId: RestorationToolId): void => {
      this.cleaningController?.setTool(toolId);
      toolButtons.forEach((button, index) => this.styleChoice(button, toolIds[index] === toolId));
      this.audio?.playSfx('choice-move');
    };
    layer.add(toolButtons); layer.setData('toolButtons', toolButtons); layer.setData('toolIds', toolIds);
    selectTool('soft-brush');
    const stop = this.createChoiceCard(790, 655, 230, 58, '停止清理，转入观察', 0, () => {
      if (!this.selectedLoot) return;
      this.selectedLoot.cleaned = true;
      this.audio?.playSfx('choice-confirm');
      this.openInspection();
    });
    layer.add(stop); this.styleChoice(stop, true);
    polishSceneTypography(this);
  }

  private openInspection(): void {
    if (!this.selectedLoot) return;
    this.clearFocusOnly();
    const def = SHOP_RELICS[this.selectedLoot.definitionId];
    const restoration = restorationDefinitionFor(this.selectedLoot);
    const layer = this.beginFocus('inspection', 'Inspection');
    this.addFocusHeader(layer, `观察 · ${def.unidentifiedChineseName}`, '拖动翻面 · 滚轮缩放 · 拖动工作灯改变侧光 · A / D 切换观察面');
    const workbench = this.add.image(455, 390, RESTORATION_TEXTURES.workbench).setDisplaySize(820, 470);
    const hint = this.add.text(870, 140, '不要寻找标记。让角度、距离和侧光把细节显出来。', {
      fontFamily: SERIF, fontSize: '15px', color: '#f0d7a8', wordWrap: { width: 340, useAdvancedWrap: true }, lineSpacing: 4,
    });
    const faceState = this.add.text(60, 145, '', { fontFamily: SANS, fontSize: '14px', color: '#ead7b6' });
    layer.add([workbench, hint, faceState]);
    this.evidenceFound = new Set(this.selectedLoot.evidenceIds);

    const notebook = this.add.image(1125, 380, RESTORATION_TEXTURES.notebookClosed).setDisplaySize(150, 178);
    const notebookTitle = this.add.text(1015, 282, '观察记录', { fontFamily: SERIF, fontSize: '19px', color: '#2d1d14', stroke: '#dfc99f', strokeThickness: 2 }).setVisible(false);
    const evidenceBody = this.add.text(930, 318, '', {
      fontFamily: SANS, fontSize: '14px', color: '#2d2018', stroke: '#dfc99f', strokeThickness: 2, wordWrap: { width: 270 }, lineSpacing: 6,
    }).setVisible(false);
    layer.add([notebook, notebookTitle, evidenceBody]);
    let notebookOpened = false;
    const openNotebook = (): void => {
      if (!notebookOpened) {
        notebookOpened = true; notebook.setTexture(RESTORATION_TEXTURES.notebookOpen).setDisplaySize(342, 270).setPosition(1040, 395);
        notebookTitle.setVisible(true); evidenceBody.setVisible(true);
        notebook.setAlpha(0).setX(1110); notebookTitle.setAlpha(0); evidenceBody.setAlpha(0);
        this.tweens.add({ targets: [notebook, notebookTitle, evidenceBody], alpha: 1, duration: 260 });
        this.tweens.add({ targets: notebook, x: 1040, duration: 320, ease: 'Cubic.Out' });
      }
    };
    const refreshEvidence = (): void => {
      const found = def.evidence.filter((e) => this.evidenceFound.has(e.id));
      if (found.length) openNotebook();
      evidenceBody.setText(found.map((e, index) => `${index + 1}. ${e.chineseLabel}\n${e.chineseDetail}`).join('\n\n') || '尚无记录');
      next.setVisible(found.length >= restoration.minimumEvidenceForAppraisal);
    };
    const next = this.createChoiceCard(1040, 620, 270, 58, '根据现有证据鉴定', 0, () => this.openAppraisal()).setVisible(false);
    layer.add(next); this.styleChoice(next, true);
    this.inspectionController = new RelicInspectionController(
      this, layer, restoration, this.selectedLoot, this.audio, 460, 395,
      {
        onEvidence: (region) => {
          this.evidenceFound.add(region.id);
          hint.setText(region.observation);
          refreshEvidence();
        },
        onHint: (message) => hint.setText(message),
        onFaceChanged: (face, zoom, lightAngle) => faceState.setText(`${face.label}  ·  放大 ${zoom.toFixed(1)}×  ·  侧光 ${Math.round(lightAngle)}°`),
      },
    );
    refreshEvidence();
    polishSceneTypography(this);
  }

  private openAppraisal(): void {
    if (!this.selectedLoot) return;
    this.clearFocusOnly();
    const def = SHOP_RELICS[this.selectedLoot.definitionId];
    const layer = this.beginFocus('appraisal', 'AppraisalDecision');
    const found = def.evidence.filter((e) => this.evidenceFound.has(e.id));
    this.addFocusHeader(layer, '鉴定结论', `已记录 ${found.length}/${def.evidence.length} 条器物证据。证据不足时也可以判断，但风险会保留。`);
    layer.add(this.add.image(355, 400, RESTORATION_TEXTURES.notebookOpen).setDisplaySize(540, 430));
    layer.add(this.add.text(150, 210, '本次依据', { fontFamily: SERIF, fontSize: '23px', color: '#3a291c' }));
    layer.add(this.add.text(145, 250, `${found.map((e) => `◆ ${e.chineseLabel}`).join('\n') || '◆ 尚未形成可靠器物证据'}\n◆ 墓中记录的方位与摆放关系\n\n保存完整度 ${this.selectedLoot.preservationScore ?? Math.max(0, 100 - this.selectedLoot.cleaningDamage)}%`, { fontFamily: SANS, fontSize: '16px', color: '#4b3928', lineSpacing: 13, wordWrap: { width: 420 } }));
    const cards = def.conclusions.map((c, i) => this.createChoiceCard(870, 285 + i * 145, 470, 105, this.conclusionChinese(def.id, i), i, () => this.confirmAppraisal(i)));
    layer.add(cards); this.choiceIndex = 0; cards.forEach((c, i) => this.styleChoice(c, i === 0));
    layer.setData('choiceCards', cards);
    polishSceneTypography(this);
  }

  private confirmAppraisal(index: number): void {
    if (!this.selectedLoot) return;
    const def = SHOP_RELICS[this.selectedLoot.definitionId];
    const restoration = restorationDefinitionFor(this.selectedLoot);
    const evidenceComplete = this.evidenceFound.size >= restoration.evidenceRegions.length;
    const criticalEvidenceIntact = !(this.selectedLoot.destroyedEvidenceIds?.length);
    const correct = index === def.correctConclusionIndex && evidenceComplete && criticalEvidenceIntact;
    ShopProgressSystem.recordConclusion(this.selectedLoot, index, correct);
    this.audio?.playSfx('choice-confirm');
    this.showToast(correct ? '朱砂印落下：证据彼此吻合，器物价值上调。' : criticalEvidenceIntact ? '账本标作“存疑”：证据尚未闭合，估价下降。' : '新刮痕破坏了关键旧痕，结论无法坐实，估价下降。');
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
    this.addFocusHeader(layer, `决定去向 · ${def.chineseName}`, '选好去向后，把器物送到店内对应位置。放下时完成结算。');
    const saleValue = calculateRelicValue(this.selectedLoot, def.saleValue);
    const pledgeValue = Math.max(0, Math.round(def.pledgeValue - this.selectedLoot.cleaningDamage * 1.5 + this.selectedLoot.evidenceIds.length * 8));
    const preservation = this.selectedLoot.preservationScore ?? Math.round(Math.max(0, 100 - this.selectedLoot.cleaningDamage));
    const choices: { d: RelicDisposition; title: string; body: string }[] = [
      { d: 'sell', title: `出售  +¥${saleValue}`, body: `损伤、证据完整度与鉴定结果已经计入。保存完整度 ${preservation}%。` },
      { d: 'collect', title: `收藏陈列  完整度 ${preservation}%`, body: '保留包浆会提高陈列价值；过度清理与新伤会永久留在器物上。' },
      { d: 'research', title: `留作研究  证据 ${this.selectedLoot.evidenceIds.length}/${def.evidence.length}`, body: '暂时没有收入。器物会保留当前污层、损伤和未确认线索。' },
      { d: 'pledge', title: `留作抵押  墓价¥${pledgeValue}`, body: '抵押估值同样受清理损伤和证据数量影响。' },
    ];
    const cards = choices.map((c, i) => this.createChoiceCard(365 + (i % 2) * 550, 285 + Math.floor(i / 2) * 190, 490, 145, `${c.title}\n${c.body}`, i, () => this.selectDisposition(c.d)));
    layer.add(cards); this.choiceIndex = 0; cards.forEach((c, i) => this.styleChoice(c, i === 0)); layer.setData('choiceCards', cards); layer.setData('dispositions', choices.map((x) => x.d));
    polishSceneTypography(this);
  }

  private selectDisposition(disposition: RelicDisposition): void {
    if (!this.selectedLoot) return;
    this.selectedLoot.disposition = disposition;
    this.carriedLoot = this.selectedLoot;
    this.closeFocus(false); this.flowState = 'Placement';
    this.carriedVisual = this.createCarryRelic(this.selectedLoot);
    this.player?.setCarrying(true);
    this.player?.playCarryAction('pickup');
    this.showToast(`账本已夹签：${this.destinationName(disposition)}。把器物送到对应位置，放下后完成结算。`);
    this.updateObjective();
  }

  private placeDisposition(disposition: RelicDisposition): void {
    if (
      !this.carriedLoot ||
      this.carriedLoot.disposition !== disposition ||
      this.carryTransitionActive
    ) return;
    const loot = this.carriedLoot; const def = SHOP_RELICS[loot.definitionId];
    const value = calculateRelicValue(loot, def.saleValue);
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
      this.showToast(disposition === 'sell' ? `已完成交货，账本记入 ¥${value}。` : `${def.chineseName}已放入${this.destinationName(disposition)}。店内陈列发生了永久变化。`);
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
    this.addFocusHeader(layer, '《万字藏图》', '这些墨迹指向的不是下一座墓，而是店里的某个位置。');
    const frame = createStyleBoardPanel(this, 950, 514, 'carved', 0.98).setPosition(640, 394);
    const page = this.add.image(640, 394, NARRATIVE_ART_TEXTURES.myriadAtlasReveal).setDisplaySize(930, 494);
    const developingPage = this.add
      .image(640, 394, NARRATIVE_ART_TEXTURES.myriadAtlasReveal)
      .setDisplaySize(930, 494)
      .setTint(0x342e27)
      .setAlpha(p.atlasPage === 0 ? 0.92 : 0);
    const captionBg = createStyleBoardPanel(this, 860, 62, 'thin', 0.94).setPosition(640, 645);
    const caption = this.add.text(640, 645, p.atlasPage === 0
      ? '墨线从纸纤维里缓慢渗出：店里的展示柜，正压在墓室前室壁龛的位置上。'
      : '残页上的店铺与墓室彼此叠映，朱砂印仍压在那座展示柜上。', {
      fontFamily: SERIF, fontSize: '17px', color: SHOP_UI.colors.text, align: 'center', wordWrap: { width: 800 },
    }).setOrigin(0.5);
    layer.add([frame, page, developingPage, captionBg, caption]);
    if (p.atlasPage === 0) {
      page.setAlpha(0.28);
      this.tweens.add({
        targets: page, alpha: 1, duration: 1900, ease: 'Sine.InOut',
      });
      this.tweens.add({
        targets: developingPage, alpha: 0, duration: 2300, ease: 'Sine.InOut',
        onComplete: () => {
          ShopProgressSystem.unlockFirstGrowth(); this.growthCabinet?.setVisible(true); this.growthCurtain?.setVisible(true); this.audio?.playSfx('transition');
        },
      });
    }
    polishSceneTypography(this);
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
            this.showToast('防尘布滑落，铜角和玻璃一一露了出来。柜格的比例，和墓室壁龛几乎一样。');
            this.refreshState();
          },
        });
      },
    });
  }

  private updateFocusInput(confirm: boolean, left: boolean, right: boolean, up: boolean, down: boolean): void {
    if (!this.focusLayer || !this.focusMode) return;
    if (this.focusMode === 'inspection' && (left || right)) {
      this.inspectionController?.nextFace(right ? 1 : -1); return;
    }
    if (this.focusMode === 'cleaning' && (left || right)) {
      const ids = this.focusLayer.getData('toolIds') as RestorationToolId[] | undefined;
      const buttons = this.focusLayer.getData('toolButtons') as Phaser.GameObjects.Container[] | undefined;
      if (ids && buttons && this.cleaningController) {
        const current = ids.indexOf(this.cleaningController.getTool());
        const next = Phaser.Math.Wrap(current + (right ? 1 : -1), 0, ids.length);
        this.cleaningController.setTool(ids[next]);
        buttons.forEach((button, index) => this.styleChoice(button, index === next));
      }
      return;
    }
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
    this.cleaningController?.destroy(); this.cleaningController = undefined;
    this.inspectionController?.destroy(); this.inspectionController = undefined;
    this.focusLayer?.destroy(true); this.focusLayer = undefined; this.focusMode = undefined;
  }

  private createChoiceCard(x: number, y: number, w: number, h: number, label: string, index: number, action: () => void): Phaser.GameObjects.Container {
    const bg = createStyleBoardButtonBackground(this, w, h, 'default', 'primary');
    const text = this.add.text(-w / 2 + 20, 0, label, { fontFamily: SANS, fontSize: '16px', color: SHOP_UI.colors.text, wordWrap: { width: w - 40 }, lineSpacing: 5 }).setOrigin(0, 0.5);
    const card = this.add.container(x, y, [bg, text]).setSize(w, h).setInteractive({ useHandCursor: true });
    card.setData('bg', bg); card.setData('label', text); card.setData('index', index);
    card.on('pointerover', () => {
      this.choiceIndex = index;
      const siblings = this.focusLayer?.getData('choiceCards') as Phaser.GameObjects.Container[] | undefined;
      siblings?.forEach((c, i) => this.styleChoice(c, i === index));
      if (!siblings) {
        drawStyleBoardButton(bg, w, h, 'hover', 'primary');
        text.setColor(styleBoardButtonTextColor('hover'));
      }
    });
    card.on('pointerdown', () => {
      drawStyleBoardButton(bg, w, h, 'pressed', 'primary');
      text.setColor(styleBoardButtonTextColor('pressed'));
      card.setScale(0.985);
    });
    card.on('pointerup', () => {
      card.setScale(1); this.styleChoice(card, true); action();
    });
    card.on('pointerout', () => {
      card.setScale(1); this.styleChoice(card, this.choiceIndex === index);
    });
    return card;
  }

  private styleChoice(card: Phaser.GameObjects.Container, selected: boolean): void {
    const bg = card.getData('bg') as Phaser.GameObjects.Graphics; const label = card.getData('label') as Phaser.GameObjects.Text;
    const width = card.width; const height = card.height;
    if (bg) drawStyleBoardButton(bg, width, height, selected ? 'selected' : 'default', 'primary');
    label?.setColor(styleBoardButtonTextColor(selected ? 'selected' : 'default'));
  }

  private createCarryRelic(loot: TombLootRecord): Phaser.GameObjects.Image {
    const texture = restorationDefinitionFor(loot).inspectionFaces[0].cleanTexture;
    const target = this.getHeldRelicTarget();
    const image = this.add
      .image(target.x, target.y, texture)
      .setDisplaySize(loot.definitionId === 'first-tomb-ritual-coin' ? 40 : 38, loot.definitionId === 'first-tomb-ritual-coin' ? 40 : 48)
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
    const texture = restorationDefinitionFor(loot).inspectionFaces[0].cleanTexture;
    this.displayVisual = this.add.image(x, y, texture)
      .setDisplaySize(loot.definitionId === 'first-tomb-ritual-coin' ? 48 : 54, loot.definitionId === 'first-tomb-ritual-coin' ? 48 : 64)
      .setDepth(3.8);
  }

  private updateObjective(): void {
    const p = ShopProgressSystem.getProgress();
    let text = '在店里转一圈，看看陈列有什么变化。';
    if (this.carriedLoot?.disposition) text = `把器物放到${this.destinationName(this.carriedLoot.disposition)}。`;
    else if (this.carriedLoot) text = '把手里的器物送到清理台。';
    else if (p.activeLoot.some((x) => !x.placed)) text = '去待处理桌拿一件器物。';
    else if (p.atlasPage === 0) text = '去看看工作台上正在自行显字的《万字藏图》。';
    else if (this.growthCurtain?.visible) text = '去揭开新展示柜上的防尘布。';
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

  private cleanup(): void { this.clearFocusOnly(); this.clickMove?.destroy(); this.clickMove = undefined; this.audio?.destroy(); this.atmosphere?.destroy(); this.player?.setMovementEnabled(false); }
}
