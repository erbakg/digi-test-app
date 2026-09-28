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

    async def when_timeline_moves_to_noon(self):
        self.temperature_value_before_timeline = await self.page.get_by_test_id(
            "layer-value-temperature"
        ).inner_text()
        await self.page.get_by_test_id("timeline-point-12:00").click()

    async def then_timeline_updates_map_and_chart_state(self):
        await expect(
            self.page.get_by_test_id("timeline-point-12:00")
        ).to_have_attribute("aria-pressed", "true")
        await expect(self.page.get_by_test_id("chart-selected-time")).to_have_text("12:00")
        await expect(
            self.page.get_by_test_id("layer-value-temperature")
        ).not_to_have_text(self.temperature_value_before_timeline)
        await expect(self.page.get_by_test_id("map-status")).to_have_attribute(
            "data-ready", "true"
        )
        await expect(self.page.get_by_test_id("map-status")).to_have_attribute(
            "data-source-count", "4"
        )
        await expect(self.page.get_by_test_id("map-status")).to_have_attribute(
            "data-layer-count", "8"
        )
        await expect(self.page.get_by_test_id("map-status")).to_have_attribute(
            "data-has-3d-layer", "true"
        )
        await expect(self.page.get_by_test_id("map-3d-weather-station")).to_be_visible()

    async def when_temperature_is_toggled_quickly(self):
        toggle = self.page.get_by_test_id("layer-toggle-temperature")
        await toggle.click()
        await toggle.click()
        await toggle.click()
        await toggle.click()

    async def then_latest_request_wins_after_quick_toggles(self):
        await expect(self.page.get_by_test_id("layer-status-temperature")).to_have_text(
            "success", timeout=3000
        )
        await expect(self.page.get_by_test_id("layer-toggle-temperature")).to_have_attribute(
            "aria-checked", "true"
        )

    async def when_opacity_is_changed(self):
        opacity = self.page.get_by_test_id("layer-opacity-temperature")
        await opacity.fill("35")

    async def then_opacity_is_reflected_in_control(self):
        await expect(self.page.get_by_test_id("layer-opacity-temperature")).to_have_value(
            "35"
        )
