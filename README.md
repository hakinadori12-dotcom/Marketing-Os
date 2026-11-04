# Marketing-Os

نظام تشغيل التسويق: عقل البراند، إنشاء المحتوى، الخطة الشهرية، استوديو الصور، التعليق الصوتي (ElevenLabs)، ولوحة API.
كل الذكاء الاصطناعي يعمل بمفاتيحك أنت (BYOK): OpenAI · Gemini · Claude · OpenRouter · xAI · DeepSeek، والفيديو قريباً (Kling · Seedance · Wan · Veo).

## التشغيل على Vercel
1. Import هذا المستودع في Vercel (بدون framework، بدون build).
2. Environment Variables:
   - `ADMIN_PASSWORD` كلمة مرور الدخول
   - `APP_SECRET` نص عشوائي طويل (40+ حرف) لتشفير المفاتيح والجلسات
3. Storage:
   - **Upstash for Redis** (مجاني) ← Connect: يضيف `KV_REST_API_URL` و `KV_REST_API_TOKEN` (أو `REDIS_URL`)
   - **Blob** ← Connect: يضيف `BLOB_READ_WRITE_TOKEN` (الصور، الصوت، الشعارات، الخط)
4. Redeploy.

## البنية
- `api/index.js` نقطة دخول واحدة لكل `/api/*`
- `lib/` التخزين (Redis + Blob بدون مكتبات خارجية)، المزوّدون، المحتوى، البراندات، ElevenLabs
- `public/` الواجهة (Vanilla JS، RTL، نمط VentureOS، خط Thmanyah Sans يُرفع من لوحة الـ API)

لا توجد أي dependencies: Node 20+ فقط.
