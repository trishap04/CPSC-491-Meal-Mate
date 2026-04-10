from django.core.management.base import BaseCommand
from users.models import FoodCategory, Food


class Command(BaseCommand):
    help = 'Populate the database with sample food items'

    def handle(self, *args, **options):
        # Create categories
        categories_data = [
            ('meat', 'Meat'),
            ('canned', 'Canned Goods'),
            ('bread', 'Bread'),
            ('veggies', 'Vegetables'),
        ]
        
        categories = {}
        for cat_key, cat_label in categories_data:
            category, created = FoodCategory.objects.get_or_create(
                name=cat_key,
                defaults={'description': f'{cat_label} items for donation'}
            )
            categories[cat_key] = category
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created category: {cat_label}'))
        
        # Create sample foods
        foods_data = {
            'meat': [
                'Chicken Breast',
                'Ground Beef',
                'Pork Chops',
                'Turkey',
                'Deli Meat',
                'Ham',
            ],
            'canned': [
                'Canned Vegetables',
                'Canned Fruit',
                'Canned Beans',
                'Canned Soup',
                'Canned Tuna',
                'Canned Chicken',
                'Peanut Butter',
                'Canned Tomatoes',
            ],
            'bread': [
                'Whole Wheat Bread',
                'White Bread',
                'Rye Bread',
                'Sourdough',
                'Bagels',
                'Rolls',
                'Tortillas',
                'Pita Bread',
            ],
            'veggies': [
                'Carrots',
                'Broccoli',
                'Spinach',
                'Tomatoes',
                'Lettuce',
                'Potatoes',
                'Onions',
                'Bell Peppers',
                'Celery',
                'Cabbage',
                'Cucumbers',
                'Zucchini',
            ],
        }
        
        created_count = 0
        for category_key, foods in foods_data.items():
            category = categories[category_key]
            for food_name in foods:
                food, created = Food.objects.get_or_create(
                    name=food_name,
                    category=category,
                    defaults={'description': f'{food_name} - {category.get_name_display()}'}
                )
                if created:
                    created_count += 1
                    self.stdout.write(self.style.SUCCESS(f'Created food: {food_name}'))
        
        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully created {created_count} food items'))
