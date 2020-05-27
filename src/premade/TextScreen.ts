import * as THREE from "three";
import * as PIXI from "pixi.js";
import { Premade } from "./Premade";
import { NodeRenderer } from "../nodes/NodeRenderer";
import { PIXINode } from "../nodes/PIXINode";
import { ShaderNode } from "../nodes/ShaderNode";
import { Shaders } from "../shaders";
import { Node } from "../nodes/Node";
import { UniformNode } from "../nodes/UniformNode";

export interface TextScreenOptions {
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

    /**
     * Space between text entries
     */
    spaceBetweenEntries?: number;

    /**
     * Opacity of the screen background
     */
    opacity?: number;
}

export interface TextScreenUpdateOptions {
    /**
     * Opacity of the screen background
     */
    opacity?: number;
}

export type EventSubscriber = (eventType: string, eventData: any) => void;

/**
 * Enum of all the events the text screen can fire
 */
export enum EventTypes {
    /**
     * When a new text line has been added to the screen
     */
    newTextAnimation = "newTextAnimation",

    /**
     * When a new character has been typed in the text animation
     */
    newCharacter = "newCharacter",

    /**
     * When the animation of a new text line is over
     */
    textAnimationOver = "textAnimationOver",

    /**
     * When a new question is added to the screen
     */
    newQuestion = "newQuestion",

    /**
     * When an answer from the list is selected
     */
    answerSelected = "answerSelected",

    /**
     * When the answer that's currently selected is confirmed (end of question)
     */
    answerConfirmed = "answerConfirmed",
}

export type TextAnimation = (deltaTime: number, forceEnd?: boolean) => boolean;

export interface Question {
    selected: string;
    container: PIXI.Container;
    answers: { id: string; container: PIXI.Container; selector: PIXI.Graphics }[];
}

export class TextScreen implements Premade {
    /**
     * Output texture to which the text screen is rendered
     */
    texture?: THREE.Texture;

    /**
     * Output quad which shader material holds the render of the screen
     */
    quad?: THREE.Mesh;

    protected _renderer: NodeRenderer;
    protected _elapsedTime: number = 0;
    protected _outputNode?: Node;
    protected _width: number;
    protected _height: number;
    protected _backgroundColor: number;
    protected _marginTop: number;
    protected _marginLeft: number;
    protected _paddingBottom: number;
    protected _paddingLeft: number;
    protected _defaultTextStyle: any;
    protected _spaceBetweenEntries: number;
    protected _opacity: number;
    protected _background?: PIXI.Graphics;
    protected _foreground?: PIXI.Container;
    protected _entries: (PIXI.Container | PIXI.Text | PIXI.Graphics)[] = [];
    protected _currentAnimation?: TextAnimation;
    protected _currentQuestion?: Question;
    protected _subscribers: EventSubscriber[] = [];

