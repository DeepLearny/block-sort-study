import { useEffect } from "react";
import localForage from "localforage";

import type { LevelState } from "@/game/types";
import {
  deleteOfflineValue,
  getOfflineValue,
  setOfflineValue,
  useOfflineStorage
} from "@/support/useOfflineStorage";

import { migrateLevelState } from "./migrateLevelState";

const GAME_STORE = "block-sort-store";

const gameStore = localForage.createInstance({
  driver: [localForage.INDEXEDDB, localForage.LOCALSTORAGE],
  name: GAME_STORE
});

export const useGameStorage = <T>(key: string, initialValue: T | (() => T)) =>
  useOfflineStorage<T>(key, initialValue, GAME_STORE);

export const getGameValue = <T>(key: string) =>
  getOfflineValue<T>(key, GAME_STORE);

export const setGameValue = <T>(key: string, value: T) =>
  setOfflineValue<T>(key, value, GAME_STORE);

export const deleteGameValue = (key: string) =>
  deleteOfflineValue(key, GAME_STORE);

export const getAllGameValues = async (): Promise<Record<string, unknown>> => {
  const values: Record<string, unknown> = {};
  await gameStore.iterate<unknown, void>((value, key) => {
    values[key] = value;
  });
  return values;
};

export const setGameValues = async (values: Record<string, unknown>) => {
  await Promise.all(
    Object.entries(values).map(([key, value]) => gameStore.setItem(key, value))
  );
};

export const useLevelStateStorage = (
  key: string,
  initialValue: LevelState | (() => LevelState)
) => {
  const [value, setValue, deleteValue] = useGameStorage<LevelState>(
    key,
    initialValue
  );
  useEffect(() => {
    const migratedValue = migrateLevelState(value);
    if (migratedValue !== value) {
      setValue(migratedValue);
    }
  }, [value, setValue]);
  return [migrateLevelState(value), setValue, deleteValue] as const;
};

export const getLevelStateValue = async (
  key: string
): Promise<LevelState | null> => {
  const value = await getOfflineValue<LevelState>(key, GAME_STORE);
  if (value === null) {
    return value;
  }
  const migratedValue = migrateLevelState(value);
  return migratedValue;
};
