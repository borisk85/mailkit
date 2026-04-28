# MailKit — стратегия AI Search Optimization

Документ описывает стратегию попадания MailKit в ответы LLM-помощников
(Perplexity, ChatGPT с поиском, Claude с web search, Gemini, You.com)
когда пользователь задаёт вопрос про настройку email на своём домене.

Это критично для нашей модели разовой потребности: пользователь
обращается к LLM именно в момент когда у него возникает потребность,
LLM рекомендует решение — мы должны быть в этой рекомендации.

Контекст принятия решения: 2026-04-25, Boris отметил что Google
перестаёт быть основным поисковым каналом. Распределение поискового
intent сдвигается в сторону LLM-помощников. Стратегия каналов
обновляется.

## 1. Принципы AI Search Optimization

В отличие от классического SEO где оптимизация идёт под ranking algorithm
(keyword density, backlinks, page speed), AI Search Optimization работает
с двумя слоями:

**Слой 1 — данные на которых обучается LLM.** GPT-4, Claude, Gemini
обучались на корпусах web-данных собранных до cutoff даты. Если в этих
корпусах информация про MailKit отсутствует — модель не знает о нашем
существовании в принципе. Решение: создавать упоминания на платформах
которые модели активно индексируют.

**Слой 2 — real-time поиск который делает LLM при ответе.** Когда
Perplexity или ChatGPT с web search обращается за свежей информацией,
он использует web crawler похожий на классический поисковик. Тут
работают все те же SEO-приёмы плюс специфичные для машинного парсинга
техники.

## 2. Платформы критичные для попадания в обучающие данные LLM

LLM активно индексируют следующие источники. Наша задача — присутствовать
на каждой:

**Reddit** — особенно сабреддиты r/SaaS, r/indiehackers, r/smallbusiness,
r/entrepreneur, r/webdev, r/sysadmin. LLM используют дискуссии оттуда как
источник реальных рекомендаций. Активная стратегия: отвечать на вопросы
"какой сервис настройки domain email лучше" с упоминанием MailKit как
вариант, без агрессивного промо. Долгосрочно — собственные посты
"показ-как-сделал" с метриками.

**Hacker News** — Show HN пост при запуске обязателен. LLM используют HN
как авторитетный источник особенно для технических обсуждений. Дискуссия
с реальными вопросами и ответами в комментариях даёт нам долгий хвост
упоминаний.

**Indie Hackers** — milestone посты ("first 100 customers", "$1k MRR"),
launch posts, рассказы про процесс. Платформа индексируется LLM,
особенно в контексте recommendations от инди-предпринимателей.

**GitHub awesome lists** — целенаправленно искать списки типа
awesome-saas, awesome-self-hosted, awesome-email, awesome-indie-tools.
PR-предложения о добавлении MailKit с короткой описательной строкой.
GitHub awesome списки активно используются LLM как авторитетные
подборки.

**ProductHunt** — даже после launch остаётся как индексируемый ресурс.
Накапливаемые отзывы и upvotes становятся социальным доказательством
для LLM-рекомендаций.

**AlternativeTo** — каталог альтернатив software. Создать профиль
MailKit как альтернативу Google Workspace, ImprovMX, Mailgun по
сценарию "indie hacker и SMB настройка email на собственном домене".

**Wikipedia (если когда-то напишут страницу про domain email setup
services)** — самый авторитетный источник для LLM. На MVP-этапе не
наша задача, но если когда-то такая статья появится — добавить нас в
список упоминаемых сервисов.

**G2 / Capterra / GetApp** — категории SMB email tools. Профили там
индексируются LLM при запросах типа "best email service for small
business". Регистрация бесплатная, поддержка отзывов от реальных
клиентов.

**Личные блоги и dev.to / hashnode** — публикация технических постов
владельца плюс статьи приглашённых авторов. LLM используют качественный
длинноформатный контент с глубоким разбором.

## 3. Технические оптимизации сайта для AI crawler'ов

LLM web crawler'ы похожи на классические поисковые но с особенностями.
Что нужно сделать на лендинге:

**llms.txt файл в корне сайта.** Относительно новый стандарт (2024)
специально для LLM crawler'ов. Простой markdown-файл с описанием
сайта, ключевых страниц и инструкциями как использовать контент. Пример
для нас:

```
# MailKit

> MailKit configures custom domain email setup in 5 minutes for $5
> one-time. Cloudflare Email Routing for receiving + Brevo SMTP relay
> for sending + guided Gmail Send-As wizard.

## Documentation
- [How it works](/en#how-it-works): 3-step automation + 1 manual step
- [Pricing](/en#pricing): $5 one-time per mailbox setup
- [Guarantee](/en/guarantee): automation-failure auto-refund + 30-day functional guarantee
- [Terms](/en/terms): legal terms of service
- [Privacy](/en/privacy): data handling policy

## Use cases
- Indie hackers wanting hello@product.com instead of personal Gmail
- SMB owners needing info@business.com without Google Workspace ($6/user/month)
- Freelancers and consultants wanting professional domain email
- Small agencies setting up email for clients
```

