// earth-glsl.js — 实时地球着色器：昼夜混合 / 晨昏线 / 城市灯光 / 海面镜面 / 云层 / 大气
// 物理：晨昏线 = 太阳方向与法线夹角；瑞利散射 limb 用 Fresnel 近似（蓝），
//       夜侧城市灯光（NASA Black Marble 2012 合成），海面镜面用 specular 掩膜。
'use strict';
window.EARTH_GLSL = {};

EARTH_GLSL.earthVert = `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;
void main(){
  vUv = uv;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vPosW = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

EARTH_GLSL.earthFrag = `
precision highp float;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;
uniform sampler2D uDay, uNight, uSpec;
uniform vec3 uSunDir;         // 世界坐标，指向太阳
uniform vec3 uCamPos;

void main(){
  vec3 N = normalize(vNormalW);
  vec3 albedo = texture2D(uDay, vUv).rgb;
  float ndl = dot(N, uSunDir);
  // 晨昏线：软化带 ~±8°（真实大气折射+散射使界线柔和）
  float dayF = smoothstep(-0.14, 0.14, ndl);

  // ── 夜侧：城市灯光（暖色） + 微弱月光蓝 ──
  vec3 lights = texture2D(uNight, vUv).rgb;
  vec3 night = lights * vec3(1.0, 0.82, 0.55) * 2.1
             + albedo * vec3(0.05, 0.08, 0.16) * 0.35;

  // ── 日侧：漫反射 + 海面镜面高光 ──
  float diff = max(ndl, 0.0);
  vec3 col = albedo * (diff * 1.25 + 0.015);
  vec3 viewDir = normalize(uCamPos - vPosW);
  vec3 H = normalize(uSunDir + viewDir);
  float oceanMask = texture2D(uSpec, vUv).r;
  float spec = pow(max(dot(N, H), 0.0), 48.0) * oceanMask * diff;
  col += vec3(1.0, 0.96, 0.86) * spec * 0.9;

  // 晨昏带暖色（长路径散射，日落红移的简化）
  float twil = (1.0 - smoothstep(0.0, 0.22, abs(ndl)));
  col += vec3(0.55, 0.22, 0.05) * twil * dayF * 0.16;

  // 日夜混合
  col = mix(night, col, dayF);

  // limb Fresnel 蓝色大气（日侧瑞利散射）
  float fres = pow(1.0 - max(dot(N, viewDir), 0.0), 2.6);
  col += vec3(0.22, 0.42, 1.0) * fres * dayF * 0.5;

  gl_FragColor = vec4(pow(max(col, 0.0), vec3(1.0/2.2)), 1.0);
}
`;

EARTH_GLSL.cloudVert = EARTH_GLSL.earthVert;

EARTH_GLSL.cloudFrag = `
precision highp float;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;
uniform sampler2D uClouds;
uniform vec3 uSunDir;

void main(){
  float c = texture2D(uClouds, vUv).a;          // 云密度在 alpha 通道（palette PNG）
  if (c < 0.02) discard;
  vec3 N = normalize(vNormalW);
  float ndl = dot(N, uSunDir);
  float dayF = smoothstep(-0.14, 0.14, ndl);
  float diff = max(ndl, 0.0);
  vec3 col = vec3(1.0) * (diff * 1.3 + 0.02);
  // 夜侧云几乎不可见（微弱月光轮廓）
  vec3 nightCol = vec3(0.06, 0.08, 0.13) * 0.6;
  col = mix(nightCol, col, dayF);
  gl_FragColor = vec4(pow(max(col, 0.0), vec3(1.0/2.2)), c * (0.55 + 0.45*dayF) * 0.92);
}
`;

EARTH_GLSL.atmoVert = EARTH_GLSL.earthVert;

// 大气壳（背面渲染）：Fresnel 边缘蓝晕，日侧亮、晨昏带暖
EARTH_GLSL.atmoFrag = `
precision highp float;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;
uniform vec3 uSunDir;
uniform vec3 uCamPos;

void main(){
  vec3 N = normalize(vNormalW);
  vec3 viewDir = normalize(uCamPos - vPosW);
  // BackSide：法线朝内，取反算边缘强度
  float rim = pow(1.0 + dot(N, viewDir), 3.2);
  float sunF = clamp(dot(-N, uSunDir)*0.65 + 0.45, 0.0, 1.0);
  float term = 1.0 - smoothstep(0.0, 0.35, abs(dot(-N, uSunDir)));
  vec3 blue = vec3(0.28, 0.5, 1.0);
  vec3 warm = vec3(1.0, 0.45, 0.15);
  vec3 col = mix(blue, warm, term*0.55) * rim * sunF;
  gl_FragColor = vec4(pow(max(col, 0.0), vec3(1.0/2.2)), rim * sunF * 0.85);
}
`;

// ── 星空背景（程序化点云，供 three.js Points 用）──────────────
EARTH_GLSL.makeStarPositions = function (count, radius) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // 均匀球面
    const u = Math.random() * 2 - 1;
    const ph = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pos[i*3]   = radius * s * Math.cos(ph);
    pos[i*3+1] = radius * u;
    pos[i*3+2] = radius * s * Math.sin(ph);
  }
  return pos;
};
