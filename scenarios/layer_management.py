import os

import vedro
from playwright.async_api import expect
from vedro_pw import opened_browser_page


APP_URL = os.getenv("APP_URL", "http://127.0.0.1:5173")


class Scenario(vedro.Scenario):
    subject = "manage map layers"

    async def given_opened_map(self):
        self.page = await opened_browser_page()
        await self.page.goto(f"{APP_URL}?demoError=wind")

    async def when_temperature_layer_is_enabled(self):
        await self.page.get_by_test_id("layer-toggle-temperature").click()

    async def then_temperature_layer_is_loaded(self):
        await expect(self.page.get_by_test_id("layer-status-temperature")).to_have_text(
            "success"
        )

    async def when_wind_layer_is_enabled(self):
        await self.page.get_by_test_id("layer-toggle-wind").click()

    async def then_wind_layer_can_be_retried(self):
        wind_status = self.page.get_by_test_id("layer-status-wind")
        await expect(wind_status).to_have_text("error")
        await self.page.get_by_test_id("layer-retry-wind").click()
        await expect(wind_status).to_have_text("success")

    async def when_temperature_is_toggled_quickly(self):
        toggle = self.page.get_by_test_id("layer-toggle-temperature")
        await toggle.click()
        await toggle.click()
        await toggle.click()

    async def then_stale_request_does_not_reenable_layer(self):
        await self.page.wait_for_timeout(900)
        await expect(self.page.get_by_test_id("layer-status-temperature")).to_have_text(
            "выключен"
        )

    async def when_opacity_is_changed(self):
        opacity = self.page.get_by_test_id("layer-opacity-temperature")
        await opacity.fill("35")

    async def then_opacity_is_reflected_in_control(self):
        await expect(self.page.get_by_test_id("layer-opacity-temperature")).to_have_value(
            "35"
        )
