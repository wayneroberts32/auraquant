/**
 * AuraQuant Help Center JavaScript
 * Interactive help system with search, tutorials, and navigation
 */

class HelpCenter {
    constructor() {
        this.currentTutorialStep = 0;
        this.tutorialSteps = [];
        this.searchIndex = [];
        this.init();
    }

    init() {
        console.log('Initializing Help Center...');
        this.setupEventListeners();
        this.buildSearchIndex();
        this.loadTutorials();
        this.initSmoothScroll();
        this.checkFirstVisit();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('helpSearch');
        const searchBtn = document.getElementById('searchBtn');
        
        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(searchInput.value);
                }
            });
            
            // Live search as user types
            searchInput.addEventListener('input', (e) => {
                if (e.target.value.length > 2) {
                    this.performSearch(e.target.value);
                }
            });
        }
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.performSearch(searchInput.value);
            });
        }

        // Tutorial controls
        const tutorialNext = document.getElementById('tutorial-next');
        const tutorialPrev = document.getElementById('tutorial-prev');
        const tutorialSkip = document.getElementById('tutorial-skip');
        
        if (tutorialNext) {
            tutorialNext.addEventListener('click', () => this.nextTutorialStep());
        }
        
        if (tutorialPrev) {
            tutorialPrev.addEventListener('click', () => this.prevTutorialStep());
        }
        
        if (tutorialSkip) {
            tutorialSkip.addEventListener('click', () => this.closeTutorial());
        }

        // Navigation highlighting
        this.setupNavigationHighlight();

        // Interactive elements
        this.setupInteractiveElements();
    }

    buildSearchIndex() {
        // Build search index from all help content
        const sections = document.querySelectorAll('.help-section');
        
        sections.forEach(section => {
            const title = section.querySelector('h2')?.textContent || '';
            const content = section.textContent.toLowerCase();
            const id = section.id;
            
            this.searchIndex.push({
                id,
                title,
                content,
                element: section
            });
        });
        
        console.log(`Search index built with ${this.searchIndex.length} sections`);
    }

    performSearch(query) {
        if (!query || query.length < 2) return;
        
        query = query.toLowerCase();
        const results = [];
        
        // Search through index
        this.searchIndex.forEach(item => {
            const relevance = this.calculateRelevance(query, item);
            if (relevance > 0) {
                results.push({ ...item, relevance });
            }
        });
        
        // Sort by relevance
        results.sort((a, b) => b.relevance - a.relevance);
        
        // Display results
        this.displaySearchResults(results, query);
    }

    calculateRelevance(query, item) {
        let score = 0;
        const words = query.split(' ');
        
        words.forEach(word => {
            // Title match is worth more
            if (item.title.toLowerCase().includes(word)) {
                score += 10;
            }
            
            // Content match
            const contentMatches = (item.content.match(new RegExp(word, 'gi')) || []).length;
            score += contentMatches;
        });
        
        return score;
    }

    displaySearchResults(results, query) {
        // Clear previous highlights
        this.clearHighlights();
        
        if (results.length === 0) {
            this.showNotification('No results found', 'warning');
            return;
        }
        
        // Highlight search terms
        results.forEach(result => {
            this.highlightText(result.element, query);
        });
        
        // Scroll to first result
        if (results[0]) {
            results[0].element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            this.showNotification(`Found ${results.length} results for "${query}"`, 'success');
        }
    }

    highlightText(element, query) {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        const textNodes = [];
        let node;
        
        while (node = walker.nextNode()) {
            if (node.nodeValue.trim()) {
                textNodes.push(node);
            }
        }
        
        textNodes.forEach(textNode => {
            const text = textNode.nodeValue;
            const regex = new RegExp(`(${query})`, 'gi');
            
            if (regex.test(text)) {
                const span = document.createElement('span');
                span.innerHTML = text.replace(regex, '<mark class="search-highlight">$1</mark>');
                textNode.parentNode.replaceChild(span, textNode);
            }
        });
    }

    clearHighlights() {
        document.querySelectorAll('.search-highlight').forEach(mark => {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });
    }

    loadTutorials() {
        // Define tutorial steps
        this.tutorialSteps = [
            {
                title: 'Welcome to AuraQuant',
                text: 'Welcome to AuraQuant Infinity Trading Bot! This tutorial will guide you through the essential features and help you get started.',
                highlight: null
            },
            {
                title: 'Connect Your Broker',
                text: 'First, you need to connect your broker account. Go to Settings → API Keys and add your broker credentials.',
                highlight: '#broker-connection'
            },
            {
                title: 'Choose Bot Version',
                text: 'Select a bot version based on your risk tolerance. V1-V5 for beginners, higher versions for experienced traders.',
                highlight: '#bot-versions'
            },
            {
                title: 'Start Paper Trading',
                text: 'Always test strategies with paper trading first. Toggle the Paper Trading switch before starting the bot.',
                highlight: '#paper-trading'
            },
            {
                title: 'Monitor Performance',
                text: 'Watch your bot\'s performance in real-time. The dashboard shows P&L, positions, and risk metrics.',
                highlight: '#bot-monitoring'
            },
            {
                title: 'Risk Management',
                text: 'The bot enforces a strict 2% maximum drawdown rule. It will automatically stop if this limit is approached.',
                highlight: '#drawdown-limits'
            },
            {
                title: 'Get Support',
                text: 'Need help? Join our Discord community or contact support via Telegram or email.',
                highlight: '#support'
            }
        ];
    }

    startTutorial() {
        this.currentTutorialStep = 0;
        this.showTutorialStep();
        document.getElementById('tutorial-overlay').classList.remove('hidden');
    }

    showTutorialStep() {
        const step = this.tutorialSteps[this.currentTutorialStep];
        
        document.getElementById('tutorial-title').textContent = step.title;
        document.getElementById('tutorial-text').textContent = step.text;
        
        // Update button states
        document.getElementById('tutorial-prev').disabled = this.currentTutorialStep === 0;
        document.getElementById('tutorial-next').textContent = 
            this.currentTutorialStep === this.tutorialSteps.length - 1 ? 'Finish' : 'Next';
        
        // Highlight relevant section
        if (step.highlight) {
            const element = document.querySelector(step.highlight);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('tutorial-highlight');
            }
        }
    }

    nextTutorialStep() {
        this.clearTutorialHighlight();
        
        if (this.currentTutorialStep < this.tutorialSteps.length - 1) {
            this.currentTutorialStep++;
            this.showTutorialStep();
        } else {
            this.closeTutorial();
        }
    }

    prevTutorialStep() {
        this.clearTutorialHighlight();
        
        if (this.currentTutorialStep > 0) {
            this.currentTutorialStep--;
            this.showTutorialStep();
        }
    }

    closeTutorial() {
        document.getElementById('tutorial-overlay').classList.add('hidden');
        this.clearTutorialHighlight();
        localStorage.setItem('tutorial_completed', 'true');
    }

    clearTutorialHighlight() {
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
    }

    checkFirstVisit() {
        const tutorialCompleted = localStorage.getItem('tutorial_completed');
        const urlParams = new URLSearchParams(window.location.search);
        
        if (!tutorialCompleted || urlParams.get('tutorial') === 'true') {
            // Start tutorial for first-time visitors
            setTimeout(() => {
                this.showWelcomeMessage();
            }, 1000);
        }
    }

    showWelcomeMessage() {
        const welcome = document.createElement('div');
        welcome.className = 'welcome-popup';
        welcome.innerHTML = `
            <div class="welcome-content">
                <h3>Welcome to AuraQuant Help Center!</h3>
                <p>Would you like to take a quick tour?</p>
                <div class="welcome-actions">
                    <button onclick="helpCenter.startTutorial()" class="btn-primary">Start Tour</button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn-secondary">Skip</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(welcome);
    }

    setupNavigationHighlight() {
        // Highlight current section in navigation
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    this.highlightNavItem(id);
                }
            });
        }, {
            rootMargin: '-20% 0px -70% 0px'
        });
        
        document.querySelectorAll('.help-section').forEach(section => {
            observer.observe(section);
        });
    }

    highlightNavItem(sectionId) {
        // Remove all active classes
        document.querySelectorAll('.nav-section a').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current section
        const activeLink = document.querySelector(`.nav-section a[href="#${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    setupInteractiveElements() {
        // Add click handlers to bot control buttons
        document.querySelectorAll('.control-item button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.className.replace('btn-', '');
                this.handleControlAction(action);
            });
        });

        // Copy code snippets
        document.querySelectorAll('code').forEach(code => {
            code.addEventListener('click', () => {
                this.copyToClipboard(code.textContent);
            });
        });
    }

    handleControlAction(action) {
        switch(action) {
            case 'pause':
                this.showNotification('Bot pause command - Example only', 'info');
                break;
            case 'resume':
                this.showNotification('Bot resume command - Example only', 'info');
                break;
            case 'close-all':
                this.showNotification('Close all positions - Example only', 'warning');
                break;
            case 'emergency':
                this.showNotification('Emergency stop - Example only', 'danger');
                break;
            default:
                console.log('Unknown action:', action);
        }
    }

    initSmoothScroll() {
        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('Copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Failed to copy:', err);
            this.showNotification('Failed to copy', 'error');
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `help-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Export help content as PDF
    exportAsPDF() {
        // This would integrate with a PDF library like jsPDF
        this.showNotification('PDF export feature coming soon!', 'info');
    }

    // Print help content
    printHelp() {
        window.print();
    }

    // Toggle dark/light mode (if needed)
    toggleTheme() {
        document.body.classList.toggle('light-theme');
        const isDark = !document.body.classList.contains('light-theme');
        localStorage.setItem('help_theme', isDark ? 'dark' : 'light');
    }
}

// Initialize help center when DOM is ready
let helpCenter;

document.addEventListener('DOMContentLoaded', () => {
    helpCenter = new HelpCenter();
    
    // Add global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K for search focus
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('helpSearch')?.focus();
        }
        
        // Escape to close tutorial
        if (e.key === 'Escape') {
            helpCenter.closeTutorial();
        }
        
        // F1 for help
        if (e.key === 'F1') {
            e.preventDefault();
            helpCenter.startTutorial();
        }
    });
});

// Add custom styles for notifications and highlights
const style = document.createElement('style');
style.textContent = `
    .help-notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        color: white;
        font-weight: 600;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        z-index: 10000;
    }
    
    .help-notification.show {
        transform: translateX(0);
    }
    
    .help-notification.info {
        background: linear-gradient(135deg, #3B82F6, #2563EB);
    }
    
    .help-notification.success {
        background: linear-gradient(135deg, #10B981, #059669);
    }
    
    .help-notification.warning {
        background: linear-gradient(135deg, #F59E0B, #D97706);
    }
    
    .help-notification.danger,
    .help-notification.error {
        background: linear-gradient(135deg, #EF4444, #DC2626);
    }
    
    .search-highlight {
        background: #FFA500;
        color: #000;
        padding: 2px 4px;
        border-radius: 3px;
    }
    
    .tutorial-highlight {
        animation: tutorialPulse 2s infinite;
        box-shadow: 0 0 20px rgba(255, 107, 157, 0.5);
    }
    
    @keyframes tutorialPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
    }
    
    .nav-section a.active {
        background: var(--bg-hover);
        color: var(--accent-pink);
        border-left: 3px solid var(--accent-pink);
    }
    
    .welcome-popup {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--bg-card);
        padding: 2rem;
        border-radius: 1rem;
        border: 2px solid var(--accent-pink);
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, -45%); }
        to { opacity: 1; transform: translate(-50%, -50%); }
    }
    
    .welcome-content h3 {
        color: var(--accent-pink);
        margin-bottom: 1rem;
    }
    
    .welcome-content p {
        color: var(--text-secondary);
        margin-bottom: 1.5rem;
    }
    
    .welcome-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
    }
    
    @media print {
        .help-header,
        .help-search,
        .help-sidebar,
        .tutorial-overlay,
        .help-notification {
            display: none !important;
        }
        
        .help-main {
            padding: 0;
            margin: 0;
        }
        
        .help-section {
            page-break-inside: avoid;
        }
    }
`;
document.head.appendChild(style);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HelpCenter;
}
