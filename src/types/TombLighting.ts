export type TombPointLight = Readonly<{
  x: number;
  y: number;
  radius: number;
  intensity: number;
  color: number;
}>;

export type TombShadowCaster = Readonly<{
  x: number;
  y: number;
  radius: number;
  height: number;
  visible: boolean;
}>;

