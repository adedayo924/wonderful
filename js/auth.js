let currentUser = null;
let userProfile = null;

async function initAuth() {
  await waitForSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    currentUser = session.user;
    await loadUserProfile(session.user.id);
    updateAuthUI(true);
  } else {
    updateAuthUI(false);
  }

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      currentUser = session.user;
      await loadUserProfile(session.user.id);
      updateAuthUI(true);
    } else {
      currentUser = null;
      userProfile = null;
      updateAuthUI(false);
    }
  });
}

async function loadUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!error && data) {
    userProfile = data;
  }
}

function updateAuthUI(isLoggedIn) {
  const authLinks = document.getElementById('authLinks');
  const userMenu = document.getElementById('userMenu');
  const userName = document.getElementById('userName');
  const adminLink = document.getElementById('adminLink');
  const adminLinkSidebar = document.getElementById('adminLinkSidebar');

  if (isLoggedIn && currentUser) {
    if (authLinks) authLinks.style.display = 'none';
    if (userMenu) {
      userMenu.style.display = 'block';
      userName.textContent = userProfile?.full_name || currentUser.email?.split('@')[0] || 'User';
      
      if (userProfile?.is_admin) {
        if (adminLink) adminLink.style.display = 'flex';
        if (adminLinkSidebar) adminLinkSidebar.style.display = 'flex';
      }
    }
  } else {
    if (authLinks) authLinks.style.display = 'flex';
    if (userMenu) userMenu.style.display = 'none';
  }
}

async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw error;
  }

  return data;
}

async function register(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (error) {
    throw error;
  }

  return data;
}

async function logout() {
  await supabase.auth.signOut();
}

async function updateProfile(updates) {
  if (!currentUser) return;

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', currentUser.id)
    .select()
    .single();

  if (error) throw error;
  
  userProfile = data;
  return data;
}

async function changePassword(currentPassword, newPassword) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) throw error;
}

document.addEventListener('DOMContentLoaded', () => {
  initAuth();

  const userToggle = document.getElementById('userToggle');
  const dropdownMenu = document.getElementById('dropdownMenu');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminLink = document.getElementById('adminLink');

  if (userToggle && dropdownMenu) {
    userToggle.addEventListener('click', (e) => {
      e.preventDefault();
      dropdownMenu.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!userToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.remove('show');
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await logout();
      window.location.href = '../index.html';
    });
  }

  if (adminLink) {
    adminLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (userProfile?.is_admin) {
        window.location.href = 'pages/admin.html';
      } else {
        alert('Access denied. Admin only.');
      }
    });
  }
});
