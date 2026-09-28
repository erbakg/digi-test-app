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
- `layer_stress.py` renders 120 real cards, runs one centralized `LayerDataSync` with 120 React Query observers, enables all 120 mock requests concurrently, waits for all to reach `success`, then changes opacity on a synthetic layer near the end of the list.

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
    timeline/           выбор временной точки
    analytics/          небольшая аналитика на Recharts
  features/
    layer-data-sync/    один query-оркестратор и projection runtime в Vedro
  entities/layer/
    api/                mock API с временными рядами и GeoJSON
    model/              типы, временная модель, store, query options/runtime
    ui/                 независимая карточка слоя
  shared/               общие типы
```

### Почему так

- MapLibre выбран вместо Mapbox/Google Maps, потому что это open-source WebGL-библиотека без обязательного access token, с хорошей поддержкой GeoJSON, плавных paint transitions и `fill-extrusion` для демонстрационного 3D-объекта.
- MapLibre отвечает только за визуализацию карты и GeoJSON overlay. Он не хранит бизнес-состояние React-приложения.
- TanStack Query отвечает за transport/cache: запуск запроса при включении, abort signal, отсутствие автоматических retry и кэширование.
- `LayerDataSync` — единственная точка подписки на Query для всех слоёв. Она проецирует `loading/success/error/data` в runtime-срез Vedro, поэтому карта, timeline, карточки и Recharts читают согласованный application snapshot.
- npm `vedro@1.1.0` отвечает за UI-store: `Vedro` хранит клиентское состояние (`enabled`, `opacity`, `requestGeneration`, `selectedTimeId`) и runtime projection (`status`, `data`, `errorMessage`), а `createVedro().useSelector` подписывает компонент на минимальный срез состояния.
- `requestGeneration` входит в query key. Любое включение или retry создаёт новое поколение запроса, поэтому устаревший ответ не может записать результат поверх более нового состояния.
- Карточка подписывается через selector только на snapshot своего слоя; изменение opacity или статуса соседнего слоя не заставляет её перерисовываться. `LayerCard` дополнительно обёрнут в `memo`.
- Один mock-запрос слоя возвращает series из пяти временных точек. Переключение timeline не запускает пять новых запросов: меняется только `selectedTimeId`, а карта и Recharts выбирают соответствующую точку уже загруженной series.
- Поток данных единый: `Timeline → Vedro.selectedTimeId → LayerData.series → MapLibre + Recharts`. Recharts также может изменить `selectedTimeId` по клику на точку.
- MapLibre обновляет GeoJSON source и цвет/позицию полигона для выбранного времени; `fill-color-transition` и `fill-opacity-transition` делают смену визуально плавной.
- Конфигурация слоёв является статической. Добавление 5–100 слоёв сводится к добавлению конфигурации, без копирования компонентов.
- Дополнительное требование закрыто локальным 3D weather station через MapLibre `fill-extrusion`: не нужен внешний 3D asset, CDN или отдельный runtime.
- Python Vedro + `vedro-pw` используются отдельно для e2e-сценариев через Playwright: загрузка, retry, opacity, быстрые переключения и 120 параллельных запросов.
- Recharts показывает временной ряд трёх доменных слоёв, вертикальную линию выбранного времени и передаёт выбор точки обратно в Vedro. Если графики не нужны в продукте, его можно удалить без влияния на GIS-часть.

### Производительность и масштабирование

- `LayerCard` подписывается только на свой layer slice; изменение соседнего слоя не заставляет её перерисовываться. Timeline намеренно обновляет все карточки, потому что их текущее значение зависит от выбранного времени.
- MapLibre source/layer создаются один раз, затем обновляются через `setData` и paint properties; React не пересоздаёт карту. Синхронизация сравнивает предыдущий и текущий snapshot и не трогает источники/paint свойства неизменившихся слоёв.
- Карточки, карта и график больше не создают собственные query observers: все наблюдатели находятся в одном `LayerDataSync`, а UI читает Vedro projection.
- Stress mode проверяет 5/25/100/120 слоёв, 120 карточек и 120 одновременных mock-запросов. Предел конфигурации оставлен 500 слоями.
- В production-модели при тысячах слоёв стоит добавить виртуализацию списка и отдельный viewport-based слой загрузки; для заданного диапазона 100+ это сознательно не добавлялось.

### Сознательные компромиссы

- Timeline загружает компактную series целиком при включении слоя, а не делает запрос на каждую временную точку. Это уменьшает race conditions и количество запросов в mock-сценарии.
- TanStack Query остаётся transport/cache-слоем, а Vedro хранит application projection, необходимую по ТЗ для общей синхронизации `status/data` между картой, timeline, карточками и графиком. Projection обновляется только центральным `LayerDataSync`; UI не пишет туда данные напрямую.
- 3D реализован через `fill-extrusion`, а не через glTF-модель: так дополнительное требование проверяется локально и не зависит от ассетов/загрузки файлов.

### Проверка npm vedro

Перед установкой `vedro@1.1.0` был проверен npm metadata и распакованный tarball: лицензия MIT, 27 файлов, около 46 KB, нет runtime-зависимостей, `postinstall`/`install`-скриптов, сетевого или файлового кода в runtime. Изолированный `npm audit` для `vedro` и его peer-зависимости React не нашёл уязвимостей. Позже найденная moderate dev-only уязвимость в Vitest 3 (`@vitest/mocker`, path traversal) исправлена обновлением до `vitest@4.1.11`; peer-зависимость `react-is` для Recharts добавлена явно. Текущий полный `npm audit` проекта: 0 уязвимостей.

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
- добавил timeline, временные series, синхронизацию Recharts/карты и 3D `fill-extrusion`;
- выполнил code review: убрал повторяющиеся UI-условия, проверил отсутствие `any`, production build, `npm audit` и поведение интерфейса в браузере.

AI-предложения не принимались автоматически: вариант заменить TanStack Query на Vedro для API-данных был отклонён, потому что это смешало бы client state и server state; вместо сторонней 3D-модели выбран локальный MapLibre extrusion, чтобы не добавлять лишний asset pipeline.

AI использовался как инструмент проектирования, реализации и проверки. Архитектурные решения, публичные контракты компонентов и результаты тестов были проверены в исходниках и локальном запуске проекта.
