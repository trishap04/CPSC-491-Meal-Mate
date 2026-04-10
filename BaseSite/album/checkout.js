// Configuration
const API_BASE_URL = 'http://localhost:8000/api/users';

// Unit options for different categories
const UNIT_OPTIONS = {
  'meat': ['lbs', 'oz', 'pieces', 'items'],
  'canned': ['cans', 'items'],
  'bread': ['loaves', 'packages', 'items'],
  'veggies': ['lbs', 'oz', 'bunches', 'pieces', 'items']
};

const DEFAULT_UNITS = {
  'meat': 'lbs',
  'canned': 'cans',
  'bread': 'loaves',
  'veggies': 'lbs'
};

// State management
let cart = [];
let selectedCategory = null;
let allFoods = [];
let categoriesData = [];
let pendingAddFood = null; // Track which food is being added

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  loadCategories();
  loadFoodsForCategory('meat');
  setupEventListeners();
  createQuantityModal();
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
    
    // Add change listeners to form fields for summary update
    document.getElementById('firstName').addEventListener('change', updateDonationSummary);
    document.getElementById('lastName').addEventListener('change', updateDonationSummary);
    document.getElementById('pickupDate').addEventListener('change', updateDonationSummary);
    document.getElementById('pickupTime').addEventListener('change', updateDonationSummary);
    document.querySelectorAll('input[name="doorPreference"]').forEach(radio => {
      radio.addEventListener('change', updateDonationSummary);
    });
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
        onclick="addToCart(${food.id}, '${escapeHtml(food.name)}', '${food.category}')">
        Add
      </button>
    </li>
  `).join('');
}

// Add item to cart
function addToCart(foodId, foodName, foodCategory = 'items') {
  // Store pending food and show modal
  pendingAddFood = {
    food_id: foodId,
    name: foodName,
    category: foodCategory
  };
  
  // Set unit options based on category
  const unitOptions = UNIT_OPTIONS[foodCategory] || ['items'];
  const defaultUnit = DEFAULT_UNITS[foodCategory] || 'items';
  
  // Populate unit dropdown
  const unitSelect = document.getElementById('quantityModalUnit');
  unitSelect.innerHTML = unitOptions.map(unit => 
    `<option value="${unit}" ${unit === defaultUnit ? 'selected' : ''}>${unit}</option>`
  ).join('');
  
  // Reset quantity to 1
  document.getElementById('quantityModalQuantity').value = 1;
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById('quantityModal'));
  modal.show();
}

// Confirm and add to cart with quantity
function confirmAddToCart() {
  if (!pendingAddFood) return;
  
  const quantity = parseInt(document.getElementById('quantityModalQuantity').value) || 1;
  const unit = document.getElementById('quantityModalUnit').value || 'items';
  
  const existingItem = cart.find(item => item.food_id === pendingAddFood.food_id);
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      food_id: pendingAddFood.food_id,
      name: pendingAddFood.name,
      quantity: quantity,
      unit: unit
    });
  }
  
  // Show success message
  showAddedToCartMessage(pendingAddFood.name, quantity, unit);
  
  updateCartUI();
  
  // Close modal
  const modal = bootstrap.Modal.getInstance(document.getElementById('quantityModal'));
  modal.hide();
  
  pendingAddFood = null;
}

// Remove item from cart
function removeFromCart(foodId) {
  const item = cart.find(item => item.food_id === foodId);
  if (item) {
    const itemName = item.name;
    const itemQuantity = item.quantity;
    const itemUnit = item.unit;
    
    cart = cart.filter(item => item.food_id !== foodId);
    
    // Show removal message
    const toastHtml = `
      <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 11;">
        <div class="toast align-items-center text-bg-warning border-0" role="alert" aria-live="assertive" aria-atomic="true">
          <div class="d-flex">
            <div class="toast-body" style="font-weight: 500;">
              ✓ Removed: ${itemQuantity} ${itemUnit} of ${itemName}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.querySelector('.toast-container .toast');
    const bsToast = new bootstrap.Toast(toastElement, { delay: 2000 });
    
    toastElement.addEventListener('hidden.bs.toast', function() {
      toastElement.parentElement.remove();
    });
    
    bsToast.show();
  }
  
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

