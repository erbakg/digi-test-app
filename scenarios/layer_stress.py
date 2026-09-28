import os

import vedro
from playwright.async_api import expect
from vedro_pw import opened_browser_page


APP_URL = os.getenv("APP_URL", "http://127.0.0.1:5173")


class Scenario(vedro.Scenario):
    subject = "render and control 120 map layers"

    async def given_stress_mode_is_opened(self):
        self.page = await opened_browser_page()
        await self.page.goto(f"{APP_URL}?layers=120")

    async def then_all_layer_cards_are_rendered(self):
        cards = self.page.locator('[data-testid^="layer-card-"]')
        assert await cards.count() == 120
        assert await self.page.get_by_test_id("layer-card-mock-117").count() == 1

    async def when_all_layers_are_enabled(self):
        for layer_id in ("temperature", "wind", "insolation"):
            await self.page.get_by_test_id(f"layer-toggle-{layer_id}").click()

        for ordinal in range(1, 118):
            await self.page.get_by_test_id(f"layer-toggle-mock-{ordinal}").click()

    async def then_all_120_requests_finish_loading(self):
        await expect(
            self.page.locator('[data-testid^="layer-status-"]').filter(has_text="success")
        ).to_have_count(120, timeout=5000)

    async def when_the_last_layer_opacity_is_changed(self):
        await self.page.get_by_test_id("layer-opacity-mock-117").fill("35")

    async def then_the_last_layer_control_is_updated(self):
        await expect(
            self.page.get_by_test_id("layer-opacity-mock-117")
        ).to_have_value("35")
