document.addEventListener('DOMContentLoaded', async () => {
  const { createClient } = window.supabaseJs;
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.supabase = supabase;

  await initAuth();
  await loadCart();
  initMobileMenu();
  
  const path = window.location.pathname;
  
  if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
    loadFeaturedProducts();
  }
  
  if (path.includes('products.html')) {
    initProductsPage();
  }
  
  if (path.includes('cart.html')) {
    renderCartItems('cartItems');
  }
  
  if (path.includes('product-detail.html')) {
    initProductDetailPage();
  }
  
  if (path.includes('login.html')) {
    initLoginPage();
  }
  
  if (path.includes('register.html')) {
    initRegisterPage();
  }
  
  if (path.includes('account.html')) {
    initAccountPage();
  }
  
  if (path.includes('orders.html')) {
    initOrdersPage();
  }
  
  if (path.includes('admin.html')) {
    initAdminPage();
  }
});

function initMobileMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('show');
    });
  }
}

async function loadFeaturedProducts() {
  const products = await loadProducts({ featured: true, limit: 8 });
  renderProductGrid(products, 'featuredProducts');
}

function initProductsPage() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  
  loadProducts({ category }).then(products => {
    const countEl = document.getElementById('productCount');
    if (countEl) countEl.textContent = products.length;
    renderProductGrid(products, 'productsGrid');
  });

  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', async (e) => {
      const products = await loadProducts({ 
        category, 
        sort: e.target.value 
      });
      renderProductGrid(products, 'productsGrid');
    });
  }

  const priceRange = document.getElementById('priceRange');
  const priceValue = document.getElementById('priceValue');
  if (priceRange && priceValue) {
    priceRange.addEventListener('input', (e) => {
      priceValue.textContent = `₦${formatNumber(e.target.value)}`;
    });
  }
}

async function initProductDetailPage() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!productId) {
    window.location.href = 'products.html';
    return;
  }

  const product = await loadProduct(productId);
  
  if (!product) {
    document.getElementById('productDetail').innerHTML = '<div class="loading">Product not found</div>';
    return;
  }

  const breadcrumb = document.getElementById('breadcrumb');
  if (breadcrumb) {
    breadcrumb.querySelector('span').textContent = product.name;
  }

  const container = document.getElementById('productDetail');
  const stockClass = product.stock > 0 ? 'in-stock' : 'out-of-stock';
  const stockText = product.stock > 0 ? `${product.stock} items in stock` : 'Out of stock';

  container.innerHTML = `
    <div class="product-detail-image">
      <img src="${product.image_url || 'https://placehold.co/600x600?text=No+Image'}" alt="${product.name}">
    </div>
    <div class="product-detail-info">
      <div class="product-detail-category">${product.category}</div>
      <h1>${product.name}</h1>
      <div class="product-detail-price">₦${formatNumber(product.price)}</div>
      <p class="product-detail-description">${product.description || 'No description available.'}</p>
      <div class="product-detail-stock ${stockClass}">
        <i class="fas fa-${product.stock > 0 ? 'check' : 'times'}-circle"></i> ${stockText}
      </div>
      ${product.stock > 0 ? `
        <div class="quantity-selector">
          <label>Quantity:</label>
          <div class="quantity-controls">
            <button onclick="decreaseQty()"><i class="fas fa-minus"></i></button>
            <span id="qtyValue">1</span>
            <button onclick="increaseQty()"><i class="fas fa-plus"></i></button>
          </div>
        </div>
        <button class="btn btn-primary" onclick="addToCartFromDetail('${product.id}')">
          <i class="fas fa-cart-plus"></i> Add to Cart
        </button>
      ` : '<button class="btn btn-outline" disabled>Out of Stock</button>'}
    </div>
  `;

  window.productQty = 1;
  window.addToCartFromDetail = async (id) => {
    await addToCart(id, window.productQty);
    alert('Added to cart!');
  };
  window.decreaseQty = () => {
    if (window.productQty > 1) {
      window.productQty--;
      document.getElementById('qtyValue').textContent = window.productQty;
    }
  };
  window.increaseQty = () => {
    if (window.productQty < product.stock) {
      window.productQty++;
      document.getElementById('qtyValue').textContent = window.productQty;
    }
  };

  const relatedProducts = await loadRelatedProducts(product.id, product.category);
  renderProductGrid(relatedProducts, 'relatedProducts');
}

