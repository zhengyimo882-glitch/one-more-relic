export type PlayerAppearanceId = 'charcoal' | 'moss' | 'umber' | 'ash';

export type PlayerHairStyle = 'short' | 'tied' | 'wavy' | 'cropped';

export interface PlayerAppearanceDefinition {
  id: PlayerAppearanceId;
  nameEn: string;
  nameZh: string;
  skinColor: number;
  hairColor: number;
  hairStyle: PlayerHairStyle;
  coatColor: number;
  innerColor: number;
  trousersColor: number;
  accentColor: number;
  shoeColor: number;
}

export const DEFAULT_PLAYER_APPEARANCE_ID: PlayerAppearanceId = 'charcoal';

export const PLAYER_APPEARANCES: readonly PlayerAppearanceDefinition[] = [
  {
    id: 'charcoal',
    nameEn: 'CHARCOAL',
    nameZh: '墨黑',
    skinColor: 0xb99a7e,
    hairColor: 0x17191a,
    hairStyle: 'short',
    coatColor: 0x34383a,
    innerColor: 0xd2c8ad,
    trousersColor: 0x25292c,
    accentColor: 0x6d7778,
    shoeColor: 0x263239,
  },
  {
    id: 'moss',
    nameEn: 'MOSS',
    nameZh: '苔青',
    skinColor: 0xc19d7f,
    hairColor: 0x202321,
    hairStyle: 'tied',
    coatColor: 0x56614f,
    innerColor: 0x474b47,
    trousersColor: 0x302e29,
    accentColor: 0x71806b,
    shoeColor: 0x26332b,
  },
  {
    id: 'umber',
    nameEn: 'UMBER',
    nameZh: '赭褐',
    skinColor: 0xa98269,
    hairColor: 0x30231f,
    hairStyle: 'wavy',
    coatColor: 0x604535,
    innerColor: 0x999083,
    trousersColor: 0x292524,
    accentColor: 0x713d35,
    shoeColor: 0x211f1e,
  },
  {
    id: 'ash',
    nameEn: 'ASH',
    nameZh: '灰烬',
    skinColor: 0xc2a087,
    hairColor: 0x303337,
    hairStyle: 'cropped',
    coatColor: 0x53616a,
    innerColor: 0x767c7e,
    trousersColor: 0x363c42,
    accentColor: 0x713e3e,
    shoeColor: 0x171b1f,
  },
] as const;

export function isPlayerAppearanceId(
  value: string | undefined,
): value is PlayerAppearanceId {
  return PLAYER_APPEARANCES.some((appearance) => appearance.id === value);
}

export function getPlayerAppearance(
  id: PlayerAppearanceId = DEFAULT_PLAYER_APPEARANCE_ID,
): PlayerAppearanceDefinition {
  return (
    PLAYER_APPEARANCES.find((appearance) => appearance.id === id) ??
    PLAYER_APPEARANCES[0]
  );
}
