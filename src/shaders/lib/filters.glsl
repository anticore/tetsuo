vec4 anaglyph(sampler2D tex, vec2 p, float k) {
    vec4 r = texture2D(tex, vec2(p.x - k, p.y));
    vec4 g = texture2D(tex, p);
    vec4 b = texture2D(tex,  vec2(p.x + k, p.y));

    float a = r.a * (1. / 3.) + g.a * (1. / 3.) + b.a * (1. / 3.);

    return vec4(
        r.r,g.g,b.b,a
    );  
}

vec4 boxblur(sampler2D tex, vec2 texSize, vec2 p, float separation) {
    vec4 result = vec4(0.);

    for (float i = -2.; i <= 2.; i++) {
        for (float j = -2.; j <= 2.; j++) {
            result.rgb += texture2D(tex, (p * texSize + vec2(i, j) * separation) / texSize).rgb;
        }
    }

    result.rgb /= 25.;
    result.a = 1.;

    return result;
}


vec4 bloom(sampler2D tex, vec2 texSize, vec2 p, float separation, float threshold, float amount) {
    vec4 result = vec4(0.);

    for (float i = -5.; i <= 5.; i++) {
        for (float j = -5.; j <= 5.; j++) {
            vec4 color = vec4(0.);
            vec4 t = texture2D(tex, (p * texSize + vec2(i, j) * separation) / texSize);
            float g = max(t.r, max(t.g, t.b));

            if (g > threshold) {
                color = t;
            }

            result.rgb += color.rgb;
        }
    }

    result.rgb /= pow(5. * 2. + 1., 2.);
    result.a = texture2D(tex, p).a;

    return vec4((texture2D(tex, p).rgb + result.rgb * amount), texture2D(tex, p).a);
}

vec4 maskBloom(sampler2D tex, vec2 texSize, vec2 p, float separation, float threshold, float amount, sampler2D mask) {
    vec4 result = vec4(0.);

    for (float i = -5.; i <= 5.; i++) {
        for (float j = -5.; j <= 5.; j++) {
            vec4 color = vec4(0.);
            vec4 t = texture2D(tex, (p * texSize + vec2(i, j) * separation) / texSize);
            vec4 m = texture2D(mask, (p * texSize + vec2(i, j) * separation) / texSize);

            float g = max(t.r, max(t.g, t.b));

            if (g > threshold && m.r > 0.) {
                color = t;
            }

            result.rgb += color.rgb;
        }
    }

    result.rgb /= pow(5. * 2. + 1., 2.);
    result.a = texture2D(tex, p).a;

    return vec4((texture2D(tex, p).rgb + result.rgb * amount), texture2D(tex, p).a);
}

vec2 curve(vec2 p) {
    p = (p - 0.5) * 2.0;
	p *= 1.1;	
	p.x *= 1.0 + pow((abs(p.y) / 5.0), 2.0);
	p.y *= 1.0 + pow((abs(p.x) / 4.0), 2.0);
	p  = (p / 2.0) + 0.5;
	p =  p * 0.92 + 0.04;
	return p;
}

vec2 tunnel(vec2 p, float k) {
    float a = atan(p.y, p.x);
    float r = length(p);
    vec2 _uv = vec2( 0.3/r + 0.2 * k, a / 3.1415927 );
    vec2 uv2 = vec2( _uv.x, atan(p.y,abs(p.x))/3.1415927 );
    return uv2;
}