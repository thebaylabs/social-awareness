import { z } from 'zod'

/**
 * Content schemas, shared by the app (at load) and scripts/validate-content.ts
 * (before every build). See the README for how to edit each file.
 */

/** A visitor-facing text: English is required; Gujarati is expected. */
export const localizedText = z.strictObject({
  en: z.string().trim().min(1, 'English text is required'),
  gu: z.string().optional(),
})
export type LocalizedTextData = z.infer<typeof localizedText>

export const audience = z.enum(['bhulkao', 'yuvako'])
export type Audience = z.infer<typeof audience>

/** Ids appear in URLs: lowercase letters, digits and hyphens. */
export const contentId = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'use lowercase letters, digits and hyphens only')

/** A file name inside content/images/. */
export const imageFile = z
  .string()
  .regex(/^[\w.-]+\.(svg|png|jpe?g|webp|gif|avif)$/i, 'must be a file name in content/images/')

/** A file name inside content/audio/. */
export const audioFile = z
  .string()
  .regex(/^[\w.-]+\.(mp3|ogg|wav|m4a)$/i, 'must be a file name in content/audio/')

const sourceNote = z.string().trim().min(1, 'record where the picture comes from (source)')

export const storyImage = z.strictObject({
  src: imageFile,
  alt: localizedText,
  source: sourceNote,
})

export const storyVideo = z.strictObject({
  src: z.string().min(1),
  poster: imageFile.optional(),
  alt: localizedText,
  captions: z.string().optional(),
  source: sourceNote,
})

export const storyChoice = z.strictObject({
  label: localizedText,
  next: z.string().min(1),
  /**
   * The decision we hope a child makes at this step. A Bhulkao story that
   * follows every expected choice ends with the firecracker celebration.
   */
  expected: z.boolean().optional(),
})

export const storyEnding = z.strictObject({
  /**
   * A short name for the ending, shown under "How it ends" and, in a Yuvako
   * scenario, in the list of endings found.
   */
  title: localizedText.optional(),
  outcome: localizedText,
  lesson: localizedText,
})

export const storyNode = z.strictObject({
  id: z.string().min(1),
  text: localizedText,
  image: storyImage.optional(),
  video: storyVideo.optional(),
  choices: z.array(storyChoice).optional(),
  ending: storyEnding.optional(),
})

export const story = z.strictObject({
  id: contentId,
  audience,
  title: localizedText,
  startNode: z.string().min(1),
  nodes: z.array(storyNode).min(1),
  placeholder: z.boolean().default(false),
})
export type Story = z.infer<typeof story>
export type StoryNode = z.infer<typeof storyNode>

/** Front matter of a prasang file (one file per language). */
export const prasangFrontMatter = z.strictObject({
  id: contentId,
  audience,
  title: z.string().trim().min(1),
  moral: z.string().trim().min(1),
  images: z
    .array(
      z.strictObject({
        src: imageFile,
        source: sourceNote,
        /** Alt text for the cover (the first image), which is not placed in the body. */
        alt: z.string().optional(),
      }),
    )
    .default([]),
  /**
   * When true, images are shown as a comic / short film instead of a scrolling
   * markdown article. With `soundtrack`, pages advance on a timer with audio.
   */
  comic: z.boolean().default(false),
  /** Optional continuous soundtrack in content/audio/ (comic film mode). */
  soundtrack: audioFile.optional(),
  /** Seconds each comic page stays on screen when a soundtrack is set. */
  pageSeconds: z.number().positive().default(10),
  placeholder: z.boolean().default(false),
})
export type PrasangFrontMatter = z.infer<typeof prasangFrontMatter>

export const impactGroup = z.enum(['children', 'adults'])
export type ImpactGroup = z.infer<typeof impactGroup>
export const IMPACT_GROUPS = impactGroup.options

/**
 * A reference in IEEE style, without the "[Online]. Available:" part, which the
 * page adds from the url. Written once, in the original language of the work.
 * Cards cite it in their texts as [1], [2]... by its position: `source` first,
 * then each of `moreSources`.
 */
export const pillSource = z.strictObject({
  citation: z.string().trim().min(10, 'write the reference in IEEE style'),
  url: z.url().optional(),
})

/** One text per age group. */
const perGroup = z.strictObject({
  children: localizedText,
  adults: localizedText,
})

/** A qualitative level, used when exact numbers would mislead. */
export const impactLevel = z.enum(['lower', 'moderate', 'higher'])

const visualAlt = { alt: localizedText }

