let cart = [];

async function loadCart() {
  await waitForSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    cart = JSON.parse(localStorage.getItem('guestCart') || '[]');
    updateCartUI();
    return;
  }

  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      *,
      products:product_id (*)
    `)
    .eq('user_id', session.user.id);

  if (error) {
    console.error('Error loading cart:', error);
    return;
  }

  cart = (data || []).map(item => ({
    id: item.product_id,
    name: item.products?.name || 'Unknown Product',
    price: item.products?.price || 0,
    image_url: item.products?.image_url,
    quantity: item.quantity,
    cartId: item.id
  }));

  updateCartUI();
}

async function addToCart(productId, quantity = 1) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const product = await loadProduct(productId);
  if (!product) {
    alert('Product not found');
    return;
  }

  if (product.stock < 1) {
    alert('Product is out of stock');
    return;
  }

  if (!session) {
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({
        id: productId,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        quantity
      });
    }
    localStorage.setItem('guestCart', JSON.stringify(cart));
    updateCartUI();
    showToast('Added to cart!');
    return;
  }

  const { data: existing } = await supabase
    .from('cart_items')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('product_id', productId)
    .single();

  if (existing) {
    await supabase
      .from('cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('cart_items')
      .insert({
        user_id: session.user.id,
        product_id: productId,
        quantity
      });
  }

  await loadCart();
  showToast('Added to cart!');
}

async function updateCartItemQuantity(cartItemId, newQuantity) {
  if (newQuantity < 1) {
    await removeFromCart(cartItemId);
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    const index = cart.findIndex(item => item.cartId === cartItemId);
    if (index !== -1) {
      cart[index].quantity = newQuantity;
      localStorage.setItem('guestCart', JSON.stringify(cart));
      updateCartUI();
    }
    return;
  }

  await supabase
    .from('cart_items')
    .update({ quantity: newQuantity })
    .eq('id', cartItemId);

  await loadCart();
}

async function removeFromCart(cartItemId) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    cart = cart.filter(item => item.cartId !== cartItemId);
    localStorage.setItem('guestCart', JSON.stringify(cart));
    updateCartUI();
    return;
  }

  await supabase
    .from('cart_items')
    .delete()
    .eq('id', cartItemId);

  await loadCart();
}

async function clearCart() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    cart = [];
    localStorage.removeItem('guestCart');
    updateCartUI();
    return;
  }

  await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', session.user.id);

  cart = [];
  updateCartUI();
}

function getCartTotal() {
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

function getCartCount() {
  return cart.reduce((count, item) => count + item.quantity, 0);
}

function updateCartUI() {
  const cartCount = document.getElementById('cartCount');
  if (cartCount) {
    cartCount.textContent = getCartCount();
  }

  if (typeof window.updateCartDisplay === 'function') {
    window.updateCartDisplay();
  }
}

function renderCartItems(containerId, showCheckout = true) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (cart.length === 0) {
    if (containerId === 'cartItems') {
      document.getElementById('cartContent').style.display = 'none';
      document.getElementById('emptyCart').style.display = 'block';
    }
    return;
  }

  container.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <img src="${item.image_url || 'https://placehold.co/80x80?text=No+Image'}" 
           alt="${item.name}" class="cart-item-image">
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <div class="cart-item-price">₦${formatNumber(item.price)}</div>
      </div>
      <div class="quantity-controls">
        <button onclick="updateCartItemQuantity('${item.cartId || item.id}', ${item.quantity - 1})">
          <i class="fas fa-minus"></i>
        </button>
        <span>${item.quantity}</span>
        <button onclick="updateCartItemQuantity('${item.cartId || item.id}', ${item.quantity + 1})">
          <i class="fas fa-plus"></i>
        </button>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.cartId || item.id}')">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');

  const subtotal = document.getElementById('subtotal');
  const total = document.getElementById('cartTotal') || document.getElementById('total');
  
  if (subtotal) subtotal.textContent = `₦${formatNumber(getCartTotal())}`;
  if (total) total.textContent = `₦${formatNumber(getCartTotal())}`;

  const payAmount = document.getElementById('payAmount');
  if (payAmount) payAmount.textContent = formatNumber(getCartTotal());
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #28a745;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
