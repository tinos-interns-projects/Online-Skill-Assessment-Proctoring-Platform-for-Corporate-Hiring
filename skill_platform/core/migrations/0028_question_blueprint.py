from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0027_testblueprint_frontend_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="question",
            name="blueprint",
            field=models.ForeignKey(blank=True, null=True, on_delete=models.CASCADE, related_name="questions", to="core.testblueprint"),
        ),
    ]
