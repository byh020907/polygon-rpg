// UI-only type colors. Labels remain visible so meaning never depends on color alone.
const PALETTE = Object.freeze({
  player: ['#f0cc70', '#493b1d'],
  enemy: ['#f18a79', '#4c2826'],
  'enemy-reference': ['#f18a79', '#4c2826'],
  humanoid: ['#efb06d', '#4c351f'],
  beast: ['#b6d975', '#35451f'],
  flying: ['#76d7ed', '#1d414c'],
  machine: ['#c2a3f2', '#392b51'],
  npc: ['#76dac6', '#1c443d'],
  equipment: ['#c2a3f2', '#392b51'],
  world: ['#9bd18b', '#2c4326'],
  scene: ['#9bd18b', '#2c4326'],
  terrain: ['#d5bb80', '#443a25'],
  background: ['#8faedc', '#26394c'],
  foreground: ['#7dd2bd', '#20443b'],
  building: ['#e7a484', '#4a3027'],
  facility: ['#d8d17e', '#424026'],
  prop: ['#e8a4ba', '#482c38'],
  effect: ['#89bfff', '#243b55'],
  ui: ['#89bfff', '#243b55'],
});
export function radialTypeColor(key) {
  const [accent, background] = PALETTE[key] ?? ['#c3a75e', '#19332d'];
  return { accent, background };
}
