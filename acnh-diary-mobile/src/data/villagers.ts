import type { Villager } from './villager-types';

const bundledVillagers = require('./content/villagers/villagers.json') as Villager[];

export const villagers = bundledVillagers;
