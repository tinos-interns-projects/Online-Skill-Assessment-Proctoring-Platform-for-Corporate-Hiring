from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0026_answer_score"),
    ]

    operations = [
        migrations.AddField(
            model_name="testblueprint",
            name="difficulty",
            field=models.CharField(blank=True, default="Medium", max_length=20),
        ),
        migrations.AddField(
            model_name="testblueprint",
            name="duration_minutes",
            field=models.PositiveIntegerField(default=45),
        ),
        migrations.AddField(
            model_name="testblueprint",
            name="primary_skill",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="testblueprint",
            name="question_count",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
