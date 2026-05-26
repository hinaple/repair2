#version 300 es
precision highp float;

in vec2 a_sampleSide;
in vec2 a_a;
in vec2 a_b;
in vec2 a_c;
in vec2 a_d;

uniform vec2 u_resolution;
uniform vec2 u_viewportPos;
uniform float u_ratio;
uniform float u_lineWidth;
uniform float u_segments;

out vec4 v_color;

vec2 worldToClip(vec2 world) {
    vec2 screen = (world - u_viewportPos) * u_ratio + u_resolution * 0.5;
    vec2 clip = screen / u_resolution * 2.0 - 1.0;

    return vec2(clip.x, -clip.y);
}

void main() {
    float t = a_sampleSide.x / u_segments;
    float side = a_sampleSide.y;

    vec2 p;
    vec2 tangent;

    p = ((a_a * t + a_b) * t + a_c) * t + a_d;
    tangent = (3.0 * a_a * t + 2.0 * a_b) * t + a_c;

    vec2 normal = normalize(vec2(-tangent.y, tangent.x));
    vec2 expanded = p + normal * side * u_lineWidth;

    gl_Position = vec4(worldToClip(expanded), 0.0, 1.0);
    v_color = vec4(0.0, 0.0, 0.0, 1.0);
}