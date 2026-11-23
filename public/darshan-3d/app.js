// Annakut 3D darshan: a streamed Gaussian splat with bilingual hotspots.
//
// The scene is drawn by PlayCanvas's SuperSplat Viewer running headless
// (`ui: false`): it owns the canvas, camera controls and streaming. Everything
// you see on top (hotspot buttons, the info sheet, the language toggle) is
// plain HTML in this file, driven through the viewer's documented handle.
//
// Useful URL switches while testing:
//   ?webgl      force the WebGL 2 renderer (default is WebGPU where available,
//               except in Safari's engine, which gets WebGL 2: see below)
//   ?webgpu     use WebGPU in Safari's engine too (it draws streaks there)
//   ?budget=1   cap the splat budget, in millions
//   ?stats      show the engine's performance graphs
//   ?lang=gu    start in Gujarati
//   ?place      hotspot placement mode: tap the scene to get coordinates
//   ?cam=px,py,pz,tx,ty,tz[,fov]   try a starting camera position and target
//   ?config=name   load site/name.json instead of the default scene, for
//                  example ?config=hotspots for the sample scene
//   ?nolimits   ignore the scene's "viewLimits" (for authoring only)
//   ?walk       start in the walk along the display, if the scene has one
//   ?embed      the page is shown inside another site's page (an iframe): see
//               "embedded" below

import { createViewer } from '@playcanvas/supersplat-viewer/viewer';
import { defaultSettings } from '@playcanvas/supersplat-viewer/settings';
import { Mat4, OrbitController, Picker, Vec2, Vec3 } from 'playcanvas';

// The scene the page opens with: site/<name>.json. Scene descriptions and
// their folders are versioned (last-year-v0, last-year-v1, ...), so putting a
// better model live is a change to this one line.
const DEFAULT_CONFIG = 'annakut-2026';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);

const STRINGS = {
    en: {
        title: 'Annakut Darshan',
        reset: 'Reset view',
        loading: 'Loading 3D scene…',
        hint: 'Drag to look around · pinch to zoom · tap a glowing point',
        hintPlain: 'Drag to look around · pinch to zoom',
        prev: 'Previous',
        next: 'Next',
        close: 'Close',
        walkStart: 'Walk along the display',
        walkNext: 'Move left',
        walkBack: 'Step back to the right',
        walkExit: 'Full view',
        quality: 'quality',
        idle: 'idle',
        failed: 'This device or browser could not start the 3D viewer.'
    },
    gu: {
        title: 'અન્નકૂટ દર્શન',
        reset: 'મૂળ દૃશ્ય',
        loading: '3D દૃશ્ય લોડ થઈ રહ્યું છે…',
        hint: 'ફેરવવા માટે ખેંચો · ઝૂમ માટે પિંચ કરો · ઝબકતા બિંદુ પર ટૅપ કરો',
        hintPlain: 'ફેરવવા માટે ખેંચો · ઝૂમ માટે પિંચ કરો',
        prev: 'પાછળ',
        next: 'આગળ',
        close: 'બંધ કરો',
        walkStart: 'ચાલતાં ચાલતાં દર્શન',
        walkNext: 'ડાબી તરફ આગળ',
        walkBack: 'જમણી તરફ પાછા',
        walkExit: 'પૂરું દૃશ્ય',
        quality: 'quality',
        idle: 'idle',
        failed: 'આ ઉપકરણ અથવા બ્રાઉઝર પર 3D વ્યૂઅર શરૂ થઈ શક્યું નથી.'
    }
};

// localStorage can throw in private windows; the page must work without it.
const store = {
    get(key) {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch {
            /* not saved; fine */
        }
    }
};

// ?embed: this page is shown inside another site's page, in an iframe. That
// page has its own heading and language switch, so the title and the language
// button here are hidden (styles.css, body.embedded), and the language comes
// from the host instead: ?lang= at the start, then a message each time the
// visitor changes it there:
//
//   frame.contentWindow.postMessage({ type: 'annakut-darshan:lang', lang: 'gu' }, location.origin)
//
// This page tells the host how it is doing the same way, with
// { type: 'annakut-darshan:ready' } once the scene is on screen and
// { type: 'annakut-darshan:error', message } if it could not start. Only
// messages from this page's own origin are listened to.
const embedded = params.has('embed');
const MESSAGE = 'annakut-darshan:';
const tellHost = (type, extra = {}) => {
    if (!embedded || window.parent === window) return;
    try {
        window.parent.postMessage({ type: MESSAGE + type, ...extra }, location.origin);
    } catch {
        /* no host to tell; fine */
    }
};

