import * as THREE from "three";

import { ShaderNode, ShaderNodeOptions } from "../ShaderNode";
import { Shaders } from "../../shaders";
import { uniqueID } from "../../utils/general";

/**
 * Bloom node options
 *
 * @category Nodes
 */
export interface BloomNodeOptions extends ShaderNodeOptions {
    /**
     * Size of the input texture
     */
    texSize?: THREE.Vector2;

    /**
     * Default bloom separation setting
     */
    separation?: number;

    /**
     * Default bloom threshold setting
     */
    threshold?: number;

    /**
     * Default bloom amount setting
     */
    amount?: number;

    /**
     * Whether to use a mask texture
     */
    mask?: boolean;
}

/**
 * Bloom effect node
 *
 * @category Nodes
 */
export class BloomNode extends ShaderNode {
    options: BloomNodeOptions;

    constructor(options?: BloomNodeOptions) {
        super({ ...options, id: options?.id || uniqueID("BloomNode_") }, false);

        this.options = options || {};

        this.fragmentShader = [
            Shaders.filters,
            /* glsl */ `
                varying vec2 vUv;
                uniform float time;
                uniform vec2 texSize;
                uniform float separation;
                uniform float threshold;
                uniform float amount;
            `,

            !this.options.mask
                ? /* glsl */ `
                        uniform sampler2D inputTex;

                        void main() {
                            gl_FragColor = bloom(inputTex, texSize, vUv, separation, threshold, amount);
                        }
                    `
                : /* glsl */ `
                        struct maskBloomTexs {
                            sampler2D bloomMask;
                            sampler2D diffuse;
                        };

                        uniform maskBloomTexs inputTex;

                        void main() {
                            gl_FragColor = maskBloom(inputTex.diffuse, texSize, vUv, separation, threshold, amount, inputTex.bloomMask);
                        }
                    `,
        ].join("\n");

        this.prepare();
    }

    prepare() {
        super.prepare();

        this.uniforms["texSize"] = {
            value: this.options.texSize || new THREE.Vector2(1280, 720),
        };
        this.uniforms["separation"] = { value: this.options.separation || 6 };
        this.uniforms["threshold"] = { value: this.options.threshold || 0.4 };
        this.uniforms["amount"] = { value: this.options.amount || 2 };

        return this;
    }

    resize(width: number, height: number) {
        super.resize(width, height);

        // update texture size uniform with current viewport size
        this.uniforms["texSize"].value.set(width, height);

        return this;
    }
}
