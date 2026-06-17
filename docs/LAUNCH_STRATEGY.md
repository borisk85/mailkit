# MailKit — Launch Strategy

Документ для извлечения когда подойдём к запуску. Содержит выбранную
стратегию запуска (Вариант Б — 2 недели целевой подготовки + Product
Hunt launch), список конкретных материалов которые надо будет
подготовить, и ожидаемые результаты.

Создан 2026-04-28 после стратегического обсуждения с owner. Owner
выбрал Вариант Б, признано что без существующей аудитории классический
soft launch не работает.

---

## Контекст

Owner — solo indie founder без существующей аудитории на X / Indie
Hackers / Telegram / Reddit. Это значит классический soft launch
(холодные посты с надеждой накопить followers) не сработает —
посты прочитают 50 человек, реальных откликов 1-5.

Прямой запуск на Product Hunt без подготовки тоже плохой вариант:
PH алгоритм наказывает запуски без upcoming notifications и без
существующего шума. Без 50-100 "+1 notify me" подписчиков и 5-10
ранних пользователей которые могут upvote в первый час — продукт
скорее всего попадёт в bottom 50% дневного списка. 50-200 уникальных
visitors, единицы покупателей.

## Выбранная стратегия — Вариант Б (гибрид)

Два недели целевой подготовки между разблокировкой LemonSqueezy
магазина и Product Hunt launch'ем. Не "soft launch с надеждой накопить
аудиторию", а целевая работа на specific outcomes.

### Неделя 1 — после LS unblock + UI полировки

Действия и материалы:

1. **Product Hunt "Coming Soon" page** — фича PH Ship.
   - Регистрируешь продукт на PH с launch date через 14 дней
   - Цель — накопить 50-100 "+1 notify me" подписчиков за 2 недели
   - Архитектор готовит copy для PH coming soon page (тагline,
     short description, gallery images)

2. **Show HN на Hacker News** — отдельный канал, аудитория не
   пересекается с PH.
   - Акцент на технику: "I built a $5 service that automates the
     Cloudflare + Brevo + Gmail Send-As setup that takes 90 minutes
     manually"
   - Хороший Show HN даёт 200-500 visitors даже без аудитории автора
   - Архитектор готовит draft текста

3. **Indie Hackers milestone post** — мета-пост о процессе.
   - Заголовок типа "I built MailKit in 2 weeks, here's the build
     process and economics"
   - IH аудитория любит сторителлинг про процесс, не нужны followers
   - Архитектор готовит draft

4. **Reddit r/SideProject + r/SaaS** — два showcase поста.
   - Подготовлены под правила каждого сабреддита
   - Без агрессивного промо, фокус на "что я построил и зачем"
   - Архитектор готовит два draft'а

5. **Промокод FIRST25** — упоминается во всех публикациях как
   attention-hook. Первые 25 платежей за $0 в обмен на отзыв.

Цель недели — собрать 5-15 ранних пользователей (включая бесплатных
по промо), которые попробуют продукт и оставят раннее впечатление в
комментариях постов. Это твой initial social proof для PH запуска.

### Неделя 2 — финальная подготовка PH launch

1. **Запуск во вторник** — исторически best day for PH (среда хуже
   из-за overlap с другими big launches, понедельник — слабый
   warm-up day, пятница — преждевременный спад).

2. **Координированный push в день запуска:**
   - Тред в X с метриками построения (если завёл аккаунт)
   - Обновление в Indie Hackers с launch announcement
   - Email тем кто подписался на "Coming Soon" в PH Ship
   - Новый пост в Telegram канале (если завёл)
   - Архитектор готовит все эти тексты

3. **5-15 ранних пользователей из Недели 1** = 5-15 первых upvotes в
   первый час, что критично для PH алгоритма.

4. **25 бесплатных по FIRST25** = bait для day-of conversion.

### Ожидаемый исход