let lang = params.get('lang') || (embedded ? null : store.get('annakut-lang')) || 'en';
if (!STRINGS[lang]) lang = 'en';
// Set once the page's text can be redrawn (in main), so a language message
// that arrives while the scene is still loading is not lost.
let redrawLanguage = null;
if (embedded) {
    document.body.classList.add('embedded');
    window.addEventListener('message', (event) => {
        if (event.origin !== location.origin) return;
        const data = event.data;
        if (!data || data.type !== `${MESSAGE}lang` || !STRINGS[data.lang]) return;
        lang = data.lang;
        document.documentElement.lang = lang;
        if (redrawLanguage) redrawLanguage();
    });
}

const t = (key) => STRINGS[lang][key];
// Picks the current language from a { en, gu } pair, falling back to English.
const tr = (pair) => (pair && (pair[lang] ?? pair.en)) || '';
const round3 = (n) => Math.round(n * 1000) / 1000;

// The viewer applies a camera's field of view to the longer side of the
// screen. A starting view authored on a wide screen would therefore crop the
// sides of the scene on a phone held upright, so step the camera back until
// about the same width is in view (capped, so the scene doesn't get tiny).
//
// With `square` (a scene description's "fitSquare": true) the starting view
// is taken to be framed for a square screen, and the camera steps back on
// wide screens as well as tall ones, until the shorter side shows what the
// square did. Use it when the subject is about as tall as it is wide.
function fitToScreen(pose, square) {
    const aspect = window.innerWidth / window.innerHeight;
    if (aspect >= 1 && !square) return pose;
    const back = square ? Math.min(Math.max(aspect, 1 / aspect), 2.2) : Math.min(1 / aspect, 2);
    const position = pose.position.map((p, i) => round3(pose.target[i] + (p - pose.target[i]) * back));
    return { ...pose, position };
}

// ----- view limits -----------------------------------------------------------
//
// A scene description can hold the camera to a window of views:
//
//   "viewLimits": {
//     "yaw":      [-75, 75],   degrees round the point the camera orbits;
//                              0 looks toward -Z, negative is the visitor's left
//     "pitch":    [0, 75],     degrees above that point's horizon
//     "ground":   0,           height (Y) of the floor
//     "focusBox": { "min": [x, y, z], "max": [x, y, z] },
//                              where the orbited point may go when panning
//     "distance": [1.5, 16]    closest and farthest zoom, from that point
//     "zoom": {                or set the zoom from the screen instead:
//       "boxes": [{ "min": [x, y, z], "max": [x, y, z] }, ...],
//                              the display's shape, as a few boxes
//       "fill": 0.75,          farthest out, the boxes span this much of the
//                              screen (across or up, whichever is tighter)
//       "in": 4                closest in shows the display this many times
//     }                        larger; the start view sits at the farthest
//   }
//
// The viewer's orbit camera is PlayCanvas's OrbitController, which the viewer
// imports from the same 'playcanvas' module as this file. That controller has
// these limits built in (pitch and yaw ranges, a box for its focus point, a
// zoom range) but the viewer leaves them open and its handle cannot set them.
// So they are applied here each time the controller is attached to a pose: on
// entering orbit mode, on reset and on a hotspot fly-to. The controller then
// clamps every drag, pan and pinch, with its usual smoothing.
//
// The ground rule follows from the other two: the camera never goes below the
// point it orbits (lowest pitch 0), and that point never goes below "ground".
// With a "ground", a lower pitch below 0 is therefore raised to 0.
//
// The controller does not clamp the distance of a pose it is attached to, so
// the hook below brings it into the zoom range itself (and, on "Reset view",
// to the farthest zoom, which may have changed if the screen was turned).
//
// The limits in force can change while the page is open: the walk along the
// display (further down) swaps in its own and puts the scene's back after.
let activeLimits = null;
let limitsApplied = false;
let orbitController = null;
let resetting = false;
const attachOrbit = OrbitController.prototype.attach;
OrbitController.prototype.attach = function (pose, smooth) {
    orbitController = this;
    if (activeLimits || limitsApplied) applyViewLimits(this, activeLimits);
    if (activeLimits) {
        const range = activeLimits.distance;
        if (range) pose = poseAtDistance(pose, resetting ? range[1] : Math.min(Math.max(pose.distance, range[0]), range[1]));
    }
    resetting = false;
    return attachOrbit.call(this, pose, smooth);
};

// The same view direction and focus point, from another distance.
function poseAtDistance(pose, distance) {
    if (Math.abs(distance - pose.distance) < 1e-6) return pose;
    const focus = pose.getFocus(new Vec3());
    const from = new Vec3().sub2(pose.position, focus).normalize().mulScalar(distance).add(focus);
    return pose.clone().look(from, focus);
}

