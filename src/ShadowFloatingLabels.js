/**
 * ShadowFloatingLabels is a class designed to enhance form inputs and textareas with floating labels using Shadow DOM.
 * This implementation creates a shadow container for each input or textarea element within the specified selector,
 * moving the placeholder text into a shadow DOM to achieve the floating label effect. The class also handles dynamic
 * style adjustments based on the element's focus and value state, and provides methods to refresh the floating labels
 * when the form elements change dynamically.
 *
 * Author: Gilles Migliori - https://github.com/migliori
 * Version: v1.0.0
 */
class ShadowFloatingLabels {
    /**
     * Constructs the ShadowFloatingLabels object.
     * @param {string} selector - The CSS selector for the form or container holding the inputs/textareas.
     */
    constructor (selector = '.floating-labels') {
        this.selector = selector;
        this.elements = [...document.querySelectorAll(`${selector} input, ${selector} textarea`)];
        this.elementShadowContainerMap = new Map();
        this.init();
        this.bindWindowResizeEvent();
        this.bindFormRefreshEvent();
    }

    /**
     * Initializes the floating labels by creating shadow containers for each element.
     */
    init () {
        this.elements.forEach(el => {
            if (el.placeholder === '') return;
            const shadowContainer = this.createShadowContainer(el);
            el.insertAdjacentElement('afterend', shadowContainer);
            this.bindEvents(el, shadowContainer);
            this.elementShadowContainerMap.set(el, shadowContainer);
        });
    }

    /**
     * Creates a shadow container for an element.
     * @param {HTMLElement} el - The input or textarea element.
     * @returns {HTMLElement} The shadow container element.
     */
    createShadowContainer (el) {
        const parent = el.parentNode;
        const elRect = el.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();
        const elStyle = window.getComputedStyle(el);
        const placeholderStyle = getComputedStyle(el, '::placeholder');

        const shadowContainer = document.createElement('span');
        shadowContainer.attachShadow({ mode: "open" });

        parent.style.position = 'relative';

        Object.assign(shadowContainer.style, {
            position: 'absolute',
            left: `${elRect.left - parentRect.left}px`,
            top: `${elRect.top - parentRect.top}px`,
            width: `${elRect.width}px`,
            height: `${elRect.height}px`,
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
            fontSize: placeholderStyle.fontSize,
            paddingLeft: elStyle.paddingLeft,
            color: placeholderStyle.color,
            zIndex: '1000'
        });

        const shadowLabel = document.createElement('span');
        shadowLabel.textContent = el.placeholder;
        el.placeholder = '';
        this.applyStylesBasedOnElementValue(el, shadowLabel, false);

        shadowContainer.shadowRoot.append(shadowLabel);
        return shadowContainer;
    }

    /**
     * Applies styles to the shadow label based on the element's value and focus state.
     * @param {HTMLElement} el - The input or textarea element.
     * @param {HTMLElement} shadowLabel - The shadow label element.
     * @param {boolean} focus - Whether the element is focused.
     */
    applyStylesBasedOnElementValue (el, shadowLabel, focus) {
        const valueNotEmpty = el.value !== '';
        const elStyle = window.getComputedStyle(el);
        const styles = {
            position: 'absolute',
            display: 'inline-block',
            left: elStyle.paddingLeft,
            padding: '0 .2em',
            marginLeft: '-.2em',
            background: `linear-gradient(to bottom,  rgba(255,255,255,0) 0%,rgba(255,255,255,0) 40%,${elStyle.backgroundColor} 41%,${elStyle.backgroundColor} 59%,rgba(255,255,255,0) 60%,rgba(255,255,255,0) 100%)`,
            transition: 'all .2s ease-in-out'
        };

        Object.entries(styles).forEach(([key, value]) => shadowLabel.style[key] = value);

        if (focus || valueNotEmpty) {
            const lineHeight = parseFloat(getComputedStyle(el, '::placeholder').lineHeight);
            shadowLabel.style.top = `-${lineHeight / 2 * .8}px`;
            shadowLabel.style.opacity = '1';
            shadowLabel.style.fontSize = '0.8em';
        } else {
            const parentHeight = parseFloat(getComputedStyle(el).height);
            const isTextarea = el.tagName.toLowerCase() === 'textarea';
            const topPosition = !isTextarea ? (parentHeight - parseFloat(getComputedStyle(el).lineHeight)) / 2 : 6;
            shadowLabel.style.top = `${topPosition}px`;
            shadowLabel.style.opacity = '0.5';
            shadowLabel.style.fontSize = getComputedStyle(el, '::placeholder').fontSize;
        }
    }

