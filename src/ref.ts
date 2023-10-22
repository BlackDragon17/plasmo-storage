/**
 * Copyright (c) 2023 Plasmo Corp. <foss@plasmo.com> (https://www.plasmo.com) and contributors
 * Licensed under the MIT license.
 * This module share storage between chrome storage and local storage.
 */
import { onUnmounted, ref, watch } from "vue";
import type { Ref, WatchStopHandle } from "vue";

import { BaseStorage, Storage, type StorageCallbackMap } from "~index"

type RawKey =
  | string
  | {
      key: string
      instance: BaseStorage
    }

type Setter<T> = T | ((storageValue?: T) => T)

/**
 * https://docs.plasmo.com/framework/storage
 * @param rawKey key of the local storage entry
 * @param onInit the initial value for this ref. If a getter is given,
 * the return value will be persisted in local storage
 * @returns a Vue ref bound to the local storage entry with the provided key
 */
export function useStorage<T = any>(rawKey: RawKey, onInit?: Setter<T>): Ref<T> {
  const isKeyAnObject = typeof rawKey === "object"
  const key = isKeyAnObject ? rawKey.key : rawKey
  const storage = isKeyAnObject ? rawKey.instance : new Storage()

  const state = ref<T>();

  // State watcher updates storage on state change
  let unwatchState: WatchStopHandle
  // Storage watcher updates state on storage change
  const storageWatcherConfig: StorageCallbackMap = {
    [key]: (change) => state.value = change.newValue
  }

  storage.get<T>(key).then((value) => {
    if (onInit instanceof Function) {
      state.value = onInit(value)
    } else {
      state.value = value === undefined ? onInit : value
    }

    unwatchState = watch(state, async (newValue: T) => {
      if (newValue === undefined || newValue === (await storage.get(key))) {
        return
      }
      await storage.set(key, newValue)
    }, {immediate: onInit instanceof Function})
  })

  storage.watch(storageWatcherConfig)

  onUnmounted(() => {
    unwatchState()
    storage.unwatch(storageWatcherConfig)
  })

  return state
}