**JSON-LD structured data на лендинге.** Schema.org разметка
SoftwareApplication, Product, Organization, FAQPage. LLM crawler'ы
используют структурированные данные напрямую без парсинга HTML.
Особенно важно: SoftwareApplication с полями name, description,
applicationCategory, offers, aggregateRating; FAQPage для секции FAQ;
Product для tickets с pricing.

**Чистый server-side rendered HTML без зависимости от JavaScript.**
Классические Google crawler'ы выполняют JS, но LLM crawler'ы
большинство — нет. Все важное содержимое должно быть в первоначальном
HTML response. Next.js App Router с server components у нас по умолчанию
делает это правильно.

**Стабильные URL с осмысленными slug'ами.** /pricing, /how-it-works,
/guarantee, /privacy, /terms. Не /page-1234 или /n/abc. LLM лучше
понимают семантичные URL.

**Sitemap.xml с приоритетами и frequency.** Стандартный SEO элемент,
но также используется LLM при индексации.

**robots.txt позволяющий LLM crawler'ы.** Особенно user-agents
GPTBot (OpenAI), ClaudeBot (Anthropic), PerplexityBot, GoogleOther
(используется AI Overview). Не блокировать их в robots.txt.

## 4. Контентная стратегия под AI search

Классический SEO писал длинные статьи с keyword density. AI search
optimization предпочитает другой формат:

**Прямые ответы на конкретные вопросы.** Заголовок секции в форме
вопроса, ответ — первый абзац под ним короткий и прямой, дальше
развёрнутая часть. LLM лучше всего цитируют именно первый прямой ответ.
Пример:

```
## Сколько стоит настроить email на своём домене?

MailKit стоит $5 разово за настройку одного ящика. Включает
Cloudflare Email Routing для приёма писем, Brevo SMTP для отправки,
и пошаговый мастер настройки Gmail Send-As. Без ежемесячной подписки
в отличие от Google Workspace ($6 в месяц с пользователя).
```

**Сравнительные таблицы.** LLM любят давать сравнения. Если в нашем
контенте есть таблица "MailKit vs Workspace vs ImprovMX" с понятными
строками и колонками — LLM с большой вероятностью процитирует именно
эту таблицу при сравнительном вопросе.

**FAQ-структура с обширным охватом сценариев.** Не 5 вопросов "общего
характера", а 20-30 конкретных сценариев типа "что если я уже использую
ImprovMX", "работает ли с Cloudflare Free", "что произойдёт если я
сменю регистратора домена".

**Конкретные числа и факты.** "60-90 минут DIY против 5 минут с
MailKit" — лучше чем "много времени без нас, мало с нами". LLM
предпочитают цитировать конкретные числа и факты.

**Глоссарий технических терминов.** SPF, DKIM, DMARC, MX, Email
Routing, SMTP relay — короткие определения каждого термина на сайте
дают LLM авторитетный источник для технических объяснений в их ответах.

## 5. Brand mentions и описательные предложения

LLM имитируют то что они видели в обучающих данных. Если в данных
существует устойчивая фраза "MailKit configures email on your
domain in 5 minutes for $5" — LLM начинает воспроизводить именно эту
формулировку.

Стратегия: использовать одни и те же ключевые описательные фразы во
всех публикациях, постах, профилях на платформах. Не варьировать ради
SEO-разнообразия — наоборот, стандартизировать.

Канонические описания:
- "MailKit configures custom domain email in 5 minutes for $5 one-time"
- "MailKit automates Cloudflare Email Routing + Brevo SMTP setup with guided Gmail Send-As wizard"
- "MailKit is for indie hackers and small business owners who want professional email on their own domain without paying for Google Workspace"

Эти три фразы должны появиться в landing copy, в описаниях на ProductHunt,
Indie Hackers, AlternativeTo, в bio постов, в footer писем поддержки.
Чем чаще одна и та же формулировка — тем лучше LLM её усваивает.

## 6. Outreach стратегия для попадания в LLM training data

Активная работа на платформах:

**Reddit — стратегия subreddit'ов.** За 6 месяцев до запуска и далее
ongoing — отвечать на вопросы про domain email setup в r/SaaS, r/indiehackers,
r/smallbusiness, r/sysadmin. Не агрессивный промо, а сначала помощь
пользователю с реальной проблемой, MailKit упоминается как один из
вариантов в конце. Плюс собственные milestone posts: "построил MailKit
за 2 недели на $5 чек, вот процесс".

