const clamp = value => Math.max(0, Math.min(1, value));
const page = document.querySelector('.phone-section');
const pin = page.querySelector('.phone-pin');
const steps = [...page.querySelectorAll('[data-phone-step]')];
const note = document.querySelector('#phone-note');
const phoneFigure = page.querySelector('.phone-figure');
const phonePoster = phoneFigure.querySelector('img');
const states = [
    ['Профиль открыт. Пока VPN выключен, трафик идёт обычным маршрутом.', 'phone-studio.webp', 'VPN выключен. В профиле выбран Амстердам.'],
    ['Приложение устанавливает зашифрованное соединение с сервером в Амстердаме.', 'phone-link.webp', 'VPN подключается. На карте появляется маршрут к серверу.'],
    ['Туннель открыт. Теперь приложение отправляет пакеты через VPN-сервер.', 'phone-online.webp', 'VPN подключён. Маршрут к серверу открыт.'],
];
const stops = [0.08, 0.50, 0.88];
const routerNote = document.querySelector('#router-note');
const routerPoster = document.querySelector('.router-view img');
const routerButtons = [...document.querySelectorAll('[data-router-view]')];
const motion = matchMedia('(prefers-reduced-motion: no-preference)');
const sticky = matchMedia('(min-height: 670px)');
const pictures = [...document.querySelectorAll('[data-product]')];
const imports = {
    connector: () => import('./connector-model.js').then(module => module.createConnector()),
    phone: () => import('./phone-model.js').then(module => module.createPhone()),
    router: () => import('./router-model.js').then(module => module.createRouter()),
};
const models = new Map();
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
let activePicture, studio, studioPromise, raf, manualPhone, routerChoice, renderedStage = -1;
let lastProgress, lastMotion, lastWidth, lastHeight, lastRouterChoice;
let hiddenContext = false;

function viewProgress(element) {
    const bounds = element.getBoundingClientRect();
    return clamp((innerHeight - bounds.top) / (innerHeight + bounds.height));
}

function phonePosition() {
    const padding = getComputedStyle(page);
    const header = document.querySelector('.site-header').offsetHeight;
    const start = page.getBoundingClientRect().top + parseFloat(padding.paddingTop) - header;
    const travel = Math.max(1, page.offsetHeight - pin.offsetHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom));
    return { start, travel };
}

function phoneProgress() {
    if (manualPhone) {
        if (!motion.matches || Math.abs(window.scrollY - manualPhone.y) < 48) return manualPhone.stop;
        manualPhone = undefined;
    }
    if (page.classList.contains('is-pinned')) {
        const { start, travel } = phonePosition();
        return clamp(-start / travel);
    }
    const bounds = phoneFigure.getBoundingClientRect();
    return motion.matches ? clamp((innerHeight * .69 - bounds.top) / Math.max(bounds.height * .86, 1)) : 0;
}

function phoneStatus(progress) {
    const stage = progress < .33 ? 0 : progress < .66 ? 1 : 2;
    if (stage === renderedStage) return;
    renderedStage = stage;
    const [text, photo, alt] = states[stage];
    note.textContent = text;
    if (phonePoster.getAttribute('src') !== 'Photo/' + photo) phonePoster.src = 'Photo/' + photo;
    phonePoster.alt = alt;
    steps.forEach((button, index) => button.setAttribute('aria-pressed', String(index === stage)));
}

function visibleArea(element) {
    const {top, bottom, width} = element.getBoundingClientRect();
    return Math.max(0, Math.min(bottom, innerHeight) - Math.max(top, 0)) * width;
}

function schedule() {
    if (!raf) raf = requestAnimationFrame(draw);
}

function prepare(name) {
    if (hiddenContext) return;
    studioPromise ??= import('./studio.js').then(({createStudio}) => {
        studio = createStudio(canvas);
        hiddenContext = !studio;
        return studio;
    }).catch(() => { hiddenContext = true; });
    if (!models.has(name)) {
        models.set(name, { pending: true });
        studioPromise.then(renderer => renderer && imports[name]()).then(model => {
            models.set(name, { model });
            schedule();
        }).catch(() => { models.set(name, {}); });
    }
}

