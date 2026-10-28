import * as THREE from 'three';

const _VS = `
varying vec3 vColor;
varying float vOpacity;
uniform float uTime;
uniform float uPixelRatio;

attribute float aSize;
attribute float aBrightness;
attribute float aIsLand;
attribute float aIsGrid;
attribute float aRandom; 

// Simplex 3D noise utilities
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - D.yyy;
  i = mod(i, 289.0); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 1.0/7.0;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

// Low-frequency noise for large clouds
float fbm(vec3 p) {
    float v = 0.0;
    // Scale down frequency for "Big Clouds"
    v += snoise(p * 0.003) * 0.60;
    v += snoise(p * 0.007) * 0.30;
    return v;
}

void main() {
    vec3 pos = position;
    
    // Altitude for Land
    float h = aIsLand * 6.0; 
    vec3 vNormal = normalize(pos);
    pos += vNormal * h;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    float baseSize = aSize * (200.0 / -mvPosition.z);
    gl_PointSize = uPixelRatio * baseSize * (aIsLand > 0.5 ? 1.2 : 0.8);
    
    // RESTORED BRIGHTNESS
    vec3 landColor = vec3(0.9, 0.9, 0.95); // Brighter tech white
    vec3 gridColor = vec3(0.35, 0.35, 0.4); // More visible grid
    vec3 seaColor = vec3(0.06, 0.06, 0.08);
    
    vColor = mix(seaColor, landColor, aIsLand);
    if(aIsGrid > 0.5) vColor = gridColor;
    
    // LARGE CLOUD FBM DRIFT
    vec3 cloudPos = position + vec3(uTime * 15.0, uTime * 20.0, uTime * 10.0);
    float cloudNoise = fbm(cloudPos);
    
    // Rescale noise to get clear "Big" patches
    float cloudMask = smoothstep(-0.3, 0.3, cloudNoise);
    
    // Boosted opacity for better impact
    vOpacity = mix(0.1, 0.95, aIsLand) * mix(0.5, 1.0, cloudMask);
    
    if(aIsGrid > 0.5) vOpacity = 0.35;
}
`;

const _FS = `
varying vec3 vColor;
varying float vOpacity;

void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float square = max(abs(cxy.x), abs(cxy.y));
    if (square > 0.9) discard;
    gl_FragColor = vec4(vColor, vOpacity);
}
`;

export class Particles {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.options = options && typeof options === 'object' ? options : {};

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.scene = new THREE.Scene();
        const { width, height } = this.getSize();
        this.camera = new THREE.PerspectiveCamera(35, width / height, 1, 10000);
        this.clock = new THREE.Clock();
        this.baseRadius = 0;
        this.globeScale = 1;

