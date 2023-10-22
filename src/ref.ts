/**
 * Copyright (c) 2023 Plasmo Corp. <foss@plasmo.com> (https://www.plasmo.com) and contributors
 * Licensed under the MIT license.
 * This module share storage between chrome storage and local storage.
 */
import {onMounted, onUnmounted, ref, watch, type WatchStopHandle} from "vue"

import { BaseStorage, Storage, type StorageCallbackMap } from "~index"

export type RawKey =
  | string
  | {
      key: string
      instance: BaseStorage
    }

/**
 * https://docs.plasmo.com/framework/storage
 * @param key key of the local storage entry
 * @param value the initial value for this ref. Will only be used if the local storage entry is undefined.
 * @param persist whether the initial value should be saved to the local storage
 * @returns a Vue ref bound to a local storage entry with the provided key
 */
export const useStorage = <T = any>(key: RawKey, value?: T, persist = false) => {
  const isKeyAnObject = typeof key === "object"
  const keyValue = isKeyAnObject ? key.key : key
  const storage = isKeyAnObject ? key.instance : new Storage()

  const state = ref<T>();

  // State watch updates storage on state change
  let stateWatchCleanup: WatchStopHandle
  // Storage watch updates state on storage change
  const storageWatchConfig: StorageCallbackMap = {
    [keyValue]: (change) => state.value = change.newValue
  }

  onMounted(async () => {
    const initialStorageValue = await storage.get<T>(keyValue)
    state.value = initialStorageValue !== undefined ? initialStorageValue : value

    // State watcher declared *after* first state write access to prevent watcher trigger
    stateWatchCleanup = watch(state, async (newValue) => {
      if (newValue === undefined || newValue === (await storage.get(keyValue))) {
        return
      }
      await storage.set(keyValue, newValue)
    }, {
      immediate: persist
    })

    storage.watch(storageWatchConfig)
  })

  onUnmounted(() => {
    stateWatchCleanup()
    storage.unwatch(storageWatchConfig)
  })

  return state
}
