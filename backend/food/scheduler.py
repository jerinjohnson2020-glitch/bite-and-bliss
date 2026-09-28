from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from django_apscheduler.jobstores import DjangoJobStore

from .order_scheduler import update_order_statuses


def start():

    scheduler = BackgroundScheduler()

    scheduler.add_jobstore(
        DjangoJobStore(),
        "default"
    )

    scheduler.add_job(
        update_order_statuses,
        trigger=IntervalTrigger(seconds=10),
        id="update_order_statuses",
        max_instances=1,
        replace_existing=True,
    )

    scheduler.start()

    print("Order status scheduler started.")