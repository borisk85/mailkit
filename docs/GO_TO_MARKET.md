# MailKit — Go-To-Market Strategy

Owner-side стратегия по распределению маркетинговых усилий, каналам и
контенту. Обновлено 2026-04-20.

## Markets split

| Market | Focus % | Why |
|---|---|---|
| Western (EN) | 60% | Больший рынок, валютная оплата, выше чеки |
| CIS (RU) | 30% | Быстрая обратная связь, знакомая аудитория |
| Secondary channels | 10% | По остаточному принципу |

## Channels — Western (EN)

| Channel | Priority | Action | Cadence |
|---|---|---|---|
| X / Twitter | HIGH | Build-in-public threads, metrics, decisions, failures | Daily |
| Indie Hackers | HIGH | Launch post + milestone posts ($100, $500, $1k MRR) | On events |
| Product Hunt | HIGH | Cold launch, первые 100 setup'ов бесплатно за отзыв | Once, launch |
| Reddit (r/SaaS, r/indiehackers) | MED | Show-posts + value posts; careful with self-promo rules | 1-2/mo |
| Hacker News (Show HN) | MED | Single Show HN post когда MVP stable | Once |
| LinkedIn (personal account) | MED | Business angle: "как я запускал SaaS на $5" | 1-2/week |
| Dev.to | LOW | Technical posts про DNS/email setup | Optional |
| SEO blog | HIGH | 10-15 evergreen articles "how to set up email on domain" | Ongoing, long game |

## Channels — CIS (RU)

| Channel | Priority | Action | Cadence |
|---|---|---|---|
| Telegram (own channel) | HIGH | Project channel, build-in-public, email tips | 2-3/week |
| Telegram (paid posts) | HIGH | Крупные IT/startup каналы при launch events | 1-2 per key event |
| Habr | HIGH | 2-3 longreads: launch, technical breakdown, results | On events |
| VC.ru | MED | Launch post + case study с цифрами | 1-2 times |
| X (RU indie community) | MED | Russian-language threads when relevant | Regular |
| LinkedIn (RU readers) | LOW | English posts reach some RU audience organically | Passive |

## What to SKIP (не трогаем)

- Separate LinkedIn company page — личный аккаунт дает 10-20x больше reach
- Instagram — аудитория B2C, не ICP
- TikTok — аудитория B2C, не ICP
- Pikabu / casual RU forums — аудитория не та
- YouTube channel — только ONE demo video (2-3 min) для landing, не channel
- Facebook — irrelevant для indie hackers

## Content strategy: Build-in-Public

Главное оружие. Бесплатный маркетинг + доверие + early followers = buyers.

**Daily X posts** — honest mix of:
- Metrics (users, MRR, conversion rates)
- Technical decisions (why chose X over Y)
- Failures (OAuth verification pain, Brevo rate limits)
- Small wins (first paying customer, first $100 MRR)

**Weekly Telegram digest** — русский язык, то же содержимое в формате
«что было на этой неделе».

**Monthly Habr post** — глубокое погружение в одну тему (launch journey,
technical architecture, results).

## Pre-launch checklist (owner actions)

До MVP release (Week 1-2):
- [ ] Создать Telegram канал `@mailkit_dev` (или аналог)
- [ ] Первый пост в Telegram про идею и процесс
- [ ] Создать X-аккаунт `@MailKitHQ` (или использовать личный с обновленным bio)
- [ ] Первый thread в X про feasibility spike + решение
- [ ] Настроить 1 пост/день в X (буфер на 7 дней вперед через Hypefury/Buffer)
- [ ] LinkedIn bio обновить upcoming launch

К MVP release (Week 2-3):
- [ ] Demo video (2-3 мин) записан
- [ ] Landing copy EN + RU готов
- [ ] Product Hunt draft готов (публикуем позже после OAuth verification)
- [ ] Habr draft статьи о запуске готов
- [ ] Indie Hackers founder profile заполнен

После soft launch (Week 3-6):
- [ ] Первые платящие юзеры → просить отзыв
- [ ] Накопить 10+ отзывов до Product Hunt launch
- [ ] Habr longread опубликован
- [ ] SEO blog первые 3-5 статей (пишем постепенно)

Product Hunt launch (Week 5-7):
- [ ] Verification approved (preview)
- [ ] PH submission с собранными отзывами
- [ ] Coordinated push: X thread + Telegram + LinkedIn + Habr cross-promo
- [ ] First 100 users free в обмен на PH review

## Content angles (для постов и статей)

- "Почему MailKit? Настройка почты на домене превращается в час возни"
- "Feasibility spike: как Google выбил нам зубы (Gmail sendAs.create 403)"
- "Хюбрид подход: 70% автоматизации = 90% ценности"
- "Построил SaaS с Claude Code за 2 недели — честные метрики"
- "$5 за то, что раньше стоило мне часа жизни — economics of micro-SaaS"
- "Почему не Workspace: индивидуальный Gmail как первичный ICP"

## Metrics to track

Weekly dashboard для Boris'а (manually в Notion / spreadsheet):
- X followers + engagement rate
- Telegram subscribers
- Website visitors (по источникам)
- Sign-ups (free + paid)
- Paid setups + revenue
- Churn / refund rate
- Monitoring subscription attach rate
