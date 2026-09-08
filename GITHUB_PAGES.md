# Публікація «Доступного маршруту» на GitHub Pages

У проєкті є окрема статична збірка для GitHub Pages. Вона підтримує карту семи районів правого берега Києва, п’ять профілів, геолокацію, побудову маршрутів у браузері, фільтри та міські відкриті дані. Ключі API для неї не потрібні.

**Спільні повідомлення, завантаження фотографій і підтвердження в цій збірці недоступні.** Для них потрібен окремий сервер зі сховищем. Інтерфейс це пояснює; маршрути працюють за даними OSM без оперативних спостережень мешканців. Серверна версія з D1/R2 і командами `local:setup` / `local:dev` залишається в коді.

## 1. Оновіть код репозиторію

Якщо вже завантажили попередню версію на GitHub, розпакуйте новий архів у свою локальну папку репозиторію із заміною файлів. Збережіть папку `.git`, власні налаштування та `.wrangler/state`. У корені мають лежати `package.json`, `vite.pages.config.ts` та `.github/workflows/pages.yml`. Завантажуйте розпаковані файли: GitHub не розпаковує ZIP автоматично.

У терміналі цієї папки:

```bash
git status
git add .
git diff --cached --stat
git commit -m "Add GitHub Pages deployment"
git push origin main
```

Перед комітом перевірте перелік файлів. `.gitignore` виключає залежності, результати збірки, локальну базу й файли секретів. Не додавайте їх примусово.

Якщо репозиторію ще немає, створіть порожній репозиторій на GitHub без README, ліцензії та `.gitignore`. Для GitHub Free використайте публічний репозиторій. Потім виконайте наведене нижче в папці з розпакованим кодом, замінивши `YOUR_LOGIN` і `YOUR_REPOSITORY`:

```bash
git init -b main
git add .
git diff --cached --stat
git commit -m "Publish Dostupnyi Marshrut"
git remote add origin https://github.com/YOUR_LOGIN/YOUR_REPOSITORY.git
git push -u origin main
```

Якщо Git попросить ім’я й email, задайте їх через `git config user.name` та `git config user.email`. Для входу на GitHub використайте браузерний вхід Git Credential Manager; не додавайте токени у файли проєкту.

## 2. Увімкніть GitHub Pages

1. Відкрийте репозиторій → **Settings → Pages**.
2. У **Build and deployment → Source** оберіть **GitHub Actions**.
3. Перейдіть у **Actions → Deploy GitHub Pages → Run workflow → main → Run workflow**. Це також повторить перший запуск, якщо він завершився помилкою до ввімкнення Pages.
4. Дочекайтеся успішного завершення обох завдань: `build` і `deploy`.
5. Відкрийте посилання із завдання `deploy` або кнопки **Visit site** у Settings → Pages.

Звичайна адреса проєкту: `https://YOUR_LOGIN.github.io/YOUR_REPOSITORY/`. Власний домен чи репозиторій `YOUR_LOGIN.github.io` використовують кореневу адресу. Workflow отримує потрібний шлях із налаштувань Pages: вручну змінювати назву репозиторію в коді не потрібно.

GitHub Pages надає HTTPS. Геолокація працює після натискання кнопки «Моє розташування» та дозволу браузера. Збірка не містить покрокової GPS-навігації чи відстеження пересувань.

## 3. Наступні публікації й оновлення даних

Кожен `git push` у `main` запускає нову публікацію. Workflow також налаштовано на щоденний запуск о **04:17 UTC** та ручний запуск через Actions. GitHub може затримувати запуски за розкладом; у публічному репозиторії без активності протягом 60 днів він може вимкнути розклад. Його можна ввімкнути знову у вкладці Actions.

Перед збіркою завантажуються три міські джерела: веломережа, майданчики та інфраструктура для собак, громадські вбиральні. Якщо окреме джерело не відповіло, публікується його копія **з репозиторію** з початковою датою; успішні джерела оновлюються незалежно. У журналі Actions буде попередження. Оновлення під час збірки не створюють комітів у репозиторії, тому при збої копія може бути старішою за попередню публікацію.

Щоб оновити також резервні копії в репозиторії, виконайте `npm run data:refresh` локально, перевірте зміни у `public/data/city-*.json`, закомітьте та надішліть їх на GitHub. **Граф OSM не оновлюється щоденним workflow**: для нього використовується вбудований витяг, дата якого наведена в застосунку.

Кнопка «Оновити міські дані» на сайті перечитує копії з опублікованої версії. Вона не звертається до реєстрів міста напряму. Розклад та API міста не є підтвердженням актуального стану на місці.

## Локальна перевірка версії Pages

Windows PowerShell:

```powershell
npm.cmd ci
npm.cmd run pages:build -- --base=/dostupnyi-marshrut/
npm.cmd run pages:check -- --base=/dostupnyi-marshrut/
npm.cmd run pages:preview -- --base=/dostupnyi-marshrut/
```

Відкрийте `http://127.0.0.1:4173/dostupnyi-marshrut/`. Для macOS/Linux використовуйте `npm` замість `npm.cmd`. Для іншого імені репозиторію замініть `/dostupnyi-marshrut/` в усіх трьох командах; для кореневого домену використайте `/`.

`pages:build` створює папку **`dist-pages`** з готовим `index.html`, JavaScript, стилями, шрифтами та даними. Workflow сам збирає й передає цю папку GitHub Pages. Комітити її або створювати гілку `gh-pages` не потрібно. Звичайна команда `npm run build` створює серверну збірку й для GitHub Pages не підходить.

## Якщо сайт не відкривається

- **Configure Pages / Not Found:** увімкніть Pages із джерелом GitHub Actions, перевірте доступність Pages для тарифу й повторіть workflow.
- **Публікація заблокована середовищем:** перевірте Settings → Environments → github-pages та дозвіл на гілку `main`.
- **Немає запуску після push:** workflow стежить за `main`. Якщо ваша гілка називається інакше, змініть `on.push.branches` у `.github/workflows/pages.yml`.
- **404 для даних або порожня сторінка:** переконайтеся, що опубліковано `dist-pages` через цей workflow, а не серверний `dist/client`; перевірте адресу з урахуванням назви репозиторію.
- **Після зміни домену:** повторіть workflow, щоб перезібрати шляхи до ресурсів.

Офіційні інструкції: [Vite — GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages), [GitHub — власні workflows для Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [GitHub — події за розкладом](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
