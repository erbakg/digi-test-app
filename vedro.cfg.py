import vedro
import vedro_pw


class Config(vedro.Config):
    class Plugins(vedro.Config.Plugins):
        class Playwright(vedro_pw.Playwright):
            enabled = True