// How far from `target`, looking from `position`'s direction, the camera has to
// be for `box` to span `fill` of the screen in its tighter direction. The viewer
// applies the field of view to the screen's longer side.
function fillDistance({ position, target, fov }, boxes, fill) {
    const W = window.innerWidth, H = window.innerHeight;
    const focal = Math.max(W, H) / 2 / Math.tan((fov * Math.PI) / 360);
    const fwd = new Vec3(target[0] - position[0], target[1] - position[1], target[2] - position[2]).normalize();
    const right = new Vec3().cross(fwd, Vec3.UP).normalize();
    const up = new Vec3().cross(right, fwd);
    const corners = [];
    for (const box of boxes)
        for (const x of [box.min[0], box.max[0]])
            for (const y of [box.min[1], box.max[1]])
                for (const z of [box.min[2], box.max[2]]) corners.push(new Vec3(x, y, z));
    const cover = (d) => {
        const cam = new Vec3(...target).sub(fwd.clone().mulScalar(d));
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (const c of corners) {
            const rel = c.clone().sub(cam);
            const z = rel.dot(fwd);
            if (z < 0.05) return Infinity;
            const px = rel.dot(right) / z, py = rel.dot(up) / z;
            x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
        }
        return Math.max(((x1 - x0) * focal) / W, ((y1 - y0) * focal) / H);
    };
    let near = 0.1, far = 1000;
    for (let i = 0; i < 50; i++) {
        const mid = (near + far) / 2;
        if (cover(mid) > fill) near = mid; else far = mid;
    }
    return far;
}

// Turns a "zoom" rule into a distance range for the current screen.
function zoomDistances(start, zoom) {
    const far = fillDistance(start, zoom.boxes, zoom.fill ?? 0.75);
    return [far / (zoom.in ?? 4), far];
}

// Sets the controller's ranges from `limits`. Anything `limits` leaves out, or
// everything when it is null, goes back to what the viewer starts with.
function applyViewLimits(controller, limits) {
    const { yaw, pitch, ground, focusBox, distance } = limits || {};
    if (pitch) {
        const low = Number.isFinite(ground) ? Math.max(pitch[0], 0) : pitch[0];
        // The engine's pitch is negative when looking down, i.e. camera above.
        controller.pitchRange = new Vec2(-pitch[1], -low);
    } else {
        controller.pitchRange = new Vec2(-90, 90);
    }
    controller.yawRange = yaw ? new Vec2(yaw[0], yaw[1]) : new Vec2(-Infinity, Infinity);
    // The focus point's box lives on the controller's target pose (Pose.xRange
    // and friends are public; the controller only exposes the pose privately).
    const focus = controller._targetRootPose;
    const min = focusBox?.min || [-Infinity, -Infinity, -Infinity];
    const max = focusBox?.max || [Infinity, Infinity, Infinity];
    focus.xRange.set(min[0], max[0]);
    focus.yRange.set(Number.isFinite(ground) ? Math.max(min[1], ground) : min[1], max[1]);
    focus.zRange.set(min[2], max[2]);
    controller.zoomRange = distance ? new Vec2(distance[0], distance[1]) : new Vec2(0.01, Infinity);
    limitsApplied = Boolean(limits);
}

// ----- walk along the display ------------------------------------------------
//
// A scene description can offer a walk past the display, the way a visitor
// walks round the front of it:
//
//   "walk": {
//     "eyeHeight": 1.91,     height (Y) of the camera. The view is level, so
//                            whatever is at this height sits halfway up the screen
//     "center":    [0, -0.7],  X and Z of the point the path curves round. The
//                            camera faces it all the way
//     "radius":    6.4,      how far the camera stays from that point
//     "angles":    [45, -45],  where on that circle the walk starts and ends, in
//                            degrees: 0 is straight in front of the display
//                            (toward +Z), positive is the visitor's right
//     "fov":       60,       field of view, across the screen's longer side
//     "stops":     5,        at least this many stops, the two ends included
//     "step":      0.6       and no two stops further apart than this share of
//                            the angle in view across the screen
//   }
//
// The path is an arc of a circle, seen from above. The camera keeps its height,
// its distance from the centre and its field of view for the whole walk, so
// nothing at the centre changes size on the way. The number of stops depends
// on the screen, because a phone held upright sees a narrower strip than a
// wide screen does.
function walkStops(walk) {
    const aspect = Math.min(1, window.innerWidth / window.innerHeight);
    const across = (2 * Math.atan(Math.tan(((walk.fov ?? 60) * Math.PI) / 360) * aspect) * 180) / Math.PI;
    const [from, to] = walk.angles;
    const steps = Math.ceil(Math.abs(to - from) / (across * (walk.step ?? 0.6)));
    const count = Math.max(walk.stops ?? 5, steps + 1, 2);
    return Array.from({ length: count }, (_, i) => round3(from + ((to - from) * i) / (count - 1)));
}

