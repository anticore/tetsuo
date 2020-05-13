import defaultUniforms from "./defaultUniforms";
import { compile } from "./compile";

export const Shaders = {
    defaultFrag: require("./default.frag"),
    defaultPostFrag: require("./defaultPost.frag"),
    defaultVert: require("./default.vert"),
    depth: require("./lib/depth.glsl"),
    light: require("./lib/light.glsl"),
    math: require("./lib/math.glsl"),
    hash: require("./lib/hash.glsl"),
    perlin: require("./lib/perlin.glsl"),
    simplex: require("./lib/simplex.glsl"),
    move: require("./lib/move.glsl"),
    sdf: require("./lib/sdf.glsl"),
    worley: require("./lib/worley.glsl"),
    filters: require("./lib/filters.glsl"),
    defaultUniforms,
    compile,
};
