# Map Layer Control

Небольшой интерфейс управления GIS-слоями на React + TypeScript.

## Запуск

```bash
npm install
npm run dev
```

Открыть <http://127.0.0.1:5173>.

Проверки:

```bash
npm run test:run
npm run build
npm run test:stress
```

Vedro-сценарии требуют Python 3.9+, установленного браузера Playwright и запущенного dev-сервера:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/playwright install chromium
npm run dev -- --host 127.0.0.1
.venv/bin/vedro run
```

Stress mode for 120 layers:

```text
http://127.0.0.1:5173/?layers=120
```

The stress check is split into two levels:

- `npm run test:stress` checks generated configurations at 5/25/100/120 layers, then measures a 120-record store, immutable updates and one notification per changed layer;
- `layer_stress.py` renders 120 real cards with 120 React Query observers, enables all 120 mock requests concurrently, waits for all to reach `success`, then changes opacity on a synthetic layer near the end of the list.

The limit is intentionally capped at 500 layers in `createLayerDefinitions`. The default UI still starts with three domain layers, so the stress fixture does not affect the normal bundle or product view.

Для проверки retry-сценария можно открыть:

```text
http://127.0.0.1:5173/?demoError=wind
```

## Архитектура

Проект организован по FSD:

```text
src/
  app/                  провайдеры и глобальные стили
  pages/                композиция страницы
  widgets/
    map-view/           MapLibre-карта и GIS overlay-слои
    layer-list/         список управляемых слоёв
    analytics/          небольшая аналитика на Recharts
  entities/layer/
    api/                mock API
    model/              типы, конфигурация, store, query hook
    ui/                 независимая карточка слоя
  shared/               общие типы
```

### Почему так

- MapLibre отвечает только за визуализацию карты и GeoJSON overlay. Он не хранит бизнес-состояние React-приложения.
- TanStack Query отвечает за server state: запуск запроса при включении, `loading/success/error`, abort signal, отсутствие автоматических retry и кэширование.
- npm `vedro@1.1.0` отвечает за UI-store: `Vedro` хранит только клиентское состояние (`enabled`, `opacity`, `requestGeneration`), а `createVedro().useSelector` подписывает компонент на минимальный срез состояния.
- `requestGeneration` входит в query key. Любое включение или retry создаёт новое поколение запроса, поэтому устаревший ответ не может записать результат поверх более нового состояния.
- Карточка подписывается через selector только на snapshot своего слоя; изменение opacity или статуса соседнего слоя не заставляет её перерисовываться. `LayerCard` дополнительно обёрнут в `memo`.
- Конфигурация слоёв является статической. Добавление 5–100 слоёв сводится к добавлению конфигурации, без копирования компонентов.
- Python Vedro + `vedro-pw` используются отдельно для e2e-сценариев через Playwright: загрузка, retry, opacity, быстрые переключения и 120 параллельных запросов.
- Recharts используется только для отдельного аналитического виджета. Если графики не нужны в продукте, его можно удалить без влияния на GIS-часть.

### Проверка npm vedro

Перед установкой `vedro@1.1.0` был проверен npm metadata и распакованный tarball: лицензия MIT, 27 файлов, около 46 KB, нет runtime-зависимостей, `postinstall`/`install`-скриптов, сетевого или файлового кода в runtime. Изолированный `npm audit` для `vedro` и его peer-зависимости React не нашёл уязвимостей. Общий audit проекта показывает две moderate dev-only уязвимости в Vitest 3 (`@vitest/mocker`, path traversal); production-зависимости чистые, а исправление требует major upgrade Vitest.

## Race condition

Сценарий `on → off → on → off` не оставляет слой включённым после завершения старого запроса:

1. каждое изменение enabled/retry увеличивает `requestGeneration`;
2. значение входит в `queryKey` TanStack Query;
3. при выключении query получает `enabled: false`, а запрос использует `AbortSignal`;
4. даже если mock API физически завершится поздно, его результат относится к старому query key и не обновляет активное поколение.

## AI-инструменты

В работе использовался OpenAI Codex в Codex Desktop:

- помог спроектировать FSD-структуру и разделить UI state, server state и GIS-рендеринг;
- подготовил типизированный store на npm `vedro`, интеграцию TanStack Query и защиту от race condition через `requestGeneration`;
- помог реализовать MapLibre-карту, Recharts-виджет и mock API с детерминированным сценарием ошибки;
- подготовил unit-тесты, Vedro + Playwright e2e-сценарии и stress-тест на 5/25/100/120 слоёв;
- выполнил code review: убрал повторяющиеся UI-условия, проверил отсутствие `any`, production build, `npm audit` и поведение интерфейса в браузере.

AI использовался как инструмент проектирования, реализации и проверки. Архитектурные решения, публичные контракты компонентов и результаты тестов были проверены в исходниках и локальном запуске проекта.
