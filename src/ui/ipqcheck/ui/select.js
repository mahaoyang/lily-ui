const CHEVRON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="arrow">
  <polyline points="6 9 12 15 18 9"></polyline>
</svg>
`.trim();

function isElement(node) {
    return node && typeof node === 'object' && node.nodeType === 1;
}

export function setupLilySelects(root = document) {
    const scope = root || document;
    const selects = scope.querySelectorAll?.('select.select:not([data-lily-select-upgraded])') || [];
    selects.forEach((select) => upgradeSelect(select));
}

function upgradeSelect(select) {
    if (!isElement(select) || select.tagName !== 'SELECT') return;
    select.dataset.lilySelectUpgraded = '1';
    select.classList.add('lily-select-native');

    const container = document.createElement('div');
    container.className = 'lily-select-container';
    select.parentNode.insertBefore(container, select);
    container.appendChild(select);

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'lily-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const label = document.createElement('span');
    label.className = 'label';
    trigger.appendChild(label);
    trigger.innerHTML += CHEVRON_SVG;

    const dropdown = document.createElement('div');
    dropdown.className = 'lily-select-dropdown';
    dropdown.setAttribute('role', 'listbox');

    container.appendChild(trigger);
    container.appendChild(dropdown);

    let portalParent = null;
    let lastPortalRect = null;

    const updateTrigger = () => {
        const selectedOption = select.options[select.selectedIndex];
        trigger.querySelector('.label').textContent = selectedOption ? selectedOption.textContent : '';
    };

    const buildOptions = () => {
        dropdown.innerHTML = '';
        Array.from(select.options).forEach((opt, index) => {
            const item = document.createElement('div');
            item.className = 'lily-select-option';
            if (index === select.selectedIndex) item.classList.add('is-selected');
            if (opt.disabled) item.classList.add('is-disabled');
            item.textContent = opt.textContent;
            item.dataset.index = index;

            item.addEventListener('click', (e) => {
                if (opt.disabled) return;
                select.selectedIndex = index;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                closeDropdown();
            });

            dropdown.appendChild(item);
        });
    };

    const toggleDropdown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('is-open');
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    };

    const openDropdown = () => {
        // Close other open selects first
        document.querySelectorAll('.lily-select-dropdown.is-open').forEach(d => {
            if (d !== dropdown) d.classList.remove('is-open');
        });

        buildOptions();

        // Portal the dropdown to <body> so it's not clipped by overflow/stacking contexts.
        if (!portalParent) portalParent = dropdown.parentNode;
        if (dropdown.parentNode !== document.body) {
            document.body.appendChild(dropdown);
        }
        dropdown.classList.add('is-open', 'is-portal');
        trigger.setAttribute('aria-expanded', 'true');

        positionPortal();
    };

    const closeDropdown = () => {
        dropdown.classList.remove('is-open', 'is-portal');
        trigger.setAttribute('aria-expanded', 'false');
        dropdown.style.left = '';
        dropdown.style.top = '';
        dropdown.style.width = '';
        dropdown.style.bottom = '';
        dropdown.style.maxHeight = '';
        dropdown.style.position = '';
        if (portalParent && dropdown.parentNode === document.body) {
            portalParent.appendChild(dropdown);
        }
    };

    const positionPortal = () => {
        if (!dropdown.classList.contains('is-open')) return;
        const rect = container.getBoundingClientRect();
        lastPortalRect = rect;

        const maxHeight = 240;
        const gap = 4;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const openUp = spaceBelow < maxHeight + gap && spaceAbove > maxHeight + gap;

        dropdown.style.position = 'fixed';
        dropdown.style.left = `${Math.max(0, rect.left)}px`;
        dropdown.style.width = `${Math.max(0, rect.width)}px`;
        dropdown.style.right = 'auto';
        dropdown.style.bottom = 'auto';
        dropdown.style.maxHeight = `${maxHeight}px`;
        dropdown.style.top = openUp ? `${Math.max(0, rect.top - gap)}px` : `${Math.max(0, rect.bottom + gap)}px`;
        dropdown.style.transform = openUp ? 'translateY(-100%)' : 'translateY(0)';
    };

    trigger.addEventListener('click', toggleDropdown);

    select.addEventListener('change', () => {
        updateTrigger();
        buildOptions();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            closeDropdown();
        }
    });

    window.addEventListener(
        'scroll',
        () => {
            if (!dropdown.classList.contains('is-open')) return;
            // Avoid expensive work if the element didn't move on screen.
            const rect = container.getBoundingClientRect();
            if (lastPortalRect && rect.left === lastPortalRect.left && rect.top === lastPortalRect.top && rect.width === lastPortalRect.width) return;
            positionPortal();
        },
        true,
    );
    window.addEventListener('resize', () => positionPortal(), { passive: true });

    updateTrigger();
}

export function refreshLilySelects(root = document) {
    const scope = root || document;
    setupLilySelects(scope);
}
