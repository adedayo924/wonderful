const EDGE_FUNCTION_URL = 'https://hgjaqurtcqkratbkqrgp.supabase.co/functions/v1/create-payment';

async function initCheckout() {
  await waitForSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    window.location.href = 'pages/login.html?redirect=pages/checkout.html';
    return;
  }

  if (cart.length === 0) {
    window.location.href = 'pages/products.html';
    return;
  }

  const customerEmail = document.getElementById('customerEmail');
  if (customerEmail && session.user.email) {
    customerEmail.value = session.user.email;
  }

  const profile = await getUserProfile(session.user.id);
  if (profile) {
    const nameInput = document.getElementById('customerName');
    const phoneInput = document.getElementById('customerPhone');
    const addressInput = document.getElementById('customerAddress');

    if (nameInput && profile.full_name) nameInput.value = profile.full_name;
    if (phoneInput && profile.phone) phoneInput.value = profile.phone;
    if (addressInput && profile.address) addressInput.value = profile.address;
  }

  renderOrderItems();
  checkPaymentStatus();
}

async function getUserProfile(userId) {
  await waitForSupabase();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}

function renderOrderItems() {
  const container = document.getElementById('orderItems');
  if (!container) return;

  container.innerHTML = cart.map(item => `
    <div class="order-item">
      <span>${item.name} x ${item.quantity}</span>
      <span>₦${formatNumber(item.price * item.quantity)}</span>
    </div>
  `).join('');
}

function checkPaymentStatus() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status');
  const ref = params.get('ref');

  const paymentStatus = document.getElementById('paymentStatus');
  
  if (status === 'success') {
    paymentStatus.className = 'alert alert-success';
    paymentStatus.textContent = 'Payment successful! Thank you for your order.';
    paymentStatus.style.display = 'block';
    localStorage.removeItem('guestCart');
    loadCart();
  } else if (status === 'cancelled') {
    paymentStatus.className = 'alert alert-warning';
    paymentStatus.textContent = 'Payment was cancelled. Please try again.';
    paymentStatus.style.display = 'block';
  } else if (status === 'failed') {
    paymentStatus.className = 'alert alert-error';
    paymentStatus.textContent = 'Payment failed. Please try again.';
    paymentStatus.style.display = 'block';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const checkoutForm = document.getElementById('checkoutForm');
  
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const customerName = document.getElementById('customerName').value;
      const customerPhone = document.getElementById('customerPhone').value;
      const customerAddress = document.getElementById('customerAddress').value;

      if (!customerName || !customerPhone || !customerAddress) {
        alert('Please fill in all required fields');
        return;
      }

      if (cart.length === 0) {
        alert('Your cart is empty');
        return;
      }

      const submitBtn = document.getElementById('payBtn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

      try {
        const items = cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        }));

        const response = await fetch(EDGE_FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            items,
            customerName,
            customerPhone,
            customerAddress
          })
        });

        const result = await response.json();

        if (result.success && result.cashierUrl) {
          window.location.href = result.cashierUrl;
        } else {
          throw new Error(result.error || 'Payment initialization failed');
        }
      } catch (error) {
        console.error('Payment error:', error);
        alert('Failed to initialize payment: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-shopping-bag"></i> Pay ₦' + document.getElementById('payAmount').textContent;
      }
    });
  }
});
