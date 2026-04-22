# JS resource inventory — feat/4b preview, cold load per locale

Source: `performance.getEntriesByType('resource').filter(r => r.name.endsWith('.js'))`
run inside fresh Playwright browser context per locale. Filter excludes
`.woff2` font assets (my earlier report of "RU +5 files +97KB" was a filter
bug that included fonts).

## EN

16 files, 262,713 bytes total.

```
/_next/static/chunks/173scccm5et9k.js       2,057
/_next/static/chunks/0g0hcuh-80b9i.js       9,135
/_next/static/chunks/14ob8dxzo0gg3.js       9,247
/_next/static/chunks/02w4qkssok9p..js      72,308
/_next/static/chunks/0r8y_d.sslpbg.js       9,622
/_next/static/chunks/0a7tz21fn7xf2.js      29,846
/_next/static/chunks/turbopack-14tl6o6-3y6k_.js   4,518
/_next/static/chunks/06_14v6o735xh.js       1,491
/_next/static/chunks/0lu5peqmv4d3j.js      13,401
/_next/static/chunks/0s9hd3sd_9aon.js      11,579
/_next/static/chunks/17tcun-b0spc-.js      12,918
/_next/static/chunks/029bbcyq0a2.x.js       3,685
/_next/static/chunks/0ogjc11em8j69.js      61,728
/_next/static/chunks/0m0hr-hcszfch.js       9,733
/_next/static/chunks/0roc~aj-m8vil.js      11,445
https://vercel.live/_next-live/feedback/feedback.js   0
```

## RU

16 files, 262,713 bytes total. **Byte-identical to EN** (same chunk names,
same sizes). Verified on cold navigation `?cb=cold1` cache-buster.

## HTML + RSC

Preview `?mock=token_entry`:

| | EN | RU | Delta |
|---|---|---|---|
| RSC (RSC: 1 header) | 12,438 | 14,811 | +2,373 |
| HTML (no RSC header) | 20,941 | 23,542 | +2,601 |

Delta ~11% RU over EN — expected UTF-8 overhead for Cyrillic.
