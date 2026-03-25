import csv
from django.core.management.base import BaseCommand
from core.models import Question, Skill, Topic

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        file_path = 'core/data/combined_questions.csv'

        with open(file_path, newline='', encoding='utf-8') as file:
            reader = csv.DictReader(file)

            count = 0

            for row in reader:

                print("IMPORTING:", row['question_text'], row['question_type'])
                
                try:
                    skill, _ = Skill.objects.get_or_create(name=row['skill'])
                    topic, _ = Topic.objects.get_or_create(name=row['topic'], skill=skill)

                    if row['question_type'] == 'mcq':
                        Question.objects.create(
                            question_text=row['question_text'],
                            option_a=row['option_a'],
                            option_b=row['option_b'],
                            option_c=row['option_c'],
                            option_d=row['option_d'],
                            correct_option=row['correct_option'],
                            question_type='mcq',
                            difficulty=row['difficulty'],
                            skill=skill,
                            topic=topic
                        )

                    elif row['question_type'] == 'coding':
                        Question.objects.create(
                            question_text=row['question_text'],
                            code_solution=row['code_solution'],
                            question_type='coding',
                            difficulty=row['difficulty'],
                            skill=skill,
                            topic=topic
                        )

                    count += 1

                except Exception as e:
                    print("Error:", e)

        print(f"{count} Questions Imported Successfully!")