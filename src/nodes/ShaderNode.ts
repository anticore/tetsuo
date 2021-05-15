import * as THREE from "three";
import { Node, NodeOptions } from "./Node";
import { NodeRenderer } from "./NodeRenderer";
import defaultUniforms from "../shaders/defaultUniforms";
import {
    IUniform,
    WebGLRenderTarget,
    WebGLMultisampleRenderTarget,
} from "three";
import { WEBGL } from "three/examples/jsm/WebGL.js";
import { UniformNode } from "./UniformNode";
import { uniqueID } from "../utils/general";

const defaultVertexShader = require("../shaders/default.vert");
const defaultFragmentShader = require("../shaders/defaultPost.frag");

/**
 * Shader node initialization options
 *
 * @category Nodes
 */
export interface ShaderNodeOptions extends NodeOptions {
    /**
     * GLSL code for the vertex shader of this node
     */
    vertexShader?: string;

    /**
     * GLSL code for the fragment shader of this node
     */
    fragmentShader?: string;

    /**
     * Whether to only render this node when needsUpdate is true
     */
    manualRender?: boolean;

    /**
     * List of custom uniforms
     */
    uniforms?: { [key: string]: IUniform };

    /**
     * Whether to attempt antialias for this node
     */
    antialias?: boolean;

    /**
     * Number of samples for antialias
     */
    antialiasSamples?: number;

    /**
     * Don't update time uniform (for external update)
     */
    noUpdateTime?: boolean;
}

/**
 * Pixel shader node
 *
 * @category Nodes
 */
export class ShaderNode extends Node {
    /**
     * Internal three.js scene
     * Used for rendering shader
     */
    scene: THREE.Scene;

    /**
     * Internal three.js camera
     * Used for rendering shader
     */
    camera: THREE.OrthographicCamera;

    /**
     * Quad where the shader is applied on for rendering
     */
    quad: THREE.Mesh = new THREE.Mesh();

    /**
     * Shader's vertex code
     */
    vertexShader: string = defaultVertexShader;

    /**
     * Shader's fragment code
     */
    fragmentShader: string = defaultFragmentShader;

    /**
     * Uniforms passed to constructor as option
     */
    private _customUniforms?: { [key: string]: IUniform } = {};

    /**
     * Shader uniforms
     */
    uniforms: { [key: string]: IUniform } = {};

    /**
     * Render target for this node
     */
    private _target: WebGLRenderTarget | WebGLMultisampleRenderTarget;

    /**
     * Whether to render this node only when needsUpdate is true
     */
    private _manualRender?: boolean;

    /**
     * Whether to rerender this node on the next pass (for manual render)
     */
    needsUpdate: boolean = true;

    /**
     * Don't update time uniform (for external update)
     */
    _noUpdateTime: boolean = false;

    /**
     * @param options - Shader node initialization options
     * @param prepare - Whether to run the prepare method for this node on construction
     */
    constructor(options?: ShaderNodeOptions, prepare: boolean = true) {
        super({ ...options, id: options?.id || uniqueID("THREENode_") });

        options = options || {};
        this.vertexShader = options.vertexShader || defaultVertexShader;
        this.fragmentShader = options.fragmentShader || defaultFragmentShader;

        if (WEBGL.isWebGL2Available() && options?.antialias) {
            this._target = new THREE.WebGLMultisampleRenderTarget(
                this.width,
                this.height
            );
        } else {
            this._target = new THREE.WebGLRenderTarget(this.width, this.height);
        }

        //TODO: Check if antialising is active on NodeRenderer and change this to 4 or 8
        //this._target.samples = 8; //default is 4 but to match the built-in AA quality 8 or 16 samples is needed

        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 100);

        this._manualRender = options?.manualRender;

        this._customUniforms = options.uniforms;

        this._noUpdateTime = !!options?.noUpdateTime;

        prepare && this.prepare();
    }

    /**
     * Prepares the shader for rendering
     */
    prepare() {
        super.prepare();

        // (re)initialize shader uniforms
        let uniforms: { [key: string]: IUniform } = {
            ...defaultUniforms,
            ...this._customUniforms,
        };
        for (let key in this.inputs) {
            if (!uniforms[key])
                uniforms[key] = { value: this.inputs[key].getValue() };
        }

        // apply shader to fullscreen quad
        this.quad && this.scene.remove(this.quad);
        this.quad = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(2, 2),
            new THREE.ShaderMaterial({
                vertexShader: this.vertexShader,
                fragmentShader: this.fragmentShader,
                uniforms,
            })
        );
        this.scene.add(this.quad);

        // save uniforms for updating
        this.uniforms = (this.quad.material as THREE.ShaderMaterial).uniforms;

        return this;
    }

    /**
     * Updates shader's uniforms
     *
     * @param time - Current clock time
     */
    update(totalTime: number, deltaTime: number) {
        super.update(totalTime, deltaTime);

        // update default uniforms
        if (!this._noUpdateTime && this.id !== "root") {
            this.uniforms["time"].value = totalTime;
        }
        this.uniforms["resolution"].value.set(this.width, this.height, 1);

        // update node connection uniforms
        for (let key in this.inputs) {
            if (!this.uniforms[key])
                this.uniforms[key] = { value: this.inputs[key].getValue() };
            else this.uniforms[key].value = this.inputs[key].getValue();
        }

        return this;
    }

    /**
     * Renders shader
     */
    render(renderer: NodeRenderer) {
        super.render(renderer);

        if (!this._manualRender || this.needsUpdate) {
            // render to a render target
            renderer.glRenderer.setRenderTarget(this._target);
            renderer.glRenderer.clear(true, true, true);
            renderer.glRenderer.render(this.scene, this.camera);

            // update output connection
            this.output.setValue(this._target.texture);

            this.needsUpdate = false;
        }

        return this;
    }

    /**
     * Handles renderer resize
     */
    resize(width: number, height: number) {
        this.width = width;
        this.height = height;

        this._target.setSize(this.width, this.height);

        return this;
    }

    /**
     * Wrapper over UniformNode creation to reduce boilerplate
     *
     * @param uniformID - Uniform id
     * @param value - Uniform initial value
     * @param value - GUI config
     */
    uniform(uniformID: string, value: any, gui?: any) {
        let node = new UniformNode({
            id: uniformID,
            value,
            gui,
        });
        this.addInput(node);
        return this;
    }
}