function initLoginPage() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('errorMsg');

    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
      await login(email, password);
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || 'index.html';
      window.location.href = redirect;
    } catch (error) {
      errorMsg.textContent = error.message;
      errorMsg.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });
}

function initRegisterPage() {
  const registerForm = document.getElementById('registerForm');
  if (!registerForm) return;

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const btn = document.getElementById('registerBtn');
    const errorMsg = document.getElementById('errorMsg');

    if (password !== confirmPassword) {
      errorMsg.textContent = 'Passwords do not match';
      errorMsg.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating account...';

    try {
      await register(email, password, fullName);
      alert('Account created successfully! Please check your email to verify your account.');
      window.location.href = 'login.html';
    } catch (error) {
      errorMsg.textContent = error.message;
      errorMsg.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });
}

async function initAccountPage() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html?redirect=account.html';
    return;
  }

  const profile = await getUserProfile(session.user.id);
  
  if (profile) {
    document.getElementById('accountName').textContent = profile.full_name || 'User';
    document.getElementById('accountEmail').textContent = session.user.email;
    
    if (document.getElementById('fullName')) document.getElementById('fullName').value = profile.full_name || '';
    if (document.getElementById('phone')) document.getElementById('phone').value = profile.phone || '';
    if (document.getElementById('address')) document.getElementById('address').value = profile.address || '';
  }

  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const updates = {
        full_name: document.getElementById('fullName').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value
      };

      try {
        await updateProfile(updates);
        const success = document.getElementById('updateSuccess');
        success.textContent = 'Profile updated successfully!';
        success.style.display = 'block';
        setTimeout(() => success.style.display = 'none', 3000);
      } catch (error) {
        alert(error.message);
      }
    });
  }

  const passwordForm = document.getElementById('passwordForm');
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmNewPassword').value;

      if (newPassword !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }

      try {
        await changePassword('', newPassword);
        alert('Password changed successfully!');
        passwordForm.reset();
      } catch (error) {
        alert(error.message);
      }
    });
  }
}

async function initOrdersPage() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html?redirect=orders.html';
    return;
  }

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  const container = document.getElementById('ordersList');
  if (!container) return;

  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-box-open"></i>
        <h2>No orders yet</h2>
        <p>You haven't placed any orders yet.</p>
        <a href="products.html" class="btn btn-primary">Start Shopping</a>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(order => `
    <div class="order-card">
      <div class="order-header">
        <div>
          <span class="order-id">Order #${order.opay_reference || order.id.slice(0, 8)}</span>
          <span class="order-date">${new Date(order.created_at).toLocaleDateString('en-NG')}</span>
        </div>
        <span class="order-status ${order.status}">${order.status}</span>
      </div>
      <div class="order-body">
        <div class="order-item">
          <span>Delivery Address</span>
          <span>${order.customer_address || 'N/A'}</span>
        </div>
      </div>
      <div class="order-footer">
        <span>Total</span>
        <span>₦${formatNumber(order.total_amount)}</span>
      </div>
    </div>
  `).join('');
}

