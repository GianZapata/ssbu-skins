import { computed, ref } from 'vue'
import { useStorage, type StorageLike } from '@vueuse/core'
import type { PersonName } from '../enums/PersonName'
import { PlanHelper } from '../helpers/plan.helper'

const memoryStore = new Map<string, string>()

const safeStorage: StorageLike = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return memoryStore.get(key) ?? null
    }
  },
  setItem: (key: string, value: string) => {
    memoryStore.set(key, value)

    try {
      localStorage.setItem(key, value)
    } catch {
      return
    }
  },
  removeItem: (key: string) => {
    memoryStore.delete(key)

    try {
      localStorage.removeItem(key)
    } catch {
      return
    }
  },
}

const storedPerson = useStorage<string>('ssbu_person', '', safeStorage)
export const isOpenPerson = ref(false)

let pendingCallback: ((person: PersonName) => void) | null = null
let onPersonSync: (person: PersonName | null) => void = () => {}

export const activePerson = computed<PersonName | null>(() => {
  const value = storedPerson.value

  if (PlanHelper.isPersonName(value)) return value

  return null
})

export const bindPersonSync = (listener: (person: PersonName | null) => void) => {
  onPersonSync = listener
  onPersonSync(activePerson.value)
}

export const syncStoredPerson = (person: string | null) => {
  if (PlanHelper.isPersonName(person)) {
    storedPerson.value = person
    onPersonSync(person)

    return
  }

  storedPerson.value = ''
  onPersonSync(null)
}

export const openPersonSheet = () => {
  pendingCallback = null
  isOpenPerson.value = true
}

export const closePersonSheet = () => {
  pendingCallback = null
  isOpenPerson.value = false
}

export const choosePerson = (person: PersonName) => {
  storedPerson.value = person
  onPersonSync(person)

  const callback = pendingCallback

  pendingCallback = null
  isOpenPerson.value = false

  if (callback) callback(person)
}

export const requirePerson = (action: (person: PersonName) => void): boolean => {
  const current = activePerson.value

  if (current) {
    action(current)

    return true
  }

  pendingCallback = action
  isOpenPerson.value = true

  return false
}

export const usePerson = () => ({
  people: PlanHelper.people,
  activePerson,
  isOpenPerson,
  openPersonSheet,
  closePersonSheet,
  choosePerson,
  requirePerson,
})
