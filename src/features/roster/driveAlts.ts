import { ref } from 'vue'

export interface DriveAlt {
  code: string
  mod_id: string
  name: string
  slots: number[]
  any: boolean
  vid: string | null
  unaudited: boolean
  img: string | null
}

export const driveAlts = ref<DriveAlt[]>([])

let loaded = false

/** Alternativas descargadas en el Drive. Se piden una sola vez; sin ellas la web funciona igual. */
export const loadDriveAlts = async () => {
  if (loaded) return

  loaded = true

  try {
    const response = await fetch('/drive-alts.json')

    if (!response.ok) return

    driveAlts.value = await response.json() as DriveAlt[]
  } catch {
    loaded = false
  }
}

export const downloadedVids = () => new Set(driveAlts.value.filter((alt) => alt.vid).map((alt) => alt.vid as string))

export const unauditedVids = () => new Set(driveAlts.value.filter((alt) => alt.vid && alt.unaudited).map((alt) => alt.vid as string))
