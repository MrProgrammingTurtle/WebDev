// Gragolf - Basic JS for navigation, cart, and search

document.addEventListener('DOMContentLoaded', function() {
    // Cart utilities stored in localStorage
    function getCart() {
        try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
    }
    function setCart(items) {
        localStorage.setItem('cart', JSON.stringify(items));
        const count = items.reduce((sum, it) => sum + (parseInt(it.quantity, 10) || 0), 0);
        localStorage.setItem('cartCount', String(count));
        document.querySelectorAll('#cart-count').forEach(el => el.textContent = `(${count})`);
        const badge = document.querySelector('.mini-cart-count');
        if (badge) badge.textContent = String(count);
    }

    // Known product images mapping and placeholder
    const productImageByName = {
        'Gragas Driver': 'GragasDriver.png',
        'Barrel Iron': 'GragasIron.png',
        'Explosive Putter': 'GragasPutter.png',
        'Barrel Polo Shirt': 'GragasPolo.png',
        'Gragas Cap': 'GragasCap.png',
        'League Socks': 'GragasSocks.png'
    };
    const placeholder40 = 'https://via.placeholder.com/40';
    function imageForProduct(name, providedSrc) {
        return providedSrc || productImageByName[name] || placeholder40;
    }

    // Override addToCart to check inventory
    function addToCart(productId, name, price, quantity = 1, image) {
        let catalogue = getProductCatalogue();
        const prod = catalogue.find(p => p.name === name);
        if (!prod || prod.inventory < quantity) {
            alert('Out of stock!');
            return;
        }
        const cart = getCart();
        const existing = cart.find(i => i.productId === productId);
        const resolvedImage = imageForProduct(name, image);
        if (existing) {
            if (prod.inventory < existing.quantity + quantity) {
                alert('Not enough stock!');
                return;
            }
            existing.quantity += quantity;
            if (!existing.image) existing.image = resolvedImage;
        } else {
            cart.push({ productId, name, price, quantity, image: resolvedImage });
        }
        setCart(cart);
        alert('Added to cart!');
        renderMiniCartPanel();
    }

    // Initialize cart count on load
    setCart(getCart());

    // Build Mini Cart UI next to search bar
    function buildMiniCartUI() {
        const searchBar = document.querySelector('.navbar .search-bar');
        if (!searchBar || document.querySelector('.mini-cart')) return;
        const container = document.createElement('div');
        container.className = 'mini-cart';
        container.innerHTML = `
          <button class="mini-cart-button" id="mini-cart-button" aria-haspopup="true" aria-expanded="false" title="Cart">
            <span aria-hidden="true">🛒</span>
            <span class="mini-cart-count">0</span>
          </button>
          <div class="mini-cart-panel" role="dialog" aria-label="Mini Cart">
            <ul class="mini-cart-items" id="mini-cart-items"></ul>
            <div class="mini-cart-subtotal"><span>Subtotal:</span> <span class="amount">$<span id="mini-cart-subtotal">0.00</span></span></div>
            <div class="mini-cart-actions">
              <a class="btn secondary" href="cart.html">View Cart</a>
              <button class="btn" id="mini-cart-place-order">Place Order</button>
            </div>
          </div>`;
        searchBar.insertAdjacentElement('afterend', container);

        // Toggle behavior
        const btn = container.querySelector('#mini-cart-button');
        const panel = container.querySelector('.mini-cart-panel');
        btn.addEventListener('click', () => {
            const isOpen = container.classList.toggle('open');
            btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            if (isOpen) renderMiniCartPanel();
        });
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                container.classList.remove('open');
                btn.setAttribute('aria-expanded', 'false');
            }
        });

        // Place order from mini cart
        container.querySelector('#mini-cart-place-order').addEventListener('click', () => {
            const username = localStorage.getItem('gragolfUser');
            if (!username) { alert('Please login first.'); return; }
            const cart = getCart();
            if (!cart.length) { alert('Cart is empty.'); return; }
            // Check inventory before placing order
            let catalogue = getProductCatalogue();
            for (const cartItem of cart) {
                const prod = catalogue.find(p => p.name === cartItem.name);
                if (!prod || prod.inventory < cartItem.quantity) {
                    alert(`Not enough stock for ${cartItem.name}. Only ${prod ? prod.inventory : 0} left.`);
                    return;
                }
            }
            // Deduct inventory
            for (const cartItem of cart) {
                const prod = catalogue.find(p => p.name === cartItem.name);
                if (prod) prod.inventory -= cartItem.quantity;
            }
            setProductCatalogue(catalogue);
            const subtotal = cart.reduce((s, it) => s + (it.price * it.quantity), 0);
            const order = {
                date: new Date().toISOString().slice(0, 10),
                items: cart.map(it => ({ name: it.name, quantity: it.quantity, price: it.price })),
                amount: subtotal,
                status: 'Processing'
            };
            const users = JSON.parse(localStorage.getItem('gragolfUsers') || '[]');
            const idx = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
            if (idx === -1) { alert('User not found. Please re-login.'); return; }
            users[idx].history = users[idx].history || [];
            users[idx].history.unshift(order);
            localStorage.setItem('gragolfUsers', JSON.stringify(users));
            setCart([]);
            window.location.href = 'account.html';
        });

        renderMiniCartPanel();
    }

    function renderMiniCartPanel() {
        const itemsEl = document.getElementById('mini-cart-items');
        const subEl = document.getElementById('mini-cart-subtotal');
        if (!itemsEl || !subEl) return;
        const cart = getCart();
        itemsEl.innerHTML = '';
        let subtotal = 0;
        cart.forEach((item, idx) => {
            const li = document.createElement('li');
            li.className = 'mini-cart-item';
            const lineTotal = (item.price || 0) * (item.quantity || 0);
            subtotal += lineTotal;
            const thumb = imageForProduct(item.name, item.image);
            li.innerHTML = `
                <img class="thumb" src="${thumb}" alt="${item.name}">
                <div class="info">
                  <div class="name">${item.name}</div>
                  <div class="meta">$${Number(item.price).toFixed(2)} x ${item.quantity}</div>
                  <div class="controls">
                    <input type="number" min="1" value="${item.quantity}" class="mini-cart-qty" data-idx="${idx}" />
                    <button class="mini-remove" data-idx="${idx}" aria-label="Remove ${item.name}">Remove</button>
                  </div>
                </div>
            `;
            itemsEl.appendChild(li);
        });
        subEl.textContent = subtotal.toFixed(2);
        const badge = document.querySelector('.mini-cart-count');
        if (badge) badge.textContent = String(cart.reduce((s, it) => s + it.quantity, 0));

        // Bind mini-cart quantity changes
        itemsEl.querySelectorAll('.mini-cart-qty').forEach(input => {
            input.addEventListener('change', e => {
                const i = parseInt(e.target.getAttribute('data-idx'), 10);
                const newQty = Math.max(1, parseInt(e.target.value || '1', 10));
                const cart = getCart();
                if (!cart[i]) return;
                cart[i].quantity = newQty;
                setCart(cart);
                renderMiniCartPanel();
                // If cart page is open, update it too
                if (document.getElementById('cart-body')) {
                    renderCartPage();
                }
            });
        });

        // Bind mini-cart remove buttons
        itemsEl.querySelectorAll('.mini-remove').forEach(btn => {
            btn.addEventListener('click', e => {
                const i = parseInt(e.target.getAttribute('data-idx'), 10);
                const cart = getCart();
                cart.splice(i, 1);
                setCart(cart);
                renderMiniCartPanel();
                if (document.getElementById('cart-body')) {
                    renderCartPage();
                }
            });
        });
    }

    buildMiniCartUI();

    // Wire add-to-cart buttons on item pages
    document.querySelectorAll('#add-to-cart').forEach(btn => {
        btn.addEventListener('click', function() {
            const titleEl = document.querySelector('.item-info h1');
            const priceEl = document.querySelector('.item-info .price');
            const imgEl = document.querySelector('.item-detail img');
            if (!titleEl || !priceEl) return;
            const name = titleEl.textContent.trim();
            const price = parseFloat(priceEl.textContent.replace(/[^0-9.]/g, ''));
            const productId = name.toLowerCase().replace(/\s+/g, '-');
            const image = imgEl ? imgEl.getAttribute('src') : undefined;
            addToCart(productId, name, price, 1, image);
        });
    });

    // Bind catalogue add-to-cart buttons
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', () => {
            const name = btn.getAttribute('data-name');
            const price = parseFloat(btn.getAttribute('data-price'));
            const image = btn.getAttribute('data-image');
            const productId = name.toLowerCase().replace(/\s+/g, '-');
            addToCart(productId, name, price, 1, image);
        });
    });

    // Render cart page from localStorage
    function renderCartPage() {
        const body = document.getElementById('cart-body');
        const subEl = document.getElementById('cart-subtotal');
        if (!body || !subEl) return;
        const cart = getCart();
        body.innerHTML = '';
        let subtotal = 0;
        cart.forEach((item, idx) => {
            const total = (item.price || 0) * (item.quantity || 0);
            subtotal += total;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>$${Number(item.price).toFixed(2)}</td>
                <td><input type="number" min="1" value="${item.quantity}" data-idx="${idx}" class="qty-input" /></td>
                <td>$${total.toFixed(2)}</td>
                <td><button class="btn remove-btn" data-idx="${idx}">Remove</button></td>
            `;
            body.appendChild(row);
        });
        subEl.textContent = subtotal.toFixed(2);

        // Bind qty change
        body.querySelectorAll('.qty-input').forEach(input => {
            input.addEventListener('change', e => {
                const idx = parseInt(e.target.getAttribute('data-idx'), 10);
                const cart = getCart();
                cart[idx].quantity = Math.max(1, parseInt(e.target.value || '1', 10));
                setCart(cart);
                renderCartPage();
                renderMiniCartPanel();
            });
        });
        // Bind remove
        body.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const idx = parseInt(e.target.getAttribute('data-idx'), 10);
                const cart = getCart();
                cart.splice(idx, 1);
                setCart(cart);
                renderCartPage();
                renderMiniCartPanel();
        });
    });
    }
    renderCartPage();

    // Search: navigate to catalogue and filter results
    function isCataloguePage() {
        return /catalogue\.html$/i.test(location.pathname) || document.title.includes('Catalogue');
    }
    function applySearch(term) {
        const main = document.querySelector('main');
        const cards = document.querySelectorAll('#clubs .item-card, #apparel .item-card');
        const sections = [document.getElementById('clubs'), document.getElementById('apparel')];
        const normalized = (term || '').trim().toLowerCase();
        let total = 0;
        cards.forEach(card => {
            const name = (card.querySelector('h3')?.textContent || '').toLowerCase();
            const match = !normalized || name.includes(normalized);
            card.style.display = match ? '' : 'none';
            if (match) total++;
        });
        // Hide sections with zero visible cards
        sections.forEach(section => {
            if (!section) return;
            const visible = Array.from(section.querySelectorAll('.item-card')).some(c => c.style.display !== 'none');
            section.style.display = visible ? '' : 'none';
        });
        // Results banner
        let banner = document.getElementById('search-results');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'search-results';
            banner.style.margin = '0.5rem 0 1rem 0';
            banner.style.fontWeight = '600';
            if (main) main.insertBefore(banner, main.firstChild);
        }
        banner.textContent = normalized ? `Results for "${term}": ${total} item${total === 1 ? '' : 's'}` : '';
        if (!normalized) banner.textContent = '';
        // Reflect term in the navbar input if present
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = term || '';
    }

    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    function handleSearchSubmit() {
        const term = (searchInput?.value || '').trim();
        if (!term) {
            if (isCataloguePage()) applySearch('');
            else window.location.href = 'catalogue.html';
            return;
        }
        if (isCataloguePage()) {
            const url = new URL(window.location.href);
            url.searchParams.set('q', term);
            history.replaceState(null, '', url.toString());
            applySearch(term);
        } else {
            window.location.href = 'catalogue.html?q=' + encodeURIComponent(term);
        }
    }
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', handleSearchSubmit);
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearchSubmit();
            }
        });
    }
    // On page load, if on catalogue with ?q, apply filter
    if (isCataloguePage()) {
        const q = new URLSearchParams(window.location.search).get('q') || '';
        if (q) applySearch(q);
    }

    // Submit order (mock) – must be logged in; save to history; clear cart; redirect
    const submitOrder = document.getElementById('submit-order');
    if (submitOrder) {
        submitOrder.addEventListener('click', function() {
            const username = localStorage.getItem('gragolfUser');
            if (!username) { alert('Please login first.'); return; }
            const cart = getCart();
            if (!cart.length) { alert('Cart is empty.'); return; }
            const subtotal = cart.reduce((s, it) => s + (it.price * it.quantity), 0);
            const order = {
                date: new Date().toISOString().slice(0, 10),
                items: cart.map(it => ({ name: it.name, quantity: it.quantity, price: it.price })),
                amount: subtotal,
                status: 'Processing'
            };
            const users = JSON.parse(localStorage.getItem('gragolfUsers') || '[]');
            const idx = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
            if (idx === -1) { alert('User not found. Please re-login.'); return; }
            users[idx].history = users[idx].history || [];
            users[idx].history.unshift(order);
            localStorage.setItem('gragolfUsers', JSON.stringify(users));
            setCart([]);
            renderMiniCartPanel();
            window.location.href = 'account.html';
        });
    }

    // --- LOGIN/REGISTER/ACCOUNT LOGIC ---
    function getUsers() {
        try { return JSON.parse(localStorage.getItem('gragolfUsers') || '[]'); } catch { return []; }
    }
    function setUsers(users) {
        localStorage.setItem('gragolfUsers', JSON.stringify(users));
    }
    function findUser(username) {
        const users = getUsers();
        return users.find(u => u.username.toLowerCase() === String(username).toLowerCase());
    }

    // Helper to find user by email
    function findUserByEmail(email) {
        const users = getUsers();
        return users.find(u => u.email && u.email.toLowerCase() === String(email).toLowerCase());
    }

    const authForm = document.querySelector('.auth-form');

    // Handle login form (require existing account)
    if (authForm && document.title.includes('Login')) {
        authForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const user = findUser(username);
            if (!user) { alert('No account found for that username. Please register first.'); return; }
            if (user.password !== password) { alert('Incorrect password.'); return; }
            localStorage.setItem('gragolfUser', user.username);
            window.location.href = 'account.html';
        });
    }

    // Handle register form (create account if email is free)
    if (authForm && document.title.includes('Register')) {
        authForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirm-password').value;
            if (!username || !email || !password) { alert('Please fill out all fields.'); return; }
            if (password !== confirm) { alert('Passwords do not match.'); return; }
            if (findUserByEmail(email)) { alert('Email is already registered.'); return; }
            const users = getUsers();
            users.push({ username, email, password, history: [] });
            setUsers(users);
            localStorage.setItem('gragolfUser', username);
            window.location.href = 'account.html';
        });
    }

    // Handle account page display and updates
    if (document.title.includes('Account')) {
        const currentUsername = localStorage.getItem('gragolfUser');
        const actionsDiv = document.querySelector('.account-actions');
        const settingsSection = document.getElementById('account-settings');
        const form = document.getElementById('account-form');
        const userObj = currentUsername ? findUser(currentUsername) : null;
        const historyBody = document.getElementById('history-body');

        if (currentUsername && userObj) {
            // Replace actions with logged-in message + logout
            actionsDiv.innerHTML = '';
            const msg = document.createElement('div');
            msg.className = 'logged-in-msg';
            msg.textContent = `You're logged in as ${currentUsername}.`;
            actionsDiv.appendChild(msg);
            const logoutBtn = document.createElement('button');
            logoutBtn.textContent = 'Logout';
            logoutBtn.className = 'btn';
            logoutBtn.addEventListener('click', function() {
                localStorage.removeItem('gragolfUser');
                window.location.reload();
            });
            actionsDiv.appendChild(logoutBtn);

            // Show settings and prefill
            settingsSection.style.display = '';
            document.getElementById('settings-username').value = userObj.username;
            document.getElementById('settings-email').value = userObj.email || '';

            form.addEventListener('submit', function(e) {
                e.preventDefault();
                const email = document.getElementById('settings-email').value.trim();
                const current = document.getElementById('settings-current').value;
                const next = document.getElementById('settings-new').value;
                const confirm = document.getElementById('settings-confirm').value;
                if (!email) { alert('Email is required.'); return; }
                if (current !== userObj.password) { alert('Current password is incorrect.'); return; }
                if (next || confirm) {
                    if (next !== confirm) { alert('New passwords do not match.'); return; }
                    userObj.password = next;
                }
                userObj.email = email;
                // Persist update
                const users = getUsers().map(u => u.username.toLowerCase() === userObj.username.toLowerCase() ? userObj : u);
                setUsers(users);
                // Clear password fields
                document.getElementById('settings-current').value = '';
                document.getElementById('settings-new').value = '';
                document.getElementById('settings-confirm').value = '';
                alert('Account updated.');
            });

            // Render purchase history
            if (historyBody) {
                historyBody.innerHTML = '';
                (userObj.history || []).forEach(order => {
                    order.items.forEach(it => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${order.date}</td>
                            <td>${it.name} x${it.quantity}</td>
                            <td>$${(it.price * it.quantity).toFixed(2)}</td>
                            <td>${order.status}</td>
                        `;
                        historyBody.appendChild(tr);
                    });
                });
            }
        }
    }

    // Build mini cart late in case DOM was modified
    buildMiniCartUI();

    // --- Live Search Suggestions ---
    const defaultProductCatalogue = [
        { name: 'Gragas Driver', price: 199.99, image: 'GragasDriver.png', href: 'item-clubs-1.html', inventory: 10 },
        { name: 'Barrel Iron', price: 149.99, image: 'GragasIron.png', href: 'item-clubs-2.html', inventory: 10 },
        { name: 'Explosive Putter', price: 129.99, image: 'GragasPutter.png', href: 'item-clubs-3.html', inventory: 10 },
        { name: 'Barrel Polo Shirt', price: 49.99, image: 'GragasPolo.png', href: 'item-apparel-1.html', inventory: 10 },
        { name: 'Gragas Cap', price: 29.99, image: 'https://via.placeholder.com/150', href: 'item-apparel-2.html', inventory: 10 },
        { name: 'League Socks', price: 19.99, image: 'GragasSocks.png', href: 'item-apparel-3.html', inventory: 10 },
    ];

    function getProductCatalogue() {
        return JSON.parse(localStorage.getItem('productCatalogue') || JSON.stringify(defaultProductCatalogue));
    }
    function setProductCatalogue(catalogue) {
        localStorage.setItem('productCatalogue', JSON.stringify(catalogue));
    }
    let productCatalogue = getProductCatalogue();

    function ensureSuggestUI() {
        const bar = document.querySelector('.navbar .search-bar');
        if (!bar) return null;
        let panel = document.querySelector('.search-suggest');
        if (panel) return panel;
        panel = document.createElement('div');
        panel.className = 'search-suggest';
        panel.innerHTML = '<ul id="suggest-list"></ul>';
        bar.appendChild(panel);
        return panel;
    }

    function renderSuggestions(term) {
        const panel = ensureSuggestUI();
        if (!panel) return;
        const list = panel.querySelector('#suggest-list');
        const q = (term || '').trim().toLowerCase();
        if (!q) { panel.classList.remove('open'); list.innerHTML=''; return; }
        // rank by includes index then alphabetic
        const matches = productCatalogue
            .map(p => ({ p, idx: p.name.toLowerCase().indexOf(q) }))
            .filter(x => x.idx !== -1)
            .sort((a, b) => a.idx - b.idx || a.p.name.localeCompare(b.p.name))
            .slice(0, 8)
            .map(x => x.p);
        if (matches.length === 0) { panel.classList.remove('open'); list.innerHTML=''; return; }
        list.innerHTML = matches.map(m => `
            <li data-href="${m.href}">
              <img class="thumb" src="${m.image}" alt="${m.name}">
              <div>
                <div class="name">${m.name}</div>
                <div class="meta">$${m.price.toFixed(2)}</div>
              </div>
            </li>`).join('');
        panel.classList.add('open');
        list.querySelectorAll('li').forEach(li => {
            li.addEventListener('click', () => {
                window.location.href = li.getAttribute('data-href');
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', e => {
            renderSuggestions(e.target.value);
        });
        searchInput.addEventListener('focus', e => {
            if (e.target.value) renderSuggestions(e.target.value);
        });
        searchInput.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                const panel = document.querySelector('.search-suggest');
                if (panel) panel.classList.remove('open');
            }
        });
        document.addEventListener('click', e => {
            const panel = document.querySelector('.search-suggest');
            if (!panel) return;
            if (panel.contains(e.target) || searchInput.contains(e.target)) return;
            panel.classList.remove('open');
        });
    }

    // Render catalogue page with inventory and stock status
    function renderCataloguePage() {
        const catalogue = getProductCatalogue();
        document.querySelectorAll('.item-card').forEach(card => {
            const name = card.querySelector('h3').textContent.trim();
            const prod = catalogue.find(p => p.name === name);
            let stockInfo = card.querySelector('.stock-info');
            if (!stockInfo) {
                stockInfo = document.createElement('div');
                stockInfo.className = 'stock-info';
                card.insertBefore(stockInfo, card.querySelector('a.btn, button.btn'));
            }
            if (prod) {
                stockInfo.textContent = `In Stock: ${prod.inventory}`;
                const addBtn = card.querySelector('.add-to-cart');
                if (prod.inventory === 0) {
                    if (addBtn) addBtn.remove();
                    let out = card.querySelector('.out-of-stock');
                    if (!out) {
                        out = document.createElement('div');
                        out.className = 'out-of-stock';
                        out.textContent = 'Out of Stock';
                        card.appendChild(out);
                    }
                } else {
                    if (!addBtn) {
                        // Optionally, re-add button if restocked (not required for now)
                    }
                    const out = card.querySelector('.out-of-stock');
                    if (out) out.remove();
                }
            }
        });
    }

    if (window.location.pathname.endsWith('catalogue.html')) {
        renderCataloguePage();
    }
}); 