function walkPose(walk, angle) {
    const [x, z] = walk.center;
    const turn = (angle * Math.PI) / 180;
    return {
        position: [round3(x + walk.radius * Math.sin(turn)), walk.eyeHeight, round3(z + walk.radius * Math.cos(turn))],
        target: [x, walk.eyeHeight, z],
        fov: walk.fov ?? 60
    };
}

// During the walk the camera can only go along its path: a drag slides it
// along the arc, and there is no tilting, panning or zoom.
function walkLimits(walk) {
    const [x, z] = walk.center;
    const point = [x, walk.eyeHeight, z];
    return {
        yaw: [Math.min(...walk.angles), Math.max(...walk.angles)],
        pitch: [0, 0],
        focusBox: { min: point, max: point },
        distance: [walk.radius, walk.radius]
    };
}

function showError(error) {
    console.error(error);
    $('loading').classList.add('done');
    const box = $('error');
    box.textContent = `${t('failed')} (${error?.message || error})`;
    box.hidden = false;
    tellHost('error', { message: String(error?.message || error) });
}

async function main() {
    // ?config=name swaps in another scene description from the same folder.
    const wanted = params.get('config') || '';
    const configName = /^[a-z0-9-]+$/.test(wanted) ? wanted : DEFAULT_CONFIG;
    const config = await (await fetch(`${configName}.json`, { cache: 'no-cache' })).json();
    const hotspots = config.hotspots || [];

    // ----- viewer ----------------------------------------------------------

    const settings = defaultSettings();
    if (config.background) settings.background.color = config.background;
    if (config.initialCamera) settings.cameras = [{ initial: config.initialCamera }];
    // ?cam=px,py,pz,tx,ty,tz[,fov] tries a starting view without editing the scene description.
    const cam = (params.get('cam') || '').split(',').map(Number);
    if (cam.length >= 6 && cam.every(Number.isFinite)) {
        settings.cameras = [{ initial: { position: cam.slice(0, 3), target: cam.slice(3, 6), fov: cam[6] || 60 } }];
    }
    // A raw scan is only clean near where the photos were taken, so a scene
    // can opt out of the step-back with "fitPortrait": false.
    const zoom = !params.has('nolimits') && config.viewLimits?.zoom;
    if (zoom && settings.cameras[0]) {
        // The start view is the farthest zoom: the display spans "fill" of the screen.
        const start = settings.cameras[0].initial;
        const far = fillDistance(start, zoom.boxes, zoom.fill ?? 0.75);
        const away = Math.hypot(...start.position.map((p, i) => p - start.target[i]));
        const position = start.position.map((p, i) => round3(start.target[i] + ((p - start.target[i]) * far) / away));
        settings.cameras[0] = { initial: { ...start, position } };
    } else if (config.fitPortrait !== false) {
        settings.cameras = settings.cameras.map((c) => ({ initial: fitToScreen(c.initial, config.fitSquare === true) }));
    }
    // The scene's own limits, which the walk puts back when it ends.
    let sceneLimits = null;
    if (config.viewLimits && !params.has('nolimits')) {
        const limits = { ...config.viewLimits };
        if (zoom) {
            const start = settings.cameras[0]?.initial || config.initialCamera;
            limits.distance = zoomDistances(start, zoom);
            // A turned or resized screen changes how far out the display fills it.
            window.addEventListener('resize', () => {
                limits.distance = zoomDistances(start, zoom);
                if (orbitController && activeLimits === limits) orbitController.zoomRange = new Vec2(...limits.distance);
            });
        }
        // Never let the zoom limit undo the step-back to the starting view.
        const start = settings.cameras[0]?.initial;
        if (start && limits.distance) {
            const away = Math.hypot(...start.position.map((p, i) => p - start.target[i]));
            limits.distance = [limits.distance[0], Math.max(limits.distance[1], away)];
        }
        sceneLimits = activeLimits = limits;
    }
    // Each hotspot is also a viewer annotation, so the viewer can fly the
    // camera to its authored viewpoint. We draw the hotspots ourselves.
    settings.annotations = hotspots.map((h) => ({
        position: h.position,
        title: h.title.en.slice(0, 60),
        text: '',
        extras: { id: h.id },
        camera: { initial: h.camera }
    }));
    // The walk borrows the same fly-to: one more annotation, after the
    // hotspots, whose viewpoint is rewritten for each stop.
    const walk = config.walk || null;
    const walkSlot = hotspots.length;
    if (walk) {
        settings.annotations.push({
            position: [walk.center[0], walk.eyeHeight, walk.center[1]],
            title: 'walk',
            text: '',
            extras: { id: 'walk' },
            camera: { initial: walkPose(walk, walk.angles[0]) }
        });
    }

    const options = {
        container: $('viewer'),
        settings,
        contentUrl: config.scene,
        ui: false,
        // Without this the viewer starts by slowly circling the scene on its own.
        noanim: true
    };
    // Safari's WebGPU draws this scan with heavy brushstroke streaks that
    // WebGL 2 does not (seen on an iPhone in November 2026: the same view was
    // clean with ?webgl). Every browser on an iPhone or iPad runs Safari's
    // engine, and so does Safari on a Mac, so those get WebGL 2 unless
    // ?webgpu asks for WebGPU. Chromium browsers (Chrome, Edge, Brave,
    // Android) carry "Chrome/" in their user agent and keep WebGPU.
    const ua = navigator.userAgent;
    const safariEngine = /AppleWebKit/.test(ua) && !/Chrome\/|Chromium\//.test(ua);
    if (params.has('webgl') || (safariEngine && !params.has('webgpu'))) options.renderer = 'webgl';
    if (params.has('budget')) options.budget = Number(params.get('budget'));
    if (params.has('stats')) options.ministats = true;

    // On phones the viewer starts at its "performance" quality, which draws
    // the scene at half resolution and makes this scan look blocky and noisy.
    // Start every device at "default" (full resolution) instead. The viewer
    // saves a visitor's taps on the readout under the same key. Phones that
    // visited earlier may have "performance" saved from before this fix, so
    // the first visit with it resets anything below "high" once; after that
    // the visitor's own choice is kept.
    //
    // Embedded in another site there are no earlier visits to put right, so
    // the one thing saved is "quality", and only when nothing valid is there.
    if (embedded) {
        if (!['performance', 'default', 'high', 'max'].includes(store.get('quality'))) store.set('quality', 'default');
    } else if (store.get('annakut-quality-reset') === null) {
        if (!['high', 'max'].includes(store.get('quality'))) store.set('quality', 'default');
        store.set('annakut-quality-reset', '1');
    }

    const viewer = await createViewer(options);
    const app = viewer.app;

    // ----- loading ---------------------------------------------------------

    const setProgress = (percent) => {
        $('bar-fill').style.width = `${Math.max(4, Math.min(100, percent))}%`;
    };
    setProgress(viewer.state.progress || 0);
    viewer.events.on('progress:changed', setProgress);

    const whenLoaded = new Promise((resolve) => {
        if (viewer.state.loaded) resolve();
        else viewer.events.once('loaded:changed', resolve);
    });

    // ----- hotspot markers -------------------------------------------------

    const layer = $('markers');
    const markers = hotspots.map((h, index) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'marker';
        el.innerHTML = '<span class="dot"></span><span class="label"></span>';
        el.addEventListener('click', () => openHotspot(index));
        layer.appendChild(el);
        return {
            el,
            label: el.querySelector('.label'),
            position: new Vec3(h.position[0], h.position[1], h.position[2]),
            visible: false,
            x: NaN,
            y: NaN
        };
    });

    let camera = null;
    const findCamera = () => app.root.findComponents('camera').find((c) => c.enabled && c.entity.enabled) || null;
    const getCamera = () => {
        if (!camera || !camera.entity || !camera.enabled) camera = findCamera();
        return camera;
    };

    // Re-project every hotspot into screen space each frame. The viewer only
    // renders when something changes, but this loop is cheap enough to run
    // always and keeps the buttons glued to the scene while the camera moves.
    const worldToCamera = new Mat4();
    const inCamera = new Vec3();
    const onScreen = new Vec3();
    const placeMarkers = () => {
        const cam = getCamera();
        if (cam) {
            worldToCamera.copy(cam.entity.getWorldTransform()).invert();
            for (const m of markers) {
                // The camera looks down its own -Z axis.
                worldToCamera.transformPoint(m.position, inCamera);
                const inFront = inCamera.z < -cam.nearClip;
                if (inFront) {
                    cam.worldToScreen(m.position, onScreen);
                    const x = Math.round(onScreen.x * 2) / 2;
                    const y = Math.round(onScreen.y * 2) / 2;
                    if (x !== m.x || y !== m.y) {
                        m.x = x;
                        m.y = y;
                        m.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
                    }
                }
                if (inFront !== m.visible) {
                    m.visible = inFront;
                    m.el.classList.toggle('show', inFront);
                }
            }
        }
        requestAnimationFrame(placeMarkers);
    };

    // ----- info sheet ------------------------------------------------------

    const sheet = $('sheet');
    let current = null;

    const renderSheet = () => {
        if (current === null) return;
        const h = hotspots[current];
        const image = $('sheet-image');
        if (image.getAttribute('src') !== h.image) image.src = h.image;
        image.alt = tr(h.title);
        $('sheet-title').textContent = tr(h.title);
        const subtitle = (h.subtitle && h.subtitle[lang]) || '';
        $('sheet-subtitle').textContent = subtitle;
        $('sheet-subtitle').hidden = !subtitle;
        $('sheet-body').textContent = tr(h.body);
        $('counter').textContent = `${current + 1} / ${hotspots.length}`;
    };

    function openHotspot(index) {
        // A hotspot's viewpoint is outside the walk's track.
        if (walking) leaveWalk(false);
        current = (index + hotspots.length) % hotspots.length;
        viewer.selectAnnotation(current);
        markers.forEach((m, i) => m.el.classList.toggle('active', i === current));
        renderSheet();
        sheet.querySelector('.sheet-scroll').scrollTop = 0;
        sheet.classList.add('open');
        sheet.setAttribute('aria-hidden', 'false');
        document.body.classList.add('sheet-open');
        hideHint();
    }

    function closeSheet() {
        if (current === null) return;
        current = null;
        viewer.selectAnnotation(null);
        markers.forEach((m) => m.el.classList.remove('active'));
        sheet.classList.remove('open');
        sheet.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('sheet-open');
    }

    $('sheet-close').addEventListener('click', closeSheet);
    $('prev').addEventListener('click', () => openHotspot(current - 1));
    $('next').addEventListener('click', () => openHotspot(current + 1));
    window.addEventListener('keydown', (event) => {
        if (current === null) return;
        if (event.key === 'Escape') closeSheet();
        if (event.key === 'ArrowLeft') openHotspot(current - 1);
        if (event.key === 'ArrowRight') openHotspot(current + 1);
    });

    $('reset').addEventListener('click', () => {
        closeSheet();
        if (!viewer.state.loaded) return;
        if (walking) {
            leaveWalk(true);
            return;
        }
        resetting = true;
        viewer.resetCamera();
    });

    // ----- walk along the display ------------------------------------------

    let walking = false;
    let walkAngles = [];
    let walkIndex = 0;

    const renderWalk = () => {
        if (!walk) return;
        $('walk-start').hidden = walking;
        $('walk-steps').hidden = !walking;
        $('walk-start').textContent = t('walkStart');
        $('walk-next').textContent = `‹ ${t('walkNext')}`;
        $('walk-next').disabled = walkIndex >= walkAngles.length - 1;
        $('walk-back').disabled = walkIndex <= 0;
        $('walk-back').setAttribute('aria-label', t('walkBack'));
        $('walk-exit').textContent = t('walkExit');
        $('walk-count').textContent = `${walkIndex + 1} / ${walkAngles.length}`;
    };

    // The viewer's keyboard and gamepad move the camera freely (see the note
    // where the scene starts), so they are off whenever limits are in force.
    let freeInput = null;
    const syncInput = () => {
        const state = viewer.state;
        if (activeLimits && !freeInput) {
            freeInput = { inputEnabled: state.inputEnabled, gamingControls: state.gamingControls };
            state.inputEnabled = false;
            state.gamingControls = false;
        } else if (!activeLimits && freeInput) {
            state.inputEnabled = freeInput.inputEnabled;
            state.gamingControls = freeInput.gamingControls;
            freeInput = null;
        }
    };

    // Glides to a stop, with the viewer's own fly-to.
    function goToStop(index) {
        walkIndex = Math.min(Math.max(index, 0), walkAngles.length - 1);
        viewer.annotations[walkSlot].camera = { initial: walkPose(walk, walkAngles[walkIndex]) };
        viewer.selectAnnotation(walkSlot);
        renderWalk();
    }

    function enterWalk() {
        if (!walk || walking || !viewer.state.loaded) return;
        closeSheet();
        walking = true;
        document.body.classList.add('walking');
        walkAngles = walkStops(walk);
        activeLimits = walkLimits(walk);
        syncInput();
        hideHint();
        goToStop(0);
    }

    // Ends the walk. With `reset` the camera goes back to the full view;
    // without, the caller is about to send it somewhere else.
    function leaveWalk(reset) {
        if (!walking) return;
        walking = false;
        document.body.classList.remove('walking');
        activeLimits = sceneLimits;
        syncInput();
        viewer.selectAnnotation(null);
        renderWalk();
        if (reset) {
            resetting = true;
            viewer.resetCamera();
        }
    }

    if (walk) {
        $('walk-start').addEventListener('click', enterWalk);
        $('walk-next').addEventListener('click', () => goToStop(walkIndex + 1));
        $('walk-back').addEventListener('click', () => goToStop(walkIndex - 1));
        $('walk-exit').addEventListener('click', () => leaveWalk(true));
        const leftward = walk.angles[1] < walk.angles[0] ? 1 : -1;
        window.addEventListener('keydown', (event) => {
            if (!walking) return;
            if (event.key === 'Escape') leaveWalk(true);
            if (event.key === 'ArrowLeft') goToStop(walkIndex + leftward);
            if (event.key === 'ArrowRight') goToStop(walkIndex - leftward);
        });
        // After a drag along the path, carry on from the stop nearest to
        // where the visitor let go.
        const afterDrag = () => {
            if (!walking || !orbitController) return;
            const angle = orbitController._targetRootPose.angles.y;
            let nearest = 0;
            walkAngles.forEach((a, i) => {
                if (Math.abs(a - angle) < Math.abs(walkAngles[nearest] - angle)) nearest = i;
            });
            if (nearest !== walkIndex) {
                walkIndex = nearest;
                renderWalk();
            }
        };
        $('viewer').addEventListener('pointerup', afterDrag, { passive: true });
        $('viewer').addEventListener('pointercancel', afterDrag, { passive: true });
        // A turned or resized screen sees a different width, so the stops move.
        window.addEventListener('resize', () => {
            if (!walking) return;
            const done = walkAngles.length > 1 ? walkIndex / (walkAngles.length - 1) : 0;
            walkAngles = walkStops(walk);
            goToStop(Math.round(done * (walkAngles.length - 1)));
        });
    }

    // ----- hint ------------------------------------------------------------

    const hint = $('hint');
    let hintTimer = 0;
    function hideHint() {
        clearTimeout(hintTimer);
        hint.classList.remove('show');
    }
    $('viewer').addEventListener('pointerdown', hideHint, { passive: true });

    // ----- language --------------------------------------------------------

    const applyLanguage = () => {
        document.documentElement.lang = lang;
        document.body.dataset.lang = lang;
        $('site-title').textContent = t('title');
        $('reset').textContent = t('reset');
        $('loading-label').textContent = t('loading');
        $('prev-label').textContent = t('prev');
        $('next-label').textContent = t('next');
        $('sheet-close').setAttribute('aria-label', t('close'));
        // A scene without hotspots has no glowing points to mention.
        hint.textContent = t(hotspots.length ? 'hint' : 'hintPlain');
        markers.forEach((m, i) => {
            m.label.textContent = tr(hotspots[i].title);
            m.el.setAttribute('aria-label', tr(hotspots[i].title));
        });
        renderSheet();
        renderWalk();
    };
    redrawLanguage = applyLanguage;

    $('lang').addEventListener('click', () => {
        lang = lang === 'en' ? 'gu' : 'en';
        store.set('annakut-lang', lang);
        applyLanguage();
    });

    // ----- test readout (renderer, quality, frame rate) --------------------

    const debug = $('debug');
    const frameTimes = [];
    app.on('framerender', () => {
        const now = performance.now();
        frameTimes.push(now);
        while (frameTimes.length && frameTimes[0] < now - 1000) frameTimes.shift();
    });
    const renderer = app.graphicsDevice.isWebGPU ? 'WebGPU' : 'WebGL 2';
    let firstFrame = '';
    const updateDebug = () => {
        const now = performance.now();
        const fps = frameTimes.filter((time) => time > now - 1000).length;
        const speed = fps > 1 ? `${fps} fps` : t('idle');
        debug.textContent = `${renderer} · ${viewer.state.quality} ${t('quality')} · ${speed}${firstFrame}`;
    };
    setInterval(updateDebug, 500);
    debug.addEventListener('click', () => {
        const levels = viewer.state.qualityAvailable || [];
        if (!levels.length) return;
        viewer.state.quality = levels[(levels.indexOf(viewer.state.quality) + 1) % levels.length];
        updateDebug();
    });

    if (config.credit) {
        $('credit').textContent = config.credit.text;
        // A credit without a "url" is plain text, not a link.
        if (config.credit.url) $('credit').href = config.credit.url;
    }

    // ----- start -----------------------------------------------------------

    applyLanguage();
    updateDebug();

    await whenLoaded;
    // Time from opening the page to the first complete picture of the scene.
    firstFrame = ` · first view ${(performance.now() / 1000).toFixed(1)}s`;
    // Start still, in the authored view, ready for the visitor to drag.
    if (viewer.state.cameraMode !== 'orbit') viewer.state.cameraMode = 'orbit';
    // The limits are on the orbit camera only. The viewer's keyboard (WASD,
    // arrows, 2 and 3) and gamepad switch to free fly and walk modes, so those
    // inputs are off while limits are in force, and the camera goes straight
    // back into orbit if anything else switches it.
    syncInput();
    viewer.events.on('cameraMode:changed', (mode) => {
        if (activeLimits && mode !== 'orbit') viewer.state.cameraMode = 'orbit';
    });
    if (walk) {
        document.body.classList.add('has-walk');
        $('walk').hidden = false;
        renderWalk();
    }
    $('loading').classList.add('done');
    document.body.classList.add('ready');
    tellHost('ready');
    requestAnimationFrame(placeMarkers);

    hint.hidden = false;
    requestAnimationFrame(() => hint.classList.add('show'));
    hintTimer = setTimeout(hideHint, 7000);

    if (params.has('place')) enablePlaceMode(viewer, getCamera);
    if (walk && params.has('walk')) enterWalk();
}