    constructor(options: TextScreenOptions) {
        // set default values
        this._width = options.width;
        this._height = options.height;
        this._backgroundColor = options.backgroundColor || 0x002c2c;
        this._marginTop = options.marginTop || 90;
        this._marginLeft = options.marginLeft || 240;
        this._paddingBottom = options.paddingBottom || 50;
        this._paddingLeft = options.paddingLeft || 50;
        this._spaceBetweenEntries = options.spaceBetweenEntries || 20;
        this._opacity = options.opacity || 1;
        this._defaultTextStyle = {
            fontFamily: "Courier New",
            fontSize: 22,
            fontWeight: "bold",
            wordWrap: true,
            wordWrapWidth: this._width - 2 * this._marginLeft - 2 * this._paddingLeft,
            fill: 0x3cdc7c,
            ...options.defaultTextStyle,
        };

        this._renderer = new NodeRenderer({
            noViewport: true,
            width: this._width,
            height: this._height,
        });
    }

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
    }

    /**
     * Generates the foreground container that will hold the text
     */
    _generateForeground() {
        this._foreground = new PIXI.Container();
        this._foreground.position.x = this._marginLeft + this._paddingLeft;
        this._foreground.position.y = this._marginTop + this._paddingBottom;

        // this graphic needs to be added to give width & height to the foreground container
        let g = new PIXI.Graphics();
        g.beginFill(0xff0000);
        g.drawRect(
            0,
            0,
            this._width - 2 * this._marginLeft - 2 * this._paddingLeft,
            this._height - 2 * this._marginTop - 2 * this._paddingBottom
        );
        g.endFill();
        g.alpha = 0;
        this._foreground.addChild(g);
    }

    /**
     * Adds an entry to the foreground, moving previous entries up and removing any entry that is out of bounds
     *
     * @param newEntry
     * @param height
     */
    _addEntry(newEntry: PIXI.Container | PIXI.Text | PIXI.Graphics, height?: number) {
        if (!this._foreground) return;

        height = height || newEntry.height;

        // place new entry at the bottom of the foreground
        newEntry.position.y = this._foreground.height - height;

        for (let i = this._entries.length - 1; i >= 0; i--) {
            let entry = this._entries[i];

            // move other entries up
            entry.position.y -= height + this._spaceBetweenEntries;

            // if entry is out of bounds, remove it from the foreground
            // TODO fade entries out
            if (entry.position.y < 0) {
                this._entries.splice(i, 1);
                this._foreground && this._foreground.removeChild(entry);
            }
        }

        this._entries.push(newEntry);
        this._foreground.addChild(newEntry);

        return newEntry;
    }

    /**
     * Deletes all entries
     */
    clear() {
        for (let i = this._entries.length - 1; i >= 0; i--) {
            let entry = this._entries[i];
            this._entries.splice(i, 1);
            this._foreground && this._foreground.removeChild(entry);
        }
    }

    /**
     * Adds a new text line animation to the screen
     *
     * @param textContent - Text of the line
     * @param textStyle - Style of the text font
     * @param options - Extra animation options
     * @param callback - Callback when animation finishes
     */
    addText(
        textContent: string,
        textStyle?: any,
        options?: { framesPerChar: number },
        callback?: () => any
    ) {
        let block = "█";

        let text = new PIXI.Text(textContent, { ...this._defaultTextStyle, ...textStyle });
        let height = text.height;

        text.text = block;

        this._addEntry(text, height);

        let elapsedTime = 0;
        let framesPerChar = options?.framesPerChar || 60;

        this._trigger(EventTypes.newTextAnimation, { textContent, textStyle, options });

        // check if theres a previous animation running and finish it
        if (this._currentAnimation) {
            this._currentAnimation(0, true);
            this._currentAnimation = undefined;
        }

        let animation: TextAnimation = (timeDelta: number, forceEnd?: boolean) => {
            // animation is forcefully ended
            if (forceEnd) {
                // display all text and callback
                text.text = textContent;
                setImmediate(() => callback && callback());
                return true;
            }

            elapsedTime += timeDelta;
            let elapsedChars = Math.floor(elapsedTime / framesPerChar);

            // if animation isn't over
            if (elapsedChars < textContent.length) {
                // if a new character was added to the screen
                if (text.text !== textContent.slice(0, elapsedChars) + block) {
                    text.text = textContent.slice(0, elapsedChars) + block;
                    this._trigger(EventTypes.newCharacter, {
                        character: text.text[elapsedChars - 1],
                    });
                }
                return false;
            }
            // if animation is over
            else {
                text.text = textContent;
                this._trigger(EventTypes.newCharacter, {
                    character: text.text[text.text.length - 1],
                });
                setImmediate(() => callback && callback());
                this._trigger(EventTypes.textAnimationOver, {});
                return true;
            }
        };

        this._currentAnimation = animation;

        return animation;
    }

    /**
     * Adds a question animation to the screen
     *
     * @param questionText - Text of the question line
     * @param answers - List of answers to be presented
     * @param options - Extra animation options
     */
    addQuestion(
        questionText: string,
        answers: { id: string; textContent: string; textStyle?: any }[],
        options?: any
    ) {
        this._trigger(EventTypes.newQuestion, { questionText, answers, options });

        // first ask the question
        this.addText(
            questionText,
            { ...this._defaultTextStyle, ...options?.questionStyle },
            undefined,

            // when it finishes animating display the answers
            () => {
                let selected = answers[0].id;

                let question: Question = {
                    selected,
                    container: new PIXI.Container(),
                    answers: [],
                };

                for (let i = 0; i < answers.length; i++) {
                    let answerContainer = new PIXI.Container();

                    let spaceBetweenAnswers =
                        options?.spaceBetweenAnswers || this._spaceBetweenEntries;

                    let answerText = new PIXI.Text(answers[i].textContent, {
                        ...this._defaultTextStyle,
                        ...answers[i].textStyle,
                    });
                    answerText.position.set(40, 10);
                    answerContainer.addChild(answerText);

                    let answerSelector = new PIXI.Graphics();
                    answerSelector.beginFill(
                        answers[i].textStyle?.fill ||
                            options?.questionStyle?.fill ||
                            this._defaultTextStyle.fill
                    );
                    answerSelector.drawRect(0, 0, 10, 10);
                    answerSelector.endFill();
                    answerSelector.position.set(10, 5 + answerText.height / 2);
                    answerSelector.visible = i == 0;
                    answerContainer.addChild(answerSelector);

                    question.answers.push({
                        id: answers[i].id,
                        container: answerContainer,
                        selector: answerSelector,
                    });

                    if (i > 0) {
                        // position answer according to previous answer position
                        answerContainer.position.y =
                            spaceBetweenAnswers +
                            question.answers[i - 1].container.position.y +
                            question.answers[i - 1].container.height;
                    }

                    question.container.addChild(answerContainer);
                }

                this._currentQuestion = question;

                this._addEntry(question.container);
            }
        );
    }

    /**
     * Selects an answer from the list of the current question's answers
     *
     * @param answerId
     */
    selectAnswer(answerId: string) {
        if (this._currentQuestion) {
            this._currentQuestion.answers.forEach(
                (answer) => (answer.selector.visible = answerId === answer.id)
            );

            this._currentQuestion.selected = answerId;

            this._trigger(EventTypes.answerSelected, { answerId });
        }
    }

    /**
     * Confirms the currently selected answer
     */
    confirmAnswer() {
        this._trigger(EventTypes.answerConfirmed, { answerId: this._currentQuestion?.selected });
        this._currentQuestion = undefined;
    }

    /**
     * Builds the screen
     */
    prepare() {
        return new Promise<any>((resolve, reject) => {
            let pixi = new PIXINode("pixi", this._renderer);

            this._generateBackground();
            this._background && pixi.add(this._background);

            this._generateForeground();
            this._foreground && pixi.add(this._foreground);

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
    update(deltaTime: number, updateOptions?: TextScreenUpdateOptions) {
        if (!this._currentAnimation || this._currentAnimation(deltaTime)) {
            this._currentAnimation = undefined;
        }

        if (updateOptions?.opacity && this._background) {
            this._background.alpha = updateOptions.opacity;
        }

        this._elapsedTime += deltaTime;
        this._render(this._elapsedTime / 1000);
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

    /**
     * Subscribes to text screen events
     *
     * @param subscriber
     */
    subscribe(subscriber: EventSubscriber) {
        this._subscribers.push(subscriber);
    }

    /**
     * Triggers a text screen event
     *
     * @param eventType
     * @param eventData
     */
    _trigger(eventType: string, eventData: any) {
        this._subscribers.forEach((subscriber) => subscriber(eventType, eventData));
    }
}
