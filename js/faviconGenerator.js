/**
 * AuraQuant Favicon Generator
 * Generates multiple favicon sizes and formats for various platforms
 */

class FaviconGenerator {
    constructor() {
        this.sizes = [16, 32, 48, 64, 96, 128, 192, 256, 512];
        this.appleSizes = [57, 60, 72, 76, 114, 120, 144, 152, 180];
    }
    
    /**
     * Generate favicon at specific size
     */
    generateFavicon(size) {
        const svg = `
<svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <circle cx="16" cy="16" r="15" fill="#1F2937"/>
  
  <!-- Gradients -->
  <defs>
    <linearGradient id="fav-pink-${size}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FF6B9D;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#C44569;stop-opacity:1"/>
    </linearGradient>
    
    <linearGradient id="fav-purple-${size}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#A855F7;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#9333EA;stop-opacity:1"/>
    </linearGradient>
    
    ${size >= 32 ? `
    <filter id="fav-glow-${size}">
      <feGaussianBlur stdDeviation="${size >= 64 ? '0.5' : '0.3'}" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>` : ''}
  </defs>
  
  <!-- Infinity symbol -->
  <g transform="translate(16, 16)">
    <path d="M -7 0 C -7 -3, -3 -3, 0 0 C 3 3, 7 3, 7 0" 
          fill="none" 
          stroke="url(#fav-pink-${size})" 
          stroke-width="${size >= 64 ? '2' : '1.5'}" 
          stroke-linecap="round"
          ${size >= 32 ? `filter="url(#fav-glow-${size})"` : ''}
          opacity="0.95"/>
    
    <path d="M 7 0 C 7 -3, 3 -3, 0 0 C -3 3, -7 3, -7 0" 
          fill="none" 
          stroke="url(#fav-purple-${size})" 
          stroke-width="${size >= 64 ? '2' : '1.5'}" 
          stroke-linecap="round"
          ${size >= 32 ? `filter="url(#fav-glow-${size})"` : ''}
          opacity="0.95"/>
    
    <circle cx="0" cy="0" r="${size >= 64 ? '1.5' : '1'}" fill="#FFA500" opacity="0.9"/>
  </g>
</svg>`;
        return svg;
    }
    
