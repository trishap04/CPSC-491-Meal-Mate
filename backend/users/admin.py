from django.contrib import admin
from django.utils.html import format_html
from .models import UserProfile, FoodCategory, Food, Donation, DonationItem
from django.utils import timezone

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
    fields = ('food', 'quantity', 'unit')
    
    def get_readonly_fields(self, request, obj=None):
        if obj:
            return ['food']
        return []


@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
    list_display = ('donation_id', 'donor_name', 'email', 'pickup_date', 'item_count', 'status', 'created_at')
    list_filter = ('status', 'pickup_date', 'created_at', 'door_preference')
    search_fields = ('first_name', 'last_name', 'email', 'phone')
    inlines = [DonationItemInline]
    readonly_fields = ('created_at', 'donation_summary')
    
    fieldsets = (
        ('Donation ID', {
            'fields': ('donation_summary',)
        }),
        ('Donor Information', {
            'fields': ('first_name', 'last_name', 'email', 'phone')
        }),
        ('Pickup Details', {
            'fields': ('address', 'pickup_date', 'pickup_time', 'door_preference', 'notes')
        }),
        ('Status', {
            'fields': ('status', 'created_at')
        }),
    )
    
    def donation_id(self, obj):
        return f'#{str(obj.id).zfill(5)}'
    donation_id.short_description = 'Donation ID'
    
    def donor_name(self, obj):
        return f'{obj.first_name} {obj.last_name}'
    donor_name.short_description = 'Donor Name'
    
    def item_count(self, obj):
        count = obj.items.count()
        return format_html(
            '<span style="background-color: #e7f3ff; color: #004085; padding: 4px 8px; border-radius: 12px;">{} item{}</span>',
            count,
            's' if count != 1 else ''
        )
    item_count.short_description = 'Items'

    def save_model(self, request, obj, form, change):
        if obj.donor_confirmed and obj.receiver_confirmed:
            obj.status = 'completed'
            obj.completed_at = timezone.now()
        elif obj.donor_confirmed or obj.receiver_confirmed:
            obj.status = 'in_progress'
        else:
            obj.status = 'pending'

        super().save_model(request, obj, form, change)
    
    def donation_summary(self, obj):
        items = obj.items.all()
        if not items:
            return 'No items recorded yet'
        
        items_html = '<ul style="list-style: none; padding: 0; margin: 0;">'
        for item in items:
            items_html += f'<li style="padding: 6px 0; border-bottom: 1px solid #e0e0e0;"><strong>{item.food.name}</strong> - {item.quantity} {item.unit}</li>'
        items_html += '</ul>'
        
        return format_html(
            '<div style="background-color: #f8f9fa; padding: 10px; border-radius: 4px;">'
            '<strong>Donation ID:</strong> #{}<br />'
            '<strong>Total Items:</strong> {}<br />'
            '<strong>Donated Items:</strong>{}'
            '</div>',
            str(obj.id).zfill(5),
            items.count(),
            items_html
        )
    donation_summary.short_description = 'Donation Summary'


@admin.register(DonationItem)
class DonationItemAdmin(admin.ModelAdmin):
    list_display = ('donation_info', 'food', 'quantity_display', 'created_date')
    list_filter = ('donation__created_at', 'food__category')
    search_fields = ('food__name', 'donation__first_name', 'donation__last_name')
    readonly_fields = ('donation', 'food')
    
    def donation_info(self, obj):
        return format_html(
            '#{} - {} {}',
            str(obj.donation.id).zfill(5),
            obj.donation.first_name,
            obj.donation.last_name
        )
    donation_info.short_description = 'Donation'
    
    def quantity_display(self, obj):
        return format_html(
            '<span style="background-color: #e7f3ff; color: #004085; padding: 4px 8px; border-radius: 12px;"><strong>{}</strong> {}</span>',
            obj.quantity,
            obj.unit
        )
    quantity_display.short_description = 'Quantity'
    
    def created_date(self, obj):
        return obj.donation.created_at.strftime('%Y-%m-%d %H:%M')
    created_date.short_description = 'Date'


