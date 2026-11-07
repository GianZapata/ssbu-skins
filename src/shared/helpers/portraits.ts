export const CLOUDINARY_CLOUD = 'gian-dev'

export const isSha = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)

export const portraitUrl = (sha: string) =>
  `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/f_auto,q_auto,w_512/ssbu/portraits/${sha}`