    /**
     * Refreshes the floating labels to account for dynamically added or removed elements.
     */
    refresh () {
        const currentElements = [...document.querySelectorAll(`${this.selector} input, ${this.selector} textarea`)];
        this.elements.forEach(el => {
            if (!currentElements.includes(el)) {
                const shadowContainer = this.elementShadowContainerMap.get(el);
                shadowContainer?.remove();
                this.elementShadowContainerMap.delete(el);
            }
        });
        this.elements = currentElements;
        this.elements.forEach(el => {
            if (!this.elementShadowContainerMap.has(el)) {
                const shadowContainer = this.createShadowContainer(el);
                el.insertAdjacentElement('afterend', shadowContainer);
                this.bindEvents(el, shadowContainer);
                this.elementShadowContainerMap.set(el, shadowContainer);
            } else {
                const shadowContainer = this.elementShadowContainerMap.get(el);
                this.applyStylesBasedOnElementValue(el, shadowContainer.shadowRoot.querySelector('span'), false);
            }
        });
    }

    /**
     * Refreshes the styles of floating labels for specific fields.
     * @param {string} selector - The CSS selector for the specific fields to refresh.
     */
    refreshFields (selector) {
        document.querySelectorAll(selector).forEach(target => {
            if (this.elements.includes(target)) {
                const shadowContainer = this.elementShadowContainerMap.get(target);
                shadowContainer && this.applyStylesBasedOnElementValue(target, shadowContainer.shadowRoot.querySelector('span'), target === document.activeElement);
            }
        });
    }

    /**
     * Updates the positions of the shadow containers, typically called after a window resize.
     */
    updateShadowContainerPositions () {
        this.elementShadowContainerMap.forEach((shadowContainer, el) => {
            const elRect = el.getBoundingClientRect();
            const parentRect = el.parentNode.getBoundingClientRect();
            Object.assign(shadowContainer.style, {
                left: `${elRect.left - parentRect.left}px`,
                top: `${elRect.top - parentRect.top}px`,
                width: `${elRect.width}px`,
                height: `${elRect.height}px`
            });
        });
    }

    /**
     * Binds focus and blur events to an element to adjust the shadow label styles accordingly.
     * @param {HTMLElement} el - The input or textarea element.
     * @param {HTMLElement} shadowContainer - The shadow container element.
     */
    bindEvents (el, shadowContainer) {
        el.addEventListener('focus', () => this.applyStylesBasedOnElementValue(el, shadowContainer.shadowRoot.querySelector('span'), true));
        el.addEventListener('blur', () => this.applyStylesBasedOnElementValue(el, shadowContainer.shadowRoot.querySelector('span'), false));
    }

    /**
     * Binds a refresh event to forms within the specified selector to handle form resets.
     */
    bindFormRefreshEvent () {
        const form = document.querySelector(this.selector) instanceof HTMLFormElement ? document.querySelector(this.selector) : null;
        const forms = form ? [form] : document.querySelectorAll(`${this.selector} form`);
        forms.forEach(form => {
            const resetButton = form.querySelector('[type="reset"]');
            resetButton?.addEventListener('click', () => setTimeout(() => this.refresh(), 0));
        });
    }

    /**
     * Binds a window resize event with a debounce to update the shadow container positions.
     */
    bindWindowResizeEvent () {
        let timeout;
        window.addEventListener('resize', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => this.updateShadowContainerPositions(), 100);
        });
    }
}