function draw() {
    raf = null;
    const progress = phoneProgress();
    phoneStatus(progress);
    if (hiddenContext || document.hidden) return;

    const [picture, area] = pictures.reduce(([best, maximum], element) => {
        const size = visibleArea(element);
        return size > maximum ? [element, size] : [best, maximum];
    }, [null, 0]);
    if (!area) return;
    const name = picture.dataset.product;
    prepare(name);
    const model = models.get(name)?.model;
    if (!model || !studio) return;

    const width = picture.clientWidth;
    const height = picture.clientHeight;
    const reduced = !motion.matches;
    let position = reduced ? 0 : viewProgress(picture);
    if (name === 'phone') position = progress;
    if (name === 'router' && routerChoice !== undefined) position = routerChoice;
    if (name === 'connector') position = clamp(2 * position - 1);
    if (picture === activePicture && width === lastWidth && height === lastHeight
        && reduced === lastMotion && routerChoice === lastRouterChoice && Math.abs(position - lastProgress) < .002) return;

    if (picture !== activePicture) {
        activePicture?.classList.remove('has-model');
        picture.append(canvas);
        activePicture = picture;
    }
    const staticPose = reduced && (name !== 'router' || routerChoice === undefined);
    studio.draw(model, position, staticPose, width, height, name, name === 'router' ? routerChoice : undefined);
    picture.classList.add('has-model');
    lastWidth = width;
    lastHeight = height;
    lastMotion = reduced;
    lastProgress = position;
    lastRouterChoice = routerChoice;
}

function configure() {
    manualPhone = undefined;
    page.classList.toggle('is-pinned', motion.matches && sticky.matches);
    schedule();
}

steps.forEach((button, index) => {
    button.addEventListener('click', () => {
        const stop = stops[index];
        if (page.classList.contains('is-pinned')) {
            const { start, travel } = phonePosition();
            window.scrollTo({top: window.scrollY + start + travel * stop, behavior: 'instant'});
        } else {
            if (sticky.matches === false && index !== 0) phoneFigure.scrollIntoView({block: 'nearest', behavior: 'instant'});
            manualPhone = { stop, y: window.scrollY };
        }
        schedule();
    });
});
page.querySelector('.phone-steps').hidden = false;

routerButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
        routerChoice = index;
        routerPoster.src = index === 0 ? 'Photo/router-studio.webp' : 'Photo/router-ports.webp';
        routerPoster.alt = index === 0
            ? 'Светлый роутер с двумя антеннами'
            : 'Разъёмы питания, WAN, LAN 1 и LAN 2 на роутере';
        routerButtons.forEach((item, i) => item.setAttribute('aria-pressed', String(i === index)));
        routerNote.textContent = index === 0
            ? 'Две антенны принимают и передают радиосигнал между роутером и устройствами дома.'
            : 'Синий WAN-порт ведёт к провайдеру. К портам LAN подключают технику дома.';
        schedule();
    });
});
document.querySelector('.router-switch').hidden = false;

canvas.addEventListener('webglcontextlost', () => {
    hiddenContext = true;
    studio?.dispose();
    activePicture?.classList.remove('has-model');
    canvas.remove();
});
const nearby = new IntersectionObserver(entries => {
    for (const {isIntersecting, target} of entries) {
        if (isIntersecting) { prepare(target.dataset.product); nearby.unobserve(target); }
    }
}, {rootMargin: '180px 0px'});
const sizing = new ResizeObserver(schedule);
for (const picture of pictures) { nearby.observe(picture); sizing.observe(picture); }
window.addEventListener('scroll', schedule, {passive:true});
window.addEventListener('resize', schedule, {passive:true});
document.addEventListener('visibilitychange', schedule);
motion.addEventListener('change', configure);
sticky.addEventListener('change', configure);
configure();