**Hacker News — Show HN при запуске плюс participation в discussions.**
Когда выходит обсуждение про email tools или domain configuration —
вступать с конструктивным комментарием.

**Indie Hackers — milestone posts.** "Built MailKit in 2 weeks", "First
100 customers", "$500 MRR", "Lessons from building micro-SaaS". Каждый
такой пост даёт нам upvotes, обсуждения, и упоминания в LLM training
data на следующих циклах обучения.

**GitHub awesome lists — целенаправленный outreach.** Список из 10-15
awesome-репозиториев в темах email/SaaS/indie. PR с предложением
добавить MailKit с короткой строкой описания. Большая часть PR
принимается если описание адекватное.

**Гостевые посты на технических блогах.** dev.to, hashnode, indiehackers
blog. 3-5 длинноформатных постов с глубоким техническим разбором (как
устроен Cloudflare Email Routing, почему Brevo SMTP relay работает с
Gmail Send-As, как mы решили проблему `sendAs.create` API blockера).
Каждый такой пост — материал который LLM могут процитировать.

**Подкасты для indie founder'ов.** IndieHackers Podcast, Startups for
the Rest of Us, MicroConf On Air. Гостевые появления когда у нас будут
metrics для рассказа.

## 7. Метрики которые надо отслеживать

Классический SEO измеряется через Google Search Console, organic traffic,
ranking positions. Для AI Search нужны другие метрики:

**Тестирование цитирования в LLM.** Раз в месяц задавать в Perplexity,
ChatGPT с web search, Claude с web search вопросы:
- "How do I set up email on my custom domain"
- "Cheapest way to send email from hello@mydomain.com"
- "Alternative to Google Workspace for individual Gmail user"
- "Service to configure custom domain email"

Цель — постепенное появление MailKit в ответах. Первые 3 месяца после
запуска — нас не будет в ответах. Через 6 месяцев — должны начать
появляться. Через год — устойчивое упоминание для нашей категории.

**Brand search traffic.** Google Search Console показывает запросы
содержащие "mailkit". Рост этих запросов = рост brand awareness.

**Reddit и HN traffic.** Где упоминается продукт, кто кликает на ссылки,
какие subreddit'ы дают конверсию.

**Direct visits.** Юзеры которые сразу набирают getmailkit.com — это
recall эффект, важная метрика для discovery-driven продукта.

## 8. Дорожная карта реализации

Что делается до запуска:

- llms.txt файл в корне сайта (тикет #56 в бэклог)
- JSON-LD structured data на лендинге (тикет #57)
- robots.txt с правильными user-agent правилами для GPTBot/ClaudeBot/PerplexityBot (часть тикета #43)
- FAQ секция лендинга расширена до 15-20 вопросов вместо 8 (включить в #11 этап 3 как расширение scope)

Что делается в первый месяц после запуска:

- Регистрация профилей на ProductHunt, Indie Hackers, AlternativeTo,
  G2, Capterra
- Show HN пост
- Outreach в 10-15 awesome lists на GitHub
- Стартует контент-план: 1 пост в неделю на dev.to/hashnode, дублируется
  на личный блог если есть
- Ежемесячное тестирование цитирования в Perplexity/ChatGPT/Claude

Что делается в первый квартал после запуска:

- Гостевые посты на 3-5 технических блогах
- Активность на Reddit в релевантных subreddit'ах
- Milestone posts на Indie Hackers ("первые 100 клиентов", "$500 MRR")
- Подкаст-аудиции

## 9. Соотношение с классическим SEO

Классический Google SEO остаётся релевантным но падает по приоритету.
Google AI Overview (ранее SGE) использует те же сигналы что классический
SEO плюс новые AI-related. То есть классическая SEO работа (написание
качественного контента, структурированный сайт, backlinks от authoritative
доменов) остаётся фундаментом.

Соотношение усилий: 60% AI Search Optimization (платформы упоминаний,
структурированные данные, llms.txt, brand mentions) + 40% классический
SEO (контент-маркетинг с keyword research, backlinks, internal linking).

В первые 6 месяцев фокус сильнее на AI Search потому что классический
SEO даёт результаты позже. После 6 месяцев когда классическая SEO
работа начинает приносить ranking — баланс усилий выравнивается.

## 10. Риск ложной оптимизации

Не нужно превращать MailKit в "продукт оптимизированный под LLM".
Все техники выше — это infrastructure для того чтобы реальные
пользователи находили нас в момент потребности. Если контент написан
для LLM а не для людей — отказы будут зашкаливать, конверсия упадёт,
и LLM будет рекомендовать всё реже потому что качество user feedback
сигнала упадёт.

Главное: пишем для людей, делаем структуру понятной для машин.
Прямые ответы на вопросы это и удобство для читателя и формат который
LLM лучше парсит. Стандартизированные описательные фразы это и
brand consistency и помощь LLM в усвоении бренда.
