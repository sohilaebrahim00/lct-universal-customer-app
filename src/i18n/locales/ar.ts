import { en } from './en';

/** Constrained to `typeof en` so a missing or extra key is a compile-time error, not a runtime gap. */
export const ar: typeof en = {
  common: {
    ok: 'موافق',
    cancel: 'إلغاء',
    save: 'حفظ',
    retry: 'إعادة المحاولة',
    loading: 'جارٍ التحميل…',
  },
  settings: {
    title: 'الإعدادات',
    pushTitle: 'الإشعارات الفورية',
    pushSubtitle: 'تحديثات الحجز، وحالة السائق الخاص، وتذكيرات الرحلات',
    signedInAs: 'تم تسجيل الدخول باسم',
    appVersion: 'إصدار التطبيق',
  },
  language: {
    title: 'اللغة',
    subtitle: 'اختر لغة التطبيق واتجاه القراءة',
    english: 'English',
    arabic: 'العربية',
    restartTitle: 'إعادة التشغيل مطلوبة',
    restartMessage: 'أغلق تطبيق LCT Universal وأعد فتحه لتطبيق اللغة الجديدة واتجاه العرض.',
    restartConfirm: 'حسنًا',
  },
} as const;