- $300-800 в первую неделю запуска
- Попадание в топ 5-10 дня PH (не топ-3 без аудитории, но достаточно
  для накопления первых отзывов)
- Контент для контент-маркетинга в дальнейшие 2-4 недели
- 30-50 платящих клиентов в первый месяц при средних показателях

---

## Альтернатива — Вариант А (быстрый запуск без подготовки)

Если совсем не хочется ждать 2 недели:

- Запуск напрямую на PH в ближайший вторник без подготовки
- Принимаем "throwaway launch" mindset
- Возможный исход: $50-200 в первую неделю, дальше затухание
- Можно повторить через 6 месяцев когда есть кейсы клиентов

Не катастрофа, но недооптимально. Owner отверг этот вариант 2026-04-28
в пользу Варианта Б.

---

## Материалы которые архитектор готовит по запросу owner'а

Когда owner дойдёт до Недели 1 (после LS unblock + UI fixes) — owner
запрашивает каждый материал по мере необходимости. Каждый готовится
за 30-60 минут архитекторской работы.

| Запрос owner'а | Что архитектор делает |
|---|---|
| "Покажи Show HN текст" | Draft поста с акцентом на технику и spike learnings |
| "Indie Hackers milestone post" | Storytelling-пост о процессе постройки |
| "Reddit posts для SideProject и SaaS" | Два draft'а под правила каждого сабреддита |
| "PH Coming Soon page copy" | Tagline, short description, gallery descriptions |
| "Day-of launch coordinated push texts" | X тред, IH update, Telegram пост, email |
| "X bio + initial profile copy" | Bio, pinned post, build-in-public template |
| "Indie Hackers founder profile" | Profile copy, milestone format |
| "Demo video script" | См. отдельный документ DEMO_VIDEO_SCRIPT.md |

Owner может iterировать каждый материал — кидать обратно "не нравится
тон, переделай агрессивнее" или "слишком технично для SMB".

---

## Что зависит от owner'а на каждой неделе

### Неделя 1
- Lemon Squeezy support unblock либо принять velabot store URL
- Завести Product Hunt account и заполнить профиль
- Зарегистрировать "Coming Soon" page в PH Ship
- Опубликовать Show HN, IH post, Reddit posts по drafts от архитектора
- Завести X account (или обновить bio существующего) и Telegram канал
  (если решит делать build-in-public канал)

### Неделя 2
- Финализировать demo video через AI generator (HeyGen/Synthesia/Runway)
- Загрузить gallery images на PH coming soon page
- Подготовить email base из тех кто подписался на PH Coming Soon
- Day-of launch — координированный push по materials от архитектора

---

## Что зависит от разработчика

- Pre-launch: завершение всех тех. блокеров (#34 LS live env switch,
  #35 domain bind, real card smoke test)
- During launch week: monitoring health, быстрый response на любые
  баги о которых пишут первые пользователи
- Post-launch: реализация AWS SES backup SMTP (#25-28 per docs/
  TICKETS_BACKLOG.md)

---

## Триггер начала Недели 1

Когда выполнено всё ниже:
1. Lemon Squeezy live mode переключён (#34)
2. Domain getmailkit.com привязан к Vercel production (#35)
3. Real card smoke test пройден ($5 покупка + refund себе ~$0.50 fee
   как стоимость verification)
4. UI/copy полировка по сигналам owner'а реализована (если есть
   запросы)
5. Demo video готов

Owner пишет в чате "стартую Неделю 1" — архитектор начинает выдавать
материалы по списку выше.

---

## Метрики успеха запуска

- Day 1 PH: топ 10 продукта дня минимум
- Week 1: 30-50 платящих + до 25 бесплатных по FIRST25
- Week 1 revenue: $300-800
- Week 2-4: organic traction через PH long-tail + поисковая выдача
- Month 1 closing: 100-200 платящих, $500-1500 MRR equivalent
- Month 3: первый честный сигнал product-market-fit (либо растёт без
  активного маркетинга, либо плато)
