# Generated by Django 5.1.1 on 2024-10-08 10:20

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mail', '0003_alter_email_id'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='email',
            field=models.EmailField(max_length=254, unique=True),
        ),
    ]
