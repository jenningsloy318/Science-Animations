/**
 * celestial-bodies.js - 太阳与各行星的真实 3D 程序化网格、大气光晕与引力势阱网格
 */
import * as THREE from 'three';
import { CONSTANTS } from './physics.js';

/**
 * 创建行星表面纹理 (Canvas 程序化生成，避免外部大文件加载风险)
 */
function createPlanetTexture(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (type === 'sun') {
    // 太阳耀斑湍流
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(0.5, '#fbbf24');
    grad.addColorStop(1, '#f97316');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);
    // 日冕光斑
    for (let i = 0; i < 800; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.25)' : 'rgba(234,88,12,0.3)';
      ctx.beginPath();
      ctx.arc(Math.random() * 1024, Math.random() * 512, Math.random() * 8 + 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'jupiter') {
    // 木星特征云带与大红斑
    const bands = [
      '#f59e0b', '#d97706', '#b45309', '#fef3c7', '#fde68a', '#d97706',
      '#b45309', '#f59e0b', '#fde68a', '#78350f', '#f59e0b', '#b45309'
    ];
    for (let i = 0; i < bands.length; i++) {
      ctx.fillStyle = bands[i];
      const y = (i / bands.length) * 512;
      const h = 512 / bands.length;
      ctx.fillRect(0, y, 1024, h);
    }
    // 添加纬向扰动纹理
    for (let y = 0; y < 512; y += 4) {
      ctx.fillStyle = `rgba(255,255,255,${(Math.sin(y * 0.1) * 0.5 + 0.5) * 0.15})`;
      ctx.fillRect(0, y, 1024, 3);
    }
    // 大红斑 (Great Red Spot: 22°S 纬度)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(650, 310, 65, 38, -0.05, 0, Math.PI * 2);
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#991b1b';
    ctx.stroke();
    // 红斑内涡旋中心
    ctx.beginPath();
    ctx.ellipse(650, 310, 30, 16, -0.05, 0, Math.PI * 2);
    ctx.fillStyle = '#b91c1c';
    ctx.fill();
    ctx.restore();
  } else if (type === 'saturn') {
    // 土星浅米黄色条纹
    const bands = ['#fef08a', '#fef9c3', '#fde047', '#eab308', '#facc15', '#fef08a'];
    for (let i = 0; i < bands.length; i++) {
      ctx.fillStyle = bands[i];
      ctx.fillRect(0, (i / bands.length) * 512, 1024, 512 / bands.length);
    }
  } else if (type === 'uranus') {
    // 天王星清亮青绿
    ctx.fillStyle = '#67e8f9';
    ctx.fillRect(0, 0, 1024, 512);
    ctx.fillStyle = 'rgba(6,182,212,0.2)';
    ctx.fillRect(0, 150, 1024, 212);
  } else if (type === 'neptune') {
    // 海王星深蔚蓝与甲烷白云
    ctx.fillStyle = '#3730a3';
    ctx.fillRect(0, 0, 1024, 512);
    // 大暗斑
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.ellipse(400, 200, 50, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    // 卷云丝带
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(0, 240, 1024, 6);
    ctx.fillRect(0, 320, 1024, 4);
  } else if (type === 'earth') {
    // 地球海洋与大陆轮廓
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, 1024, 512);
    // 大陆斑块
    ctx.fillStyle = '#16a34a';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc((i * 55) % 1024, 150 + Math.sin(i) * 120, 45 + Math.cos(i) * 20, 0, Math.PI * 2);
      ctx.fill();
    }
    // 白云
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 15; i++) {
      ctx.fillRect(Math.random() * 1024, Math.random() * 512, Math.random() * 200 + 50, 12);
    }
  } else if (type === 'venus') {
    // 金星浓厚二氧化碳硫酸云层
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.5, '#fde047');
    grad.addColorStop(1, '#eab308');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * 创建太阳本体与辉光日冕
 */
