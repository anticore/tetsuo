import { Viewport } from "./Viewport";
import { Scene } from "./Scene";
import { Clock } from "./Clock";
import { Shaders } from "./shaders";
import { ShadedObject } from "./ShadedObject";
import { NodeRenderer } from "./nodes/NodeRenderer";
import { NodeGraph } from "./nodes/NodeGraph";
import { Node } from "./nodes/Node";
import { ShaderNode } from "./nodes/ShaderNode";
import { THREENode } from "./nodes/THREENode";
import { UniformNode } from "./nodes/UniformNode";
import { Connection } from "./nodes/Connection";
import * as Utils from "./utils";

const TETSUO = {
    Scene,
    Viewport,
    Clock,
    Shaders,
    ShadedObject,
    NodeRenderer,
    NodeGraph,
    Node,
    Connection,
    ShaderNode,
    THREENode,
    UniformNode,
    Utils,
};

(window as any)["TETSUO"] = TETSUO;

export default TETSUO;
