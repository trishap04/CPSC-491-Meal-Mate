from django.contrib import admin
from .models import UserProfile, FoodCategory, Food, Donation, DonationItem

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'created_at')
    list_filter = ('role', 'created_at')
    search_fields = ('user__username', 'user__email')


@admin.register(FoodCategory)
class FoodCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)


@admin.register(Food)
class FoodAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'created_at')
    list_filter = ('category', 'created_at')
    search_fields = ('name', 'description')


class DonationItemInline(admin.TabularInline):
    model = DonationItem
    extra = 1


@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'email', 'pickup_date', 'status', 'created_at')
    list_filter = ('status', 'pickup_date', 'created_at')
    search_fields = ('first_name', 'last_name', 'email', 'phone')
    inlines = [DonationItemInline]
    readonly_fields = ('created_at',)


@admin.register(DonationItem)
class DonationItemAdmin(admin.ModelAdmin):
    list_display = ('donation', 'food', 'quantity', 'unit')
    list_filter = ('donation__created_at', 'food__category')
    search_fields = ('food__name', 'donation__first_name', 'donation__last_name')

