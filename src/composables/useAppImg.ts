import { ref, watch } from 'vue'
import type { QImgProps } from 'quasar'

export interface UseAppImgProps {
  src?: string | null
  alt?: string
  fit?: NonNullable<QImgProps['fit']>
  srcset?: string
  sizes?: string
  eager?: boolean
  retry?: boolean
  missing?: string
}

export const useAppImg = (props: UseAppImgProps) => {
  const failed = ref(false)
  const attempt = ref(0)

  const retryLoad = () => {
    failed.value = false
    attempt.value += 1
  }

  watch(() => props.src, () => {
    failed.value = false
  })

  return { failed, attempt, retryLoad }
}
