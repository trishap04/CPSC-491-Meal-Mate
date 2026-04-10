// Configuration
const API_BASE_URL = 'http://localhost:8000/api/users';

// State management
let cart = [];
let selectedCategory = null;
let allFoods = [];
let categoriesData = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  loadCategories();
  loadFoodsForCategory('meat');
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  const foodSearch = document.getElementById('foodSearch');
  const donorForm = document.getElementById('donorForm');
  
  if (foodSearch) {
    foodSearch.addEventListener('input', debounce(searchFoods, 300));
  }
  
  if (donorForm) {
    donorForm.addEventListener('submit', handleFormSubmit);
  }
}

// Load categories from API
async function loadCategories() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/categories/`);
    if (!response.ok) throw new Error('Failed to load categories');
    
    categoriesData = await response.json();
    renderCategoryButtons();
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

// Render category buttons
function renderCategoryButtons() {
  const categoryButtons = document.getElementById('categoryButtons');
  if (!categoryButtons) return;
  
  categoryButtons.innerHTML = '';
  
  const categories = ['meat', 'canned', 'bread', 'veggies'];
  const categoryLabels = {
    'meat': 'Meat',
    'canned': 'Canned Goods',
    'bread': 'Bread',
    'veggies': 'Vegetables'
  };
  
  categories.forEach(category => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn btn-sm ${selectedCategory === category ? 'btn-primary' : 'btn-outline-primary'}`;
    button.textContent = categoryLabels[category];
    button.addEventListener('click', (e) => {
      e.preventDefault();
      selectedCategory = category;
      loadFoodsForCategory(category);
      updateCategoryButtons();
    });
    categoryButtons.appendChild(button);
  });
  
  // Set default category
  if (!selectedCategory) {
    selectedCategory = 'meat';
    updateCategoryButtons();
  }
}

// Update category buttons styling
function updateCategoryButtons() {
  const buttons = document.querySelectorAll('#categoryButtons button');
  buttons.forEach(button => {
    const category = ['meat', 'canned', 'bread', 'veggies'].find(cat => 
      button.textContent.toLowerCase().includes(cat === 'canned' ? 'canned' : cat)
    );
    
    if (category === selectedCategory) {
      button.classList.remove('btn-outline-primary');
      button.classList.add('btn-primary');
    } else {
      button.classList.remove('btn-primary');
      button.classList.add('btn-outline-primary');
    }
  });
  renderCategoryButtons();
}

// Load foods for a specific category
async function loadFoodsForCategory(category) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/foods/?category=${category}`);
    if (!response.ok) throw new Error('Failed to load foods');
    
    allFoods = await response.json();
    renderFoodList(allFoods);
  } catch (error) {
    console.error('Error loading foods:', error);
  }
}

// Search foods
async function searchFoods(event) {
  const searchTerm = event.target.value.trim();
  
  if (searchTerm.length === 0) {
    loadFoodsForCategory(selectedCategory);
    return;
  }
  
  try {
    const queryParam = selectedCategory ? `&category=${selectedCategory}` : '';
    const response = await fetch(`${API_BASE_URL}/api/foods/search/?q=${encodeURIComponent(searchTerm)}${queryParam}`);
    if (!response.ok) throw new Error('Failed to search foods');
    
    const results = await response.json();
    renderFoodList(results);
  } catch (error) {
    console.error('Error searching foods:', error);
  }
}

// Render food list
function renderFoodList(foods) {
  const foodList = document.getElementById('foodList');
  if (!foodList) return;
  
  if (foods.length === 0) {
    foodList.innerHTML = '<li class="list-group-item text-muted text-center">No foods found</li>';
    return;
  }
  
  foodList.innerHTML = foods.map(food => `
    <li class="list-group-item d-flex justify-content-between align-items-start">
      <div style="flex: 1;">
        <h6 class="my-0">${escapeHtml(food.name)}</h6>
        <small class="text-body-secondary">${escapeHtml(food.category_name)}</small>
      </div>
      <button 
        class="btn btn-sm btn-success ms-2"
        onclick="addToCart(${food.id}, '${escapeHtml(food.name)}')">
        Add
      </button>
    </li>
  `).join('');
}

// Add item to cart
function addToCart(foodId, foodName) {
  const existingItem = cart.find(item => item.food_id === foodId);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      food_id: foodId,
      name: foodName,
      quantity: 1,
      unit: 'items'
    });
  }
  
  updateCartUI();
}

// Remove item from cart
function removeFromCart(foodId) {
  cart = cart.filter(item => item.food_id !== foodId);
  updateCartUI();
}

// Update quantity
function updateQuantity(foodId, quantity) {
  const item = cart.find(item => item.food_id === foodId);
  if (item) {
    item.quantity = Math.max(1, parseInt(quantity) || 1);
  }
  updateCartUI();
}

// Update cart UI
function updateCartUI() {
  const cartItems = document.getElementById('cartItems');
  const cartCount = document.getElementById('cartCount');
  
  if (!cartItems) return;
  
  cartCount.textContent = cart.length;
  
  if (cart.length === 0) {
    cartItems.innerHTML = '<li class="list-group-item text-muted text-center py-3">No items in cart</li>';
    return;
  }
  
  cartItems.innerHTML = cart.map(item => `
    <li class="list-group-item d-flex justify-content-between align-items-center">
      <div style="flex: 1;">
        <h6 class="my-0">${escapeHtml(item.name)}</h6>
        <small class="text-body-secondary">
          <input 
            type="number" 
            min="1" 
            value="${item.quantity}" 
            style="width: 50px;"
            onchange="updateQuantity(${item.food_id}, this.value)"
            class="form-control form-control-sm"
          />
        </small>
      </div>
      <button 
        class="btn btn-sm btn-danger"
        onclick="removeFromCart(${item.food_id})">
        Remove
      </button>
    </li>
  `).join('');
}

// Handle form submission
function handleFormSubmit(event) {
  event.preventDefault();
  
  const form = document.getElementById('donorForm');
  const doorPref = document.querySelector('input[name="doorPreference"]:checked');
  
  if (!doorPref) {
    document.getElementById('doorPreferenceError').style.display = 'block';
    return;
  }
  
  document.getElementById('doorPreferenceError').style.display = 'none';
  
  if (!form.checkValidity() || !doorPref) {
    form.classList.add('was-validated');
    return;
  }
  
  if (cart.length === 0) {
    alert('Please add at least one item to your donation');
    return;
  }
  
  const donationData = {
    first_name: document.getElementById('firstName').value.trim(),
    last_name: document.getElementById('lastName').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    pickup_date: document.getElementById('pickupDate').value,
    pickup_time: document.getElementById('pickupTime').value,
    door_preference: doorPref.value,
    items: cart
  };
  
  // Save to session storage
  sessionStorage.setItem('donationData', JSON.stringify(donationData));
  
  // Send to API
  submitDonation(donationData);
}

// Submit donation to API
async function submitDonation(donationData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/donations/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(donationData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create donation');
    }
    
    const result = await response.json();
    console.log('Donation created:', result);
    alert('Thank you for your donation! Your donation has been recorded.');
    
    // Optionally redirect to confirmation page
    // window.location.href = 'donation-confirmation.html?id=' + result.id;
  } catch (error) {
    console.error('Error submitting donation:', error);
    alert('Error submitting donation: ' + error.message);
  }
}

// Utility functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Bootstrap form validation
(() => {
  'use strict'
  
  const forms = document.querySelectorAll('.needs-validation')
  
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }
      
      form.classList.add('was-validated')
    }, false)
  })
})()