async function initAdminPage() {
  if (!userProfile?.is_admin) {
    window.location.href = '../index.html';
    return;
  }

  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`${tab}Tab`).classList.add('active');

      if (tab === 'products') loadAdminProducts();
      if (tab === 'orders') loadAdminOrders();
    });
  });

  await loadAdminProducts();
  await loadAdminOrders();

  const addProductBtn = document.getElementById('addProductBtn');
  const modal = document.getElementById('productModal');
  const closeModal = document.getElementById('closeModal');
  const cancelProductBtn = document.getElementById('cancelProductBtn');
  const productForm = document.getElementById('productForm');

  addProductBtn?.addEventListener('click', () => {
    document.getElementById('modalTitle').textContent = 'Add Product';
    productForm.reset();
    document.getElementById('productId').value = '';
    modal.classList.add('show');
  });

  closeModal?.addEventListener('click', () => modal.classList.remove('show'));
  cancelProductBtn?.addEventListener('click', () => modal.classList.remove('show'));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('show');
  });

  productForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const productId = document.getElementById('productId').value;
    const productData = {
      name: document.getElementById('productName').value,
      description: document.getElementById('productDescription').value,
      price: parseFloat(document.getElementById('productPrice').value),
      category: document.getElementById('productCategory').value,
      image_url: document.getElementById('productImage').value || 'https://placehold.co/400x300?text=No+Image',
      stock: parseInt(document.getElementById('productStock').value) || 0,
      is_featured: document.getElementById('productFeatured').checked
    };

    try {
      if (productId) {
        await supabase.from('products').update(productData).eq('id', productId);
      } else {
        await supabase.from('products').insert(productData);
      }
      
      modal.classList.remove('show');
      loadAdminProducts();
      alert('Product saved successfully!');
    } catch (error) {
      alert(error.message);
    }
  });
}

async function loadAdminProducts() {
  const products = await loadProducts({ limit: 100 });
  const tbody = document.querySelector('#productsTable tbody');
  
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading">No products found</td></tr>';
    return;
  }

  tbody.innerHTML = products.map(p => `
    <tr>
      <td><img src="${p.image_url || 'https://placehold.co/60x60'}" alt="${p.name}"></td>
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td>₦${formatNumber(p.price)}</td>
      <td>${p.stock}</td>
      <td class="actions">
        <button class="btn btn-sm btn-outline" onclick="editProduct('${p.id}')">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

async function loadAdminOrders() {
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  const tbody = document.querySelector('#ordersTable tbody');
  if (!tbody) return;

  if (!orders || orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading">No orders found</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(o => `
    <tr>
      <td>${o.opay_reference || o.id.slice(0, 8)}</td>
      <td>${o.customer_name || 'N/A'}<br><small>${o.customer_phone || ''}</small></td>
      <td>₦${formatNumber(o.total_amount)}</td>
      <td>
        <select onchange="updateOrderStatus('${o.id}', this.value)" class="status-select">
          <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="paid" ${o.status === 'paid' ? 'selected' : ''}>Paid</option>
          <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Shipped</option>
          <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
        </select>
      </td>
      <td>${new Date(o.created_at).toLocaleDateString()}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteOrder('${o.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

window.editProduct = async (id) => {
  const product = await loadProduct(id);
  if (!product) return;

  document.getElementById('modalTitle').textContent = 'Edit Product';
  document.getElementById('productId').value = product.id;
  document.getElementById('productName').value = product.name;
  document.getElementById('productDescription').value = product.description || '';
  document.getElementById('productPrice').value = product.price;
  document.getElementById('productCategory').value = product.category;
  document.getElementById('productImage').value = product.image_url || '';
  document.getElementById('productStock').value = product.stock;
  document.getElementById('productFeatured').checked = product.is_featured;

  document.getElementById('productModal').classList.add('show');
};

window.deleteProduct = async (id) => {
  if (!confirm('Are you sure you want to delete this product?')) return;
  
  await supabase.from('products').delete().eq('id', id);
  loadAdminProducts();
};

window.updateOrderStatus = async (id, status) => {
  await supabase.from('orders').update({ status }).eq('id', id);
};

window.deleteOrder = async (id) => {
  if (!confirm('Are you sure you want to delete this order?')) return;
  
  await supabase.from('orders').delete().eq('id', id);
  loadAdminOrders();
};

window.updateCartDisplay = function() {
  if (window.location.pathname.includes('cart.html')) {
    renderCartItems('cartItems');
  }
};
