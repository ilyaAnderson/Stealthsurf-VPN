const lab = document.querySelector("#server-lab");

if (lab && "IntersectionObserver" in window && "ResizeObserver" in window) {
    const navigation = new AbortController();
    let navigationAt = performance.now();
    window.addEventListener("hashchange", () => { navigationAt = performance.now(); }, { signal: navigation.signal });

    const load = new IntersectionObserver(async ([entry], observer) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        try {
            const { makeServerScene } = await import("./server-scene.js");
            const scene = makeServerScene(lab.querySelector(".server-viewport"));
            const anchor = document.getElementById(location.hash.slice(1));
            // The pin adds scroll distance and can move the destination of an in-flight jump.
            const restoreAnchor = anchor && !lab.contains(anchor) && (lab.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_FOLLOWING)
                && (performance.now() - navigationAt < 1500 || Math.abs(anchor.getBoundingClientRect().top) < 110);
            setupLab(lab, scene);
            if (restoreAnchor) {
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    if (location.hash === "#" + anchor.id) anchor.scrollIntoView({ behavior: "instant" });
                }));
            }
        } catch {
            // The poster and all three chapters are already in the HTML.
        } finally {
            navigation.abort();
        }
    }, { rootMargin: "500px 0px" });
    load.observe(lab);
}

const chapterStops = [0.08, 0.51, 0.89];
const clamp = (value) => Math.max(0, Math.min(1, value));

function setupLab(section, scene) {
    const story = section.querySelector(".server-story");
    const pin = section.querySelector(".server-pin");
    const viewport = section.querySelector(".server-viewport");
    const controls = section.querySelector(".server-controls");
    const progressTrack = section.querySelector(".server-progress");
    const progressBar = progressTrack.querySelector("span");
    const marker = section.querySelector(".server-marker");
    const routeLabels = section.querySelector(".server-route-labels");
    const chapters = [...section.querySelectorAll(".server-chapter")];
    const steps = [...controls.querySelectorAll("button")];
    const parts = [...section.querySelectorAll("[data-server-part]")];
    const partNotes = [...section.querySelectorAll(".server-part-notes > div")];
    const scrollMotion = matchMedia("(prefers-reduced-motion: no-preference) and (min-height: 540px)");
    const events = new AbortController();
    const { signal } = events;

    let frame = null;
    let chapter = -1;
    let manualStep = 0;
    let manualPart = null;
    let activePart = null;
    let visible = false;

    function schedule() {
        if (frame === null) frame = requestAnimationFrame(update);
    }

    function travel() {
        return Math.max(1, story.offsetHeight - pin.offsetHeight);
    }

    function scrollTop() {
        return story.getBoundingClientRect().top - parseFloat(getComputedStyle(pin).top);
    }

    function update() {
        frame = null;
        const progress = scrollMotion.matches ? clamp(-scrollTop() / travel()) : chapterStops[manualStep];
        const next = progress < 0.29 ? 0 : progress < 0.71 ? 1 : 2;

        if (chapter !== next) {
            chapter = next;
            manualPart = null;
            chapters.forEach((panel, index) => { panel.hidden = index !== chapter; });
            steps.forEach((step, index) => step.setAttribute("aria-pressed", String(index === chapter)));
        }

        let part = null;
        if (chapter === 1) {
            const automaticIndex = Math.min(parts.length - 1, Math.floor(clamp((progress - 0.39) / 0.25) * parts.length));
            part = manualPart ?? (scrollMotion.matches ? parts[automaticIndex].dataset.serverPart : "board");
        }
        if (part !== activePart) {
            activePart = part;
            parts.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.serverPart === part)));
            partNotes.forEach((note) => { note.hidden = note.id !== "server-part-" + part; });
        }

        progressBar.style.transform = `scaleX(${progress})`;
        routeLabels.hidden = chapter !== 2;
        const location = scene.render(progress, part);
        marker.hidden = !location;
        if (location) {
            marker.style.left = `${location.x * 100}%`;
            marker.style.top = `${location.y * 100}%`;
        }
    }

    function resize() {
        scene.size(viewport.clientWidth, viewport.clientHeight);
        schedule();
    }

    function configure() {
        manualStep = Math.max(0, chapter);
        section.classList.toggle("is-pinned", scrollMotion.matches);
        resize();
    }

    controls.hidden = false;
    progressTrack.hidden = false;
    section.classList.add("is-ready");
    configure();

    const sizing = new ResizeObserver(resize);
    sizing.observe(viewport);
    const visibility = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) schedule();
    });
    visibility.observe(story);
    window.addEventListener("scroll", () => {
        if (visible && scrollMotion.matches) schedule();
    }, { passive: true, signal });
    scrollMotion.addEventListener("change", configure, { signal });

    steps.forEach((button, index) => {
        button.addEventListener("click", () => {
            if (scrollMotion.matches) {
                window.scrollTo({ top: window.scrollY + scrollTop() + travel() * chapterStops[index] });
            } else {
                manualStep = index;
                schedule();
            }
        }, { signal });
    });
    parts.forEach((button) => {
        button.addEventListener("click", () => {
            manualPart = button.dataset.serverPart;
            schedule();
        }, { signal });
    });

    scene.canvas.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        events.abort();
        sizing.disconnect();
        visibility.disconnect();
        cancelAnimationFrame(frame);
        scene.dispose();
        scene.canvas.remove();
        controls.hidden = progressTrack.hidden = marker.hidden = routeLabels.hidden = true;
        section.classList.remove("is-ready", "is-pinned");
        chapters.concat(partNotes).forEach((panel) => { panel.hidden = false; });
    }, { once: true });
}