// Update unit
function updateUnit(foodId, unit) {
  const item = cart.find(item => item.food_id === foodId);
  if (item) {
    item.unit = unit;
  }
  updateCartUI();
  updateDonationSummary();
}

// Update donation summary display
function updateDonationSummary() {
  const summary = document.getElementById('donationSummary');
  const summaryItems = document.getElementById('summaryItems');
  const summaryDate = document.getElementById('summaryDate');
  const summaryTime = document.getElementById('summaryTime');
  const summaryDonor = document.getElementById('summaryDonor');
  const summaryPreference = document.getElementById('summaryPreference');
  
  // Show summary only if there are items in cart
  if (cart.length > 0) {
    summary.style.display = 'block';
    
    // Update items list
    summaryItems.innerHTML = cart.map(item => `
      <li class="list-group-item bg-light">
        <strong>${escapeHtml(item.name)}</strong><br>
        <small class="text-muted">${item.quantity} ${item.unit}</small>
      </li>
    `).join('');
  } else {
    summary.style.display = 'none';
    return;
  }
  
  // Update pickup details
  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const pickupDate = document.getElementById('pickupDate').value;
  const pickupTime = document.getElementById('pickupTime').value;
  const doorPref = document.querySelector('input[name="doorPreference"]:checked');
  
  // Format date
  if (pickupDate) {
    const date = new Date(pickupDate);
    summaryDate.textContent = date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } else {
    summaryDate.textContent = 'Not selected';
  }
  
  // Set time
  summaryTime.textContent = pickupTime || 'Not selected';
  
  // Set donor name
  const donorName = (firstName && lastName) ? `${firstName} ${lastName}` : 'Not entered';
  summaryDonor.textContent = donorName;
  
  // Set preference
  const prefText = {
    'meet': '👤 Meet at door',
    'leave': '🚪 Leave at door'
  };
  summaryPreference.textContent = doorPref ? prefText[doorPref.value] : 'Not selected';
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
  
  cartItems.innerHTML = cart.map(item => {
    // Get unit options for this category (we'll use common units if category unknown)
    const allUnits = ['items', 'lbs', 'oz', 'cans', 'loaves', 'packages', 'bunches', 'pieces'];
    
    return `
    <li class="list-group-item">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div style="flex: 1;">
          <h6 class="my-0">${escapeHtml(item.name)}</h6>
          <small class="edit-hint">💡 Click to edit quantity or unit, click Remove to delete</small>
        </div>
        <button 
          class="btn btn-sm btn-danger ms-2"
          onclick="removeFromCart(${item.food_id})"
          title="Remove this item from donation">
          Remove
        </button>
      </div>
      <div class="row g-2 align-items-center mt-2">
        <div class="col-auto">
          <label class="form-label mb-0 small" title="Edit the quantity">Quantity:</label>
          <input 
            type="number" 
            min="1" 
            value="${item.quantity}" 
            onchange="updateQuantity(${item.food_id}, this.value)"
            class="form-control form-control-sm"
            style="width: 80px;"
            title="Change the quantity of this item"
          />
        </div>
        <div class="col-auto">
          <label class="form-label mb-0 small" title="Edit the measurement unit">Unit:</label>
          <select 
            class="form-select form-select-sm"
            onchange="updateUnit(${item.food_id}, this.value)"
            style="width: 110px;"
            title="Change the measurement unit (e.g., cans, lbs, loaves)">
            ${allUnits.map(unit => 
              `<option value="${unit}" ${unit === item.unit ? 'selected' : ''}>${unit}</option>`
            ).join('')}
          </select>
        </div>
        <div class="col-auto mt-4">
          <span class="badge bg-info text-dark ms-2" title="Summary of donation amount">${item.quantity} ${item.unit}</span>
        </div>
      </div>
    </li>
  `}).join('');
  
  // Update summary display
  updateDonationSummary();
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
    showErrorToast('Please add at least one item to your donation');
    return;
  }
  
  // Disable submit button and show loading state
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Processing...';
  
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
    
    // Save full donation data to session for confirmation page
    sessionStorage.setItem('lastDonationId', result.id);
    sessionStorage.setItem('lastDonationData', JSON.stringify(result));
    
    // Show success toast
    showSuccessToast(`✓ Donation #${String(result.id).padStart(5, '0')} submitted successfully!`, () => {
      // Redirect to confirmation page after toast
      window.location.href = 'donation-confirmation.html?id=' + result.id;
    });
    
  } catch (error) {
    // Re-enable submit button
    const form = document.getElementById('donorForm');
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = false;
    submitButton.innerHTML = 'Continue';
    
    console.error('Error submitting donation:', error);
    showErrorToast('Error: ' + error.message);
  }
}

