import { Node, NodeOptions } from "./Node";
import { Callback } from "../types/Callback";
import { getGUI } from "../utils/page";
import { uniqueID } from "../utils/general";

/**
 * Uniform node initialization options
 *
 * @category Nodes
 */
export interface UniformNodeOptions extends NodeOptions {
    /**
     * Initial value of the uniform
     */
    value: any;

    /**
     * Callback when value changes
     */
    onChange?: Callback;

    /**
     * dat.gui configurations
     */
    gui?: {
        name?: string;
        min?: number;
        max?: number;
        step?: number;
        [key: string]: any;
    };
}

/**
 * Node for controlling uniforms in nodes
 *
 * @category Nodes
 */
export class UniformNode extends Node {
    /**
     * Current uniform value
     */
    value: any = null;

    /**
     * Callback when value changes
     */
    onChange?: Callback;

    /**
     * @param options - Uniform node initialization options
     */
    constructor(options: UniformNodeOptions) {
        super({ ...options, id: options?.id || uniqueID("UniformNode") });

        this.setValue(options.value);

        this.onChange = options.onChange;

        let gui = getGUI();
        if (gui) {
            if (typeof this.value === "object" && this.value !== null) {
                let folder = gui.addFolder(this.id);
                Object.keys(this.value).forEach((key) => {
                    folder
                        .add(
                            this.value,
                            key,
                            options.gui && options.gui[key]
                                ? options.gui[key].min
                                : undefined,
                            options.gui && options.gui[key]
                                ? options.gui[key].max
                                : undefined,
                            options.gui && options.gui[key]
                                ? options.gui[key].step
                                : undefined
                        )
                        .name(
                            options.gui && options.gui[key]
                                ? options.gui[key].name
                                : key
                        )
                        .onChange((value: any) => {
                            if (this.value) {
                                this.value[key] = value;
                            }
                        });
                });
            } else {
                gui.add(
                    this,
                    "value",
                    options.gui?.min,
                    options.gui?.max,
                    options.gui?.step
                )
                    .name(options.gui?.name || this.id)
                    .onChange((value: any) => this.setValue(value));
            }
        }
    }

    /**
     * Sets the uniform value
     *
     * @param value
     */
    setValue(value: any) {
        this.value = value;

        // update output connection value in order to propagate value change to the connected nodes
        this.output.setValue(value);

        this.onChange && this.onChange(value);

        return this;
    }
}
