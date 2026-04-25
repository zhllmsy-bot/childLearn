import { lazy } from 'react';

const loadEnglishModulePage = () =>
  import('../components/EnglishModulePage/EnglishModulePage').then((module) => ({
    default: module.EnglishModulePage,
  }));

const loadLiteracyModulePage = () =>
  import('../components/LiteracyModulePage/LiteracyModulePage').then((module) => ({
    default: module.LiteracyModulePage,
  }));

const loadProgrammingIslandPage = () =>
  import('../components/ProgrammingIslandPage/ProgrammingIslandPage').then((module) => ({
    default: module.ProgrammingIslandPage,
  }));

const loadStickerAlbumPage = () =>
  import('../components/StickerAlbumPage/StickerAlbumPage').then((module) => ({
    default: module.StickerAlbumPage,
  }));

export const EnglishModulePage = lazy(loadEnglishModulePage);
export const LiteracyModulePage = lazy(loadLiteracyModulePage);
export const ProgrammingIslandPage = lazy(loadProgrammingIslandPage);
export const StickerAlbumPage = lazy(loadStickerAlbumPage);

const preloaders = {
  english: loadEnglishModulePage,
  literacy: loadLiteracyModulePage,
  programming: loadProgrammingIslandPage,
  stickers: loadStickerAlbumPage,
} as const;

export type LazyScene = keyof typeof preloaders;

export function preloadLazyScene(scene: LazyScene) {
  void preloaders[scene]();
}

export function preloadSecondaryScenes() {
  (Object.keys(preloaders) as LazyScene[]).forEach(preloadLazyScene);
}
