document.addEventListener("DOMContentLoaded", function() {
    const isMobile = window.innerWidth <= 768;
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const content = document.querySelector('.content');
    let activeCanvasEmojis = []; // Global array for emojis to be drawn on canvas

    const INTERACTIVE_SELECTOR = 'input, textarea, select, button, a, label, [role="button"], [contenteditable="true"]';

    // Shared references for canvas animations
    let parallaxCanvas = null;
    let parallaxCtx = null;
    let parallaxLayers = [];
    let parallaxRafId = null;

    function initParallax() {
        if (isMobile || !content) return;

        const canvas = document.createElement('canvas');
        canvas.className = 'parallax-canvas';
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        parallaxCanvas = canvas;
        parallaxCtx = ctx;

        const layers = [
            { src: 'assets/city_parallax/1.avif', speed: 0.10, img: new Image() },
            { src: 'assets/city_parallax/2.avif', speed: 0.18, img: new Image() },
            { src: 'assets/city_parallax/3.avif', speed: 0.26, img: new Image() },
            { src: 'assets/city_parallax/4.avif', speed: 0.34, img: new Image() },
            { src: 'assets/city_parallax/5.avif', speed: 0.42, img: new Image() },
            { src: 'assets/city_parallax/6.avif', speed: 0.52, img: new Image() }
        ];

        parallaxLayers = layers;

        let loadedImages = 0;
        layers.forEach(layer => {
            layer.img.src = layer.src;
            layer.img.onload = () => {
                loadedImages++;
                if (loadedImages === layers.length) {
                    resizeCanvas();
                    startParallaxLoop();
                }
            };
        });

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        function startParallaxLoop() {
            if (prefersReducedMotion) {
                // Still draw once for a static background
                drawParallax();
                return;
            }

            if (parallaxRafId) return;
            const loop = () => {
                drawParallax();
                parallaxRafId = requestAnimationFrame(loop);
            };
            parallaxRafId = requestAnimationFrame(loop);

            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    if (parallaxRafId) cancelAnimationFrame(parallaxRafId);
                    parallaxRafId = null;
                } else {
                    if (!parallaxRafId && !prefersReducedMotion) {
                        parallaxRafId = requestAnimationFrame(loop);
                    }
                }
            });
        }

        // Main drawing loop for both parallax and emojis
        function drawParallax() {
            if (!ctx || !canvas) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const now = Date.now();
            const t = now / 1000;
            const scrollX = content.scrollLeft;

            // Subtle autonomous drift so the background feels alive even when not scrolling
            const driftPx = prefersReducedMotion ? 0 : (t * 8);
            const effectiveScrollX = scrollX + driftPx;

            // 1) Update & bucket emojis (so we can render them between layers)
            const layerCount = layers.length;
            const buckets = Array.from({ length: layerCount + 1 }, () => []);
            const nextEmojis = [];

            for (const emoji of activeCanvasEmojis) {
                if (now < emoji.animationStartTime) {
                    nextEmojis.push(emoji);
                    // Not started yet; keep it (no bucket)
                    continue;
                }

                const elapsedTime = now - emoji.animationStartTime;
                if (elapsedTime > emoji.animationDuration) {
                    continue;
                }

                const progress = elapsedTime / emoji.animationDuration;
                emoji.currentY = emoji.startY - (progress * (canvas.height + emoji.size * 2));
                emoji.currentX = emoji.baseX - (effectiveScrollX * emoji.parallaxFactor);
                emoji.opacity = Math.sin(progress * Math.PI);
                emoji.currentRotation = emoji.initialRotation + progress * (emoji.targetRotation - emoji.initialRotation);

                nextEmojis.push(emoji);

                const slot = Number.isInteger(emoji.layerSlot) ? emoji.layerSlot : layerCount;
                const clampedSlot = Math.max(0, Math.min(slot, layerCount));
                buckets[clampedSlot].push(emoji);
            }

            activeCanvasEmojis = nextEmojis;

            function drawEmojiBucket(bucket) {
                for (const emoji of bucket) {
                    ctx.save();
                    ctx.font = `${emoji.size}px Syne, Segoe UI Emoji, Noto Color Emoji, Arial, sans-serif`;
                    ctx.globalAlpha = emoji.opacity;
                    ctx.translate(emoji.currentX, emoji.currentY);
                    ctx.rotate(emoji.currentRotation * Math.PI / 180);
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(emoji.char, 0, 0);
                    ctx.restore();
                }
            }

            // 2) Draw layers, inserting emoji buckets between them
            for (let i = 0; i < layers.length; i++) {
                const layer = layers[i];
                const img = layer.img;
                if (!img.complete || img.naturalWidth === 0) continue;

                const imgW = img.width;
                const imgH = img.height;
                const canvasH = canvas.height;
                const drawH = canvasH;
                const drawW = imgW * (drawH / imgH);

                let xPosition = (-(effectiveScrollX) * layer.speed) % drawW;
                if (xPosition > 0) xPosition -= drawW;

                const yPosition = (canvasH - drawH) / 2;
                for (let currentX = xPosition; currentX < canvas.width; currentX += drawW) {
                    ctx.drawImage(img, currentX, yPosition, drawW, drawH);
                }

                // Emojis for this "gap" (after layer i, before layer i+1)
                drawEmojiBucket(buckets[i]);
            }

            // Emojis that should be in front of all layers
            drawEmojiBucket(buckets[layerCount]);
        }

        window.addEventListener('resize', () => {
            resizeCanvas();
            if (prefersReducedMotion) drawParallax();
        });

        // Draw immediately if already loaded (cache)
        if (loadedImages === layers.length) {
            resizeCanvas();
            startParallaxLoop();
        }
    }

    
    function initContentScrolling() {
        if (isMobile || !content) return;

        let isDragging = false;
        let startX, scrollLeftInitial;
        const DRAG_MULTIPLIER = 2;

        function handleDragStart(e) {
            // Only left-click drag on desktop
            if (!e.touches && e.button !== 0) return;

            // Don't hijack clicks on interactive controls (especially the contact form)
            // so inputs can be focused and clicked normally.
            if (e.target && e.target.closest && e.target.closest(INTERACTIVE_SELECTOR)) return;
            if (e.target && e.target.closest && e.target.closest('#contact')) return;

            isDragging = true;
            content.classList.add('is-dragging');

            const pageX = e.touches ? e.touches[0].pageX : e.pageX;
            startX = pageX - content.offsetLeft;
            scrollLeftInitial = content.scrollLeft;

            if (e.touches) {
                document.addEventListener('touchmove', handleDragMove, { passive: false });
                document.addEventListener('touchend', handleDragEnd);
                document.addEventListener('touchcancel', handleDragEnd);
            } else {
                e.preventDefault();
                document.addEventListener('mousemove', handleDragMove);
                document.addEventListener('mouseup', handleDragEnd);
            }
        }

        function handleDragMove(e) {
            if (!isDragging) return;
            e.preventDefault();

            const pageX = e.touches ? e.touches[0].pageX : e.pageX;
            const x = pageX - content.offsetLeft;
            const walk = (x - startX) * DRAG_MULTIPLIER;
            content.scrollLeft = scrollLeftInitial - walk;
        }

        function handleDragEnd() {
            if (!isDragging) return;
            isDragging = false;
            content.classList.remove('is-dragging');

            document.removeEventListener('touchmove', handleDragMove);
            document.removeEventListener('touchend', handleDragEnd);
            document.removeEventListener('touchcancel', handleDragEnd);
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
        }

        content.addEventListener("mousedown", handleDragStart);
        content.addEventListener("touchstart", handleDragStart, { passive: true });
    }

    
    const statBox = document.querySelector('.stat-box');
    const aboutBox = document.querySelector('.about-box');

    function matchAndSetHeights() {
        if (statBox && aboutBox) {
            
            statBox.style.height = 'auto';
            aboutBox.style.height = 'auto';

            const maxHeight = Math.max(statBox.scrollHeight, aboutBox.scrollHeight);
            statBox.style.height = maxHeight + "px";
            aboutBox.style.height = maxHeight + "px";
        }
    }

    function initMatchBoxHeights() {
        if (!statBox || !aboutBox) return;

        
        
        

        window.addEventListener("resize", matchAndSetHeights);
        window.addEventListener("load", matchAndSetHeights);
    }

    
    function initMobileSkillsTabs() {
        if (!isMobile) return;

        const tabs = document.querySelectorAll('.skills-tab-btn');
        
        const categories = {
            advanced: document.getElementById('skills-advanced'),
            intermediate: document.getElementById('skills-intermediate'),
            beginner: document.getElementById('skills-beginner')
        };

        if (!tabs.length) return;

        
        const validCategories = {};
        Object.keys(categories).forEach(key => {
            if (categories[key]) {
                validCategories[key] = categories[key];
            } else {
                console.warn(`Skills category element with ID 'skills-${key}' not found.`);
            }
        });

        function showCategory(categoryToShow) {
            Object.keys(validCategories).forEach(key => {
                validCategories[key].style.display = (key === categoryToShow) ? '' : 'none';
            });
            tabs.forEach(tab => {
                tab.classList.toggle('active', tab.dataset.category === categoryToShow);
            });
        }

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const categoryKey = tab.dataset.category;
                if (validCategories[categoryKey]) { 
                    showCategory(categoryKey);
                }
            });
        });

        
        if (validCategories.advanced) {
            showCategory('advanced');
        } else if (Object.keys(validCategories).length > 0) {
            showCategory(Object.keys(validCategories)[0]);
        }
    }

    
    const mainContentElement = document.querySelector('.content'); 
    const mainSiteOverlayElement = document.querySelector('body > .overlay'); 
    

    function initIframeModal() {
        const projectsButton = document.getElementById('myProjectsBtn');
        const blackOverlay = document.getElementById('iframeBlackOverlay');
        const iframeContainer = document.getElementById('iframeModalContainer');
        const closeBtn = document.getElementById('iframeModalCloseBtn');
        const websiteIframe = document.getElementById('websiteIframe');

        if (!projectsButton || !blackOverlay || !iframeContainer || !websiteIframe || !mainContentElement || !mainSiteOverlayElement || !closeBtn) {
            console.warn('Iframe modal elements for projects or core components not found.');
            return;
        }

        let lastFocusedElement = null;

        function openModal(iframeSrc) {
            lastFocusedElement = document.activeElement;

            websiteIframe.src = iframeSrc;

            blackOverlay.style.display = 'block';
            iframeContainer.style.display = 'block';
            iframeContainer.setAttribute('aria-hidden', 'false');

            void blackOverlay.offsetWidth;
            void iframeContainer.offsetWidth;

            blackOverlay.classList.add('visible');
            iframeContainer.classList.add('visible');
            document.body.classList.add('iframe-modal-open');

            // Hide page content behind the dialog after the fade-in
            setTimeout(() => {
                if (iframeContainer.classList.contains('visible')) {
                    mainContentElement.style.display = 'none';
                    mainSiteOverlayElement.style.display = 'none';
                    closeBtn.focus();
                }
            }, 350);
        }

        function closeModal() {
            // Show page content immediately so focus restoration is visible
            mainContentElement.style.display = isMobile ? 'block' : 'flex';
            mainSiteOverlayElement.style.display = 'block';

            iframeContainer.classList.remove('visible');
            blackOverlay.classList.remove('visible');
            document.body.classList.remove('iframe-modal-open');
            iframeContainer.setAttribute('aria-hidden', 'true');

            setTimeout(() => {
                if (!iframeContainer.classList.contains('visible')) {
                    iframeContainer.style.display = 'none';
                    blackOverlay.style.display = 'none';
                    // Stop iframe playback/network when closed
                    websiteIframe.src = 'about:blank';

                    const focusTarget = lastFocusedElement || projectsButton;
                    if (focusTarget && typeof focusTarget.focus === 'function') {
                        focusTarget.focus();
                    }
                }
            }, 650);
        }

        projectsButton.addEventListener('click', () => {
            const isVisible = iframeContainer.classList.contains('visible');
            if (isVisible) {
                closeModal();
            } else {
                openModal('https://sajagin.thedev.id/ShowCase');
            }
        });

        closeBtn.addEventListener('click', closeModal);
        blackOverlay.addEventListener('click', closeModal);

        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && iframeContainer.classList.contains('visible')) {
                closeModal();
            }
        });
    }

    function initEmojiHover() {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) return;

        const angryEyesButton = document.getElementById('angryEyesButton');
        if (!angryEyesButton) {
            console.warn('Emoji button "angryEyesButton" not found.');
            return;
        }

        // Preserve the original icon and clear the button for restructuring
        const originalIconHTML = angryEyesButton.innerHTML;
        angryEyesButton.innerHTML = '';

        // Create the emoji panel
        const emojiPanel = document.createElement('div');
        emojiPanel.className = 'emoji-panel';

        const emojis = ['💩', '😊', '🎈', '🎉', '👍', '✨', '🔥', '💙'];
        emojis.forEach(emojiChar => {
            const emojiSpan = document.createElement('span');
            emojiSpan.textContent = emojiChar;
            emojiSpan.setAttribute('role', 'button');
            emojiSpan.setAttribute('tabindex', '0');
            emojiSpan.setAttribute('aria-label', `Send ${emojiChar} emojis`);

            const fire = () => animateEmojiFlyUp(emojiChar, { count: 8 });
            emojiSpan.addEventListener('click', fire);
            emojiSpan.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fire();
                }
            });

            emojiPanel.appendChild(emojiSpan);
        });

        // Icon container (click toggles auto emoji mode)
        const iconContainer = document.createElement('span');
        iconContainer.className = 'button-icon-container';
        iconContainer.innerHTML = originalIconHTML;
        iconContainer.setAttribute('role', 'button');
        iconContainer.setAttribute('tabindex', '0');
        iconContainer.setAttribute('aria-label', 'Toggle automatic background emojis');

        angryEyesButton.appendChild(emojiPanel);
        angryEyesButton.appendChild(iconContainer);

        // Hover expands panel; click toggles auto mode
        let panelTimeout;
        function openPanel() {
            clearTimeout(panelTimeout);
            angryEyesButton.classList.add('expanded-emoji-button');
        }
        function closePanel() {
            panelTimeout = setTimeout(() => {
                angryEyesButton.classList.remove('expanded-emoji-button');
            }, 120);
        }

        angryEyesButton.addEventListener('mouseenter', openPanel);
        angryEyesButton.addEventListener('mouseleave', closePanel);
        emojiPanel.addEventListener('mouseenter', () => clearTimeout(panelTimeout));
        emojiPanel.addEventListener('mouseleave', closePanel);

        let autoEmojiEnabled = !prefersReducedMotion;
        let autoEmojiIntervalId = null;

        function setAutoEmojiEnabled(enabled) {
            autoEmojiEnabled = enabled;
            angryEyesButton.classList.toggle('auto-emoji-on', autoEmojiEnabled);
            angryEyesButton.setAttribute('aria-pressed', autoEmojiEnabled ? 'true' : 'false');

            if (autoEmojiIntervalId) {
                clearInterval(autoEmojiIntervalId);
                autoEmojiIntervalId = null;
            }

            if (!autoEmojiEnabled) return;

            autoEmojiIntervalId = setInterval(() => {
                // Don’t spawn while modal is open (keeps it calmer)
                if (document.body.classList.contains('iframe-modal-open')) return;

                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                animateEmojiFlyUp(randomEmoji, { count: 4 + Math.floor(Math.random() * 6) });
            }, 900);
        }

        const toggleAuto = () => setAutoEmojiEnabled(!autoEmojiEnabled);
        iconContainer.addEventListener('click', toggleAuto);
        iconContainer.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleAuto();
            }
        });

        // Start in auto mode by default (desktop)
        setAutoEmojiEnabled(autoEmojiEnabled);
    }

    function animateEmojiFlyUp(emojiChar, options = {}) {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) return;
        if (prefersReducedMotion) return;
        if (!content) return;

        // Prefer the cached canvas reference if available
        const canvas = parallaxCanvas || document.querySelector('.parallax-canvas');
        if (!canvas) {
            console.warn("Parallax canvas not found for emoji animation.");
            return;
        }

        const now = Date.now();
        const t = now / 1000;
        const driftPx = prefersReducedMotion ? 0 : (t * 8);
        const effectiveScrollXNow = content.scrollLeft + driftPx;

        const canvasW = canvas.width || window.innerWidth;
        const canvasH = canvas.height || window.innerHeight;
        const count = typeof options.count === 'number' ? options.count : 10;

        const layerCount = (parallaxLayers && parallaxLayers.length) ? parallaxLayers.length : 0;

        for (let i = 0; i < count; i++) {
            // Random layer "gap" to place emojis between layers.
            // slot = 0..layerCount means:
            // - 0 is between layer 0 and layer 1 (after drawing layer 0)
            // - layerCount is in front of all layers
            const layerSlot = layerCount ? Math.floor(Math.random() * (layerCount + 1)) : 0;

            // Parallax factor derived from neighbouring layer speeds (feels like true depth)
            let parallaxFactor = 0.35;
            if (layerCount) {
                const lower = parallaxLayers[Math.min(layerSlot, layerCount - 1)].speed;
                const upper = layerSlot < layerCount
                    ? parallaxLayers[Math.min(layerSlot + 1, layerCount - 1)].speed
                    : Math.min(1, lower + 0.25);
                const min = Math.min(lower, upper);
                const max = Math.max(lower, upper);
                parallaxFactor = min + Math.random() * Math.max(0.01, (max - min));
            }

            // Spawn X in screen-space, then convert to a stable world-space base
            // so emojis spawn correctly on ANY horizontal page (not just near scrollLeft=0).
            const xScreen = Math.random() * canvasW;
            const baseX = (effectiveScrollXNow * parallaxFactor) + xScreen;

            const randomSize = 18 + Math.random() * 34;
            const animationDurationInMs = (2.6 + Math.random() * 3.6) * 1000;
            const animationDelay = (Math.random() * 0.9) * 1000;
            const initialRotation = (Math.random() - 0.5) * 30;
            const targetRotation = initialRotation + (Math.random() - 0.5) * 260;

            // Start from a band covering mid-to-bottom so it feels like it’s coming from “everywhere”
            const startY = (canvasH * (0.45 + Math.random() * 0.75)) + randomSize;

            activeCanvasEmojis.push({
                char: emojiChar,
                layerSlot,
                baseX,
                startY,
                currentX: 0,
                currentY: 0,
                size: randomSize,
                opacity: 0,
                initialRotation,
                targetRotation,
                currentRotation: initialRotation,
                parallaxFactor,
                animationStartTime: now + animationDelay,
                animationDuration: animationDurationInMs,
            });
        }

        // Hard cap to avoid memory growth during long sessions
        if (activeCanvasEmojis.length > 500) {
            activeCanvasEmojis = activeCanvasEmojis.slice(activeCanvasEmojis.length - 500);
        }
    }

    // updateFlyingEmojiScroll function is no longer needed as its logic is in drawParallax

    function initKeyboardScrolling() {
        if (isMobile || !content) return;
        
        let scrollDirection = 0; // -1 for left, 1 for right, 0 for none
        const scrollSpeed = 15; // Pixels per frame. Adjust for desired speed.
        let animationFrameId = null;

        function scrollLoop() {
            if (scrollDirection === 0 || !content) { // Added !content check
                animationFrameId = null; // Stop the loop
                return;
            }

            const newScrollLeft = content.scrollLeft + (scrollDirection * scrollSpeed);
            content.scrollLeft = Math.max(0, Math.min(newScrollLeft, content.scrollWidth - content.clientWidth));

            animationFrameId = requestAnimationFrame(scrollLoop);
        }

        function isTypingInField() {
            const el = document.activeElement;
            if (!el) return false;
            const tag = (el.tagName || '').toLowerCase();
            return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
        }

        window.addEventListener('keydown', (event) => {
            if (document.body.classList.contains('iframe-modal-open')) return;

            // Don't steal arrow keys from form fields; this is critical for accessibility.
            if (isTypingInField()) return;

            let newDirection = 0;
            if (event.key === 'ArrowLeft') {
                newDirection = -1;
            } else if (event.key === 'ArrowRight') {
                newDirection = 1;
            } else {
                return;
            }

            if (scrollDirection !== newDirection) {
                scrollDirection = newDirection;
                if (!animationFrameId) {
                    animationFrameId = requestAnimationFrame(scrollLoop);
                }
            }

            event.preventDefault();
        });
        
        window.addEventListener('keyup', (event) => {
            if ((event.key === 'ArrowLeft' && scrollDirection === -1) ||
                (event.key === 'ArrowRight' && scrollDirection === 1)) {
                scrollDirection = 0; // Stop scrolling
            }
        });
    }

    // Initialize all functionalities
    initParallax();
    initContentScrolling();
    initMatchBoxHeights();
    initMobileSkillsTabs();
    initIframeModal();
    initKeyboardScrolling();
    initEmojiHover();
 });
