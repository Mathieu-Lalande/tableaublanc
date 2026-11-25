import type { TLDefaultColorStyle } from 'tldraw'
import type { LibraryItem } from '@/features/library/types'
import { insertTemplate } from './builders'

const today = () => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(new Date())

function columns(
  titles: ReadonlyArray<{ name: string; color: TLDefaultColorStyle; notes: string[] }>,
  colW = 300,
  colH = 640,
  gap = 40,
): Parameters<typeof insertTemplate>[2] {
  return (b) =>
    titles.forEach((col, i) => {
      const frame = b.frame(i * (colW + gap), 0, colW, colH, col.name, col.color)
      col.notes.forEach((text, j) => b.note(50, 40 + j * 230, text, col.color, frame))
    })
}

export const templateItems: readonly LibraryItem[] = [
  {
    id: 'tpl-kanban',
    label: 'Kanban',
    description: 'Colonnes À faire / En cours / Fait, cartes déplaçables',
    emoji: '📋',
    category: 'Modèles',
    keywords: ['tâches', 'todo', 'projet', 'colonnes'],
    run: ({ editor }) =>
      insertTemplate(
        editor,
        { w: 1180, h: 640 },
        columns([
          {
            name: '📝 À faire',
            color: 'light-blue',
            notes: ['Réserver le gîte', 'Faire les courses'],
          },
          { name: '🚧 En cours', color: 'yellow', notes: ['Planning du week-end'] },
          { name: '✅ Fait', color: 'light-green', notes: ['Choisir la date'] },
          { name: '🧊 Plus tard', color: 'light-violet', notes: [] },
        ]),
      ),
  },
  {
    id: 'tpl-brainstorm',
    label: 'Brainstorm + vote',
    description: 'Post-its d’idées ; sélectionne un post-it pour voter (3 points chacun)',
    emoji: '💡',
    category: 'Modèles',
    keywords: ['idées', 'post-it', 'vote', 'dot voting'],
    run: ({ editor }) =>
      insertTemplate(editor, { w: 1000, h: 640 }, (b) => {
        const frame = b.frame(
          0,
          0,
          1000,
          640,
          '💡 Brainstorm — une idée par post-it, puis votez !',
          'yellow',
        )
        const ideas = ['Idée 1', 'Idée 2', 'Idée 3', 'Idée 4', 'Idée 5', 'Idée 6']
        const colors: TLDefaultColorStyle[] = [
          'yellow',
          'light-green',
          'light-blue',
          'orange',
          'light-violet',
          'light-red',
        ]
        ideas.forEach((idea, i) =>
          b.note(
            60 + (i % 3) * 300,
            60 + Math.floor(i / 3) * 280,
            idea,
            colors[i] ?? 'yellow',
            frame,
          ),
        )
      }),
  },
  {
    id: 'tpl-retro',
    label: 'Rétro',
    description: 'Ce qui a marché, à améliorer, idées, actions',
    emoji: '🔁',
    category: 'Modèles',
    keywords: ['rétrospective', 'retour', 'équipe'],
    run: ({ editor }) =>
      insertTemplate(
        editor,
        { w: 1320, h: 640 },
        columns([
          { name: '😀 Ce qui a marché', color: 'green', notes: ['…'] },
          { name: '😕 À améliorer', color: 'orange', notes: ['…'] },
          { name: '💡 Idées', color: 'blue', notes: ['…'] },
          { name: '✅ Actions', color: 'violet', notes: ['…'] },
        ]),
      ),
  },
  {
    id: 'tpl-flowchart',
    label: 'Flowchart',
    description: 'Début, étapes, décision oui/non, fin — flèches liées',
    emoji: '🔀',
    category: 'Modèles',
    keywords: ['diagramme', 'processus', 'organigramme'],
    run: ({ editor }) =>
      insertTemplate(editor, { w: 760, h: 760 }, (b) => {
        const start = b.geo(280, 0, 200, 80, 'Début', { geo: 'oval', color: 'green' })
        const step = b.geo(260, 160, 240, 100, 'Étape', { color: 'blue' })
        const decision = b.geo(270, 340, 220, 160, 'Condition ?', {
          geo: 'diamond',
          color: 'orange',
        })
        const yes = b.geo(0, 580, 220, 100, 'Action A', { color: 'blue' })
        const no = b.geo(540, 580, 220, 100, 'Action B', { color: 'blue' })
        const end = b.geo(280, 760, 200, 80, 'Fin', { geo: 'oval', color: 'red' })
        b.connect(start, step)
        b.connect(step, decision)
        b.connect(decision, yes, 'Oui')
        b.connect(decision, no, 'Non')
        b.connect(yes, end)
        b.connect(no, end)
      }),
  },
  {
    id: 'tpl-eisenhower',
    label: 'Matrice d’Eisenhower',
    description: 'Urgent / important : faire, planifier, déléguer, abandonner',
    emoji: '🎯',
    category: 'Modèles',
    keywords: ['priorités', 'urgent', 'important'],
    run: ({ editor }) =>
      insertTemplate(editor, { w: 1000, h: 860 }, (b) => {
        b.text(380, 0, '⬅ Urgent · Pas urgent ➡', 'm')
        const q: ReadonlyArray<[number, number, string, TLDefaultColorStyle]> = [
          [0, 60, '🔥 Faire maintenant (urgent + important)', 'red'],
          [510, 60, '📅 Planifier (important, pas urgent)', 'blue'],
          [0, 470, '🤝 Déléguer (urgent, pas important)', 'orange'],
          [510, 470, '🗑️ Abandonner (ni l’un ni l’autre)', 'grey'],
        ]
        q.forEach(([x, y, name, color]) => b.frame(x, y, 490, 390, name, color))
      }),
  },
  {
    id: 'tpl-timeline',
    label: 'Timeline',
    description: 'Frise chronologique avec 5 jalons',
    emoji: '🗓️',
    category: 'Modèles',
    keywords: ['frise', 'planning', 'jalons', 'chronologie'],
    run: ({ editor }) =>
      insertTemplate(editor, { w: 1240, h: 360 }, (b) => {
        const points = Array.from({ length: 5 }, (_, i) =>
          b.geo(i * 300, 140, 40, 40, '', { geo: 'ellipse', color: 'violet', fill: 'solid' }),
        )
        for (let i = 0; i < points.length - 1; i++) {
          const a = points[i]
          const c = points[i + 1]
          if (a && c) b.connect(a, c, '', 'violet')
        }
        ;['Lancement', 'Étape 1', 'Étape 2', 'Étape 3', 'Objectif 🎉'].forEach((label, i) => {
          b.note(
            i * 300 - 80,
            i % 2 === 0 ? 220 : -100,
            `${label}\n(date)`,
            i === 4 ? 'light-green' : 'light-violet',
          )
        })
      }),
  },
  {
    id: 'tpl-journal',
    label: 'Journal de pensées',
    description: 'Humeur, gratitude, pensées et intention du jour',
    emoji: '📓',
    category: 'Modèles',
    keywords: ['journal', 'humeur', 'gratitude', 'notes'],
    run: ({ editor }) =>
      insertTemplate(editor, { w: 760, h: 900 }, (b) => {
        const frame = b.frame(0, 0, 760, 900, `📓 ${today()}`, 'light-violet')
        b.note(40, 40, 'Humeur du jour : 😊 😐 😔', 'light-violet', frame)
        b.note(400, 40, 'Je suis reconnaissant·e pour…', 'yellow', frame)
        b.note(40, 330, 'Ce qui me trotte dans la tête…', 'light-blue', frame)
        b.note(400, 330, 'Une victoire, même petite', 'light-green', frame)
        b.note(220, 620, 'Intention pour demain', 'orange', frame)
      }),
  },
  {
    id: 'tpl-moodboard',
    label: 'Moodboard',
    description: 'Grille d’emplacements pour images + palette de couleurs',
    emoji: '🎨',
    category: 'Modèles',
    keywords: ['inspiration', 'images', 'palette', 'design'],
    run: ({ editor }) =>
      insertTemplate(editor, { w: 1040, h: 820 }, (b) => {
        const frame = b.frame(0, 0, 1040, 820, '🎨 Moodboard — glisse tes images ici', 'light-red')
        const slots: ReadonlyArray<[number, number, number, number]> = [
          [30, 30, 460, 300],
          [510, 30, 240, 300],
          [770, 30, 240, 300],
          [30, 350, 300, 300],
          [350, 350, 400, 300],
          [770, 350, 240, 300],
        ]
        slots.forEach(([x, y, w, h]) =>
          b.geo(x, y, w, h, '🖼️ Image', { color: 'grey', fill: 'pattern' }, frame),
        )
        const palette: TLDefaultColorStyle[] = [
          'red',
          'orange',
          'yellow',
          'green',
          'blue',
          'violet',
        ]
        palette.forEach((c, i) =>
          b.geo(30 + i * 110, 690, 90, 90, '', { geo: 'ellipse', color: c, fill: 'solid' }, frame),
        )
      }),
  },
]