// ---------------------------------------------------------------------------
// Placement mode (?place): tap a spot in the scene to get its 3D coordinates
// and the current camera viewpoint, ready to paste into hotspots.json.
// ---------------------------------------------------------------------------
function enablePlaceMode(viewer, getCamera) {
    const app = viewer.app;
    const canvas = app.graphicsDevice.canvas;
    const picker = new Picker(app, 1, 1, true);

    const pickAt = async (x, y) => {
        const cam = getCamera();
        if (!cam) return null;
        picker.resize(canvas.clientWidth, canvas.clientHeight);
        picker.prepare(cam, app.scene);
        const point = await picker.getWorldPointAsync(x, y);
        return point ? [round3(point.x), round3(point.y), round3(point.z)] : null;
    };

    const cameraPosition = () => {
        const p = getCamera().entity.getPosition();
        return [round3(p.x), round3(p.y), round3(p.z)];
    };

    // The current view as a camera pose: where the camera is, and the point
    // of the scene at the centre of the screen.
    const currentView = async () => {
        const cam = getCamera();
        let target = await pickAt(canvas.clientWidth / 2, canvas.clientHeight / 2);
        if (!target) {
            const p = cam.entity.getPosition();
            const f = cam.entity.forward;
            target = [round3(p.x + f.x * 3), round3(p.y + f.y * 3), round3(p.z + f.z * 3)];
        }
        return { position: cameraPosition(), target, fov: round3(cam.fov) };
    };

    const panel = document.createElement('div');
    panel.className = 'place-panel';
    panel.innerHTML = `
        <strong>Placement mode</strong>
        <span>Tap the scene to record a hotspot from the current viewpoint.</span>
        <textarea readonly rows="7"></textarea>
        <div class="place-actions">
            <button type="button" data-action="view">Record current view</button>
            <button type="button" data-action="copy">Copy</button>
            <button type="button" data-action="clear">Clear</button>
        </div>`;
    document.body.appendChild(panel);
    const output = panel.querySelector('textarea');
    const records = [];
    const refresh = () => {
        output.value = records.map((r) => JSON.stringify(r)).join(',\n');
        output.scrollTop = output.scrollHeight;
    };

    panel.addEventListener('click', async (event) => {
        const action = event.target.dataset?.action;
        if (action === 'view') {
            records.push({ initialCamera: await currentView() });
            refresh();
        } else if (action === 'copy') {
            try {
                await navigator.clipboard.writeText(output.value);
            } catch {
                output.select();
            }
        } else if (action === 'clear') {
            records.length = 0;
            refresh();
        }
    });

    // A tap is a short press that barely moves; anything else is a camera drag.
    let down = null;
    const container = viewer.app.graphicsDevice.canvas.parentElement;
    container.addEventListener('pointerdown', (event) => {
        down = { x: event.clientX, y: event.clientY, time: performance.now() };
    }, { passive: true });
    container.addEventListener('pointerup', async (event) => {
        if (!down) return;
        const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
        const quick = performance.now() - down.time < 400;
        down = null;
        if (moved > 6 || !quick) return;
        const rect = canvas.getBoundingClientRect();
        const position = await pickAt(event.clientX - rect.left, event.clientY - rect.top);
        if (!position) return;
        const cam = getCamera();
        records.push({ position, camera: { position: cameraPosition(), target: position, fov: round3(cam.fov) } });
        refresh();
    }, { passive: true });

    // Handy from the browser console while authoring.
    window.annakut = { viewer, pickAt, currentView, records };
}

main().catch(showError);
