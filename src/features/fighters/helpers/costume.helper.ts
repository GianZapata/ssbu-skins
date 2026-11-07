import { isSha, portraitUrl } from '../../../shared/helpers/portraits'
import { thumbOf } from '../../../shared/helpers/skins'
import type { Current } from '../../../shared/helpers/ssbu'
import { skinOf } from '../../plan/helpers/lookup'
import { driveAlts } from '../../roster/driveAlts'
import { CostumeBadgeKind } from '../enums/CostumeBadgeKind'

interface CostumeBadgeMeta {
  label: string
}

export class CostumeHelper {
  static readonly badgeMeta: Record<CostumeBadgeKind, CostumeBadgeMeta> = {
    [CostumeBadgeKind.Original]: {
      get label() {
        return 'Original'
      },
    },
    [CostumeBadgeKind.Mod]: {
      get label() {
        return 'Mod'
      },
    },
  }

  private static readonly unknownBadgeMeta: CostumeBadgeMeta = {
    get label() {
      return 'Original'
    },
  }

  private static getMeta<T extends PropertyKey>(
    meta: Record<T, CostumeBadgeMeta>,
    value: T | null | undefined,
  ): CostumeBadgeMeta {
    if (value == null) return this.unknownBadgeMeta

    return meta[value]
  }

  static badgeKindOf(current: Current | null | undefined): CostumeBadgeKind {
    if (!current || current.kind === 'original') return CostumeBadgeKind.Original

    return CostumeBadgeKind.Mod
  }

  static getBadgeMeta(kind: CostumeBadgeKind | null | undefined): CostumeBadgeMeta {
    return this.getMeta(this.badgeMeta, kind)
  }

  static proposalThumbOf(
    code: string,
    vid: string,
    variantId: string | null | undefined,
  ): string | null {
    const skin = skinOf(vid)

    if (!variantId) return thumbOf(skin)

    const alt = driveAlts.value.find(
      (item) =>
        item.code === code
        && (item.vid === vid || (skin && item.mod_id === String(skin.id))),
    )

    const variant = alt?.variants?.find((entry) => entry.id === variantId)

    if (variant && isSha(variant.portrait)) return portraitUrl(variant.portrait)

    return null
  }
}