// Success Toast Notification
function showSuccessToast(message, callback) {
  const toastHtml = `
    <div class="toast-container position-fixed top-0 start-50 translate-middle-x p-3" style="z-index: 11; margin-top: 20px;">
      <div class="toast align-items-center text-bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body" style="font-weight: 500; font-size: 1.05rem;">
            ${message}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', toastHtml);
  const toastElement = document.querySelector('.toast-container .toast');
  const bsToast = new bootstrap.Toast(toastElement, { delay: 3000 });
  
  toastElement.addEventListener('hidden.bs.toast', function() {
    if (callback) callback();
    toastElement.parentElement.remove();
  });
  
  bsToast.show();
}

// Error Toast Notification
function showErrorToast(message) {
  const toastHtml = `
    <div class="toast-container position-fixed top-0 start-50 translate-middle-x p-3" style="z-index: 11; margin-top: 20px;">
      <div class="toast align-items-center text-bg-danger border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body" style="font-weight: 500; font-size: 1.05rem;">
            ${message}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', toastHtml);
  const toastElement = document.querySelector('.toast-container .toast');
  const bsToast = new bootstrap.Toast(toastElement, { delay: 5000 });
  
  toastElement.addEventListener('hidden.bs.toast', function() {
    toastElement.parentElement.remove();
  });
  
  bsToast.show();
}

// Success Message for cart operations
function showAddedToCartMessage(itemName, quantity, unit) {
  const toastHtml = `
    <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 11;">
      <div class="toast align-items-center text-bg-info border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body" style="font-weight: 500;">
            ✓ Added to donation: ${quantity} ${unit} of ${itemName}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', toastHtml);
  const toastElement = document.querySelector('.toast-container .toast');
  const bsToast = new bootstrap.Toast(toastElement, { delay: 2000 });
  
  toastElement.addEventListener('hidden.bs.toast', function() {
    toastElement.parentElement.remove();
  });
  
  bsToast.show();
}

// Create quantity and unit selection modal
function createQuantityModal() {
  const modalHtml = `
    <div class="modal fade" id="quantityModal" tabindex="-1" aria-labelledby="quantityModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="quantityModalLabel">Add Item to Donation</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label for="quantityModalQuantity" class="form-label">Quantity</label>
              <input 
                type="number" 
                class="form-control" 
                id="quantityModalQuantity" 
                min="1" 
                value="1"
                placeholder="Enter quantity"
              />
            </div>
            <div class="mb-3">
              <label for="quantityModalUnit" class="form-label">Unit of Measurement</label>
              <select id="quantityModalUnit" class="form-select">
                <option value="items">items</option>
              </select>
              <small class="form-text text-muted">Select the appropriate unit for this item (e.g., cans, lbs, loaves)</small>
            </div>
            <div class="alert alert-info" role="alert">
              <small><strong>Example:</strong> If donating 3 cans of vegetables, enter Quantity: 3, Unit: cans</small>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" onclick="confirmAddToCart()">Add to Donation</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHtml);
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