    /**
     * Convert SVG to data URL
     */
    svgToDataURL(svg) {
        const encoded = encodeURIComponent(svg)
            .replace(/'/g, '%27')
            .replace(/"/g, '%22');
        return `data:image/svg+xml,${encoded}`;
    }
    
    /**
     * Convert SVG to Canvas (for PNG generation)
     */
    async svgToCanvas(svg, size) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, size, size);
                resolve(canvas);
            };
            img.onerror = reject;
            img.src = this.svgToDataURL(svg);
        });
    }
    
    /**
     * Generate PNG from SVG
     */
    async generatePNG(size) {
        const svg = this.generateFavicon(size);
        const canvas = await this.svgToCanvas(svg, size);
        return canvas.toDataURL('image/png');
    }
    
    /**
     * Generate all favicon sizes
     */
    async generateAllSizes() {
        const favicons = {};
        
        for (const size of this.sizes) {
            favicons[`favicon-${size}x${size}.png`] = await this.generatePNG(size);
        }
        
        for (const size of this.appleSizes) {
            favicons[`apple-touch-icon-${size}x${size}.png`] = await this.generatePNG(size);
        }
        
        return favicons;
    }
    
    /**
     * Generate web manifest icons
     */
    generateManifestIcons() {
        return this.sizes.map(size => ({
            src: `/icons/favicon-${size}x${size}.png`,
            sizes: `${size}x${size}`,
            type: 'image/png',
            purpose: size >= 192 ? 'any maskable' : 'any'
        }));
    }
    
    /**
     * Generate HTML meta tags for favicons
     */
    generateMetaTags() {
        const tags = [
            '<!-- Primary favicon -->',
            '<link rel="icon" type="image/svg+xml" href="/icons/favicon.svg">',
            '<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png">',
            '<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png">',
            '',
            '<!-- Apple Touch Icons -->',
            '<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-180x180.png">',
            '<link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-touch-icon-152x152.png">',
            '<link rel="apple-touch-icon" sizes="144x144" href="/icons/apple-touch-icon-144x144.png">',
            '<link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-touch-icon-120x120.png">',
            '<link rel="apple-touch-icon" sizes="114x114" href="/icons/apple-touch-icon-114x114.png">',
            '<link rel="apple-touch-icon" sizes="76x76" href="/icons/apple-touch-icon-76x76.png">',
            '<link rel="apple-touch-icon" sizes="72x72" href="/icons/apple-touch-icon-72x72.png">',
            '<link rel="apple-touch-icon" sizes="60x60" href="/icons/apple-touch-icon-60x60.png">',
            '<link rel="apple-touch-icon" sizes="57x57" href="/icons/apple-touch-icon-57x57.png">',
            '',
            '<!-- Android/Chrome -->',
            '<link rel="icon" type="image/png" sizes="192x192" href="/icons/favicon-192x192.png">',
            '<link rel="icon" type="image/png" sizes="512x512" href="/icons/favicon-512x512.png">',
            '',
            '<!-- Microsoft Tiles -->',
            '<meta name="msapplication-TileColor" content="#1F2937">',
            '<meta name="msapplication-TileImage" content="/icons/favicon-144x144.png">',
            '',
            '<!-- Theme Color -->',
            '<meta name="theme-color" content="#1F2937">',
            '',
            '<!-- Web Manifest -->',
            '<link rel="manifest" href="/manifest.json">'
        ];
        
        return tags.join('\n');
    }
    
    /**
     * Download favicon as file
     */
    downloadFavicon(dataURL, filename) {
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    /**
     * Generate and download all favicons
     */
    async downloadAllFavicons() {
        console.log('Generating all favicon sizes...');
        const favicons = await this.generateAllSizes();
        
        for (const [filename, dataURL] of Object.entries(favicons)) {
            this.downloadFavicon(dataURL, filename);
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between downloads
        }
        
        console.log('All favicons generated and downloaded!');
    }
    
    /**
     * Setup favicon dynamically in the page
     */
    setupFavicon() {
        // Remove existing favicons
        const existingLinks = document.querySelectorAll('link[rel*="icon"]');
        existingLinks.forEach(link => link.remove());
        
        // Add SVG favicon
        const svgLink = document.createElement('link');
        svgLink.rel = 'icon';
        svgLink.type = 'image/svg+xml';
        svgLink.href = '/icons/favicon.svg';
        document.head.appendChild(svgLink);
        
        // Add PNG fallback
        const pngLink = document.createElement('link');
        pngLink.rel = 'icon';
        pngLink.type = 'image/png';
        pngLink.sizes = '32x32';
        pngLink.href = this.svgToDataURL(this.generateFavicon(32));
        document.head.appendChild(pngLink);
        
        // Add theme color
        let themeColor = document.querySelector('meta[name="theme-color"]');
        if (!themeColor) {
            themeColor = document.createElement('meta');
            themeColor.name = 'theme-color';
            document.head.appendChild(themeColor);
        }
        themeColor.content = '#1F2937';
    }
    
    /**
     * Animate favicon (for notifications)
     */
    animateFavicon(type = 'pulse') {
        const animations = {
            pulse: () => {
                let opacity = 1;
                let decreasing = true;
                const interval = setInterval(() => {
                    if (decreasing) {
                        opacity -= 0.1;
                        if (opacity <= 0.3) decreasing = false;
                    } else {
                        opacity += 0.1;
                        if (opacity >= 1) {
                            clearInterval(interval);
                            this.setupFavicon();
                            return;
                        }
                    }
                    this.updateFaviconOpacity(opacity);
                }, 100);
            },
            
            rotate: () => {
                let angle = 0;
                const interval = setInterval(() => {
                    angle += 10;
                    if (angle >= 360) {
                        clearInterval(interval);
                        this.setupFavicon();
                        return;
                    }
                    this.updateFaviconRotation(angle);
                }, 50);
            },
            
            alert: () => {
                let isRed = false;
                let count = 0;
                const interval = setInterval(() => {
                    count++;
                    if (count > 6) {
                        clearInterval(interval);
                        this.setupFavicon();
                        return;
                    }
                    isRed = !isRed;
                    this.updateFaviconAlert(isRed);
                }, 300);
            }
        };
        
        const animation = animations[type];
        if (animation) animation();
    }
    
    /**
     * Update favicon with opacity
     */
    updateFaviconOpacity(opacity) {
        const svg = `
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="16" r="15" fill="#1F2937" opacity="${opacity}"/>
  <g transform="translate(16, 16)" opacity="${opacity}">
    <path d="M -7 0 C -7 -3, -3 -3, 0 0 C 3 3, 7 3, 7 0" 
          fill="none" stroke="#FF6B9D" stroke-width="2" stroke-linecap="round"/>
    <path d="M 7 0 C 7 -3, 3 -3, 0 0 C -3 3, -7 3, -7 0" 
          fill="none" stroke="#A855F7" stroke-width="2" stroke-linecap="round"/>
    <circle cx="0" cy="0" r="1.5" fill="#FFA500"/>
  </g>
</svg>`;
        
        const link = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
        if (link) {
            link.href = this.svgToDataURL(svg);
        }
    }
    
    /**
     * Update favicon with rotation
     */
    updateFaviconRotation(angle) {
        const svg = `
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="16" r="15" fill="#1F2937"/>
  <g transform="translate(16, 16) rotate(${angle})">
    <path d="M -7 0 C -7 -3, -3 -3, 0 0 C 3 3, 7 3, 7 0" 
          fill="none" stroke="#FF6B9D" stroke-width="2" stroke-linecap="round"/>
    <path d="M 7 0 C 7 -3, 3 -3, 0 0 C -3 3, -7 3, -7 0" 
          fill="none" stroke="#A855F7" stroke-width="2" stroke-linecap="round"/>
    <circle cx="0" cy="0" r="1.5" fill="#FFA500"/>
  </g>
</svg>`;
        
        const link = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
        if (link) {
            link.href = this.svgToDataURL(svg);
        }
    }
    
    /**
     * Update favicon for alert
     */
    updateFaviconAlert(isRed) {
        const bgColor = isRed ? '#DC2626' : '#1F2937';
        const svg = `
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="16" r="15" fill="${bgColor}"/>
  <g transform="translate(16, 16)">
    <path d="M -7 0 C -7 -3, -3 -3, 0 0 C 3 3, 7 3, 7 0" 
          fill="none" stroke="#FF6B9D" stroke-width="2" stroke-linecap="round"/>
    <path d="M 7 0 C 7 -3, 3 -3, 0 0 C -3 3, -7 3, -7 0" 
          fill="none" stroke="#A855F7" stroke-width="2" stroke-linecap="round"/>
    <circle cx="0" cy="0" r="1.5" fill="#FFA500"/>
  </g>
</svg>`;
        
        const link = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
        if (link) {
            link.href = this.svgToDataURL(svg);
        }
    }
}

// Initialize favicon generator
const faviconGenerator = new FaviconGenerator();

// Auto-setup favicon when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        faviconGenerator.setupFavicon();
    });
} else {
    faviconGenerator.setupFavicon();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FaviconGenerator;
}

// Make available globally
window.faviconGenerator = faviconGenerator;