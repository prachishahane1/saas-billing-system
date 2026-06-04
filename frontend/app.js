/* ==========================================
   ApexFlow Billing Client JS Engine
   ========================================== */

// Global state
const state = {
    user: null,
    plans: [],
    invoices: [],
    payments: [],
    subscriptions: [],
    revenueChart: null,
    distributionChart: null
};

// API Base URL (point to backend server running locally)
const API_URL = 'http://localhost:8080';

// DOM Elements
const landingSection = document.getElementById('landing-section');
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const btnLogout = document.getElementById('btn-logout');
const goSignup = document.getElementById('go-to-signup');
const goLogin = document.getElementById('go-to-login');
const authAlert = document.getElementById('auth-alert');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const navButtons = document.querySelectorAll('.nav-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

// Page Load Event Listener
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkAuthSession();
    loadPublicPricing();
    configureGoogleLoginUI();
});

// Event Listeners
function setupEventListeners() {
    // Auth Toggles
    goSignup.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        authTitle.innerText = "Create Account";
        authSubtitle.innerText = "Register your organization to start billing";
        clearAuthAlert();
    });

    goLogin.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        authTitle.innerText = "Welcome Back";
        authSubtitle.innerText = "Sign in to manage your billing and subscription";
        clearAuthAlert();
    });

    // Form submits
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    btnLogout.addEventListener('click', logout);

    // Sidebar navigation
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-target');
            switchTab(targetTab);
        });
    });

    // Plan CRUD form
    document.getElementById('plan-crud-form').addEventListener('submit', handlePlanCrudSubmit);
}

// Session Check
function checkAuthSession() {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');

    if (token && userJson) {
        state.user = JSON.parse(userJson);
        showDashboard();
    } else {
        showLandingPage();
    }
}

// Show sections
function showLandingPage() {
    landingSection.classList.remove('hidden');
    authSection.classList.add('hidden');
    dashboardSection.classList.add('hidden');
}

function showAuthPage(isSignup = false) {
    landingSection.classList.add('hidden');
    authSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    clearAuthAlert();

    if (isSignup) {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        authTitle.innerText = "Create Account";
        authSubtitle.innerText = "Register your organization to start billing";
    } else {
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        authTitle.innerText = "Welcome Back";
        authSubtitle.innerText = "Sign in to manage your billing and subscription";
    }
}

function showDashboard() {
    landingSection.classList.add('hidden');
    authSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');

    // Display user profile info in navbar
    document.getElementById('avatar-circle').innerText = state.user.name.charAt(0).toUpperCase();
    document.getElementById('nav-user-name').innerText = state.user.name;
    document.getElementById('nav-user-role').innerText = state.user.role.replace('_', ' ');

    // Handle role restrictions on navigation
    const adminLinks = document.querySelectorAll('.admin-only');
    const orgLinks = document.querySelectorAll('.org-only');

    if (state.user.role === 'SUPER_ADMIN') {
        adminLinks.forEach(el => el.classList.remove('hidden'));
        orgLinks.forEach(el => el.classList.add('hidden'));
    } else if (state.user.role === 'ORGANIZATION_ADMIN') {
        adminLinks.forEach(el => el.classList.add('hidden'));
        orgLinks.forEach(el => el.classList.remove('hidden'));
    } else {
        adminLinks.forEach(el => el.classList.add('hidden'));
        orgLinks.forEach(el => el.classList.add('hidden'));
    }

    switchTab('tab-overview');
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    state.user = null;
    showLandingPage();
    showToast('Logged out successfully', 'success');
}

// Fetch helper with JWT header
async function apiFetch(endpoint, options = {}) {
    showLoader(true);
    const token = localStorage.getItem('token');
    const defaultHeaders = {
        'Content-Type': 'application/json'
    };

    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        showLoader(false);

        if (response.status === 401) {
            logout();
            throw new Error('Session expired. Please log in again.');
        }

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'Network request failed');
        }

        if (response.status === 244 || response.status === 204) {
            return null;
        }

        return await response.json();
    } catch (err) {
        showLoader(false);
        throw err;
    }
}

// API: Handle Login
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({
            userId: data.userId,
            name: data.name,
            email: data.email,
            role: data.role,
            orgId: data.organizationId,
            orgName: data.orgName
        }));

        state.user = JSON.parse(localStorage.getItem('user'));
        showToast(`Welcome back, ${state.user.name}!`, 'success');
        showDashboard();
    } catch (err) {
        showAuthAlert(err.message, 'danger');
    }
}

// API: Handle Google Identity Callback Response
async function handleGoogleLoginResponse(response) {
    if (!response.credential) {
        showAuthAlert('Google Sign-In failed to return credentials.', 'danger');
        return;
    }

    try {
        const data = await apiFetch('/auth/google-login', {
            method: 'POST',
            body: JSON.stringify({ idToken: response.credential })
        });

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({
            userId: data.userId,
            name: data.name,
            email: data.email,
            role: data.role,
            orgId: data.organizationId,
            orgName: data.orgName
        }));

        state.user = JSON.parse(localStorage.getItem('user'));
        showToast(`Welcome, ${state.user.name}! (Signed in via Google)`, 'success');
        showDashboard();
    } catch (err) {
        showAuthAlert(err.message, 'danger');
    }
}

// API: Simulate Google Login (Sandbox fallback for developer demos)
async function simulateGoogleLogin() {
    try {
        const data = await apiFetch('/auth/google-login', {
            method: 'POST',
            body: JSON.stringify({ idToken: 'SIMULATED_GOOGLE_TOKEN' })
        });

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({
            userId: data.userId,
            name: data.name,
            email: data.email,
            role: data.role,
            orgId: data.organizationId,
            orgName: data.orgName
        }));

        state.user = JSON.parse(localStorage.getItem('user'));
        showToast(`Welcome, ${state.user.name}! (Simulated Google User)`, 'success');
        showDashboard();
    } catch (err) {
        showAuthAlert(err.message, 'danger');
    }
}

