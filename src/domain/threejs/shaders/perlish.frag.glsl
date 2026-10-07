        uniform float time;
        uniform vec2 resolution;
        uniform vec3 foreground;
        uniform vec3 background;
        uniform float maxProbPeak;
        uniform float minProbPeak;
        uniform float maxProbTrough;
        uniform float fieldSpeed;
        uniform float noiseScale;

        // --- simplex noise 3D ---
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

        float snoise(vec3 v)
        {
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
          vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

          i = mod289(i);
          vec4 p = permute( permute( permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

          float n_ = 1.0/7.0;
          vec3  ns = n_ * D.wyz - D.xzx;

          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

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

          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1),
                                        dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;

          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1),
                                  dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                        dot(p2,x2), dot(p3,x3) ) );
        }

        void main() {
          vec2 uv = gl_FragCoord.xy / resolution.xy;

          float f1 = snoise(vec3(uv * noiseScale, time * fieldSpeed));
          float f2 = snoise(vec3(uv * (noiseScale * 2.0), time * fieldSpeed * 1.7));
          float field = mix(f1, f2, 0.35);
          field = (field + 1.0) * 0.5; // 0..1

          float spacing = .05;
          spacing = .02;

          float nearestThreshold = floor(field / spacing + 0.5) * spacing;
          //float dist = abs(field - nearestThreshold);
          float contour = fract(field / spacing);
          float dist = min(contour, 1.0 - contour) * spacing;

          float width = fwidth(field);
          float thickness = 1.5;
          //thickness = 2.0;
          thickness = 1.0;
          thickness = 0.5;
          thickness = 1.0;

          float line = 1.0 - smoothstep(0.0, width * thickness, dist);
          line = 1.0 - step(width * thickness, dist);
          float contourT = clamp(nearestThreshold, 0.0, 1.0);
          vec3 contourColor = mix(foreground, background, contourT);
          //vec3 color = mix(foreground, background, line);
          vec3 color = mix(background, contourColor, line);

          // force-encode to sRGB so it matches hex
          color = pow(color, vec3(1.0 / 2.2));

          // ---- scene scale test ----
          // color = vec3(calmMask);
          gl_FragColor = vec4(color, 1.0);
        }