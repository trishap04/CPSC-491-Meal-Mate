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
    path('login.html', TemplateView.as_view(template_name='album/login.html'), name='login_html'),
    path('login/', TemplateView.as_view(template_name='album/login.html'), name='login'),
    path('register.html', TemplateView.as_view(template_name='album/register.html'), name='register_html'),
    path('register/', TemplateView.as_view(template_name='album/register.html'), name='register'),
    path('forgot-password.html', TemplateView.as_view(template_name='album/forgot-password.html'), name='forgot_password_html'),
    path('forgot-password/', TemplateView.as_view(template_name='album/forgot-password.html'), name='forgot_password'),
    path('reset-password.html', TemplateView.as_view(template_name='album/reset-password.html'), name='reset_password_html'),
    path('reset-password/', TemplateView.as_view(template_name='album/reset-password.html'), name='reset_password'),
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
    path('settings.html', TemplateView.as_view(template_name='album/settings.html'), name='settings_html'),
    path('settings/', TemplateView.as_view(template_name='album/settings.html'), name='settings'),
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