// Configures the Google Sign-in buttons dynamically based on whether a real Client ID is set
function configureGoogleLoginUI() {
    const onLoadEl = document.getElementById('g_id_onload');
    if (!onLoadEl) return;
    
    const clientId = onLoadEl.getAttribute('data-client_id');
    const isPlaceholder = !clientId || clientId.includes('YOUR_GOOGLE_CLIENT_ID');
    
    const gSigninWidget = document.querySelector('.g_id_signin');
    const simulateBtn = document.querySelector('button[onclick="simulateGoogleLogin()"]');
    
    if (isPlaceholder) {
        // Hide the official widget to prevent 401 invalid_client error from Google
        if (gSigninWidget) gSigninWidget.style.display = 'none';
        
        // Transform the simulation button into a premium primary blue Google login button
        if (simulateBtn) {
            simulateBtn.innerHTML = '<i class="fa-brands fa-google"></i> Sign In with Google';
            simulateBtn.className = 'btn btn-primary btn-block';
            simulateBtn.style.backgroundColor = '#4285f4';
            simulateBtn.style.borderColor = '#4285f4';
            simulateBtn.style.color = '#ffffff';
            simulateBtn.style.fontSize = '0.9rem';
            simulateBtn.style.padding = '0.625rem 1rem';
        }
    } else {
        // If a real client ID is configured, show the official widget and keep simulator as secondary
        if (gSigninWidget) gSigninWidget.style.display = 'flex';
        if (simulateBtn) {
            simulateBtn.innerHTML = '<i class="fa-brands fa-google" style="color: #ea4335;"></i> Simulate Google Login';
            simulateBtn.className = 'btn btn-secondary btn-block btn-sm';
            simulateBtn.style.backgroundColor = 'rgba(255,255,255,0.02)';
            simulateBtn.style.borderColor = 'var(--border-color)';
            simulateBtn.style.color = 'var(--text-primary)';
        }
    }
}


// API: Handle Signup
async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const orgName = document.getElementById('signup-org').value;
    const password = document.getElementById('signup-password').value;

    try {
        await apiFetch('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ name, email, orgName, password, role: 'ORGANIZATION_ADMIN' })
        });

        showToast('Registration successful! Logging you in...', 'success');

        // Auto Login
        const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({
            userId: data.userId,
            name: data.name,
            email: data.email,
            role: data.role,
            orgId: data.organizationId,
            orgName: data.orgName
        }));

        state.user = JSON.parse(localStorage.getItem('user'));
        showDashboard();
    } catch (err) {
        showAuthAlert(err.message, 'danger');
    }
}