/** A small accessible diagram. Every kind needs a text alternative (alt). */
export const insightVisual = z.discriminatedUnion('type', [
  /** Three rows of segmented bars with a text level. Qualitative, never a measurement. */
  z.strictObject({
    type: z.literal('impact-bars'),
    values: z.strictObject({
      children: impactLevel,
      adults: impactLevel,
    }),
    ...visualAlt,
  }),
  /** Numbered steps in order. */
  z.strictObject({
    type: z.literal('timeline'),
    steps: z.array(localizedText).min(3).max(5),
    ...visualAlt,
  }),
  /** Two boxes: a habit and a swap. */
  z.strictObject({
    type: z.literal('before-after'),
    before: z.strictObject({ title: localizedText, text: localizedText }),
    after: z.strictObject({ title: localizedText, text: localizedText }),
    ...visualAlt,
  }),
  /** Side-by-side groups, each with a short label. */
  z.strictObject({
    type: z.literal('group-compare'),
    labels: perGroup,
    ...visualAlt,
  }),
])
export type InsightVisualData = z.infer<typeof insightVisual>

export const pillCard = z
  .strictObject({
    /** The red pill cards only. The blue and green pills have their own sections in pills.json. */
    path: z.literal('red'),
    text: localizedText,
    source: pillSource.nullable(),
    placeholder: z.boolean().default(false),
    /** The rest is the rich "insight" layout used by finished red cards. Plain placeholders leave it out. */
    title: localizedText.optional(),
    visual: insightVisual.optional(),
    takeaway: localizedText.optional(),
    audienceImpacts: perGroup.optional(),
    recommendation: localizedText.optional(),
    /** Further sources, shown after `source`. */
    moreSources: z.array(pillSource).default([]),
  })
  .superRefine((card, ctx) => {
    if (card.placeholder) return
    const need = (ok: boolean, key: string, message: string) => {
      if (!ok) ctx.addIssue({ code: 'custom', path: [key], message })
    }
    need(card.title !== undefined, 'title', 'a finished red card needs a title')
    need(card.visual !== undefined, 'visual', 'a finished red card needs a visual with alt text')
    need(card.takeaway !== undefined, 'takeaway', 'a finished red card needs a key takeaway')
    need(
      card.audienceImpacts !== undefined,
      'audienceImpacts',
      'needs impacts for children and adults',
    )
    need(
      card.recommendation !== undefined,
      'recommendation',
      'a finished red card needs a "what can help" line',
    )
    need(
      card.source !== null,
      'source',
      'a finished red card needs a source (a placeholder may use null)',
    )
  })

/**
 * The blue pill: the guide tosses it away and offers a green pill instead.
 * `message` is his speech bubble as he does it: brief, light-hearted, and the
 * point that ignoring reality does not make it go away.
 */
export const pillBlue = z.strictObject({
  message: localizedText,
  placeholder: z.boolean().default(false),
})

/** One green pill page: a solution with an action, why it helps, a diagram and IEEE-style references. */
export const greenPage = z.strictObject({
  title: localizedText,
  text: localizedText,
  action: localizedText,
  why: localizedText,
  visual: insightVisual.optional(),
  source: pillSource,
  moreSources: z.array(pillSource).default([]),
  placeholder: z.boolean().default(false),
})

export const pills = z.strictObject({
  cards: z.array(pillCard),
  blue: pillBlue,
  green: z.strictObject({ pages: z.array(greenPage).min(2).max(3) }),
})
export type Pills = z.infer<typeof pills>
export type PillCard = z.infer<typeof pillCard>
export type PillBlue = z.infer<typeof pillBlue>
export type GreenPage = z.infer<typeof greenPage>

export const wordEntry = z.strictObject({
  word: z.string().regex(/^[a-z]{3,10}$/, 'lowercase a-z only, 3 to 10 letters'),
  native: z.strictObject({ gu: z.string().optional() }).optional(),
  meaning: localizedText,
  reflection: localizedText,
  placeholder: z.boolean().default(false),
})

export const words = z.strictObject({
  words: z.array(wordEntry).min(1),
})
export type WordEntry = z.infer<typeof wordEntry>

export const doodleItem = z
  .strictObject({
    label: localizedText,
    kind: z.enum(['positive', 'negative']),
    icon: z.string().min(1),
    explanation: localizedText.optional(),
    placeholder: z.boolean().default(false),
  })
  .refine((item) => item.kind === 'positive' || item.explanation !== undefined, {
    message: 'a negative item needs an explanation',
    path: ['explanation'],
  })

export const doodleConfig = z.strictObject({
  /** Falling speed at the start, in play-area pixels per second (the play area is 360 wide). */
  startSpeed: z.number().positive(),
  /** How much the falling speed rises for each good habit caught. */
  speedPerPoint: z.number().min(0),
  /** The falling speed never goes above this. */
  maxSpeed: z.number().positive(),
  /** Seconds between new items. */
  spawnInterval: z.number().positive(),
  /** Share of items that are negative, from 0 to 1. */
  negativeShare: z.number().min(0).max(1),
})

export const doodle = z.strictObject({
  config: doodleConfig,
  items: z.array(doodleItem).min(2),
})
export type DoodleContent = z.infer<typeof doodle>
export type DoodleItemData = z.infer<typeof doodleItem>
