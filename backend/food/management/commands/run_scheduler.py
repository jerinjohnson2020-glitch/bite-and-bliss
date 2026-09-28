from django.core.management.base import BaseCommand

from food.scheduler import start


class Command(BaseCommand):

    help = "Starts the automatic order status scheduler"

    def handle(self, *args, **options):

        self.stdout.write(
            self.style.SUCCESS(
                "Starting order status scheduler..."
            )
        )

        start()

        self.stdout.write(
            self.style.SUCCESS(
                "Order status scheduler is running."
            )
        )

        try:

            import time

            while True:
                time.sleep(1)

        except KeyboardInterrupt:

            self.stdout.write(
                self.style.WARNING(
                    "Order status scheduler stopped."
                )
            )