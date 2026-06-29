document.addEventListener('DOMContentLoaded', () => {
    // App State
    let rawReleases = [];      // Raw feed from backend
    let parsedUpdates = [];    // Split updates with structure: { date, originalLink, type, html, plainText, categoryInfo }
    let currentFilter = 'all';
    let searchQuery = '';
    let lastFetchedTime = null;

    // DOM Elements
    const timelineContainer = document.getElementById('timeline-container');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const emptyState = document.getElementById('empty-state');
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const retryBtn = document.getElementById('retry-btn');
    const lastUpdatedText = document.getElementById('last-updated-text');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIconSun = document.getElementById('theme-icon-sun');
    const themeIconMoon = document.getElementById('theme-icon-moon');
    
    // Stats elements
    const countTotalEl = document.getElementById('count-total');
    const countFeaturesEl = document.getElementById('count-features');
    const countChangesEl = document.getElementById('count-changes');
    const countFixesEl = document.getElementById('count-fixes');
    
    // Search elements
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const filterChips = document.querySelectorAll('.filter-chip');

    // --- Core API Functions ---

    // Fetch releases from Python Flask backend
    async function fetchReleases(bypassCache = false) {
        setLoading(true);
        try {
            const url = bypassCache ? '/api/releases?refresh=true' : '/api/releases';
            const response = await fetch(url);
            const data = await response.json();
            
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Server returned an error');
            }
            
            rawReleases = data.releases;
            processReleases(rawReleases);
            updateStats();
            renderTimeline();
            
            lastFetchedTime = new Date();
            updateLastUpdatedTimeText();
            setLoading(false);
        } catch (error) {
            console.error('Fetch error:', error);
            showError(error.message || 'Failed to connect to the backend server.');
        }
    }

    // Process and split releases into individual update cards
    function processReleases(releases) {
        parsedUpdates = [];
        
        releases.forEach(entry => {
            const date = entry.title; // e.g. "June 25, 2026"
            const link = entry.link || 'https://docs.cloud.google.com/bigquery/docs/release-notes';
            const rawContent = entry.content;
            
            // Extract items from feed content (split by H3 tags, or any other H tag if H3 is missing)
            const items = parseEntryContent(rawContent);
            
            items.forEach(item => {
                const categoryInfo = getCategoryInfo(item.type);
                
                // Construct clean plain text representation (remove html tags)
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = item.html;
                let plainText = tempDiv.textContent || tempDiv.innerText || "";
                plainText = plainText.replace(/\s+/g, ' ').trim();
                
                parsedUpdates.push({
                    id: Math.random().toString(36).substr(2, 9),
                    date: date,
                    originalLink: link,
                    type: item.type,
                    html: item.html,
                    plainText: plainText,
                    categoryInfo: categoryInfo
                });
            });
        });
    }

    // Parse HTML content of a feed entry to split it by headers
    function parseEntryContent(contentHtml) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(contentHtml, 'text/html');
        const items = [];
        
        let currentType = null;
        let currentElements = [];
        
        const children = Array.from(doc.body.children);
        
        children.forEach((child) => {
            const tagName = child.tagName.toLowerCase();
            const isHeader = /^h[1-6]$/.test(tagName);
            
            if (isHeader) {
                // Save previous section if exists
                if (currentElements.length > 0 || currentType) {
                    items.push({
                        type: currentType || 'Note',
                        html: currentElements.map(el => el.outerHTML).join('')
                    });
                }
                currentType = child.textContent.trim();
                currentElements = [];
            } else {
                currentElements.push(child);
            }
        });
        
        // Push the last remaining section
        if (currentElements.length > 0 || currentType) {
            items.push({
                type: currentType || 'Note',
                html: currentElements.map(el => el.outerHTML).join('')
            });
        }
        
        // Clean and filter empty HTML blocks
        return items.filter(item => item.html.trim().length > 0);
    }

    // Categorization mapper
    function getCategoryInfo(typeText) {
        const t = typeText.toLowerCase();
        if (t.includes('feature')) {
            return { 
                category: 'Feature', 
                class: 'type-feature', 
                badgeClass: 'badge-feature', 
                icon: 'fa-wand-magic-sparkles', 
                label: 'Feature' 
            };
        } else if (t.includes('change') || t.includes('update')) {
            return { 
                category: 'Change', 
                class: 'type-change', 
                badgeClass: 'badge-change', 
                icon: 'fa-code-compare', 
                label: 'Change' 
            };
        } else if (t.includes('fix') || t.includes('bug') || t.includes('resolve')) {
            return { 
                category: 'Fix', 
                class: 'type-fix', 
                badgeClass: 'badge-fix', 
                icon: 'fa-wrench', 
                label: 'Fix' 
            };
        } else if (t.includes('deprecat')) {
            return { 
                category: 'Deprecation', 
                class: 'type-deprecation', 
                badgeClass: 'badge-deprecation', 
                icon: 'fa-triangle-exclamation', 
                label: 'Deprecation' 
            };
        } else {
            return { 
                category: 'Note', 
                class: 'type-note', 
                badgeClass: 'badge-note', 
                icon: 'fa-info-circle', 
                label: typeText || 'Note' 
            };
        }
    }

    // --- Stats Dashboard ---
    function updateStats() {
        const totalCount = parsedUpdates.length;
        const featuresCount = parsedUpdates.filter(u => u.categoryInfo.category === 'Feature').length;
        const changesCount = parsedUpdates.filter(u => u.categoryInfo.category === 'Change').length;
        
        // Combine Fixes, Deprecations and Notes for the general third dashboard block
        const fixesCount = parsedUpdates.filter(u => 
            u.categoryInfo.category === 'Fix' || 
            u.categoryInfo.category === 'Deprecation' || 
            u.categoryInfo.category === 'Note'
        ).length;

        countTotalEl.textContent = totalCount;
        countFeaturesEl.textContent = featuresCount;
        countChangesEl.textContent = changesCount;
        countFixesEl.textContent = fixesCount;
    }

    // --- Rendering Functions ---

    // Build timeline DOM structure based on current filter & search query
    function renderTimeline() {
        // Filter and Search checks
        const filtered = parsedUpdates.filter(update => {
            const matchesFilter = currentFilter === 'all' || update.categoryInfo.category === currentFilter;
            
            const matchesSearch = !searchQuery || 
                update.plainText.toLowerCase().includes(searchQuery) ||
                update.date.toLowerCase().includes(searchQuery) ||
                update.type.toLowerCase().includes(searchQuery);
                
            return matchesFilter && matchesSearch;
        });

        if (filtered.length === 0) {
            timelineContainer.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        timelineContainer.style.display = 'block';
        timelineContainer.innerHTML = '';

        // Group updates by date
        const groups = {};
        filtered.forEach(update => {
            if (!groups[update.date]) {
                groups[update.date] = [];
            }
            groups[update.date].push(update);
        });

        // Render each date group
        Object.keys(groups).forEach(date => {
            const updatesInGroup = groups[date];
            
            const groupDiv = document.createElement('div');
            groupDiv.className = 'timeline-date-group';
            
            // Marker
            const markerDiv = document.createElement('div');
            markerDiv.className = 'timeline-date-marker';
            markerDiv.innerHTML = `
                <div class="timeline-dot"></div>
                <div class="timeline-date-text">${date}</div>
            `;
            groupDiv.appendChild(markerDiv);
            
            // Cards Container
            const cardsDiv = document.createElement('div');
            cardsDiv.className = 'timeline-cards';
            
            updatesInGroup.forEach(update => {
                const card = document.createElement('article');
                card.className = `timeline-card ${update.categoryInfo.class}`;
                
                // Inject card components
                card.innerHTML = `
                    <div class="card-header">
                        <span class="badge ${update.categoryInfo.badgeClass}">
                            <i class="fa-solid ${update.categoryInfo.icon} mr-1"></i> ${update.categoryInfo.label}
                        </span>
                        <div class="card-meta-links">
                            <a href="${update.originalLink}" target="_blank" rel="noopener noreferrer" class="btn btn-icon-only card-btn" title="View official release log">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            </a>
                        </div>
                    </div>
                    <div class="card-content">
                        ${update.html}
                    </div>
                    <div class="card-footer">
                        <button class="card-btn btn-copy" data-id="${update.id}">
                            <i class="fa-regular fa-copy"></i> Copy Text
                        </button>
                        <button class="card-btn card-btn-tweet btn-tweet" data-id="${update.id}">
                            <i class="fa-brands fa-x-twitter"></i> Tweet
                        </button>
                    </div>
                `;
                
                // Add event listeners to card footer actions
                card.querySelector('.btn-copy').addEventListener('click', (e) => handleCopy(update, e.currentTarget));
                card.querySelector('.btn-tweet').addEventListener('click', () => handleTweet(update));
                
                cardsDiv.appendChild(card);
            });
            
            groupDiv.appendChild(cardsDiv);
            timelineContainer.appendChild(groupDiv);
        });
    }

    // --- Action Handlers ---

    // Tweet specific card update
    function handleTweet(update) {
        // Construct standard intent share
        const title = `📢 BigQuery Update (${update.date}):\n[${update.categoryInfo.label}] `;
        const linkStr = `\n\nRead more: ${update.originalLink}`;
        const hashtags = `\n#BigQuery #GoogleCloud #DataPlatform`;
        
        // Calculate max allowed length for body (280 total)
        const allowedLength = 280 - title.length - linkStr.length - hashtags.length;
        
        let shareText = update.plainText;
        if (shareText.length > allowedLength) {
            shareText = shareText.substring(0, allowedLength - 3) + '...';
        }
        
        const tweetText = `${title}${shareText}${linkStr}${hashtags}`;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        
        // Open intent pop-up
        window.open(twitterUrl, '_blank', 'width=550,height=420,resizable=yes,scrollbars=yes');
    }

    // Copy plaintext content to clipboard
    function handleCopy(update, buttonEl) {
        const textToCopy = `BigQuery Update (${update.date}) - [${update.categoryInfo.label}]\n\n${update.plainText}\n\nRead more: ${update.originalLink}`;
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalHTML = buttonEl.innerHTML;
            buttonEl.innerHTML = `<i class="fa-solid fa-check text-emerald-500 animate-bounce"></i> Copied!`;
            buttonEl.style.borderColor = 'var(--color-feature)';
            buttonEl.style.color = 'var(--color-feature)';
            
            setTimeout(() => {
                buttonEl.innerHTML = originalHTML;
                buttonEl.style.borderColor = '';
                buttonEl.style.color = '';
            }, 2000);
        }).catch(err => {
            console.error('Clipboard write failed:', err);
        });
    }

    // --- State UI Handlers ---

    function setLoading(isLoading) {
        if (isLoading) {
            loadingState.style.display = 'block';
            errorState.style.display = 'none';
            emptyState.style.display = 'none';
            timelineContainer.style.display = 'none';
            refreshIcon.classList.add('rotate-loading');
            refreshBtn.disabled = true;
        } else {
            loadingState.style.display = 'none';
            refreshIcon.classList.remove('rotate-loading');
            refreshBtn.disabled = false;
        }
    }

    function showError(msg) {
        loadingState.style.display = 'none';
        emptyState.style.display = 'none';
        timelineContainer.style.display = 'none';
        errorMessage.textContent = msg;
        errorState.style.display = 'block';
        refreshIcon.classList.remove('rotate-loading');
        refreshBtn.disabled = false;
    }

    function updateLastUpdatedTimeText() {
        if (lastFetchedTime) {
            const hrs = String(lastFetchedTime.getHours()).padStart(2, '0');
            const mins = String(lastFetchedTime.getMinutes()).padStart(2, '0');
            const secs = String(lastFetchedTime.getSeconds()).padStart(2, '0');
            lastUpdatedText.textContent = `Synced at ${hrs}:${mins}:${secs}`;
        }
    }

    // Interval to show relative updates is simple, but absolute synced time is robust and clean.

    // --- Search & Filters Event Listeners ---

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        searchClear.style.display = searchQuery ? 'block' : 'none';
        renderTimeline();
    });

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClear.style.display = 'none';
        renderTimeline();
        searchInput.focus();
    });

    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.getAttribute('data-filter');
            renderTimeline();
        });
    });

    clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClear.style.display = 'none';
        
        filterChips.forEach(c => c.classList.remove('active'));
        document.querySelector('.filter-chip[data-filter="all"]').classList.add('active');
        currentFilter = 'all';
        
        renderTimeline();
    });

    // Theme Toggle Functionality
    function initTheme() {
        const activeTheme = localStorage.getItem('theme') || 'dark';
        if (activeTheme === 'light') {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            themeIconSun.style.display = 'none';
            themeIconMoon.style.display = 'inline-block';
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            themeIconMoon.style.display = 'none';
            themeIconSun.style.display = 'inline-block';
        }
    }

    themeToggle.addEventListener('click', () => {
        if (document.body.classList.contains('dark-theme')) {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            themeIconSun.style.display = 'none';
            themeIconMoon.style.display = 'inline-block';
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            themeIconMoon.style.display = 'none';
            themeIconSun.style.display = 'inline-block';
            localStorage.setItem('theme', 'dark');
        }
    });

    // Refresh buttons
    refreshBtn.addEventListener('click', () => fetchReleases(true));
    retryBtn.addEventListener('click', () => fetchReleases(true));

    // --- Init ---
    initTheme();
    fetchReleases();
});