// Public Page: Load pricing plans
async function loadPublicPricing() {
    try {
        const res = await fetch(`${API_URL}/plans`);
        if (!res.ok) return;
        const plans = await res.json();
        
        const grid = document.getElementById('pricing-public-grid');
        grid.innerHTML = '';
        
        plans.forEach(plan => {
            const card = document.createElement('div');
            card.className = 'feature-card text-center';
            card.style.border = '1px solid var(--border-color)';
            
            const featuresList = plan.features ? plan.features.split(',') : ['Unlimited support', 'Secure API access'];
            let featuresLi = featuresList.map(f => `<li><i class="fa-solid fa-check color-emerald"></i> ${f.trim()}</li>`).join('');

            card.innerHTML = `
                <h3>${plan.planName}</h3>
                <p class="text-secondary">${plan.planType} Package</p>
                <div class="margin-top-md">
                    <strong style="font-size: 2.25rem; font-family: var(--font-display);">$${plan.price.toFixed(2)}</strong>
                    <span class="text-secondary">/ ${plan.duration}</span>
                </div>
                <ul class="plan-features margin-top-md" style="list-style: none; display: flex; flex-direction: column; gap: 0.5rem; text-align: left; padding-left: 1rem;">
                    ${featuresLi}
                </ul>
                <button class="btn btn-primary btn-block margin-top-lg" onclick="showAuthPage(true)">
                    Select plan
                </button>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error('Error loading public plans', err);
    }
}

// Router & Tab switching
function switchTab(tabId) {
    tabPanes.forEach(pane => {
        if (pane.id === tabId) {
            pane.classList.remove('hidden');
        } else {
            pane.classList.add('hidden');
        }
    });

    navButtons.forEach(btn => {
        if (btn.getAttribute('data-target') === tabId) {
            btn.classList.add('active');
            document.getElementById('current-tab-title').innerText = btn.innerText.trim();
        } else {
            btn.classList.remove('active');
        }
    });

    // Router triggers
    if (tabId === 'tab-overview') {
        loadOverviewData();
    } else if (tabId === 'tab-subscriptions') {
        loadSubscriptionPage();
    } else if (tabId === 'tab-payments') {
        loadPaymentsData();
    } else if (tabId === 'tab-invoices') {
        loadInvoicesData();
    } else if (tabId === 'tab-plans') {
        loadPlansData();
    } else if (tabId === 'tab-org-users') {
        loadOrgUsers();
    } else if (tabId === 'tab-organizations') {
        loadOrganizations();
    } else if (tabId === 'tab-users') {
        loadAllUsers();
    } else if (tabId === 'tab-profile') {
        loadProfileData();
    }
}

// Tab: Overview Loaders
async function loadOverviewData() {
    try {
        const data = await apiFetch('/admin/dashboard/metrics');
        
        // Update metric values
        document.getElementById('metric-users').innerText = data.totalUsers;
        document.getElementById('metric-active-subs').innerText = data.activeSubscriptions;
        document.getElementById('metric-revenue').innerText = `$${data.monthlyRevenue.toFixed(2)}`;
        document.getElementById('metric-failed-payments').innerText = data.failedPayments;

        // Render Recent Transactions
        const tbody = document.getElementById('overview-payments-body');
        tbody.innerHTML = '';
        if (data.recentTransactions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center">No recent transactions</td></tr>`;
        } else {
            data.recentTransactions.forEach(p => {
                const tr = document.createElement('tr');
                const formattedDate = new Date(p.paymentDate).toLocaleDateString();
                
                let badgeClass = 'badge-info';
                if (p.status === 'SUCCESS') badgeClass = 'badge-success';
                if (p.status === 'FAILED') badgeClass = 'badge-danger';
                if (p.status === 'PENDING') badgeClass = 'badge-accent';

                tr.innerHTML = `
                    <td>#${p.paymentId}</td>
                    <td>${formattedDate}</td>
                    <td><span class="badge badge-info">${p.paymentGateway}</span></td>
                    <td>$${p.amount.toFixed(2)}</td>
                    <td><span class="badge ${badgeClass}">${p.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Render charts
        renderCharts(data.revenueByMonth, data.activeSubscriptions, data.expiredSubscriptions);
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

function renderCharts(revenueByMonth, activeCount, expiredCount) {
    // 1. Line Chart: Revenue by month
    const ctxRevenue = document.getElementById('revenueChart').getContext('2d');
    if (state.revenueChart) {
        state.revenueChart.destroy();
    }
    
    const months = Object.keys(revenueByMonth);
    const revenues = Object.values(revenueByMonth);

    state.revenueChart = new Chart(ctxRevenue, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Monthly Income ($)',
                data: revenues,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af' } },
                x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
            },
            plugins: { legend: { display: false } }
        }
    });

    // 2. Doughnut Chart: Distribution
    const ctxDist = document.getElementById('distributionChart').getContext('2d');
    if (state.distributionChart) {
        state.distributionChart.destroy();
    }

    state.distributionChart = new Chart(ctxDist, {
        type: 'doughnut',
        data: {
            labels: ['Active / Trial', 'Cancelled / Expired'],
            datasets: [{
                data: [activeCount, expiredCount],
                backgroundColor: ['#10b981', '#f43f5e'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#9ca3af', boxWidth: 12 } }
            }
        }
    });
}

// Tab: Subscriptions Loaders
async function loadSubscriptionPage() {
    try {
        const subList = await apiFetch(`/subscriptions/user/${state.user.userId}`);
        state.subscriptions = subList;

        const subContainer = document.getElementById('subscriptions-list-container');
        subContainer.innerHTML = '';

        if (subList.length === 0) {
            subContainer.innerHTML = `
                <div class="text-center padding-lg">
                    <i class="fa-solid fa-folder-open empty-icon"></i>
                    <p class="text-secondary">No active subscription packages mapped.</p>
                </div>
            `;
        } else {
            subList.forEach(sub => {
                const isTrial = sub.status === 'TRIAL';
                const div = document.createElement('div');
                div.className = 'sub-active-display-box';

                let badgeColor = 'badge-success';
                if (sub.status === 'TRIAL') badgeColor = 'badge-accent';
                if (sub.status === 'CANCELLED') badgeColor = 'badge-danger';
                if (sub.status === 'PENDING') badgeColor = 'badge-info';

                div.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h4 style="font-size: 1.125rem;">${sub.plan.planName} (${sub.plan.planType})</h4>
                            <p class="text-secondary" style="font-size: 0.8125rem;">Billing cycle: ${sub.billingCycle} | Auto-Renew: ${sub.autoRenew ? 'On' : 'Off'}</p>
                        </div>
                        <span class="badge ${badgeColor}">${sub.status}</span>
                    </div>
                    <div class="grid grid-3-cols" style="background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 0.375rem; font-size: 0.8125rem;">
                        <div>
                            <span class="text-secondary">Price:</span>
                            <strong style="display: block;">$${sub.plan.price.toFixed(2)}</strong>
                        </div>
                        <div>
                            <span class="text-secondary">Start Date:</span>
                            <strong style="display: block;">${sub.startDate}</strong>
                        </div>
                        <div>
                            <span class="text-secondary">Renewal/Expiry:</span>
                            <strong style="display: block;">${sub.endDate || 'Pending Payment'}</strong>
                        </div>
                    </div>
                    ${sub.status === 'ACTIVE' || sub.status === 'TRIAL' ? `
                        <div class="text-right">
                            <button class="btn btn-danger btn-sm" onclick="cancelSubscription(${sub.subscriptionId})">
                                <i class="fa-solid fa-circle-xmark"></i> Cancel Subscription
                            </button>
                        </div>
                    ` : ''}
                `;
                subContainer.innerHTML = '';
                subContainer.appendChild(div);
            });
        }

        // Load pricing plans available for purchase
        const plans = await apiFetch('/plans');
        state.plans = plans;

        const purchaseGrid = document.getElementById('plans-purchase-grid');
        purchaseGrid.innerHTML = '';

        plans.forEach(plan => {
            const hasActiveThisPlan = subList.find(s => s.plan.planId === plan.planId && (s.status === 'ACTIVE' || s.status === 'TRIAL'));
            const btnText = hasActiveThisPlan ? 'Active Plan' : 'Subscribe Now';
            const btnClass = hasActiveThisPlan ? 'btn-secondary' : 'btn-primary';
            const disabledAttr = hasActiveThisPlan ? 'disabled' : '';

            const card = document.createElement('div');
            card.className = 'sub-plan-purchase-card';
            card.innerHTML = `
                <div>
                    <strong>${plan.planName} (${plan.planType})</strong>
                    <span style="display: block; font-size: 0.75rem; color: var(--text-secondary);">${plan.features || 'Standard access'}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <strong>$${plan.price.toFixed(2)} / ${plan.duration}</strong>
                    <button class="btn ${btnClass} btn-sm" ${disabledAttr} onclick="openCheckout(${plan.planId})">${btnText}</button>
                </div>
            `;
            purchaseGrid.appendChild(card);
        });
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// Cancel subscription handler
async function cancelSubscription(subId) {
    if (!confirm('Are you sure you want to cancel your active subscription?')) return;
    try {
        await apiFetch(`/subscriptions/${subId}/cancel`, { method: 'POST' });
        showToast('Subscription cancelled successfully!', 'success');
        loadSubscriptionPage();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// Checkout Form simulation
let checkoutPayment = null;
let checkoutPlanId = null;
let checkoutGateway = null;
let checkoutCurrency = null;
let checkoutBillingCycle = null;
let checkoutAutoRenew = null;

function openCheckout(planId) {
    const plan = state.plans.find(p => p.planId === planId);
    if (!plan) return;

    checkoutPlanId = plan.planId;
    document.getElementById('checkout-plan-name').innerText = `${plan.planName} (${plan.planType})`;
    document.getElementById('checkout-plan-price').innerText = `$${plan.price.toFixed(2)}`;
    
    // Hide autorenew / billing options if it is Free plan
    if (plan.price === 0) {
        document.getElementById('checkout-form').innerHTML = `
            <input type="hidden" id="checkout-plan-id" value="${plan.planId}">
            <div class="simulation-alert" style="background-color: rgba(16, 185, 129, 0.1); color: #a7f3d0; border: 1px solid rgba(16, 185, 129, 0.2); padding: 0.75rem 1rem; font-size: 0.8125rem; border-radius: 0.375rem; margin-bottom: 1.25rem;">
                This is a Free pricing plan. Click the button below to sign up for a 14-day Free Trial instantly!
            </div>
            <button type="button" class="btn btn-success btn-block" onclick="processFreeTrial()">
                Activate Free Trial <i class="fa-solid fa-circle-play"></i>
            </button>
        `;
    } else {
        renderCheckoutStep1(plan);
    }

    document.getElementById('checkout-modal').classList.remove('hidden');
}

function renderCheckoutStep1(plan) {
    const form = document.getElementById('checkout-form');
    form.innerHTML = `
        <input type="hidden" id="checkout-plan-id" value="${plan.planId}">
        
        <div class="form-group">
            <label>Choose Payment Provider</label>
            <div class="payment-method-selector">
                <label class="method-option">
                    <input type="radio" name="paymentGateway" value="STRIPE" checked>
                    <span class="method-box">
                        <i class="fa-brands fa-stripe" style="font-size: 1.5rem;"></i> Stripe
                    </span>
                </label>
                <label class="method-option">
                    <input type="radio" name="paymentGateway" value="PAYPAL">
                    <span class="method-box">
                        <i class="fa-brands fa-paypal" style="font-size: 1.25rem;"></i> PayPal
                    </span>
                </label>
                <label class="method-option">
                    <input type="radio" name="paymentGateway" value="RAZORPAY">
                    <span class="method-box">
                        <i class="fa-solid fa-wallet"></i> Razorpay
                    </span>
                </label>
                <label class="method-option">
                    <input type="radio" name="paymentGateway" value="PHONEPE">
                    <span class="method-box">
                        <i class="fa-solid fa-mobile-screen-button"></i> PhonePe
                    </span>
                </label>
            </div>
        </div>

        <div class="grid grid-2-cols no-gap">
            <div class="form-group margin-right-sm">
                <label for="checkout-currency">Currency</label>
                <select id="checkout-currency">
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                </select>
            </div>
            <div class="form-group">
                <label for="checkout-billing-cycle">Billing Cycle</label>
                <select id="checkout-billing-cycle">
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                </select>
            </div>
        </div>

        <div class="form-group">
            <label class="custom-checkbox">
                <input type="checkbox" id="checkout-autorenew" checked>
                <span>Enable subscription auto-renewal</span>
            </label>
        </div>

        <button type="button" class="btn btn-primary btn-block margin-top-md" onclick="proceedToPaymentStep2()">
            Proceed to Payment <i class="fa-solid fa-credit-card"></i>
        </button>
    `;
}

function proceedToPaymentStep2() {
    checkoutGateway = document.querySelector('input[name="paymentGateway"]:checked').value;
    checkoutCurrency = document.getElementById('checkout-currency').value;
    checkoutBillingCycle = document.getElementById('checkout-billing-cycle').value;
    checkoutAutoRenew = document.getElementById('checkout-autorenew').checked;

    const plan = state.plans.find(p => p.planId === checkoutPlanId);
    if (!plan) return;

    const form = document.getElementById('checkout-form');
    let gatewayFormHtml = '';

    if (checkoutGateway === 'STRIPE') {
        gatewayFormHtml = `
            <div class="mock-gateway-card" style="background: rgba(255, 255, 255, 0.02); padding: 1.25rem; border-radius: 0.5rem; border: 1px solid var(--border-color);">
                <h4 style="margin-bottom: 1rem; color: #635bff; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fa-brands fa-stripe" style="font-size: 1.5rem;"></i> Stripe Checkout Simulator
                </h4>
                <div class="form-group">
                    <label>Cardholder Name</label>
                    <input type="text" value="John Doe" class="form-control" style="background: rgba(11, 15, 25, 0.8); border: 1px solid var(--border-color); color: white;" required>
                </div>
                <div class="form-group">
                    <label>Card Number</label>
                    <input type="text" value="4242 •••• •••• 4242" class="form-control" style="background: rgba(11, 15, 25, 0.8); border: 1px solid var(--border-color); color: white;" required>
                </div>
                <div class="grid grid-2-cols no-gap">
                    <div class="form-group margin-right-sm">
                        <label>Expiration</label>
                        <input type="text" value="12/28" class="form-control" style="background: rgba(11, 15, 25, 0.8); border: 1px solid var(--border-color); color: white;" required>
                    </div>
                    <div class="form-group">
                        <label>CVC</label>
                        <input type="password" value="123" class="form-control" style="background: rgba(11, 15, 25, 0.8); border: 1px solid var(--border-color); color: white;" required>
                    </div>
                </div>
                <div class="grid grid-2-cols checkout-buttons margin-top-md" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <button type="button" class="btn btn-success" onclick="startProcessing(true)">
                        Pay $${plan.price.toFixed(2)}
                    </button>
                    <button type="button" class="btn btn-danger" onclick="startProcessing(false)">
                        Decline Charge
                    </button>
                </div>
            </div>
        `;
    } else if (checkoutGateway === 'PAYPAL') {
        gatewayFormHtml = `
            <div class="mock-gateway-card" style="background: rgba(255, 255, 255, 0.02); padding: 1.25rem; border-radius: 0.5rem; border: 1px solid var(--border-color);">
                <h4 style="margin-bottom: 1rem; color: #0079c1; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fa-brands fa-paypal" style="font-size: 1.25rem;"></i> PayPal Sandbox Checkout
                </h4>
                <div class="form-group">
                    <label>PayPal Email Address</label>
                    <input type="email" value="customer@paypal-sandbox.com" class="form-control" style="background: rgba(11, 15, 25, 0.8); border: 1px solid var(--border-color); color: white;" required>
                </div>
                <div class="form-group">
                    <label>Sandbox Password</label>
                    <input type="password" value="••••••••" class="form-control" style="background: rgba(11, 15, 25, 0.8); border: 1px solid var(--border-color); color: white;" required>
                </div>
                <div class="grid grid-2-cols checkout-buttons margin-top-md" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <button type="button" class="btn btn-success" onclick="startProcessing(true)">
                        Log In & Pay
                    </button>
                    <button type="button" class="btn btn-danger" onclick="startProcessing(false)">
                        Cancel Login
                    </button>
                </div>
            </div>
        `;
    } else if (checkoutGateway === 'RAZORPAY') {
        gatewayFormHtml = `
            <div class="mock-gateway-card" style="background: rgba(255, 255, 255, 0.02); padding: 1.25rem; border-radius: 0.5rem; border: 1px solid var(--border-color);">
                <h4 style="margin-bottom: 1rem; color: #3399cc; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fa-solid fa-wallet" style="font-size: 1.15rem;"></i> Razorpay Gateway Simulator
                </h4>
                <div class="form-group">
                    <label>Enter UPI ID / VPA</label>
                    <input type="text" value="9876543210@upi" class="form-control" style="background: rgba(11, 15, 25, 0.8); border: 1px solid var(--border-color); color: white;" required>
                </div>
                <div class="grid grid-2-cols checkout-buttons margin-top-md" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <button type="button" class="btn btn-success" onclick="startProcessing(true)">
                        Request UPI Pay
                    </button>
                    <button type="button" class="btn btn-danger" onclick="startProcessing(false)">
                        Decline Request
                    </button>
                </div>
            </div>
        `;
    } else if (checkoutGateway === 'PHONEPE') {
        gatewayFormHtml = `
            <div class="mock-gateway-card" style="background: rgba(255, 255, 255, 0.02); padding: 1.25rem; border-radius: 0.5rem; border: 1px solid var(--border-color); text-align: center;">
                <h4 style="margin-bottom: 0.5rem; color: #673ab7; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    <i class="fa-solid fa-mobile-screen-button" style="font-size: 1.25rem;"></i> PhonePe Merchant Pay
                </h4>
                <p class="text-secondary" style="font-size: 0.75rem; margin-bottom: 1rem;">Scan QR code with your PhonePe app to authorize payment</p>
                <div style="margin: 0.75rem auto; width: 120px; height: 120px; background-color: white; padding: 0.5rem; border-radius: 0.375rem; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-md);">
                    <svg width="100" height="100" viewBox="0 0 100 100">
                        <rect x="0" y="0" width="22" height="22" fill="#673ab7"/>
                        <rect x="4" y="4" width="14" height="14" fill="white"/>
                        <rect x="78" y="0" width="22" height="22" fill="#673ab7"/>
                        <rect x="82" y="4" width="14" height="14" fill="white"/>
                        <rect x="0" y="78" width="22" height="22" fill="#673ab7"/>
                        <rect x="4" y="82" width="14" height="14" fill="white"/>
                        <rect x="32" y="8" width="10" height="15" fill="#333"/>
                        <rect x="52" y="4" width="14" height="10" fill="#333"/>
                        <rect x="28" y="32" width="18" height="18" fill="#333"/>
                        <rect x="58" y="32" width="14" height="10" fill="#673ab7"/>
                        <rect x="8" y="38" width="14" height="14" fill="#333"/>
                        <rect x="38" y="62" width="18" height="14" fill="#673ab7"/>
                        <rect x="62" y="62" width="10" height="22" fill="#333"/>
                        <rect x="78" y="42" width="14" height="14" fill="#333"/>
                    </svg>
                </div>
                <div class="form-group text-left" style="margin-top: 1rem;">
                    <label>Registered Phone Number</label>
                    <input type="text" value="9876543210" class="form-control" style="background: rgba(11, 15, 25, 0.8); border: 1px solid var(--border-color); color: white; text-align: center;" required>
                </div>
                <div class="grid grid-2-cols checkout-buttons margin-top-md" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <button type="button" class="btn btn-primary" onclick="payWithPhonePeReal()">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Real preprod Pay
                    </button>
                    <button type="button" class="btn btn-success" onclick="startProcessing(true)">
                        Simulate Instant Pay
                    </button>
                </div>
            </div>
        `;
    }

    form.innerHTML = `
        ${gatewayFormHtml}
        <button type="button" class="btn btn-secondary btn-block margin-top-md" onclick="resetCheckoutToStart()">
            <i class="fa-solid fa-arrow-left"></i> Change Billing & Provider
        </button>
    `;
}

function resetCheckoutToStart() {
    const plan = state.plans.find(p => p.planId === checkoutPlanId);
    if (plan) {
        renderCheckoutStep1(plan);
    }
}

async function payWithPhonePeReal() {
    const form = document.getElementById('checkout-form');
    
    // Show connecting status
    form.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem;">
            <div class="spinner" style="margin: 0 auto 1.5rem auto; width: 50px; height: 50px; border-width: 4px; border: 3px solid rgba(255, 255, 255, 0.1); border-top: 3px solid var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <h4 style="margin-bottom: 0.5rem;">Connecting to PhonePe Secure Gateway...</h4>
            <p class="text-secondary" style="font-size: 0.8125rem;">Generating payment token...</p>
        </div>
    `;

    try {
        const payload = {
            userId: state.user.userId,
            planId: checkoutPlanId,
            paymentGateway: "PHONEPE",
            currency: checkoutCurrency,
            billingCycle: checkoutBillingCycle,
            autoRenew: checkoutAutoRenew,
            isTrial: false
        };

        // 1. Initiate subscription & get paymentId
        checkoutPayment = await apiFetch('/subscriptions/subscribe', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const paymentId = checkoutPayment.paymentId;

        // 2. Trigger PhonePe API redirection handler
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/phonepe/pay?paymentId=${paymentId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            const errMsg = await res.text();
            throw new Error(errMsg || "Connection to PhonePe API sandbox failed");
        }

        const data = await res.json();
        
        if (data.redirectUrl) {
            showToast("Redirecting to PhonePe merchant pay window...", "success");
            setTimeout(() => {
                window.location.href = data.redirectUrl;
            }, 1000);
        } else {
            throw new Error("PhonePe sandbox did not yield redirection URL");
        }

    } catch (err) {
        form.innerHTML = `
            <div style="text-align: center; padding: 2rem 1rem;">
                <div style="margin: 0 auto 1.5rem auto; width: 64px; height: 64px; border-radius: 50%; background-color: rgba(244, 63, 94, 0.1); border: 2px solid var(--danger-color); display: flex; align-items: center; justify-content: center; color: var(--danger-color); font-size: 2rem;">
                    <i class="fa-solid fa-circle-exclamation"></i>
                </div>
                <h3 class="color-rose" style="margin-bottom: 0.5rem;">PhonePe Connection Error</h3>
                <p class="text-secondary" style="font-size: 0.875rem; margin-bottom: 1.5rem;">${err.message}</p>
                <button type="button" class="btn btn-secondary btn-block" onclick="resetCheckoutToStart()">
                    <i class="fa-solid fa-rotate-left"></i> Try Again
                </button>
            </div>
        `;
    }
}

async function startProcessing(simulateSuccess) {
    const form = document.getElementById('checkout-form');
    
    let providerName = 'Gateway';
    if (checkoutGateway === 'STRIPE') providerName = 'Stripe Secure';
    if (checkoutGateway === 'PAYPAL') providerName = 'PayPal Sandbox';
    if (checkoutGateway === 'RAZORPAY') providerName = 'Razorpay UPI';
    if (checkoutGateway === 'PHONEPE') providerName = 'PhonePe Merchant';

    form.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem;">
            <div class="spinner" style="margin: 0 auto 1.5rem auto; width: 50px; height: 50px; border-width: 4px; border: 3px solid rgba(255, 255, 255, 0.1); border-top: 3px solid var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <h4 style="margin-bottom: 0.5rem;">Authenticating with ${providerName}...</h4>
            <p class="text-secondary" style="font-size: 0.8125rem;">Please do not refresh this page or close the browser.</p>
        </div>
    `;

    try {
        const payload = {
            userId: state.user.userId,
            planId: checkoutPlanId,
            paymentGateway: checkoutGateway,
            currency: checkoutCurrency,
            billingCycle: checkoutBillingCycle,
            autoRenew: checkoutAutoRenew,
            isTrial: false
        };

        checkoutPayment = await apiFetch('/subscriptions/subscribe', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const paymentId = checkoutPayment.paymentId;
        const totalAmount = checkoutPayment.amount;

        if (simulateSuccess) {
            await apiFetch(`/payments/${paymentId}/complete`, { method: 'POST' });
        } else {
            await apiFetch(`/payments/${paymentId}/fail?reason=Insufficient credit authorization`, { method: 'POST' });
        }

        setTimeout(() => {
            if (simulateSuccess) {
                renderCheckoutResult(true, totalAmount, checkoutGateway);
            } else {
                renderCheckoutResult(false);
            }
        }, 2000);

    } catch (err) {
        setTimeout(() => {
            form.innerHTML = `
                <div style="text-align: center; padding: 2rem 1rem;">
                    <div style="margin: 0 auto 1.5rem auto; width: 64px; height: 64px; border-radius: 50%; background-color: rgba(244, 63, 94, 0.1); border: 2px solid var(--danger-color); display: flex; align-items: center; justify-content: center; color: var(--danger-color); font-size: 2rem;">
                        <i class="fa-solid fa-circle-exclamation"></i>
                    </div>
                    <h3 class="color-rose" style="margin-bottom: 0.5rem;">Gateway Error</h3>
                    <p class="text-secondary" style="font-size: 0.875rem; margin-bottom: 1.5rem;">${err.message}</p>
                    <button type="button" class="btn btn-secondary btn-block" onclick="resetCheckoutToStart()">
                        <i class="fa-solid fa-rotate-left"></i> Try Again
                    </button>
                </div>
            `;
        }, 1500);
    }
}

function renderCheckoutResult(isSuccess, amount, gateway) {
    const form = document.getElementById('checkout-form');
    if (isSuccess) {
        form.innerHTML = `
            <div style="text-align: center; padding: 2.5rem 1rem 1.5rem 1rem;">
                <div class="pulse" style="margin: 0 auto 1.5rem auto; width: 68px; height: 68px; border-radius: 50%; background-color: rgba(16, 185, 129, 0.15); border: 2px solid var(--success-color); display: flex; align-items: center; justify-content: center; color: var(--success-color); font-size: 2.25rem;">
                    <i class="fa-solid fa-circle-check"></i>
                </div>
                <h3 class="color-emerald" style="margin-bottom: 0.5rem; font-family: var(--font-display);">Payment Confirmed!</h3>
                <p class="text-secondary" style="font-size: 0.875rem; margin-bottom: 1.5rem;">Your transaction has been processed successfully.</p>
                
                <div style="background: rgba(0, 0, 0, 0.25); padding: 1.25rem; border-radius: 0.5rem; text-align: left; font-size: 0.8125rem; border: 1px solid var(--border-color); margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem;">
                    <div style="display: flex; justify-content: space-between;">
                        <span class="text-secondary">Amount Charged:</span>
                        <strong class="color-emerald" style="font-size: 0.95rem;">$${amount.toFixed(2)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span class="text-secondary">Processor:</span>
                        <span class="badge badge-info" style="font-size: 0.6875rem; padding: 0.15rem 0.5rem;">${gateway}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span class="text-secondary">Reference Code:</span>
                        <span style="font-family: monospace; color: var(--text-secondary);">TXN-${Date.now().toString().slice(-6)}</span>
                    </div>
                </div>

                <button type="button" class="btn btn-success btn-block" onclick="completeCheckoutFlow(true)">
                    Enter Dashboard <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
        `;
    } else {
        form.innerHTML = `
            <div style="text-align: center; padding: 2.5rem 1rem 1.5rem 1rem;">
                <div style="margin: 0 auto 1.5rem auto; width: 68px; height: 68px; border-radius: 50%; background-color: rgba(244, 63, 94, 0.15); border: 2px solid var(--danger-color); display: flex; align-items: center; justify-content: center; color: var(--danger-color); font-size: 2.25rem;">
                    <i class="fa-solid fa-circle-xmark"></i>
                </div>
                <h3 class="color-rose" style="margin-bottom: 0.5rem; font-family: var(--font-display);">Payment Cancelled</h3>
                <p class="text-secondary" style="font-size: 0.875rem; margin-bottom: 2rem;">The transaction was cancelled or declined by authorization limits.</p>
                
                <button type="button" class="btn btn-secondary btn-block" onclick="resetCheckoutToStart()">
                    <i class="fa-solid fa-rotate-left"></i> Choose Another Method
                </button>
            </div>
        `;
    }
}

function completeCheckoutFlow(success) {
    closeCheckoutModal();
    if (success) {
        showToast('Subscription active & dashboard metrics updated!', 'success');
        switchTab('tab-subscriptions');
    }
}

function closeCheckoutModal() {
    document.getElementById('checkout-modal').classList.add('hidden');
}

// Activate Free Trial
async function processFreeTrial() {
    const planId = parseInt(document.getElementById('checkout-plan-id').value);
    try {
        const payload = {
            userId: state.user.userId,
            planId: planId,
            paymentGateway: "STRIPE",
            currency: "USD",
            billingCycle: "monthly",
            autoRenew: true,
            isTrial: true
        };

        await apiFetch('/subscriptions/subscribe', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        showToast('Trial subscription activated successfully!', 'success');
        closeCheckoutModal();
        switchTab('tab-subscriptions');
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// Process Checkout gateway
async function processCheckout(simulateSuccess) {
    const planId = parseInt(document.getElementById('checkout-plan-id').value);
    const gateway = document.querySelector('input[name="paymentGateway"]:checked').value;
    const currency = document.getElementById('checkout-currency').value;
    const billingCycle = document.getElementById('checkout-billing-cycle').value;
    const autoRenew = document.getElementById('checkout-autorenew').checked;

    try {
        const payload = {
            userId: state.user.userId,
            planId: planId,
            paymentGateway: gateway,
            currency: currency,
            billingCycle: billingCycle,
            autoRenew: autoRenew,
            isTrial: false
        };

        // 1. Call API to initiate subscription
        checkoutPayment = await apiFetch('/subscriptions/subscribe', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const paymentId = checkoutPayment.paymentId;

        // 2. Complete or Fail Payment simulation
        if (simulateSuccess) {
            await apiFetch(`/payments/${paymentId}/complete`, { method: 'POST' });
            showToast('Gateway Payment Approved! Subscription active.', 'success');
        } else {
            await apiFetch(`/payments/${paymentId}/fail?reason=Insufficent funds simulated`, { method: 'POST' });
            showToast('Transaction declined by gateway.', 'danger');
        }

        closeCheckoutModal();
        switchTab('tab-subscriptions');
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// Tab: Payments Loader
async function loadPaymentsData() {
    try {
        let payments;
        if (state.user.role === 'SUPER_ADMIN') {
            payments = await apiFetch('/payments');
        } else {
            payments = await apiFetch(`/payments/user/${state.user.userId}`);
        }
        
        state.payments = payments;
        const tbody = document.getElementById('payments-table-body');
        tbody.innerHTML = '';

        if (payments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center">No transaction records found.</td></tr>`;
            return;
        }

        payments.forEach(p => {
            const tr = document.createElement('tr');
            const dateStr = new Date(p.paymentDate).toLocaleDateString();

            let badgeClass = 'badge-info';
            if (p.status === 'SUCCESS') badgeClass = 'badge-success';
            if (p.status === 'FAILED') badgeClass = 'badge-danger';
            if (p.status === 'REFUNDED') badgeClass = 'badge-danger';
            if (p.status === 'PENDING') badgeClass = 'badge-accent';

            // Show refund button if success and is SUPER_ADMIN or ORGANIZATION_ADMIN
            const canRefund = p.status === 'SUCCESS' && (state.user.role === 'SUPER_ADMIN' || state.user.role === 'ORGANIZATION_ADMIN');
            const refundBtn = canRefund ? `
                <button class="btn btn-danger btn-sm" onclick="refundPayment(${p.paymentId})">
                    <i class="fa-solid fa-rotate-left"></i> Refund
                </button>
            ` : '-';

            tr.innerHTML = `
                <td>#${p.paymentId}</td>
                <td>${dateStr}</td>
                <td><strong>${p.currency}</strong></td>
                <td>$${p.amount.toFixed(2)}</td>
                <td><span class="badge badge-info">${p.paymentGateway}</span></td>
                <td><span class="badge ${badgeClass}">${p.status}</span></td>
                <td style="font-family: monospace; font-size: 0.75rem;">${p.transactionId || '-'}</td>
                <td>${refundBtn}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function refundPayment(paymentId) {
    if (!confirm('Are you sure you want to process a refund for this transaction?')) return;
    try {
        await apiFetch(`/payments/${paymentId}/refund`, { method: 'POST' });
        showToast('Refund processed successfully!', 'success');
        loadPaymentsData();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// Tab: Invoices Loader
async function loadInvoicesData() {
    try {
        let invoices;
        if (state.user.role === 'SUPER_ADMIN') {
            invoices = await apiFetch('/invoices');
        } else {
            invoices = await apiFetch(`/invoices/user/${state.user.userId}`);
        }

        state.invoices = invoices;
        const tbody = document.getElementById('invoices-table-body');
        tbody.innerHTML = '';

        if (invoices.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center">No invoice statements generated yet.</td></tr>`;
            return;
        }

        invoices.forEach(inv => {
            const tr = document.createElement('tr');
            const dateStr = new Date(inv.generatedDate).toLocaleDateString();

            let badgeClass = 'badge-success';
            if (inv.invoiceStatus === 'VOID') badgeClass = 'badge-danger';
            if (inv.invoiceStatus === 'UNPAID') badgeClass = 'badge-accent';

            tr.innerHTML = `
                <td><strong>${inv.invoiceNumber}</strong></td>
                <td>${dateStr}</td>
                <td>#${inv.subscription.subscriptionId}</td>
                <td>$${inv.amount.toFixed(2)}</td>
                <td><span class="badge ${badgeClass}">${inv.invoiceStatus}</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="viewReceipt(${inv.invoiceId})">
                        <i class="fa-solid fa-file-pdf"></i> View PDF
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// Receipt Viewer
function viewReceipt(invoiceId) {
    const inv = state.invoices.find(i => i.invoiceId === invoiceId);
    if (!inv) return;

    const printArea = document.getElementById('invoice-print-area');
    const invoiceDate = new Date(inv.generatedDate).toLocaleDateString();

    printArea.innerHTML = `
        <div class="invoice-bill">
            <div class="invoice-bill-header">
                <div class="invoice-logo">
                    <i class="fa-solid fa-bolt"></i> ApexFlow
                </div>
                <div class="invoice-title-block">
                    <h1>Receipt Statement</h1>
                    <p style="text-align: right; font-size: 0.875rem; color: #6b7280;">
                        No: <strong>${inv.invoiceNumber}</strong>
                    </p>
                </div>
            </div>
            
            <div class="invoice-bill-meta">
                <div class="meta-col">
                    <p style="color: #6b7280; font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Customer Account</p>
                    <p><strong>${inv.user.name}</strong></p>
                    <p>Contact Email: ${inv.user.email}</p>
                    <p>Company: ${inv.user.organization ? inv.user.organization.orgName : 'Independent user'}</p>
                </div>
                <div class="meta-col" style="text-align: right;">
                    <p style="color: #6b7280; font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Transaction details</p>
                    <p>Issued Date: ${invoiceDate}</p>
                    <p>Subscription ID: #${inv.subscription.subscriptionId}</p>
                    <p>Gateway: ${inv.payment.paymentGateway}</p>
                    <p>Status: <span style="font-weight:700; color:#10b981;">${inv.invoiceStatus}</span></p>
                </div>
            </div>
            
            <table class="invoice-details-table">
                <thead>
                    <tr>
                        <th>Billing Package Details</th>
                        <th>Status</th>
                        <th style="text-align: right;">Amount Due</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <strong>${inv.subscription.plan.planName} (${inv.subscription.plan.planType})</strong><br>
                            <span style="font-size: 0.75rem; color: #6b7280;">
                                Features: ${inv.subscription.plan.features || 'Full API permissions'}
                            </span>
                        </td>
                        <td>
                            <span class="badge badge-success">${inv.invoiceStatus}</span>
                        </td>
                        <td style="text-align: right; font-weight: 600;">
                            $${inv.amount.toFixed(2)}
                        </td>
                    </tr>
                    <tr class="invoice-total-row">
                        <td colspan="2" style="text-align: right; padding-top: 2rem;">Grand Total Paid:</td>
                        <td style="text-align: right; padding-top: 2rem; color: #4f46e5;">
                            $${inv.amount.toFixed(2)}
                        </td>
                    </tr>
                </tbody>
            </table>
            
            <div style="text-align: center; font-size: 0.75rem; color: #9ca3af; margin-top: 3rem; border-top: 1px solid #e5e7eb; padding-top: 1.5rem;">
                Thank you for billing with ApexFlow. For any support reach out to billing@apexflow.com
            </div>
        </div>
    `;

    document.getElementById('invoice-modal').classList.remove('hidden');
}

function closeInvoiceModal() {
    document.getElementById('invoice-modal').classList.add('hidden');
}

function printInvoice() {
    window.print();
}

// Tab: Plan Manager (CRUD)
async function loadPlansData() {
    try {
        const plans = await apiFetch('/plans');
        state.plans = plans;

        const tbody = document.getElementById('plans-table-body');
        tbody.innerHTML = '';

        plans.forEach(p => {
            const tr = document.createElement('tr');
            
            // Allow update/delete if SUPER_ADMIN or ORGANIZATION_ADMIN
            const hasRights = state.user.role === 'SUPER_ADMIN';
            const actionButtons = hasRights ? `
                <button class="btn btn-secondary btn-sm" onclick="editPlan(${p.planId})">
                    <i class="fa-solid fa-pen"></i> Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="deletePlan(${p.planId})">
                    <i class="fa-solid fa-trash"></i> Delete
                </button>
            ` : '-';

            tr.innerHTML = `
                <td>#${p.planId}</td>
                <td><strong>${p.planName}</strong></td>
                <td><span class="badge badge-info">${p.planType}</span></td>
                <td>$${p.price.toFixed(2)}</td>
                <td><span class="badge badge-accent">${p.duration}</span></td>
                <td>${actionButtons}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// Plan Form CRUD submit
async function handlePlanCrudSubmit(e) {
    e.preventDefault();

    const planIdVal = document.getElementById('plan-crud-id').value;
    const name = document.getElementById('plan-crud-name').value;
    const type = document.getElementById('plan-crud-type').value;
    const price = parseFloat(document.getElementById('plan-crud-price').value);
    const duration = document.getElementById('plan-crud-duration').value;
    const features = document.getElementById('plan-crud-features').value;

    const payload = { planName: name, planType: type, price, duration, features };

    try {
        if (planIdVal) {
            // Update mapping
            await apiFetch(`/plans/${planIdVal}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            showToast('Pricing Plan updated successfully!', 'success');
        } else {
            // Create mapping
            await apiFetch('/plans', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            showToast('Pricing Plan published successfully!', 'success');
        }

        resetPlanForm();
        loadPlansData();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

function editPlan(planId) {
    const plan = state.plans.find(p => p.planId === planId);
    if (!plan) return;

    document.getElementById('plan-crud-id').value = plan.planId;
    document.getElementById('plan-crud-name').value = plan.planName;
    document.getElementById('plan-crud-type').value = plan.planType;
    document.getElementById('plan-crud-price').value = plan.price;
    document.getElementById('plan-crud-duration').value = plan.duration;
    document.getElementById('plan-crud-features').value = plan.features || '';

    document.getElementById('plan-form-title').innerText = "Edit Plan Settings";
    document.getElementById('btn-plan-submit').innerText = "Update Plan Settings";
    document.getElementById('btn-plan-cancel').classList.remove('hidden');
}

async function deletePlan(planId) {
    if (!confirm('Are you sure you want to delete this pricing package?')) return;
    try {
        await apiFetch(`/plans/${planId}`, { method: 'DELETE' });
        showToast('Pricing Plan deleted.', 'success');
        loadPlansData();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

function resetPlanForm() {
    document.getElementById('plan-crud-id').value = '';
    document.getElementById('plan-crud-form').reset();
    document.getElementById('plan-form-title').innerText = "Create New Plan";
    document.getElementById('btn-plan-submit').innerText = "Publish Plan";
    document.getElementById('btn-plan-cancel').classList.add('hidden');
}

// Tab: Team Members (Org Users)
async function loadOrgUsers() {
    if (!state.user.orgId) {
        document.getElementById('org-users-table-body').innerHTML = `<tr><td colspan="5" class="text-center">No associated Organization. Register with an organization to invite team members.</td></tr>`;
        return;
    }

    try {
        const users = await apiFetch('/users');
        const orgUsers = users.filter(u => u.organization && u.organization.organizationId === state.user.orgId);
        
        const tbody = document.getElementById('org-users-table-body');
        tbody.innerHTML = '';

        if (orgUsers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center">No team members found</td></tr>`;
            return;
        }

        orgUsers.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${u.userId}</td>
                <td><strong>${u.name}</strong></td>
                <td>${u.email}</td>
                <td><span class="badge badge-info">${u.role.replace('_', ' ')}</span></td>
                <td><span class="badge badge-success">${u.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// Tab: Organizations (Super Admin View)
async function loadOrganizations() {
    try {
        const orgs = await apiFetch('/organizations');
        const tbody = document.getElementById('orgs-table-body');
        tbody.innerHTML = '';

        if (orgs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center">No organizations registered</td></tr>`;
            return;
        }

        orgs.forEach(o => {
            const tr = document.createElement('tr');
            const dateStr = new Date(o.createdAt).toLocaleDateString();
            tr.innerHTML = `
                <td>#${o.organizationId}</td>
                <td><strong>${o.orgName}</strong></td>
                <td>${dateStr}</td>
                <td><span class="badge badge-success">${o.status}</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="editOrg(${o.organizationId})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteOrg(${o.organizationId})">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function deleteOrg(orgId) {
    if (!confirm('Are you sure you want to delete this organization tenant? All associated users will lose their mapped company.')) return;
    try {
        await apiFetch(`/organizations/${orgId}`, { method: 'DELETE' });
        showToast('Organization deleted successfully!', 'success');
        loadOrganizations();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// Tab: Users (Super Admin View)
async function loadAllUsers() {
    try {
        const users = await apiFetch('/users');
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';

        if (users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center">No registered accounts</td></tr>`;
            return;
        }

        users.forEach(u => {
            const tr = document.createElement('tr');
            const orgVal = u.organization ? u.organization.orgName : '-';
            tr.innerHTML = `
                <td>#${u.userId}</td>
                <td><strong>${u.name}</strong></td>
                <td>${u.email}</td>
                <td><span class="badge badge-info">${u.role}</span></td>
                <td>${orgVal}</td>
                <td><span class="badge badge-success">${u.status}</span></td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.userId})">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this account?')) return;
    try {
        await apiFetch(`/users/${userId}`, { method: 'DELETE' });
        showToast('User account deleted.', 'success');
        loadAllUsers();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// Tab: Profile Data Loader
function loadProfileData() {
    if (!state.user) return;
    document.getElementById('prof-name').innerText = state.user.name;
    document.getElementById('prof-email').innerText = state.user.email;
    document.getElementById('prof-role').innerText = state.user.role.replace('_', ' ');
    document.getElementById('prof-org').innerText = state.user.orgName || 'N/A';
}

// UI notification helper
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation';
    toast.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove toast after 3.5s
    setTimeout(() => {
        toast.style.animation = 'slide-in 0.3s ease reverse';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

// Show/Hide Spinner Loaders
function showLoader(visible) {
    const loader = document.getElementById('loading-overlay');
    if (visible) {
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

// Auth Alert Helper
function showAuthAlert(msg, type) {
    authAlert.innerText = msg;
    authAlert.className = `alert alert-${type}`;
    authAlert.classList.remove('hidden');
}

function clearAuthAlert() {
    authAlert.innerText = '';
    authAlert.classList.add('hidden');
}
