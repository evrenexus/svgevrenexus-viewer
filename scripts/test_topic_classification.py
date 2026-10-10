#!/usr/bin/env python3
"""Regression tests for Evren Nexus news topic classification."""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from news_collector import assign_topics
import news_ai


class TopicClassificationTests(unittest.TestCase):
    def topics(self, title, summary="", category="اقتصاد و سرمایه‌گذاری", content=""):
        return set(assign_topics({
            "title": title,
            "summary": summary,
            "category": category,
            "content": content,
        }))

    def test_source_category_does_not_turn_sports_into_economy(self):
        self.assertEqual(
            self.topics("ببینید؛ خلاصه بازی بارسلونا ۳ - ختافه ۰"),
            set(),
        )

    def test_ambiguous_word_molk_does_not_mean_real_estate(self):
        topics = self.topics(
            "عربستان: فعالیت‌های فرودگاه ملک خالد به‌طور موقت متوقف شد"
        )
        self.assertNotIn("real-estate", topics)

    def test_ai_news_also_belongs_to_technology(self):
        topics = self.topics(
            "سازمان‌ها در عصر هوش مصنوعی؛ پیش‌نیازهای تحول AI",
            category="بورس و بازار سرمایه",
        )
        self.assertIn("ai", topics)
        self.assertIn("technology", topics)

    def test_crypto_is_separate_from_currency_and_gold(self):
        topics = self.topics(
            "ارز دیجیتال بیت‌کوین از کانال ۸۲ هزار دلاری جدا شد؛ آلت‌کوین‌ها سبزپوش شدند"
        )
        self.assertIn("crypto", topics)
        self.assertNotIn("currency-gold", topics)

    def test_currency_and_gold_news_is_classified(self):
        topics = self.topics("قیمت دلار و طلا امروز افزایش یافت")
        self.assertIn("currency-gold", topics)
        self.assertNotIn("crypto", topics)

    def test_car_news_is_classified(self):
        self.assertIn(
            "auto",
            self.topics("فروش بدون قرعه‌کشی سایپا آغاز می‌شود"),
        )

    def test_housing_news_is_classified(self):
        self.assertIn(
            "real-estate",
            self.topics("وام مسکن و تسهیلات خرید آپارتمان اعلام شد"),
        )

    def test_unrelated_body_cannot_override_sports_headline(self):
        self.assertEqual(
            self.topics(
                "خلاصه بازی بارسلونا",
                content="قیمت دلار و طلا در بازار امروز افزایش یافت",
            ),
            set(),
        )

    def ai_topics(self, title, summary="", category="اقتصاد و سرمایه‌گذاری"):
        src = {"title": title, "summary": summary, "category": category, "topics": []}
        meta = {
            "local_score": 5,
            "group_id": "test-group",
            "duplicate_count": 1,
            "political": False,
            "breaking_signal": False,
            "age_hours": 0,
        }
        return set(news_ai.make_local_result(src, meta)["topics"])

    def test_ai_fallback_keeps_crypto_separate_even_when_headline_says_dollari(self):
        topics = self.ai_topics(
            "ارز دیجیتال بیت‌کوین از کانال ۸۲ هزار دلاری جدا شد"
        )
        self.assertIn("crypto", topics)
        self.assertNotIn("currency-gold", topics)

    def test_ai_fallback_places_ai_in_technology(self):
        topics = self.ai_topics(
            "سازمان‌ها در عصر هوش مصنوعی؛ پیش‌نیازهای تحول AI"
        )
        self.assertIn("ai", topics)
        self.assertIn("technology", topics)

    def test_ai_fallback_does_not_restore_publisher_category(self):
        self.assertEqual(
            self.ai_topics("ببینید؛ خلاصه بازی بارسلونا ۳ - ختافه ۰"),
            set(),
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
