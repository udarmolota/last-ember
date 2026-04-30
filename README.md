# Last Ember — Vite + TypeScript

## Быстрый старт

```bash
npm install
npm run dev       # открывает http://localhost:5173
```

## Сборка

```bash
npm run build     # dist/ готов
npm run cap:add   # добавить Android (один раз)
npm run cap:sync  # build + cap sync
npm run cap:open  # открыть в Android Studio
```

## Структура проекта

```
last-ember/
  index.html              HTML-оболочка (только разметка, без JS/CSS)
  src/
    main.ts               ← ВСЯ игровая логика (Этап 1)
    styles.css            Стили из оригинального HTML
    game/
      types.ts            Все TypeScript-интерфейсы
      state.ts            Singleton G — состояние игры
    data/
      index.ts            Все константы: BLDGS, CRAFTS, TRAITS и т.д.
  package.json
  tsconfig.json
  vite.config.ts
  capacitor.config.ts
```

## План миграции

### ✅ Этап 1 — сделано
- Проект запускается через `npm run dev`
- Весь код в TypeScript с типами
- Данные вынесены в `src/data/index.ts`
- Типы в `src/game/types.ts`
- Состояние в `src/game/state.ts`
- Совместим с Capacitor → Android APK

### 🔲 Этап 2 — дробление main.ts
Следующий шаг — вынести модули из main.ts:

| Файл | Содержимое |
|------|-----------|
| `src/game/map.ts` | `genMap`, `renderMap`, `refreshTileEl` |
| `src/game/colonists.ts` | `genPool`, `doWork`, `getTarget` |
| `src/game/buildings.ts` | `placeBuilding`, `finishPlace`, `tickConstruction` |
| `src/game/combat.ts` | `spawnEnemy`, `tickCombat`, `checkFirstRaid` |
| `src/game/events.ts` | `randEvent`, `loreNote`, `checkHerald` |
| `src/ui/mapRenderer.ts` | Камера, спрайты, `posSprite` |
| `src/ui/modal.ts` | `showModal`, `showBuildConfirm` |
| `src/ui/resourceBar.ts` | `renderResources` |
| `src/ui/sidebar.ts` | `renderSidebar`, `showCdet` |

**Правило Этапа 2:** один PR — один модуль. Каждый раз игра должна быть рабочей.

## Почему не `@ts-strict` везде?
В Этапе 1 часть кода использует `as any` там где оригинальный JS добавлял поля в объекты на лету
(например `ti.bldg.totalTime`, `c.priorityTarget`). В Этапе 2 при выносе каждого модуля
эти места зачищаются по-настоящему.