        this.init();
        this.animate();
        window.addEventListener('resize', () => this.onResize(), { passive: true });
        if (typeof ResizeObserver === 'function') {
            this._ro = new ResizeObserver(() => this.onResize());
            this._ro.observe(this.canvas);
        }
    }

    getSize() {
        const rect = this.canvas.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width || 1));
        const height = Math.max(1, Math.round(rect.height || 1));
        return { width, height };
    }

    async init() {
        const { width, height } = this.getSize();
        this.renderer.setSize(width, height, false);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const minSide = Math.min(width, height);
        // Cap scaling so the globe doesn't get cropped in background canvases.
        const scale = Math.max(0.85, Math.min(1.0, minSide / 520));
        const globeScale = scale * 0.84;
        this.globeScale = globeScale;

        const radius = 265;
        this.baseRadius = radius;
        const totalPoints = 90000;
        const positions = new Float32Array(totalPoints * 3);
        const sizes = new Float32Array(totalPoints);
        const isLandAttr = new Float32Array(totalPoints);
        const isGridAttr = new Float32Array(totalPoints);

        const worldImg = new Image();
        worldImg.crossOrigin = "anonymous";
        worldImg.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/World_map_blank_without_borders.svg/2048px-World_map_blank_without_borders.svg.png";

        await new Promise((resolve) => {
            worldImg.onload = resolve;
            worldImg.onerror = resolve;
        });

        const mapCanvas = document.createElement('canvas');
        mapCanvas.width = 1024;
        mapCanvas.height = 512;
        const ctx = mapCanvas.getContext('2d');
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 1024, 512);
        if (worldImg.complete && worldImg.naturalWidth > 0) ctx.drawImage(worldImg, 0, 0, 1024, 512);
        const pixels = ctx.getImageData(0, 0, 1024, 512).data;

        for (let i = 0; i < totalPoints; i++) {
            const phi = Math.acos(-1 + (2 * i) / totalPoints);
            const theta = Math.sqrt(totalPoints * Math.PI) * phi;
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.cos(phi);
            const z = radius * Math.sin(phi) * Math.sin(theta);
            const u = 1 - (theta % (Math.PI * 2)) / (2 * Math.PI);
            const v = phi / Math.PI;
            const px = Math.floor(u * 1023);
            const py = Math.floor(v * 511);
            const idx = (py * 1024 + px) * 4;
            const isLand = pixels[idx] > 120;
            const isGrid = (Math.abs(fract(u * 36.0)) < 0.04) || (Math.abs(fract(v * 18.0)) < 0.04);

            positions[i * 3 + 0] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            isLandAttr[i] = isLand ? 1.0 : 0.0;
            isGridAttr[i] = isGrid ? 1.0 : 0.0;
            if (isLand) sizes[i] = 1.6 + Math.random() * 2.8;
            else if (isGrid) sizes[i] = 1.0;
            else sizes[i] = (Math.random() > 0.04) ? 0 : 0.5;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('aIsLand', new THREE.BufferAttribute(isLandAttr, 1));
        geometry.setAttribute('aIsGrid', new THREE.BufferAttribute(isGridAttr, 1));
        this.material = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, uPixelRatio: { value: this.renderer.getPixelRatio() } },
            vertexShader: _VS, fragmentShader: _FS, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const points = new THREE.Points(geometry, this.material);
        this.globeContainer = new THREE.Group();
        this.pointsGroup = new THREE.Group();
        this.pointsGroup.add(points);
        this.globeContainer.add(this.pointsGroup);
        this.globeContainer.rotation.z = Math.PI * (30 / 180);
        this.globeContainer.rotation.x = 0.2;
        this.globeContainer.scale.setScalar(globeScale);
        this.scene.add(this.globeContainer);
        this.fitCameraToGlobe();
        this.initialized = true;
    }

    fitCameraToGlobe() {
        // Lower padding => globe appears larger while still fitting the view.
        const padding = 1.07;
        const r = Math.max(1, (this.baseRadius + 18) * (this.globeScale || 1)) * padding;
        const halfFovY = THREE.MathUtils.degToRad(this.camera.fov * 0.5);
        const halfFovX = Math.atan(Math.tan(halfFovY) * this.camera.aspect);
        const halfMin = Math.min(halfFovY, halfFovX);
        const distance = r / Math.tan(halfMin);
        this.camera.position.set(0, 0, distance);
        this.camera.lookAt(0, 0, 0);
        this.camera.updateProjectionMatrix();
    }

    onResize() {
        const { width, height } = this.getSize();
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        if (this.initialized) {
            const minSide = Math.min(width, height);
            const scale = Math.max(0.85, Math.min(1.0, minSide / 520));
            this.globeScale = scale * 0.84;
            if (this.globeContainer) this.globeContainer.scale.setScalar(this.globeScale);
            this.material.uniforms.uPixelRatio.value = this.renderer.getPixelRatio();
            this.fitCameraToGlobe();
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (!this.initialized) return;
        const elapsedTime = this.clock.getElapsedTime();
        this.material.uniforms.uTime.value = elapsedTime;
        this.pointsGroup.rotation.y = elapsedTime * 0.12;
        this.renderer.render(this.scene, this.camera);
    }
}
function fract(x) { return x - Math.floor(x); }
