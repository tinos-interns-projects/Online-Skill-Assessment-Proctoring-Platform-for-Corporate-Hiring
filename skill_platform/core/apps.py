from django.apps import AppConfig


class CoreConfig(AppConfig):
    name = 'core'

    def ready(self):
        # Load model signals without changing existing app behavior.
        import core.signals  # noqa: F401