export function createSun(radius = 7.0) {
  const group = new THREE.Group();
  group.name = 'Sun';

  const texture = createPlanetTexture('sun');
  const sunMat = new THREE.MeshBasicMaterial({
    map: texture,
    color: 0xfffbeb
  });

  const sphereGeo = new THREE.SphereGeometry(radius, 48, 32);
  const sunMesh = new THREE.Mesh(sphereGeo, sunMat);
  group.add(sunMesh);

  // 太阳外发光光晕 (Coronal Glow Sphere)
  const glowMat = new THREE.ShaderMaterial({
    uniforms: {
      c: { value: 0.3 },
      p: { value: 3.5 },
      glowColor: { value: new THREE.Color(0xf59e0b) },
      viewVector: { value: new THREE.Vector3() }
    },
    vertexShader: `
      uniform vec3 viewVector;
      uniform float c;
      uniform float p;
      varying float intensity;
      void main() {
        vec3 vNormal = normalize(normalMatrix * normal);
        vec3 vNormel = normalize(normalMatrix * viewVector);
        intensity = pow(c - dot(vNormal, vNormel), p);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying float intensity;
      void main() {
        vec3 glow = glowColor * intensity;
        gl_FragColor = vec4(glow, intensity * 0.85);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });

  const glowMesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.35, 32, 16), glowMat);
  group.add(glowMesh);

  // 太阳光源
  const sunLight = new THREE.PointLight(0xfff7ed, 3.0, 800, 0.4);
  group.add(sunLight);

  return {
    group,
    mesh: sunMesh,
    glow: glowMesh,
    update: (time) => {
      sunMesh.rotation.y += 0.0015;
    }
  };
}

/**
 * 创建行星 3D 网格 (含可选行星环、大气边缘光)
 */
export function createPlanet(planetKey, displayRadius = 2.5) {
  const pData = CONSTANTS.PLANETS[planetKey];
  const group = new THREE.Group();
  group.name = `Planet_${planetKey}`;

  const texture = createPlanetTexture(planetKey);
  const mat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.7,
    metalness: 0.1
  });

  const geo = new THREE.SphereGeometry(displayRadius, 48, 32);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // 土星特有环系 (Saturn Rings)
  let ringMesh = null;
  if (pData.hasRings) {
    const innerR = displayRadius * 1.4;
    const outerR = displayRadius * 2.5;
    const ringGeo = new THREE.RingGeometry(innerR, outerR, 64);
    // 旋转让圆环在赤道面
    ringGeo.rotateX(Math.PI / 2);

    const ringCanvas = document.createElement('canvas');
    ringCanvas.width = 256;
    ringCanvas.height = 1;
    const rctx = ringCanvas.getContext('2d');
    const rgrad = rctx.createLinearGradient(0, 0, 256, 0);
    rgrad.addColorStop(0, 'rgba(254, 240, 138, 0.2)');
    rgrad.addColorStop(0.3, 'rgba(250, 204, 21, 0.85)'); // B环
    rgrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.1)');       // 卡西尼缝 (Cassini Division)
    rgrad.addColorStop(0.85, 'rgba(234, 179, 8, 0.65)');  // A环
    rgrad.addColorStop(1, 'rgba(234, 179, 8, 0.0)');
    rctx.fillStyle = rgrad;
    rctx.fillRect(0, 0, 256, 1);

    const ringTex = new THREE.CanvasTexture(ringCanvas);
    const ringMat = new THREE.MeshStandardMaterial({
      map: ringTex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      roughness: 0.4
    });

    ringMesh = new THREE.Mesh(ringGeo, ringMat);
    // 土星自转轴倾角 26.7°
    group.rotation.z = 0.466; // ~26.7 deg
    group.add(ringMesh);
  }

  // 天王星轴倾角 97.8°
  if (planetKey === 'uranus') {
    group.rotation.x = 1.707;
  }

  return {
    group,
    mesh,
    ringMesh,
    planetKey,
    update: (dt = 0.016) => {
      mesh.rotation.y += 0.008;
    }
  };
}

/**
 * 3D 时空曲率/引力势阱漏斗网格 (Gravitational Potential Well Funnel)
 * 形象展示广义相对论时空弯曲以及牛顿引力势能 U = -GM/r 的凹陷形态
 */
export function createGravityWellMesh(radius = 18.0, depth = 5.0, color = 0xf59e0b) {
  const segments = 48;
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2, segments, segments);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r > 0.4) {
      // U(r) ~ -1 / r 势阱形状，中心做平滑下限截断
      const dip = -depth / (1.0 + r * 0.45);
      pos.setY(i, dip);
    } else {
      pos.setY(i, -depth);
    }
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshBasicMaterial({
    color,
    wireframe: true,
    transparent: true,
    opacity: 0.28
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'GravityWell';
  return mesh;
}
