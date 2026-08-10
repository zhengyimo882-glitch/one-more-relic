import Phaser from 'phaser';
import { TOMB_FEEL } from '../config/tombFeelConfig';

export type TombEncounterState =
  | 'Dormant'
  | 'Remembering'
  | 'Following'
  | 'Manifesting'
  | 'Appeased'
  | 'Provoked';

export type TombEncounterTransition = {
  previous: TombEncounterState;
  current: TombEncounterState;
  reason: string;
};

export class TombEncounterSystem extends Phaser.Events.EventEmitter {
  private state: TombEncounterState = 'Dormant';
  private criticalSlotId: string;
  private currentSlotId: string | null;
  private criticalCarried = false;
  private originX = 0;
  private originY = 0;

  constructor(criticalSlotId: string) {
    super();
    this.criticalSlotId = criticalSlotId;
    this.currentSlotId = criticalSlotId;
  }

  getState(): TombEncounterState {
    return this.state;
  }

  getCriticalSlotId(): string {
    return this.criticalSlotId;
  }

  getCurrentSlotId(): string | null {
    return this.currentSlotId;
  }

  isCriticalCarried(): boolean {
    return this.criticalCarried;
  }

  isExitUnlocked(): boolean {
    return this.state === 'Appeased';
  }

  reset(originX: number, originY: number): void {
    this.state = 'Dormant';
    this.currentSlotId = this.criticalSlotId;
    this.criticalCarried = false;
    this.originX = originX;
    this.originY = originY;
  }

  takeCritical(fromSlotId: string, worldX: number, worldY: number): void {
    this.currentSlotId = null;
    this.criticalCarried = true;
    this.originX = worldX;
    this.originY = worldY;

    if (this.state === 'Appeased') {
      this.transition('Provoked', 'critical offering taken again after appeasement');
      return;
    }
    if (this.state === 'Dormant') {
      this.criticalSlotId = fromSlotId;
      this.transition('Remembering', 'critical offering first disturbed');
    }
  }

  placeCritical(slotId: string): 'correct' | 'wrong' {
    this.currentSlotId = slotId;
    this.criticalCarried = false;
    if (slotId === this.criticalSlotId) {
      if (this.state === 'Manifesting' || this.state === 'Provoked') {
        this.transition('Appeased', 'critical offering returned to its remembered slot');
      } else if (this.state === 'Remembering' || this.state === 'Following') {
        this.transition(
          'Dormant',
          'critical offering returned before the tomb could manifest',
        );
      }
      return 'correct';
    }

    if (this.state === 'Remembering') {
      this.transition('Following', 'critical offering placed in the wrong slot');
    }
    return 'wrong';
  }

  updatePlayerPosition(playerX: number, playerY: number): void {
    if (this.state === 'Remembering') {
      const distance = Phaser.Math.Distance.Between(
        playerX,
        playerY,
        this.originX,
        this.originY,
      );
      if (distance >= TOMB_FEEL.encounter.followDistance) {
        this.transition('Following', 'player carried the remembered offering away');
      }
      return;
    }

    if (
      this.state === 'Following' &&
      playerY >= TOMB_FEEL.encounter.manifestingCorridorY
    ) {
      this.transition('Manifesting', 'player entered the return corridor');
    }
  }

  private transition(next: TombEncounterState, reason: string): void {
    if (next === this.state) {
      return;
    }
    const transition: TombEncounterTransition = {
      previous: this.state,
      current: next,
      reason,
    };
    this.state = next;
    this.emit('statechange', transition);
  }
}
