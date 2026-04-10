from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from .serializers import RegisterSerializer, FoodSerializer, FoodCategorySerializer, DonationSerializer
from .models import Food, FoodCategory, Donation, DonationItem
from django.db.models import Q


class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "message": "User registered successfully!",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FoodCategoryView(APIView):
    """API to get all food categories"""
    def get(self, request):
        categories = FoodCategory.objects.all()
        serializer = FoodCategorySerializer(categories, many=True)
        return Response(serializer.data)


class FoodSearchView(APIView):
    """API to search foods by name and optionally filter by category"""
    def get(self, request):
        query = request.query_params.get('q', '').strip()
        category = request.query_params.get('category', '').strip()
        
        foods = Food.objects.all()
        
        # Filter by search query
        if query:
            foods = foods.filter(
                Q(name__icontains=query) | Q(description__icontains=query)
            )
        
        # Filter by category
        if category:
            foods = foods.filter(category__name=category)
        
        serializer = FoodSerializer(foods, many=True)
        return Response(serializer.data)


class FoodListView(APIView):
    """API to get all foods, optionally filtered by category"""
    def get(self, request):
        category = request.query_params.get('category', '').strip()
        
        foods = Food.objects.all()
        if category:
            foods = foods.filter(category__name=category)
        
        serializer = FoodSerializer(foods, many=True)
        return Response(serializer.data)


class DonationCreateView(APIView):
    """API to create a new donation with items"""
    def post(self, request):
        try:
            # Extract donation info
            donation_data = {
                'first_name': request.data.get('first_name'),
                'last_name': request.data.get('last_name'),
                'email': request.data.get('email'),
                'phone': request.data.get('phone'),
                'pickup_date': request.data.get('pickup_date'),
                'pickup_time': request.data.get('pickup_time'),
                'door_preference': request.data.get('door_preference'),
            }
            
            # Create donation
            donation = Donation.objects.create(**donation_data)
            
            # Extract and create donation items
            items_data = request.data.get('items', [])
            for item in items_data:
                food_id = item.get('food_id')
                quantity = item.get('quantity', 1)
                unit = item.get('unit', 'items')
                
                try:
                    food = Food.objects.get(id=food_id)
                    DonationItem.objects.create(
                        donation=donation,
                        food=food,
                        quantity=quantity,
                        unit=unit
                    )
                except Food.DoesNotExist:
                    donation.delete()
                    return Response(
                        {'error': f'Food with id {food_id} does not exist'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            serializer = DonationSerializer(donation)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class DonationDetailView(APIView):
    """API to retrieve donation details"""
    def get(self, request, donation_id):
        try:
            donation = Donation.objects.get(id=donation_id)
            serializer = DonationSerializer(donation)
            return Response(serializer.data)
        except Donation.DoesNotExist:
            return Response(
                {'error': 'Donation not found'},
                status=status.HTTP_404_NOT_FOUND
            )

