import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { CLICK_MOVE_TEXTURES } from '../visuals/clickMoveVisuals';

type ObstacleObject = Phaser.GameObjects.GameObject & {
  body?: Phaser.Physics.Arcade.StaticBody | Phaser.Physics.Arcade.Body;
};

export type ClickMoveControllerOptions = {
  obstacles: () => Phaser.GameObjects.GameObject[];
  isEnabled: () => boolean;
  bounds?: () => Phaser.Geom.Rectangle;
  screenExclusions?: Phaser.Geom.Rectangle[];
  cellSize?: number;
  clearance?: number;
  arrivalRadius?: number;
  depth?: number;
};

type GridPoint = { x: number; y: number };

export class ClickMoveController {
  private readonly hoverMarker: Phaser.GameObjects.Container;
  private readonly destinationMarker: Phaser.GameObjects.Container;
  private readonly path: Phaser.Math.Vector2[] = [];
  private readonly target = new Phaser.Math.Vector2();
  private readonly lastPosition = new Phaser.Math.Vector2();
  private readonly moveDirection = new Phaser.Math.Vector2();
  private lastProgressTime = 0;
  private replanCount = 0;
  private lastRejectAt = -Infinity;
  private arrivalCallback?: () => void;
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly options: ClickMoveControllerOptions,
  ) {
    this.hoverMarker = this.createMarker(false);
    this.destinationMarker = this.createMarker(true);
    this.scene.input.on('pointermove', this.handlePointerMove);
    this.scene.input.on('pointerdown', this.handlePointerDown);
    window.addEventListener('blur', this.handleBlur, true);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  update(time: number): void {
    if (this.destroyed) return;
    const enabled = this.options.isEnabled() && this.player.isMovementEnabled();
    if (!enabled) {
      this.hoverMarker.setVisible(false);
      this.cancelDestination();
      return;
    }

    this.updateHoverMarker(this.scene.input.activePointer);
    this.animateMarker(this.hoverMarker, time, false);
    this.animateMarker(this.destinationMarker, time, true);

    if (this.player.hasManualMovementInput()) {
      this.cancelDestination();
      return;
    }
    if (!this.destinationMarker.visible || this.path.length === 0) {
      this.player.setAutoMoveDirection(undefined);
      return;
    }

    while (this.path.length > 1 && this.distanceTo(this.path[0]) <= 16) this.path.shift();
    const waypoint = this.path[0];
    const distance = this.distanceTo(waypoint);
    if (this.path.length === 1 && distance <= (this.options.arrivalRadius ?? 12)) {
      this.completeDestination();
      return;
    }

    this.moveDirection.set(waypoint.x - this.player.x, waypoint.y - this.player.y);
    this.player.setAutoMoveDirection(this.moveDirection);

    if (time - this.lastProgressTime >= 420) {
      const moved = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.lastPosition.x,
        this.lastPosition.y,
      );
      this.lastPosition.set(this.player.x, this.player.y);
      this.lastProgressTime = time;
      if (moved < 3) {
        if (this.replanCount >= 2 || !this.planPath(this.target.x, this.target.y)) {
          this.cancelDestination();
        } else {
          this.replanCount += 1;
        }
      }
    }
  }

  cancelDestination(): void {
    this.path.length = 0;
    this.arrivalCallback = undefined;
    this.destinationMarker.setVisible(false);
    this.player.setAutoMoveDirection(undefined);
    this.scene.game.canvas.style.cursor = 'default';
  }

  /**
   * Finds a walkable point around an interaction whose authored center may be
   * inside furniture collision. The closest reachable candidate on the player
   * side is preferred, then progressively wider angles are tried.
   */
  moveNear(
    worldX: number,
    worldY: number,
    interactionRadius: number,
    onArrival?: () => void,
  ): boolean {
    if (this.destroyed || !this.options.isEnabled() || !this.player.isMovementEnabled()) return false;
    const currentDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, worldX, worldY);
    if (currentDistance <= interactionRadius) {
      onArrival?.();
      return true;
    }

    const towardPlayer = Phaser.Math.Angle.Between(worldX, worldY, this.player.x, this.player.y);
    const angleOffsets = [0, -22.5, 22.5, -45, 45, -67.5, 67.5, -90, 90, -135, 135, 180];
    const radii = [0.68, 0.82, 0.94].map((ratio) => Math.max(28, interactionRadius * ratio));
    const candidates: Array<{ x: number; y: number; distance: number }> = [];
    for (const radius of radii) {
      for (const offset of angleOffsets) {
        const angle = towardPlayer + Phaser.Math.DegToRad(offset);
        const x = worldX + Math.cos(angle) * radius;
        const y = worldY + Math.sin(angle) * radius;
        if (!this.isWorldPointWalkable(x, y)) continue;
        candidates.push({
          x,
          y,
          distance: Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y),
        });
      }
    }
    candidates.sort((left, right) => left.distance - right.distance);
    for (const candidate of candidates) {
      if (!this.planPath(candidate.x, candidate.y)) continue;
      this.commitDestination(candidate.x, candidate.y, onArrival);
      return true;
    }
    return false;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.input.off('pointermove', this.handlePointerMove);
    this.scene.input.off('pointerdown', this.handlePointerDown);
    window.removeEventListener('blur', this.handleBlur, true);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.player.setAutoMoveDirection(undefined);
    this.hoverMarker.destroy(true);
    this.destinationMarker.destroy(true);
  }

  private readonly handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (this.destroyed) return;
    this.updateHoverMarker(pointer);
  };

  private readonly handlePointerDown = (
    pointer: Phaser.Input.Pointer,
    gameObjects: Phaser.GameObjects.GameObject[],
  ): void => {
    if (this.destroyed || pointer.button !== 0 || !this.options.isEnabled()) return;
    if (gameObjects.length > 0 || !this.isScreenPointAllowed(pointer.x, pointer.y)) return;
    const world = pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
    if (!this.isWorldPointWalkable(world.x, world.y) || !this.planPath(world.x, world.y)) {
      this.rejectDestination(world.x, world.y);
      return;
    }

    this.commitDestination(world.x, world.y);
  };

  private commitDestination(x: number, y: number, onArrival?: () => void): void {
    this.target.set(x, y);
    this.arrivalCallback = onArrival;
    this.destinationMarker
      .setPosition(x, y)
      .setVisible(true)
      .setAlpha(0)
      .setScale(0.72);
    this.scene.tweens.killTweensOf(this.destinationMarker);
    this.scene.tweens.add({
      targets: this.destinationMarker,
      alpha: 1,
      scale: 1,
      duration: 260,
      ease: 'Back.Out',
    });
    this.playSealEcho(x, y, 0.82);
    this.lastPosition.set(this.player.x, this.player.y);
    this.lastProgressTime = this.scene.time.now;
    this.replanCount = 0;
  }

  private updateHoverMarker(pointer: Phaser.Input.Pointer): void {
    const insideCanvas = pointer.x >= 0 && pointer.y >= 0 &&
      pointer.x <= this.scene.scale.width && pointer.y <= this.scene.scale.height;
    if (!this.options.isEnabled() || !insideCanvas || !this.isScreenPointAllowed(pointer.x, pointer.y)) {
      this.hoverMarker.setVisible(false);
      if (insideCanvas) this.scene.game.canvas.style.cursor = 'default';
      return;
    }
    const world = pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
    if (
      this.destinationMarker.visible &&
      Phaser.Math.Distance.Between(world.x, world.y, this.target.x, this.target.y) < 22
    ) {
      this.hoverMarker.setVisible(false);
      return;
    }
    const valid = this.isWorldPointWalkable(world.x, world.y);
    this.hoverMarker.setVisible(valid);
    this.scene.game.canvas.style.cursor = valid ? 'default' : 'not-allowed';
    if (valid) this.hoverMarker.setPosition(world.x, world.y);
  }

  private readonly handleBlur = (): void => this.cancelDestination();

  private rejectDestination(x: number, y: number): void {
    const now = this.scene.time.now;
    if (now - this.lastRejectAt < 450) return;
    this.lastRejectAt = now;
    const reject = this.scene.add.image(x, y, CLICK_MOVE_TEXTURES.floorSeal)
      .setDepth(this.options.depth ?? 48)
      .setDisplaySize(72, 26)
      .setTint(0x7e3a31)
      .setAlpha(0.72);
    this.scene.tweens.add({
      targets: reject,
      alpha: 0,
      scaleX: reject.scaleX * 0.72,
      duration: 260,
      ease: 'Sine.Out',
      onComplete: () => reject.destroy(),
    });
  }

  private isScreenPointAllowed(x: number, y: number): boolean {
    return !(this.options.screenExclusions ?? []).some((rect) => rect.contains(x, y));
  }

  private bounds(): Phaser.Geom.Rectangle {
    if (this.options.bounds) return this.options.bounds();
    const bounds = this.scene.physics.world.bounds;
    return new Phaser.Geom.Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  private isWorldPointWalkable(x: number, y: number): boolean {
    const bounds = this.bounds();
    const clearance = this.options.clearance ?? 19;
    if (
      x < bounds.left + clearance || x > bounds.right - clearance ||
      y < bounds.top + clearance || y > bounds.bottom - clearance
    ) return false;

    return !this.options.obstacles().some((object) => {
      const body = (object as ObstacleObject).body;
      if (!body || !body.enable) return false;
      return x >= body.x - clearance && x <= body.x + body.width + clearance &&
        y >= body.y - clearance && y <= body.y + body.height + clearance;
    });
  }

  private planPath(targetX: number, targetY: number): boolean {
    this.path.length = 0;
    const start = new Phaser.Math.Vector2(this.player.x, this.player.y);
    const target = new Phaser.Math.Vector2(targetX, targetY);
    if (this.hasLineOfSight(start, target)) {
      this.path.push(target);
      return true;
    }

    const bounds = this.bounds();
    const cell = this.options.cellSize ?? 32;
    const columns = Math.ceil(bounds.width / cell);
    const rows = Math.ceil(bounds.height / cell);
    const toGrid = (point: Phaser.Math.Vector2): GridPoint => ({
      x: Phaser.Math.Clamp(Math.floor((point.x - bounds.x) / cell), 0, columns - 1),
      y: Phaser.Math.Clamp(Math.floor((point.y - bounds.y) / cell), 0, rows - 1),
    });
    const toWorld = (point: GridPoint): Phaser.Math.Vector2 => new Phaser.Math.Vector2(
      bounds.x + point.x * cell + cell / 2,
      bounds.y + point.y * cell + cell / 2,
    );
    const startGrid = toGrid(start);
    const targetGrid = toGrid(target);
    const key = (point: GridPoint): string => `${point.x},${point.y}`;
    const startKey = key(startGrid);
    const targetKey = key(targetGrid);
    const blocked = new Map<string, boolean>();
    const isBlocked = (point: GridPoint): boolean => {
      const pointKey = key(point);
      if (pointKey === startKey) return false;
      const cached = blocked.get(pointKey);
      if (cached !== undefined) return cached;
      const world = toWorld(point);
      const value = !this.isWorldPointWalkable(world.x, world.y);
      blocked.set(pointKey, value);
      return value;
    };
    if (isBlocked(targetGrid)) return false;

    const open: GridPoint[] = [startGrid];
    const openKeys = new Set([startKey]);
    const cameFrom = new Map<string, string>();
    const points = new Map<string, GridPoint>([[startKey, startGrid]]);
    const gScore = new Map<string, number>([[startKey, 0]]);
    const fScore = new Map<string, number>([[startKey, this.gridHeuristic(startGrid, targetGrid)]]);
    const neighbours = [-1, 0, 1].flatMap((dy) =>
      [-1, 0, 1].map((dx) => ({ dx, dy })),
    ).filter(({ dx, dy }) => dx !== 0 || dy !== 0);

    while (open.length > 0) {
      let bestIndex = 0;
      for (let index = 1; index < open.length; index += 1) {
        if ((fScore.get(key(open[index])) ?? Infinity) < (fScore.get(key(open[bestIndex])) ?? Infinity)) {
          bestIndex = index;
        }
      }
      const current = open.splice(bestIndex, 1)[0];
      const currentKey = key(current);
      openKeys.delete(currentKey);
      if (currentKey === targetKey) {
        const gridPath: GridPoint[] = [current];
        let cursor = currentKey;
        while (cameFrom.has(cursor)) {
          cursor = cameFrom.get(cursor)!;
          gridPath.unshift(points.get(cursor)!);
        }
        const worldPath = gridPath.slice(1).map(toWorld);
        worldPath.push(target);
        this.path.push(...this.simplifyPath(start, worldPath));
        return this.path.length > 0;
      }

      for (const { dx, dy } of neighbours) {
        const next = { x: current.x + dx, y: current.y + dy };
        if (next.x < 0 || next.y < 0 || next.x >= columns || next.y >= rows || isBlocked(next)) continue;
        if (dx !== 0 && dy !== 0) {
          if (isBlocked({ x: current.x + dx, y: current.y }) || isBlocked({ x: current.x, y: current.y + dy })) continue;
        }
        const nextKey = key(next);
        const tentative = (gScore.get(currentKey) ?? Infinity) + (dx !== 0 && dy !== 0 ? 1.414 : 1);
        if (tentative >= (gScore.get(nextKey) ?? Infinity)) continue;
        cameFrom.set(nextKey, currentKey);
        points.set(nextKey, next);
        gScore.set(nextKey, tentative);
        fScore.set(nextKey, tentative + this.gridHeuristic(next, targetGrid));
        if (!openKeys.has(nextKey)) {
          open.push(next);
          openKeys.add(nextKey);
        }
      }
    }
    return false;
  }

  private simplifyPath(start: Phaser.Math.Vector2, points: Phaser.Math.Vector2[]): Phaser.Math.Vector2[] {
    const simplified: Phaser.Math.Vector2[] = [];
    let anchor = start;
    let index = 0;
    while (index < points.length) {
      let furthest = index;
      for (let candidate = index; candidate < points.length; candidate += 1) {
        if (!this.hasLineOfSight(anchor, points[candidate])) break;
        furthest = candidate;
      }
      simplified.push(points[furthest]);
      anchor = points[furthest];
      index = furthest + 1;
    }
    return simplified;
  }

  private hasLineOfSight(from: Phaser.Math.Vector2, to: Phaser.Math.Vector2): boolean {
    const distance = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
    const steps = Math.max(1, Math.ceil(distance / 12));
    for (let index = 1; index <= steps; index += 1) {
      const t = index / steps;
      if (!this.isWorldPointWalkable(
        Phaser.Math.Linear(from.x, to.x, t),
        Phaser.Math.Linear(from.y, to.y, t),
      )) return false;
    }
    return true;
  }

  private gridHeuristic(from: GridPoint, to: GridPoint): number {
    const dx = Math.abs(from.x - to.x);
    const dy = Math.abs(from.y - to.y);
    return Math.max(dx, dy) + (1.414 - 1) * Math.min(dx, dy);
  }

  private distanceTo(point: Phaser.Math.Vector2): number {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, point.x, point.y);
  }

  private completeDestination(): void {
    const onArrival = this.arrivalCallback;
    this.arrivalCallback = undefined;
    this.path.length = 0;
    this.player.setAutoMoveDirection(undefined);
    this.scene.tweens.add({
      targets: this.destinationMarker,
      alpha: 0,
      scaleX: 0.66,
      scaleY: 0.66,
      duration: 240,
      ease: 'Cubic.In',
      onComplete: () => this.destinationMarker.setVisible(false).setAlpha(1).setScale(1),
    });
    this.playSealEcho(this.target.x, this.target.y, 1.12);
    onArrival?.();
  }

  private animateMarker(marker: Phaser.GameObjects.Container, time: number, destination: boolean): void {
    if (!marker.visible) return;
    const speed = destination ? 0.0047 : 0.0058;
    const wave = Math.sin(time * speed);
    const counterWave = Math.sin(time * speed * 0.62 + 1.7);
    const arrow = marker.getData('arrow') as Phaser.GameObjects.Image;
    const arrowGlow = marker.getData('arrowGlow') as Phaser.GameObjects.Image;
    const ring = marker.getData('ring') as Phaser.GameObjects.Image;
    const ringEcho = marker.getData('ringEcho') as Phaser.GameObjects.Image;
    const ringScaleX = ring.getData('baseScaleX') as number;
    const ringScaleY = ring.getData('baseScaleY') as number;
    const echoScaleX = ringEcho.getData('baseScaleX') as number;
    const echoScaleY = ringEcho.getData('baseScaleY') as number;

    arrow.setY(-10 + wave * 4.2).setAngle(counterWave * 2.2);
    arrowGlow
      .setY(arrow.y)
      .setAngle(arrow.angle)
      .setAlpha((destination ? 0.18 : 0.1) + (wave + 1) * 0.035);
    ring
      .setScale(ringScaleX * (1.01 - wave * 0.045), ringScaleY * (1 - wave * 0.058))
      .setAlpha((destination ? 0.95 : 0.86) + wave * 0.025);
    ringEcho
      .setScale(echoScaleX * (1.12 + wave * 0.075), echoScaleY * (1 + wave * 0.065))
      .setAlpha((destination ? 0.36 : 0.28) - wave * 0.03);
  }

  private createMarker(destination: boolean): Phaser.GameObjects.Container {
    const ringEcho = this.scene.add.image(0, 2, CLICK_MOVE_TEXTURES.floorSeal)
      .setDisplaySize(destination ? 106 : 98, destination ? 39 : 36)
      .setTint(destination ? 0xe48b59 : 0xb49a66)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(destination ? 0.36 : 0.28);
    ringEcho.setData('baseScaleX', ringEcho.scaleX);
    ringEcho.setData('baseScaleY', ringEcho.scaleY);
    ringEcho.setScale(ringEcho.getData('baseScaleX'), ringEcho.getData('baseScaleY'));
    const ring = this.scene.add.image(0, 0, CLICK_MOVE_TEXTURES.floorSeal)
      .setDisplaySize(destination ? 94 : 86, destination ? 34 : 31)
      .setTint(0xffffff)
      .setAlpha(destination ? 0.95 : 0.86);
    ring.setData('baseScaleX', ring.scaleX);
    ring.setData('baseScaleY', ring.scaleY);
    ring.setScale(ring.getData('baseScaleX'), ring.getData('baseScaleY'));
    const arrowGlow = this.scene.add.image(0, -10, CLICK_MOVE_TEXTURES.pointer)
      .setDisplaySize(destination ? 48 : 43, destination ? 54 : 49)
      .setOrigin(0.5, 1)
      .setTint(destination ? 0xff806d : 0x79a997)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(destination ? 0.2 : 0.12);
    const arrow = this.scene.add.image(0, -10, CLICK_MOVE_TEXTURES.pointer)
      .setDisplaySize(destination ? 44 : 40, destination ? 50 : 46)
      .setOrigin(0.5, 1)
      .setAlpha(destination ? 0.96 : 0.82);

    const marker = this.scene.add.container(0, 0, [ringEcho, ring, arrowGlow, arrow])
      .setDepth(this.options.depth ?? 48)
      .setVisible(false);
    marker.setData('ring', ring);
    marker.setData('ringEcho', ringEcho);
    marker.setData('arrow', arrow);
    marker.setData('arrowGlow', arrowGlow);
    return marker;
  }

  private playSealEcho(x: number, y: number, strength: number): void {
    const echo = this.scene.add.image(x, y, CLICK_MOVE_TEXTURES.floorSeal)
      .setDepth((this.options.depth ?? 48) - 1)
      .setDisplaySize(90, 33)
      .setTint(strength > 1 ? 0xb94632 : 0xd6a45d)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.5);
    const baseScaleX = echo.scaleX;
    const baseScaleY = echo.scaleY;
    echo.setScale(baseScaleX * 0.72, baseScaleY * 0.72);
    this.scene.tweens.add({
      targets: echo,
      alpha: 0,
      scaleX: baseScaleX * 1.42,
      scaleY: baseScaleY * 1.42,
      duration: strength > 1 ? 360 : 430,
      ease: 'Sine.Out',
      onComplete: () => echo.destroy(),
    });
  }
}
