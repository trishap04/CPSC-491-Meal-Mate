"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView

urlpatterns = [
    path('', TemplateView.as_view(template_name='album/index.html'), name='home'),
    path('index.html', TemplateView.as_view(template_name='album/index.html'), name='home_html'),
    path('checkout.html', TemplateView.as_view(template_name='album/checkout.html'), name='checkout_html'),
    path('checkout/', TemplateView.as_view(template_name='album/checkout.html'), name='checkout'),
    path('donation-confirmation.html', TemplateView.as_view(template_name='album/donation-confirmation.html'), name='donation_confirmation_html'),
    path('donation-confirmation/', TemplateView.as_view(template_name='album/donation-confirmation.html'), name='donation_confirmation'),
    path('donation-directory.html', TemplateView.as_view(template_name='album/donation-directory.html'), name='donation_directory_html'),
    path('donation-directory/', TemplateView.as_view(template_name='album/donation-directory.html'), name='donation_directory'),
    path('food-pickup.html', TemplateView.as_view(template_name='album/food-pickup.html'), name='food_pickup_html'),
    path('food-pickup/', TemplateView.as_view(template_name='album/food-pickup.html'), name='food_pickup'),
    path('badges/', TemplateView.as_view(template_name='badges/index.html'), name='badges'),
    path('badges/index.html', TemplateView.as_view(template_name='badges/index.html'), name='badges_html'),
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
