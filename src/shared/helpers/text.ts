import { SSBU } from './ssbu'

export const norm = (value: string) => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const initialsOf = (name: string) => SSBU.initials(name)

export const trajeName = (slot: number) => 'Traje ' + (slot + 1)
