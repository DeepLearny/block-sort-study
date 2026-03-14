export type LegacyProgressState = {
  levelNr: number;
  inLevel: boolean;
  inZenMode: boolean;
};

export type GameStateMap = Record<string, unknown>;

export type StudyGameSnapshotV2 = {
  version: 2;
  savedAt: string;
  revision: number;
  levelNr: number;
  inLevel: boolean;
  inZenMode: boolean;
  activeState: {
    levelStage: number;
    levelType: string | null;
    zenLevelStage: number;
    zenLevelType: string | null;
    zenLevelNr: number;
    zenDifficulty: number;
    zenLevelTypeIndex: number;
    moveCount: number;
    previousMoveCount: number;
    revealedCount: number;
  };
  seeds: {
    currentLevelSeed: number | null;
    currentZenLevelSeed: number | null;
  };
  gameState: GameStateMap;
};

export type StudyProgressSnapshot = StudyGameSnapshotV2 | LegacyProgressState;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasManagedPrefix = (key: string) =>
  [
    "levelNr",
    "inLevel",
    "inZenMode",
    "zenLevelNr",
    "zenDifficulty",
    "zenLevelType",
    "zenLevelSettings",
    "levelStage",
    "levelType",
    "moves",
    "previousMoves",
    "revealed",
    "lostCounter",
    "usedAutoMoves",
    "streak",
    "hintMode",
    "disableGhostHand",
    "zenlevelStage",
    "zenlevelType",
    "zenmoves",
    "zenpreviousMoves",
    "zenrevealed",
    "zenlostCounter",
    "zenusedAutoMoves"
  ].includes(key);

const isLevelBlob = (key: string) =>
  /^(zen)?(initialLevelState|levelState)\d+(-\d+)?$/.test(key);

const isManagedGameKey = (key: string) =>
  hasManagedPrefix(key) || isLevelBlob(key);

const getNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const getBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const getMoveCount = (value: unknown) =>
  Array.isArray(value) ? value.length : 0;

const getSeedFromState = (value: unknown): number | null => {
  if (!isRecord(value)) {
    return null;
  }
  const generationInfo = value.generationInformation;
  if (!isRecord(generationInfo)) {
    return null;
  }
  return typeof generationInfo.seed === "number" ? generationInfo.seed : null;
};

export const serializeGameSnapshot = (
  coarse: LegacyProgressState,
  gameState: GameStateMap,
  revision: number,
  now = new Date()
): StudyGameSnapshotV2 => {
  const managedGameState = Object.fromEntries(
    Object.entries(gameState).filter(([key]) => isManagedGameKey(key))
  );

  const currentLevelNr = getNumber(managedGameState.levelNr, coarse.levelNr);
  const currentZenLevelNr = getNumber(managedGameState.zenLevelNr, 0);

  return {
    version: 2,
    savedAt: now.toISOString(),
    revision,
    levelNr: coarse.levelNr,
    inLevel: coarse.inLevel,
    inZenMode: coarse.inZenMode,
    activeState: {
      levelStage: getNumber(managedGameState.levelStage),
      levelType:
        typeof managedGameState.levelType === "string"
          ? managedGameState.levelType
          : null,
      zenLevelStage: getNumber(managedGameState.zenlevelStage),
      zenLevelType:
        typeof managedGameState.zenlevelType === "string"
          ? managedGameState.zenlevelType
          : null,
      zenLevelNr: currentZenLevelNr,
      zenDifficulty: getNumber(managedGameState.zenDifficulty),
      zenLevelTypeIndex: getNumber(managedGameState.zenLevelType),
      moveCount: getMoveCount(
        managedGameState[coarse.inZenMode ? "zenmoves" : "moves"]
      ),
      previousMoveCount: getMoveCount(
        managedGameState[
          coarse.inZenMode ? "zenpreviousMoves" : "previousMoves"
        ]
      ),
      revealedCount: getMoveCount(
        managedGameState[coarse.inZenMode ? "zenrevealed" : "revealed"]
      )
    },
    seeds: {
      currentLevelSeed: getSeedFromState(
        managedGameState[`initialLevelState${currentLevelNr}`] ??
          managedGameState[`levelState${currentLevelNr}`]
      ),
      currentZenLevelSeed: getSeedFromState(
        managedGameState[`zeninitialLevelState${currentZenLevelNr}`] ??
          managedGameState[`zenlevelState${currentZenLevelNr}`]
      )
    },
    gameState: managedGameState
  };
};

export const normalizeProgressSnapshot = (
  incoming: unknown
): { coarse: LegacyProgressState; snapshot: StudyGameSnapshotV2 | null } => {
  if (!isRecord(incoming)) {
    return {
      coarse: { levelNr: 0, inLevel: false, inZenMode: false },
      snapshot: null
    };
  }

  const levelNr = getNumber(incoming.levelNr);
  const inLevel = getBoolean(incoming.inLevel);
  const inZenMode = getBoolean(incoming.inZenMode);

  if (incoming.version === 2) {
    const savedAt =
      typeof incoming.savedAt === "string"
        ? incoming.savedAt
        : new Date(0).toISOString();
    const revision = getNumber(incoming.revision);
    const gameState = isRecord(incoming.gameState) ? incoming.gameState : {};
    const activeState = isRecord(incoming.activeState)
      ? incoming.activeState
      : {};
    const seeds = isRecord(incoming.seeds) ? incoming.seeds : {};

    return {
      coarse: { levelNr, inLevel, inZenMode },
      snapshot: {
        version: 2,
        savedAt,
        revision,
        levelNr,
        inLevel,
        inZenMode,
        gameState,
        activeState: {
          levelStage: getNumber(activeState.levelStage),
          levelType:
            typeof activeState.levelType === "string"
              ? activeState.levelType
              : null,
          zenLevelStage: getNumber(activeState.zenLevelStage),
          zenLevelType:
            typeof activeState.zenLevelType === "string"
              ? activeState.zenLevelType
              : null,
          zenLevelNr: getNumber(activeState.zenLevelNr),
          zenDifficulty: getNumber(activeState.zenDifficulty),
          zenLevelTypeIndex: getNumber(activeState.zenLevelTypeIndex),
          moveCount: getNumber(activeState.moveCount),
          previousMoveCount: getNumber(activeState.previousMoveCount),
          revealedCount: getNumber(activeState.revealedCount)
        },
        seeds: {
          currentLevelSeed:
            typeof seeds.currentLevelSeed === "number"
              ? seeds.currentLevelSeed
              : null,
          currentZenLevelSeed:
            typeof seeds.currentZenLevelSeed === "number"
              ? seeds.currentZenLevelSeed
              : null
        }
      }
    };
  }

  return {
    coarse: { levelNr, inLevel, inZenMode },
    snapshot: null
  };
};

export const restoreGameSnapshot = (
  snapshot: StudyGameSnapshotV2
): { gameState: GameStateMap; coarse: LegacyProgressState } => ({
  gameState: snapshot.gameState,
  coarse: {
    levelNr: snapshot.levelNr,
    inLevel: snapshot.inLevel,
    inZenMode: snapshot.inZenMode
  }
});
