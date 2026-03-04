async function loadProducts(options = {}) {
  await waitForSupabase();
  const { category, sort = 'created_at-desc', limit = 50, featured = false } = options;
  
  let query = supabase
    .from('products')
    .select('*');

  if (category) {
    query = query.eq('category', category);
  }

  if (featured) {
    query = query.eq('is_featured', true);
  }

  const [column, order] = sort.split('-');
  query = query.order(column, { ascending: order === 'asc' });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error loading products:', error.message, error.details);
    return [];
  }

  console.log('Products loaded:', data?.length || 0);
  return data || [];
}

async function loadProduct(id) {
  await waitForSupabase();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error loading product:', error);
    return null;
  }

  return data;
}

async function loadRelatedProducts(productId, category, limit = 4) {
  await waitForSupabase();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('category', category)
    .neq('id', productId)
    .limit(limit);

  if (error) {
    console.error('Error loading related products:', error);
    return [];
  }

  return data || [];
}

async function searchProducts(searchTerm) {
  await waitForSupabase();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
    .limit(20);

  if (error) {
    console.error('Error searching products:', error);
    return [];
  }

  return data || [];
}

function renderProductCard(product) {
  const stockClass = product.stock > 0 ? 'in-stock' : 'out-of-stock';
  const stockText = product.stock > 0 ? `${product.stock} in stock` : 'Out of stock';
  const badge = product.is_featured ? '<span class="product-badge">Featured</span>' : '';

  return `
    <div class="product-card">
      <div class="product-image">
        ${badge}
        <img src="${product.image_url || 'https://placehold.co/400x300?text=No+Image'}" 
             alt="${product.name}"
             loading="lazy">
      </div>
      <div class="product-info">
        <div class="product-category">${product.category}</div>
        <h3 class="product-name">${product.name}</h3>
        <div class="product-price">₦${formatNumber(product.price)}</div>
        <div class="product-stock ${stockClass}">${stockText}</div>
        ${product.stock > 0 ? 
          `<button class="btn btn-primary btn-sm add-to-cart-btn" data-id="${product.id}">
            <i class="fas fa-cart-plus"></i> Add to Cart
          </button>` : 
          `<button class="btn btn-outline btn-sm" disabled>Out of Stock</button>`
        }
      </div>
    </div>
  `;
}

function renderProductGrid(products, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!products || products.length === 0) {
    container.innerHTML = '<div class="loading">No products found</div>';
    return;
  }

  container.innerHTML = products.map(product => renderProductCard(product)).join('');
  attachAddToCartListeners(container);
}

function attachAddToCartListeners(container) {
  container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const productId = e.target.dataset.id;
      await addToCart(productId);
    });
  });
}

function formatNumber(num) {
  return new Intl.NumberFormat('en-NG').format(num);
}
