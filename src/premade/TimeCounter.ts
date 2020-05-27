import * as THREE from "three";
import * as PIXI from "pixi.js";
import { Premade } from "./Premade";
import { NodeRenderer } from "../nodes/NodeRenderer";
import { PIXINode } from "../nodes/PIXINode";
import { ShaderNode } from "../nodes/ShaderNode";
import { Shaders } from "../shaders";
import { Node } from "../nodes/Node";
import { UniformNode } from "../nodes/UniformNode";

export interface TimeCounterOptions {
    /**
     * Width of the text screen
     */
    width: number;

    /**
     * Height of the text screen
     */
    height: number;

    /**
     * Background color of the text screen
     */
    backgroundColor?: number;

    /**
     * Distance from the top/bottom of the viewport to the top of the screen
     */
    marginTop?: number;

    /**
     * Distance from the sides of the viewport to the sides of the screen
     */
    marginLeft?: number;

    /**
     * Distance from the bottom of the screen to the bottom of the text
     */
    paddingBottom?: number;

    /**
     * Distance from the side of the screen to the side of the text
     */
    paddingLeft?: number;

    /**
     * Default text style to pass to all created text
     * Each text request can override properties from this style
     */
    defaultTextStyle?: PIXI.TextStyle;

    initialTime?: number;

    opacity?: number;
}

export interface TimeCounterUpdateOptions {
    currentTime?: number;

    opacity?: number;
}

export class TimeCounter implements Premade {
    /**
     * Output texture to which the text screen is rendered
     */
    texture?: THREE.Texture;

    /**
     * Output quad which shader material holds the render of the screen
     */
    quad?: THREE.Mesh;

    protected _renderer: NodeRenderer;
    protected _outputNode?: Node;
    protected _width: number;
    protected _height: number;
    protected _backgroundColor: number;
    protected _marginTop: number;
    protected _marginLeft: number;
    protected _defaultTextStyle: any;
    protected _opacity: number;
    protected _background?: PIXI.Graphics;

    protected _timeText?: PIXI.Text;
    protected _timeValue: number = 0;

    constructor(options: TimeCounterOptions) {
        // set default values
        this._width = options.width;
        this._height = options.height;
        this._backgroundColor = options.backgroundColor || 0x002c2c;
        this._marginTop = options.marginTop || 90;
        this._marginLeft = options.marginLeft || 240;
        this._opacity = options.opacity || 1;
        this._defaultTextStyle = {
            fontFamily: "Courier New",
            fontSize: 22,
            fontWeight: "bold",
            fill: 0x3cdc7c,
            ...options.defaultTextStyle,
        };

        this._timeValue = options.initialTime || 0;

        this._renderer = new NodeRenderer({
            noViewport: true,
            width: this._width,
            height: this._height,
        });
    }

    /**
     * Deletes all entries
     */
    clear() {}

    /**
     * Generates a background graphic
     */
    _generateBackground() {
        this._background = new PIXI.Graphics();

        let backgroundWidth = this._width - 2 * this._marginLeft;
        let backgroundHeight = this._height - 2 * this._marginTop;

        this._background.beginFill(this._backgroundColor);
        this._background.drawRect(0, 0, backgroundWidth, backgroundHeight);
        this._background.endFill();
        this._background.alpha = this._opacity;

        this._background.pivot.set(backgroundWidth / 2, backgroundHeight / 2);
        this._background.position.set(this._width / 2, this._height / 2);

        return this._background;
    }

    _generateTimeText() {
        let text = new PIXI.Text(this._timeValue.toString(), this._defaultTextStyle);
        text.pivot.set(text.width / 2, text.height / 2);
        text.position.set(this._width / 2, this._height / 2);
        return text;
    }

    setTime(time: number) {
        this._timeValue = time;
        if (!this._timeText) return;

        this._timeText.text = time.toString();
        this._timeText.pivot.set(this._timeText.width / 2, this._timeText.height / 2);
        this._timeText.position.set(this._width / 2, this._height / 2);
    }

    /**
     * Builds the screen
     */
    prepare() {
        return new Promise<any>((resolve, reject) => {
            let pixi = new PIXINode("pixi", this._renderer);
            let background = this._generateBackground();
            pixi.add(background);

            this._timeText = this._generateTimeText();
            pixi.add(this._timeText);

            let crt = new ShaderNode("crt", this._renderer, {
                fragmentShader: Shaders.compile(
                    Shaders.math,
                    Shaders.filters,

                    /* glsl */ `
                        varying vec2 vUv;
                        uniform sampler2D inputTex;
                        uniform float iTime;
                        uniform vec2 texSize;

                        float gradient(vec2 p) {
                            return 1. - length(p / 3.);
                        }

                        float scanline(vec2 p) {
                            float s = 1. - abs(sin(iTime * 2. + p.y * 3.));
                            return s > 0.7 ? s : 0.;
                        }

                        float smallline(vec2 p) {
                            return abs(sin(iTime * 5. - p.y * 450.) * 0.9);
                        }

                        void main() {
                            vec2 p = curve(vUv);

                            vec4 t = bloom(inputTex, texSize, p, .6, 0.3, 1.);  
                            gl_FragColor = vec4(1.);
                            gl_FragColor = mix(t, (t  + scanline(p) * 0.02 - smallline(p) * 0.02) * gradient((p - 0.5) * 2.), t.a);
                        }
                    `
                ),
            })
                .addInput(pixi, "inputTex")
                .addInput(
                    new UniformNode("texSize", {
                        value: new THREE.Vector2(this._width, this._height),
                        gui: { hide: true },
                    })
                );

            this._outputNode = crt;

            this.update(0);

            this.texture = this._outputNode.output.getValue();
            this.quad = (this._outputNode as ShaderNode).quad;

            this._renderer.connectToScreen(this._outputNode);

            resolve(this.texture);
        });
    }

    /**
     * Updates the screen
     *
     * @param time - Current animation time
     * @param updateOptions - Update options to override defaults
     */
    update(time: number, updateOptions?: TimeCounterUpdateOptions) {
        this._render(time / 1000);

        if (updateOptions?.opacity && this._background) {
            this._background.alpha = updateOptions.opacity;
        }
    }

    /**
     * Renders the screen
     *
     * @param time
     */
    _render(time: number) {
        if (!this._outputNode) return;
        this._renderer.update(time);
        this._renderer.render();

        this.texture = this._outputNode.output.getValue();
        this.quad = (this._outputNode as ShaderNode)?.quad;
    }

    /**
     * Retrieves the output texture for external use
     */
    getTexture() {
        return this.texture;
    }

    /**
     * Retrieves the output quad for external use
     */
    getQuad() {
        return this.quad;
    }
}
