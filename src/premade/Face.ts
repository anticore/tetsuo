import * as THREE from "three";
import { Premade } from "./Premade";
import { ShaderMaterial } from "../utils/ShaderMaterial";
import Loader from "../core/Loader";

export interface FaceOptions {
    /**
     * Path to the mesh geometry
     */
    geometryPath: string;

    /**
     * Color of the object
     */
    color: THREE.Vector3;

    lineMultiplier: number;
}

export interface FaceUpdateOptions {
    /**
     * Color of the object
     */
    color: THREE.Vector3;
}

export class Face implements Premade {
    /**
     * Path to the mesh geometry
     */

    geometryPath: string;

    /**
     * Color of the object
     */
    color: THREE.Vector3;

    /**
     * Output mesh for external use
     */
    mesh: THREE.Mesh;

    lineMultiplier: number = 100;

    constructor(options?: FaceOptions) {
        this.geometryPath = options?.geometryPath || "";
        this.color = options?.color || new THREE.Vector3(0.11, 0.82, 0.58);
        this.lineMultiplier = options?.lineMultiplier || 100;

        this.mesh = new THREE.Mesh();
    }

    /**
     * Builds the mesh
     */
    prepare() {
        return new Promise<THREE.Mesh>((resolve, reject) => {
            Loader.loadGeometry(this.geometryPath, (geometry: any) => {
                let material = ShaderMaterial({
                    side: THREE.DoubleSide,
                    uniforms: {
                        color: { value: this.color },
                        lineMultiplier: { value: this.lineMultiplier },
                    },

                    fragmentShader: /*glsl*/ `
                        varying vec2 vUv;
                        varying vec3 vPosition;
                        varying vec3 vNormal;
    
                        uniform vec3 color;
                        uniform float iTime;
                        uniform float lineMultiplier;

                        #if NUM_DIR_LIGHTS > 0
                            struct DirectionalLight {
                                vec3 direction;
                                vec3 color;
                            };

                            uniform DirectionalLight directionalLights[NUM_DIR_LIGHTS];
                        #endif
                        
                        void main() {
                            vec3 light = vec3(0., 0., 0.);

                        #if NUM_DIR_LIGHTS > 0
                            for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
                                light += dot(directionalLights[i].direction, vNormal) * directionalLights[i].color;
                            }
                        #endif
                            
                            float v = abs(sin(5. * lineMultiplier * (vUv.y + iTime / 1.))) - 0.25;
                            float bigv = sin((lineMultiplier / 10.) * vUv.y + iTime * 5.) + 0.5;
                            gl_FragColor = vec4((color + bigv * 0.2).rgb * light * v, v);
                        }
                    `,
                });

                geometry.center();

                this.mesh = new THREE.Mesh(geometry, material);

                resolve(this.mesh);
            });
        });
    }

    /**
     * Updates the mesh
     *
     * @param time - Current animation time
     * @param updateOptions - Update options to override defaults
     */
    update(time: number, updateOptions?: FaceUpdateOptions) {
        if (this.mesh && (this.mesh.material as THREE.ShaderMaterial).uniforms) {
            (this.mesh.material as THREE.ShaderMaterial).uniforms.iTime.value = time;

            if (updateOptions?.color) {
                (this.mesh.material as THREE.ShaderMaterial).uniforms.color.value =
                    updateOptions.color;
            }
        }
    }

    /**
     * Retrieves the output mesh for external use
     */
    getMesh() {
        return this.mesh;
    }
}
