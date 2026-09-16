// glsl.js — Schwarzschild 测地线光线追踪着色器
// 每个像素反向积分一条类光测地线（rs=1 几何单位）：
//   ODE: d²x/dλ² = −1.5 · h² · x / r⁵ ，h² = |x × ẋ|²（守恒）
// 数值已在 node 验证：临界撞击参数 b=2.5952 vs 解析 3√3/2=2.5981（0.1%）
// 视界 r=1 · 光子球 r=1.5 · ISCO r=3（v=0.5c）· 阴影角径 b_crit=2.6 rs
'use strict';
window.BH_GLSL = {};

BH_GLSL.vert = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

BH_GLSL.frag = `
precision highp float;
varying vec2 vUv;

uniform vec2  uRes;
uniform float uTime;
uniform vec3  uCamPos;
uniform vec3  uCamRight, uCamUp, uCamFwd;
uniform float uTanHalfFov;
uniform float uAspect;
uniform float uLensing;      // 0/1 引力透镜开关
uniform float uDoppler;      // 0/1 多普勒+引力红移开关
uniform float uExposure;
uniform float uSteps;        // 积分步数上限
uniform float uEscR;         // 逃逸半径
uniform float uDiskGain;

const float PI = 3.14159265;
const float RS = 1.0;
const float R_ISCO = 3.0;          // 最内稳定圆轨道 = 3 rs
const float R_OUT = 13.0;          // 盘外缘（示意）
const float B_CRIT = 2.5980762;    // 阴影临界撞击参数 3√3/2

// ── hash / noise ────────────────────────────────────────────────
float hash13(vec3 p){ p = fract(p*0.1031); p += dot(p, p.yzx+33.33); return fract((p.x+p.y)*p.z); }
vec3  hash33(vec3 p){ p = fract(p*vec3(0.1031,0.1030,0.0973));
  p += dot(p, p.yxz+33.33); return fract((p.xxy+p.yxx)*p.zyx); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  float a = fract(sin(dot(i, vec2(127.1,311.7)))*43758.5453);
  float b = fract(sin(dot(i+vec2(1,0), vec2(127.1,311.7)))*43758.5453);
  float c = fract(sin(dot(i+vec2(0,1), vec2(127.1,311.7)))*43758.5453);
  float d = fract(sin(dot(i+vec2(1,1), vec2(127.1,311.7)))*43758.5453);
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}

// ── 黑体辐射颜色（Planck 轨迹拟合，1000–40000 K）───────────────
vec3 blackbody(float T){
  float t = clamp(T, 1000.0, 40000.0) / 100.0;
  float r = (t <= 66.0) ? 255.0 : 329.698727446 * pow(t-60.0, -0.1332047592);
  float g = (t <= 66.0) ? 99.4708025861*log(t) - 161.1195681661
                        : 288.1221695283 * pow(t-60.0, -0.0755148492);
  float b = (t >= 66.0) ? 255.0 : ((t <= 19.0) ? 0.0
                        : 138.5177312231*log(t-10.0) - 305.0447927307);
  return clamp(vec3(r,g,b)/255.0, 0.0, 1.0);
}

// ── 星空背景（被透镜光自然弯曲）────────────────────────────────
vec3 starfield(vec3 d){
  vec3 col = vec3(0.0);
  for (int i = 0; i < 3; i++){
    float N = 16.0 + 24.0*float(i);
    vec3 g = d * N;
    vec3 id = floor(g);
    vec3 f = fract(g) - 0.5;
    vec3 off = (hash33(id + float(i)*7.7) - 0.5) * 0.72;
    float dstar = length(f - off);
    float h = hash13(id + float(i)*17.0);
    float b = pow(smoothstep(0.5, 0.0, dstar), 16.0);
    float mag = pow(h, 26.0)*2.2 + pow(h, 9.0)*0.05;
    vec3 tint = mix(vec3(1.0,0.85,0.66), vec3(0.72,0.83,1.0), hash13(id+4.2));
    col += b * mag * tint;
  }
  // 银河微光
  float band = exp(-pow(dot(d, normalize(vec3(0.4, 0.85, 0.25)))*2.6, 2.0));
  float neb = vnoise(d.xy*4.0 + d.z*2.0)*0.6 + vnoise(d.zx*7.0)*0.4;
  col += band * (0.010 + 0.035*neb) * vec3(0.62, 0.68, 0.92);
  return col;
}

// ── 相对论 g 因子（多普勒束流 × 引力红移）─────────────────────
// beta: 局部轨道速度/c（v=√(M/(r−rs))，M=0.5）；photonDir: 光子传播方向
float gFactor(vec3 pos, vec3 tangentFrame, vec3 photonDir){
  float rd = length(pos.xz);
  float beta = clamp(sqrt(0.5 / max(rd - 1.0, 0.7)), 0.0, 0.92);
  vec3 tangent = tangentFrame;
  float gam = inversesqrt(1.0 - beta*beta);
  float D = 1.0 / (gam * (1.0 - beta*dot(tangent, photonDir)));
  float grav = sqrt(max(1.0 - 1.0/rd, 0.02));
  return uDoppler > 0.5 ? D * grav : 1.0;
}

// 温度剖面（Shakura–Sunyaev，峰值在 1.36 R_ISCO，归一到 1）
float tempProfile(float rd){
  float x = max(rd / R_ISCO, 1.0);
  return pow(x, -0.75) * pow(max(1.0 - pow(x, -0.5), 0.0), 0.25) / 0.4885;
}

// ── 吸积盘硬表面命中（盘面穿越）────────────────────────────────
vec3 diskHit(vec3 hp, vec3 photonDir, out float alpha){
  alpha = 0.0;
  float rd = length(hp.xz);
  if (rd < R_ISCO || rd > R_OUT) return vec3(0.0);
  float prof = tempProfile(rd);
  float T = 6100.0 * prof;
  float ang = atan(hp.z, hp.x);
  float swirl = ang + 7.0 * pow(rd, -1.5) * uTime * 0.55;
  float n = vnoise(vec2(swirl*1.7, rd*4.2)) * 0.6
          + vnoise(vec2(swirl*3.4, rd*9.0)) * 0.4;
  float filaments = 0.16 + 1.1*n;
  float edgeIn  = smoothstep(R_ISCO, R_ISCO + 0.45, rd);
  float edgeOut = 1.0 - smoothstep(R_OUT - 5.0, R_OUT - 0.5, rd);
  alpha = clamp(filaments, 0.0, 1.0) * edgeIn * edgeOut * 0.82;
  float g = gFactor(hp, normalize(vec3(-hp.z, 0.0, hp.x)), photonDir);
  vec3 c = blackbody(T * g);
  float I = pow(prof, 5.0) * pow(g, 4.0);
  return c * I * filaments * uDiskGain * 5.5;
}

// ── 光学薄辉光：光线掠过盘面附近时累积的等离子体发射 ──────────
vec3 diskGlow(vec3 pm, vec3 photonDir, float dt){
  float rd = length(pm.xz);
  if (rd < R_ISCO * 0.95 || rd > 9.5) return vec3(0.0);
  float prof = tempProfile(rd);
  float vert = exp(-pm.y*pm.y / 0.07);
  float edgeOut = 1.0 - smoothstep(R_OUT - 5.0, R_OUT - 0.5, rd);
  float g = gFactor(pm, normalize(vec3(-pm.z, 0.0, pm.x)), photonDir);
  vec3 c = blackbody(6100.0 * prof * g);
  return c * pow(prof, 2.6) * pow(g, 4.0) * vert * edgeOut * dt * 0.075 * uDiskGain;
}

// ── 测地线积分 ──────────────────────────────────────────────────
vec4 trace(vec3 ro, vec3 rd){
  vec3 p = ro;
  vec3 v = rd;
  vec3 hv = cross(p, v);
  float h2 = hv.x*hv.x + hv.y*hv.y + hv.z*hv.z;
  if (uLensing < 0.5) h2 = 0.0;                  // 透镜关 → 平直时空直线
  vec3 col = vec3(0.0);
  float trans = 1.0;
  float prevY = p.y;
  bool captured = false;
  for (int i = 0; i < 480; i++){
    if (float(i) >= uSteps) break;
    float r2 = dot(p, p);
    float r = sqrt(r2);
    if (r < RS) { captured = true; break; }                    // 落入视界 → 黑
    if (r > uEscR && dot(p, v) > 0.0) {                        // 逃逸 → 星空
      col += trans * starfield(normalize(v));
      return vec4(col, 1.0);
    }
    // 自适应步长：近场细、远场粗；盘面附近加密保证穿越采样干净
    float dt = clamp(0.14*(r - 0.9), 0.03, 2.2);
    if (r < R_OUT + 2.5 && abs(p.y) < 0.8) dt = min(dt, 0.05 + 0.13*abs(p.y));
    if (uLensing > 0.5){
      vec3 a = (-1.5 * h2 / (r2*r2*r)) * p;                    // 测地线弯曲
      v += a * dt;
    }
    vec3 pn = p + v*dt;
    if (prevY * pn.y < 0.0){                                    // 穿过赤道面 → 盘硬表面
      float t = prevY / (prevY - pn.y);
      vec3 hp = mix(p, pn, t);
      float a;
      vec3 dc = diskHit(hp, -normalize(v), a);
      col += trans * dc * a;
      trans *= (1.0 - a);
      if (trans < 0.02) return vec4(col, 1.0);
    } else {
      // 光学薄辉光：掠过盘面附近也累积发射（半透明等离子体）
      col += trans * diskGlow(mix(p, pn, 0.5), -normalize(v), dt);
    }
    p = pn; prevY = p.y;
  }
  return vec4(col, 1.0);                                       // 耗尽未逃逸 → 视为被俘获（黑）
}

// ACES tone mapping
vec3 aces(vec3 x){
  return clamp((x*(2.51*x + 0.03)) / (x*(2.43*x + 0.59) + 0.14), 0.0, 1.0);
}

void main(){
  vec2 uv = (vUv*2.0 - 1.0);
  uv.x *= uAspect;
  vec3 rd = normalize(uCamFwd + uTanHalfFov*(uv.x*uCamRight + uv.y*uCamUp));
  vec4 c = trace(uCamPos, rd);
  vec3 col = c.rgb;
  col = aces(col * uExposure);
  col = pow(col, vec3(1.0/2.2));
  float vig = 1.0 - 0.22*dot(vUv - 0.5, vUv - 0.5)*2.2;
  col *= vig;
  gl_FragColor = vec4(col, 1.0);
}
`;
