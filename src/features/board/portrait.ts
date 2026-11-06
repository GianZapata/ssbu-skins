export const CLOUDINARY_CLOUD = 'gian-dev'

export const portraitUrl = (sha: string) =>
  `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/f_auto,q_auto,w_512/ssbu/portraits/${sha}`

export const previewUrl = (publicId: string) =>
  `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/f_auto,q_auto,c_fill,w_96,h_96/${publicId}`

export const isSha = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)

export const costumeSrc = (sha: unknown, isOriginal: boolean, originalArt?: string | null) => {
  if (isSha(sha)) return portraitUrl(sha)
  if (isOriginal) return originalArt || ''

  return ''
}
